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

  constructor(variable: string) {
    super(
      `Missing Railway credential. Set ${variable} or pass it explicitly.`,
    );
    this.variable = variable;
  }
}

/** A WebSocket or network transport failure. */
export class RailwayConnectionError extends RailwayError {
  readonly closeCode: number | undefined;
  /** The raw close reason the server sent (verbatim), when one was provided. */
  readonly closeReason: string | undefined;

  constructor(args: {
    message: string;
    closeCode?: number;
    closeReason?: string;
    cause?: unknown;
  }) {
    super(
      args.message,
      args.cause === undefined ? undefined : { cause: args.cause },
    );
    this.closeCode = args.closeCode;
    this.closeReason = args.closeReason;
  }
}

/**
 * Base for the back-pressure conditions a client can hit; `reason` discriminates
 * which limit and `retryAfterMs` carries a server hint when present. The rate
 * limit and per-connection concurrency cap are retried internally (a 429
 * self-heals on reconnect; a busy frame re-queues); the sandbox session limit
 * surfaces to the caller, since retrying can't free another session's slot.
 */
export class RailwayBackpressureError extends RailwayError {
  readonly reason:
    | "ip_rate_limit"
    | "connection_concurrency"
    | "sandbox_session_limit";
  /** Suggested wait before retrying, when the server provided one. */
  readonly retryAfterMs: number | undefined;

  constructor(args: {
    message: string;
    reason: RailwayBackpressureError["reason"];
    retryAfterMs?: number;
    cause?: unknown;
  }) {
    super(
      args.message,
      args.cause === undefined ? undefined : { cause: args.cause },
    );
    this.reason = args.reason;
    this.retryAfterMs = args.retryAfterMs;
  }
}

/** The per-IP WS rate limit rejected the upgrade with HTTP 429. */
export class RailwayRateLimitError extends RailwayBackpressureError {
  readonly httpStatus: number;

  constructor(args: {
    message: string;
    httpStatus?: number;
    retryAfterMs?: number;
  }) {
    super({
      message: args.message,
      reason: "ip_rate_limit",
      ...(args.retryAfterMs !== undefined && { retryAfterMs: args.retryAfterMs }),
    });
    this.httpStatus = args.httpStatus ?? 429;
  }
}

/**
 * The connection is at its per-connection concurrent-operation cap (the
 * server's in-band `too_many_concurrent_operations`); `limit` is the server's
 * cap so the client can size its own concurrency.
 */
export class RailwayConcurrencyLimitError extends RailwayBackpressureError {
  readonly limit: number | undefined;

  constructor(args: { message: string; limit?: number }) {
    super({ message: args.message, reason: "connection_concurrency" });
    this.limit = args.limit;
  }
}

/** The sandbox is at its concurrent-session limit (WS close 4001). */
export class RailwaySessionLimitError extends RailwayBackpressureError {
  readonly closeCode: number;
  /** The raw close reason the server sent (verbatim), when one was provided. */
  readonly closeReason: string | undefined;

  constructor(args: {
    message: string;
    closeCode?: number;
    closeReason?: string;
  }) {
    super({ message: args.message, reason: "sandbox_session_limit" });
    this.closeCode = args.closeCode ?? 4001;
    this.closeReason = args.closeReason;
  }
}

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
