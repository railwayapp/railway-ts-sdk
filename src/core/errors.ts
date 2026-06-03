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

/** A WebSocket transport failure outside the GraphQL protocol. */
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
