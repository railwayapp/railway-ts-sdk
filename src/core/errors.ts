export interface RailwayGraphQLErrorItem {
  message: string;
  path?: readonly (string | number)[];
  extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export class RailwayError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class RailwayAuthError extends RailwayError {
  readonly variable: string;

  constructor(variable: string, message?: string, options?: ErrorOptions) {
    super(
      message ??
        `Missing Railway credential. Set ${variable} or pass it explicitly.`,
      options,
    );
    this.variable = variable;
  }
}

/** A WebSocket or network transport failure. */
export class RailwayConnectionError extends RailwayError {
  readonly closeCode: number | undefined;

  constructor(args: { message: string; closeCode?: number; cause?: unknown }) {
    super(
      args.message,
      args.cause === undefined ? undefined : { cause: args.cause },
    );
    this.closeCode = args.closeCode;
  }
}

/**
 * The exec connection failed before any command was sent, so nothing ran in the
 * sandbox and the exec is safe to retry.
 */
export class ExecNotStartedError extends RailwayConnectionError {}

/**
 * The tcp-proxy closed the exec socket in answer to `exec_hello` without
 * advertising capabilities: it predates exec control. No command was sent, but
 * retrying the same request cannot succeed, so this is not an
 * `ExecNotStartedError`.
 */
export class ExecControlUnsupportedError extends RailwayConnectionError {}

/**
 * Close code tcp-proxy sends when it accepts a WebSocket only to refuse it for
 * rate limiting. A plain HTTP 429 on the upgrade is invisible to the WHATWG
 * WebSocket API (it surfaces as a bare 1006), so the limit rides a close code
 * every runtime can read. The reason carries `retry_after=<seconds>`.
 */
const RATE_LIMIT_CLOSE_CODE = 4029;

/**
 * Railway refused the request for rate limiting. Nothing ran; the SDK does not
 * retry it, so callers decide whether and when to try again.
 */
export class RailwayRateLimitError extends RailwayError {
  /** How long the server asked callers to wait, when it said. */
  readonly retryAfterMs: number | undefined;

  constructor(args: { message: string; retryAfterMs?: number | undefined }) {
    super(
      args.retryAfterMs === undefined
        ? `${args.message}.`
        : `${args.message}; retry after ${Math.ceil(args.retryAfterMs / 1000)}s.`,
    );
    this.retryAfterMs = args.retryAfterMs;
  }
}

/** Maps a tcp-proxy rate-limit close to its error; undefined for any other close. */
export function rateLimitFromClose(
  endpoint: "exec" | "files",
  event: { code: number; reason: string },
): RailwayRateLimitError | undefined {
  if (event.code !== RATE_LIMIT_CLOSE_CODE) return undefined;
  const seconds = /retry_after=(\d+(?:\.\d+)?)/.exec(event.reason)?.[1];
  return new RailwayRateLimitError({
    message: `tcp-proxy rate-limited the ${endpoint} connection`,
    retryAfterMs: seconds === undefined ? undefined : Number(seconds) * 1000,
  });
}

/** Stable code backboard sets in error extensions when an apply's base config is stale. */
export const STALE_ENVIRONMENT_BASE_CODE = "STALE_ENVIRONMENT_BASE";

/** Thrown by IaC apply when the environment changed since the plan's base snapshot. */
export class StaleEnvironmentError extends RailwayError {}

export class RailwayGraphQLError extends RailwayError {
  readonly status: number;
  readonly errors: readonly RailwayGraphQLErrorItem[];
  readonly responseBody: unknown;

  constructor(args: {
    message: string;
    status: number;
    errors?: readonly RailwayGraphQLErrorItem[];
    responseBody?: unknown;
  }) {
    super(args.message);
    this.status = args.status;
    this.errors = args.errors ?? [];
    this.responseBody = args.responseBody;
  }
}
