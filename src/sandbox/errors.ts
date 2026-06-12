import { RailwayError } from "../core/errors.js";
import type { SandboxStatus } from "./types.js";

export class SandboxNotFoundError extends RailwayError {
  readonly id: string;
  readonly environmentId: string;

  constructor(args: { id: string; environmentId: string }) {
    super(
      `Sandbox "${args.id}" was not found in environment "${args.environmentId}".`,
    );
    this.id = args.id;
    this.environmentId = args.environmentId;
  }
}

/** A sandbox reached FAILED/DESTROYING/DESTROYED before becoming RUNNING. */
export class SandboxFailedError extends RailwayError {
  readonly id: string;
  readonly status: SandboxStatus;

  constructor(args: { id: string; status: SandboxStatus }) {
    super(
      `Sandbox "${args.id}" entered terminal state "${args.status}" before becoming ready.`,
    );
    this.id = args.id;
    this.status = args.status;
  }
}

/** A server-side template build finished in the FAILED state. */
export class SandboxTemplateBuildError extends RailwayError {
  readonly templateId: string;
  readonly environmentId: string;

  constructor(args: { templateId: string; environmentId: string }) {
    super(
      `Sandbox template "${args.templateId}" failed to build in environment "${args.environmentId}".`,
    );
    this.templateId = args.templateId;
    this.environmentId = args.environmentId;
  }
}

/** A file operation was rejected by the sandbox (the message is the VM's error text). */
export class SandboxFilesError extends RailwayError {
  readonly operation: string;
  readonly path: string;

  constructor(args: { operation: string; path: string; message: string }) {
    super(`File ${args.operation} failed for "${args.path}": ${args.message}`);
    this.operation = args.operation;
    this.path = args.path;
  }
}

/** The path does not exist in the sandbox. */
export class SandboxFileNotFoundError extends SandboxFilesError {}

/** A readiness wait timed out. */
export class SandboxTimeoutError extends RailwayError {
  readonly resource: "sandbox" | "template";
  readonly id: string;
  readonly lastStatus: string;
  readonly timeoutMs: number;

  constructor(args: {
    resource: "sandbox" | "template";
    id: string;
    lastStatus: string;
    timeoutMs: number;
  }) {
    super(
      `Timed out after ${args.timeoutMs}ms waiting for ${args.resource} "${args.id}" ` +
        `to become ready (last status: ${args.lastStatus}).`,
    );
    this.resource = args.resource;
    this.id = args.id;
    this.lastStatus = args.lastStatus;
    this.timeoutMs = args.timeoutMs;
  }
}
