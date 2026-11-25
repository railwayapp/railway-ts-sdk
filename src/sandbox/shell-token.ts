import type { NormalizedRailwayClientConfig } from "../core/config.js";
import { requestGraphQL } from "../core/graphql-client.js";
import {
  RailwayGenerateShellTokenDocument,
  type RailwayGenerateShellTokenMutation,
  type RailwayGenerateShellTokenMutationVariables,
} from "../generated/graphql.js";

type ShellTokenScope = "shell" | "files:read" | "files:read files:write";

interface ShellTokenTarget {
  config: NormalizedRailwayClientConfig;
  environmentId: string;
  sandboxId: string;
}

/**
 * A cached token stops being handed out this long before it expires, so it is
 * still valid when tcp-proxy verifies it at the WebSocket upgrade.
 */
const EXPIRY_MARGIN_MS = 60_000;

interface Entry {
  jwt: Promise<string>;
  value?: string;
  reusableUntil: number;
}

/**
 * `generateShellToken` JWTs are verified locally by tcp-proxy at each upgrade
 * and are not single-use, so one token authorizes any number of connections
 * until it expires. Caching them per sandbox and scope takes a backboard round
 * trip off every exec and file dial. Concurrent callers share one in-flight
 * mint; failed mints are dropped so the next caller retries.
 */
export class ShellTokens {
  readonly #entries = new Map<string, Entry>();

  get(target: ShellTokenTarget, scope: ShellTokenScope, signal?: AbortSignal): Promise<string> {
    signal?.throwIfAborted();
    const key = entryKey(target.sandboxId, scope);
    const now = Date.now();
    const cached = this.#entries.get(key);
    if (cached && cached.reusableUntil > now) return abortable(cached.jwt, signal);

    for (const [k, entry] of this.#entries) {
      if (entry.reusableUntil <= now) this.#entries.delete(k);
    }
    // The mint is shared, so one caller's abort must not cancel it for the rest.
    const entry: Entry = { jwt: mint(target, scope), reusableUntil: Number.POSITIVE_INFINITY };
    this.#entries.set(key, entry);
    entry.jwt.then(
      jwt => {
        entry.value = jwt;
        // Measured from before the request, so the window never outlives the token.
        entry.reusableUntil = now + reuseWindowMs(jwt);
      },
      () => {
        if (this.#entries.get(key) === entry) this.#entries.delete(key);
      },
    );
    return abortable(entry.jwt, signal);
  }

  /** Stops handing out `jwt` (e.g. after a failed dial); a no-op once it was replaced. */
  evict(sandboxId: string, scope: ShellTokenScope, jwt: string): void {
    const key = entryKey(sandboxId, scope);
    if (this.#entries.get(key)?.value === jwt) this.#entries.delete(key);
  }
}

function entryKey(sandboxId: string, scope: ShellTokenScope): string {
  return `${sandboxId}\n${scope}`;
}

async function mint(target: ShellTokenTarget, scope: ShellTokenScope): Promise<string> {
  const data = await requestGraphQL<
    RailwayGenerateShellTokenMutation,
    RailwayGenerateShellTokenMutationVariables
  >(target.config, RailwayGenerateShellTokenDocument, {
    input: {
      environmentId: target.environmentId,
      instanceId: target.sandboxId,
      kind: "sandbox",
      scope,
    },
  });
  return data.generateShellToken;
}

/**
 * The token's own lifetime (`exp - iat`) less the margin, so a skewed local
 * clock cannot stretch it. A token that cannot be decoded is used once.
 */
function reuseWindowMs(jwt: string): number {
  try {
    const payload = jwt.split(".")[1]!.replaceAll("-", "+").replaceAll("_", "/");
    const { exp, iat } = JSON.parse(atob(payload)) as { exp?: unknown; iat?: unknown };
    if (typeof exp !== "number" || typeof iat !== "number") return 0;
    return Math.max(0, (exp - iat) * 1000 - EXPIRY_MARGIN_MS);
  } catch {
    return 0;
  }
}

function abortable<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
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
