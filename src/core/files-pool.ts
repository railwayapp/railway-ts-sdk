import {
  deriveFilesWsEndpoint,
  type NormalizedRailwayClientConfig,
} from "./config.js";
import {
  RailwayConcurrencyLimitError,
  RailwayConnectionError,
  RailwayRateLimitError,
} from "./errors.js";
import {
  connectFilesWs,
  sleep,
  type FilesWsConnection,
} from "./files-ws-client.js";
import { requestGraphQL } from "./graphql-client.js";
import {
  RailwayGenerateShellTokenDocument,
  type RailwayGenerateShellTokenMutation,
  type RailwayGenerateShellTokenMutationVariables,
} from "../generated/graphql.js";

/** Read scope for inspection ops; the rw scope for anything that mutates. */
export type FilesScope = "files:read" | "files:read files:write";

export interface FilesTarget {
  config: NormalizedRailwayClientConfig;
  environmentId: string;
  sandboxId: string;
}

/** A held concurrency slot on a pooled connection; `release()` frees it. */
export interface FilesLease {
  readonly connection: FilesWsConnection;
  release(): void;
}

/**
 * Per-connection concurrent-operation cap, chosen to match the server's default
 * so its in-band busy frame is a safety net the gate lowers itself to, not
 * something hit in normal use.
 */
const DEFAULT_MAX_CONCURRENT_OPS = 16;

/** How long an idle (zero-lease) connection lingers before closing. */
const IDLE_TTL_MS = 30_000;

/** Bounded retries for a one-shot op rejected by the server's concurrency cap. */
const CONCURRENCY_RETRY_MAX = 3;

/** Bounded retries for a pre-open connect failure (per-IP 429 / transient transport). */
const CONNECT_RETRY_MAX = 3;
const CONNECT_BASE_DELAY_MS = 250;

/** Pre-open connect failures (per-IP 429, transient transport) are safe to retry. */
function isRetryableConnect(error: unknown): boolean {
  return (
    error instanceof RailwayRateLimitError ||
    error instanceof RailwayConnectionError
  );
}

function connectBackoffMs(attempt: number, error: unknown): number {
  if (
    error instanceof RailwayRateLimitError &&
    error.retryAfterMs !== undefined
  ) {
    return error.retryAfterMs;
  }
  return CONNECT_BASE_DELAY_MS * 2 ** (attempt - 1);
}

/**
 * A counting semaphore: at most `limit` holders, FIFO queue beyond. Exported for
 * unit testing the concurrency invariant.
 */
export class Gate {
  #active = 0;
  #limit: number;
  readonly #queue: (() => void)[] = [];

  constructor(limit: number) {
    this.#limit = limit;
  }

  /** Drop the ceiling toward a server-advertised cap; never raises it. */
  lower(limit: number): void {
    if (Number.isFinite(limit) && limit > 0 && limit < this.#limit) {
      this.#limit = limit;
    }
  }

  async acquire(): Promise<void> {
    if (this.#active < this.#limit) {
      this.#active++;
      return;
    }
    // At the cap: wait for release() to hand us its slot. No increment on resume
    // — the slot is transferred, so the holder count is unchanged.
    await new Promise<void>(resolve => this.#queue.push(resolve));
  }

  release(): void {
    // Hand the slot straight to the next waiter (count unchanged) rather than
    // decrement-then-let-the-waiter-reincrement, which leaves a transient gap a
    // fresh acquire() can barge into past the cap. Only hand off while within the
    // cap; otherwise decrement, draining an over-subscribed gate (post-lower())
    // down to the new ceiling before admitting a waiter.
    if (this.#active <= this.#limit && this.#queue.length > 0) {
      this.#queue.shift()!();
      return;
    }
    this.#active--;
  }
}

/**
 * A pooled `/ws/files` connection for one (sandbox, scope): single-flight
 * connect, refcounted, idle-closing, self-evicting on an unexpected close so
 * the next acquire reconnects. Operations multiplex over it up to the gate.
 */
class PooledConnection {
  #refs = 0;
  #connectOnce: Promise<FilesWsConnection> | undefined;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;
  #evicted = false;
  readonly #gate: Gate;

  constructor(
    private readonly target: FilesTarget,
    private readonly scope: FilesScope,
    private readonly onEvict: () => void,
    maxConcurrentOps: number,
  ) {
    this.#gate = new Gate(maxConcurrentOps);
  }

  async acquireLease(): Promise<FilesLease> {
    this.#refs++;
    if (this.#idleTimer) {
      clearTimeout(this.#idleTimer);
      this.#idleTimer = undefined;
    }

    let connection: FilesWsConnection;
    try {
      connection = await this.#connect();
      await this.#gate.acquire();
    } catch (error) {
      this.#releaseRef();
      throw error;
    }

    let released = false;
    return {
      connection,
      release: () => {
        if (released) return;
        released = true;
        this.#gate.release();
        this.#releaseRef();
      },
    };
  }

  /** A server busy frame means our ceiling is above the server's; lower it. */
  observe(error: unknown): void {
    if (error instanceof RailwayConcurrencyLimitError && error.limit) {
      this.#gate.lower(error.limit);
    }
  }

  dispose(): void {
    this.#evict();
  }

  #releaseRef(): void {
    if (--this.#refs > 0 || this.#evicted) return;
    this.#idleTimer = setTimeout(() => this.#evict(), IDLE_TTL_MS);
    this.#idleTimer.unref?.();
  }

  #connect(): Promise<FilesWsConnection> {
    if (!this.#connectOnce) {
      this.#connectOnce = this.#openWithRetry()
        .then(connection => {
          connection.onClose(() => this.#evict());
          return connection;
        })
        .catch(error => {
          // A poisoned connect must not be cached for the next acquire.
          this.#evict();
          throw error;
        });
    }
    return this.#connectOnce;
  }

  /** Opens with bounded backoff so a per-IP 429 (or transient transport) self-heals. */
  async #openWithRetry(): Promise<FilesWsConnection> {
    for (let attempt = 1; ; attempt++) {
      try {
        return await this.#open();
      } catch (error) {
        if (attempt >= CONNECT_RETRY_MAX || !isRetryableConnect(error)) throw error;
        await sleep(connectBackoffMs(attempt, error));
      }
    }
  }

  async #open(): Promise<FilesWsConnection> {
    const { config, environmentId, sandboxId } = this.target;
    const input: RailwayGenerateShellTokenMutationVariables["input"] = {
      environmentId,
      instanceId: sandboxId,
      kind: "sandbox",
      scope: this.scope,
    };
    const tokenData = await requestGraphQL<
      RailwayGenerateShellTokenMutation,
      RailwayGenerateShellTokenMutationVariables
    >(config, RailwayGenerateShellTokenDocument, { input });
    return connectFilesWs({
      config,
      jwt: tokenData.generateShellToken,
      endpoint: deriveFilesWsEndpoint(config.tcpProxyWsEndpoint),
    });
  }

  #evict(): void {
    if (this.#evicted) return;
    this.#evicted = true;
    if (this.#idleTimer) clearTimeout(this.#idleTimer);
    void this.#connectOnce
      ?.then(connection => connection.close())
      .catch(() => {});
    this.onEvict();
  }
}

/**
 * Pools `/ws/files` connections per (sandbox, scope) so concurrent file
 * operations multiplex over one connection instead of opening a connection per
 * operation. Keyed on credentials + endpoint so a process-global pool
 * never hands one tenant's socket to code with different creds.
 */
class FilesPool {
  readonly #connections = new Map<string, PooledConnection>();

  constructor(private readonly maxConcurrentOps = DEFAULT_MAX_CONCURRENT_OPS) {}

  acquireLease(target: FilesTarget, scope: FilesScope): Promise<FilesLease> {
    return this.#entry(target, scope).acquireLease();
  }

  /**
   * Acquire a lease, run `fn` under it, and release — for one-shot ops. If the
   * server rejects with its concurrency cap (gate above the server's), lower
   * the gate and re-queue; `fn` must be safe to re-run (a busy frame only fires
   * at request admission, before any content is consumed).
   */
  async run<T>(
    target: FilesTarget,
    scope: FilesScope,
    fn: (connection: FilesWsConnection) => Promise<T>,
  ): Promise<T> {
    const entry = this.#entry(target, scope);
    for (let attempt = 0; ; attempt++) {
      const lease = await entry.acquireLease();
      try {
        return await fn(lease.connection);
      } catch (error) {
        entry.observe(error);
        if (
          error instanceof RailwayConcurrencyLimitError &&
          attempt < CONCURRENCY_RETRY_MAX
        ) {
          continue;
        }
        throw error;
      } finally {
        lease.release();
      }
    }
  }

  /** Test/shutdown hook: close every connection and clear the pool. */
  dispose(): void {
    for (const connection of this.#connections.values()) connection.dispose();
    this.#connections.clear();
  }

  #entry(target: FilesTarget, scope: FilesScope): PooledConnection {
    const k = key(target, scope);
    let entry = this.#connections.get(k);
    if (!entry) {
      const created = new PooledConnection(
        target,
        scope,
        () => {
          if (this.#connections.get(k) === created) this.#connections.delete(k);
        },
        this.maxConcurrentOps,
      );
      this.#connections.set(k, created);
      entry = created;
    }
    return entry;
  }
}

/**
 * Pool key. MUST fold in endpoint + credentials so a process-global pool never
 * hands one tenant's socket to code with different creds.
 */
function key(target: FilesTarget, scope: FilesScope): string {
  return [
    target.config.tcpProxyWsEndpoint,
    target.config.token,
    target.sandboxId,
    target.environmentId,
    scope,
  ].join(" ");
}

let pool: FilesPool | undefined;

export function getFilesPool(): FilesPool {
  return (pool ??= new FilesPool());
}

/** Test isolation / explicit shutdown. */
export function __resetFilesPool(): void {
  pool?.dispose();
  pool = undefined;
}
