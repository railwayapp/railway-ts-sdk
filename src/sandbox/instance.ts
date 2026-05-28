import type {
  SandboxExecOptions,
  SandboxExecResult,
  SandboxInstanceOperations,
  SandboxSnapshot,
  SandboxStatus,
} from "./types.js";

export class SandboxInstance {
  readonly #operations: SandboxInstanceOperations;

  readonly id: string;
  readonly status: SandboxStatus;
  readonly environmentId: string;
  readonly region: string;
  readonly idleTimeoutMinutes: number | null;
  readonly createdAt: string;

  constructor(
    snapshot: SandboxSnapshot,
    operations: SandboxInstanceOperations,
  ) {
    this.#operations = operations;
    this.id = snapshot.id;
    this.status = snapshot.status;
    this.environmentId = snapshot.environmentId;
    this.region = snapshot.region;
    this.idleTimeoutMinutes = snapshot.idleTimeoutMinutes ?? null;
    this.createdAt = snapshot.createdAt;
  }

  exec(
    command: string,
    options: SandboxExecOptions = {},
  ): Promise<SandboxExecResult> {
    return this.#operations.exec(this.id, command, options);
  }

  delete(): Promise<SandboxInstance | null> {
    return this.#operations.delete(this.id);
  }

  toJSON(): SandboxSnapshot {
    return {
      id: this.id,
      status: this.status,
      environmentId: this.environmentId,
      region: this.region,
      idleTimeoutMinutes: this.idleTimeoutMinutes,
      createdAt: this.createdAt,
    };
  }
}
