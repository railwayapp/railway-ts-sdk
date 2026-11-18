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

/** Stable code backboard sets in error extensions when an apply's base config is stale. */
export const STALE_ENVIRONMENT_BASE_CODE = "STALE_ENVIRONMENT_BASE";

/** Thrown by IaC apply when the environment changed since the plan's base snapshot. */
export class StaleEnvironmentError extends RailwayError {}

export class RailwayGraphQLError extends RailwayError {
  readonly status: number;
  readonly errors: readonly RailwayGraphQLErrorItem[];
  readonly responseBody: unknown;
  /** From the response's `Retry-After` (rate limits, 503s), when it sent one. */
  readonly retryAfterMs: number | undefined;

  constructor(args: {
    message: string;
    status: number;
    errors?: readonly RailwayGraphQLErrorItem[];
    responseBody?: unknown;
    retryAfterMs?: number;
  }) {
    super(args.message);
    this.status = args.status;
    this.errors = args.errors ?? [];
    this.responseBody = args.responseBody;
    this.retryAfterMs = args.retryAfterMs;
  }
}

/**
 * The token ran out of its hourly API budget for longer than an operation can
 * wait. Nothing is lost: a sandbox that was being waited on keeps booting, and
 * `resourceId` names it so it can be reached (`Sandbox.connect`) once the limit
 * resets. A `RailwayGraphQLError` with status 429, so code that already
 * catches rate limits that way keeps working.
 */
export class RailwayRateLimitError extends RailwayGraphQLError {
  declare readonly retryAfterMs: number;
  readonly resourceId: string | undefined;

  constructor(args: {
    message: string;
    retryAfterMs: number;
    resourceId?: string;
    cause?: RailwayGraphQLError;
  }) {
    super({
      message: args.message,
      status: 429,
      errors: args.cause?.errors ?? [],
      responseBody: args.cause?.responseBody,
      retryAfterMs: args.retryAfterMs,
    });
    if (args.cause !== undefined) (this as { cause?: unknown }).cause = args.cause;
    this.resourceId = args.resourceId;
  }
}
