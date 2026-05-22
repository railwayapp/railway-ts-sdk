import { RailwayError } from "../core/errors.js";

export type SandboxFileOperation =
  | "read"
  | "write"
  | "info"
  | "remove"
  | "list"
  | "move"
  | "makeDir"
  | "tree";

export interface RailwaySandboxFileErrorArgs {
  message: string;
  operation: SandboxFileOperation;
  path: string;
  status?: number | undefined;
  responseBody?: unknown;
  cause?: unknown;
}

export class RailwaySandboxFileError extends RailwayError {
  readonly operation: SandboxFileOperation;
  readonly path: string;
  readonly status: number | undefined;
  readonly responseBody: unknown;

  constructor(args: RailwaySandboxFileErrorArgs) {
    super(args.message, { cause: args.cause });
    this.operation = args.operation;
    this.path = args.path;
    this.status = args.status;
    this.responseBody = args.responseBody;
  }
}

export class SandboxFileNotFoundError extends RailwaySandboxFileError {
  constructor(args: {
    operation: SandboxFileOperation;
    path: string;
    status?: number | undefined;
    responseBody?: unknown;
  }) {
    super({
      message: `Sandbox file not found: ${args.path}`,
      operation: args.operation,
      path: args.path,
      status: args.status,
      responseBody: args.responseBody,
    });
  }
}

export class SandboxFileTooLargeError extends RailwaySandboxFileError {
  readonly maxBytes: number;
  readonly actualBytes: number | undefined;

  constructor(args: {
    operation: SandboxFileOperation;
    path: string;
    maxBytes: number;
    actualBytes?: number;
    status?: number | undefined;
    responseBody?: unknown;
  }) {
    const actual =
      args.actualBytes === undefined ? "" : `, got ${args.actualBytes} bytes`;

    super({
      message: `Sandbox file is too large: max ${args.maxBytes} bytes${actual}`,
      operation: args.operation,
      path: args.path,
      status: args.status,
      responseBody: args.responseBody,
    });

    this.maxBytes = args.maxBytes;
    this.actualBytes = args.actualBytes;
  }
}
