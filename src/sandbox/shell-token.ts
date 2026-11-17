import { RailwayConnectionError } from "../core/errors.js";

/**
 * Shell tokens (`generateShellToken`) authorize tcp-proxy sessions for five
 * minutes and only need the sandbox to exist, so one token serves every exec
 * in that window instead of a GraphQL round trip per exec.
 */

/** Stop handing out a token this long before it expires, so a connect never races expiry. */
const REUSE_MARGIN_MS = 60_000;
/** Lifetime to assume when the token's `iat`/`exp` can't be read (the server's is five minutes). */
const FALLBACK_TTL_MS = 4 * 60_000;
/** A mint that has not answered by then is abandoned, so it cannot stall every exec sharing it. */
const SHELL_TOKEN_MINT_TIMEOUT_MS = 15_000;

interface Entry {
  promise: Promise<string>;
  /** Infinity while the mint is in flight. */
  reuseUntil: number;
}

export type MintShellToken = (scope: string, signal: AbortSignal) => Promise<string>;

export class ShellTokenCache {
  readonly #mint: MintShellToken;
  readonly #entries = new Map<string, Entry>();
  readonly #timeoutMs: number;

  constructor(mint: MintShellToken, options: { timeoutMs?: number } = {}) {
    this.#mint = mint;
    this.#timeoutMs = options.timeoutMs ?? SHELL_TOKEN_MINT_TIMEOUT_MS;
  }

  /**
   * A token for `scope`, reused while it has more than a minute left.
   * `fresh` always mints (and caches) a new one. `signal` abandons the wait
   * without cancelling a mint other callers may share.
   */
  get(scope: string, options: { fresh?: boolean; signal?: AbortSignal | undefined } = {}): Promise<string> {
    options.signal?.throwIfAborted();
    const current = this.#entries.get(scope);
    const entry =
      !options.fresh && current && Date.now() < current.reuseUntil
        ? current
        : this.#start(scope);
    return abortable(entry.promise, options.signal);
  }

  clear(): void {
    this.#entries.clear();
  }

  #start(scope: string): Entry {
    const controller = new AbortController();
    // Rejects at the deadline even if the mint ignores its signal.
    const promise = new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        const error = new RailwayConnectionError({
          message: `Minting a shell token did not answer within ${this.#timeoutMs / 1000}s.`,
        });
        controller.abort(error);
        reject(error);
      }, this.#timeoutMs);
      (timer as { unref?: () => void }).unref?.();
      this.#mint(scope, controller.signal).then(
        jwt => {
          clearTimeout(timer);
          resolve(jwt);
        },
        error => {
          clearTimeout(timer);
          // A fetch aborted by the timeout rejects with its own AbortError.
          reject(controller.signal.aborted ? controller.signal.reason : error);
        },
      );
    });
    const entry: Entry = { promise, reuseUntil: Number.POSITIVE_INFINITY };
    this.#entries.set(scope, entry);
    entry.promise.then(
      jwt => {
        entry.reuseUntil = Date.now() + lifetimeMs(jwt) - REUSE_MARGIN_MS;
      },
      () => {
        if (this.#entries.get(scope) === entry) this.#entries.delete(scope);
      },
    );
    return entry;
  }
}

/**
 * How long the token lives (`exp - iat`), measured from when it arrived rather
 * than against `exp` on the local clock, so a client clock that runs slow
 * never reuses a token the server already considers expired.
 */
function lifetimeMs(jwt: string): number {
  try {
    const payload = jwt.split(".")[1];
    if (payload) {
      const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      const { exp, iat } = JSON.parse(atob(padded)) as { exp?: unknown; iat?: unknown };
      if (typeof exp === "number" && typeof iat === "number" && exp > iat) {
        return Math.min((exp - iat) * 1000, FALLBACK_TTL_MS + REUSE_MARGIN_MS);
      }
    }
  } catch {
    // Not a readable JWT; fall through to the conservative lifetime.
  }
  return FALLBACK_TTL_MS;
}

/** Settles with `promise`, or rejects with the signal's reason if it aborts first. */
export function abortable<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise;
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(signal.reason);
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(
      value => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      error => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}
