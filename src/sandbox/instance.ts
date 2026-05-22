import { SandboxFiles } from "./files.js";
import { readSandboxTree, type SandboxTree } from "./tree.js";
import type {
  SandboxExecOptions,
  SandboxExecResult,
  SandboxInstanceOperations,
  SandboxSnapshot,
  SandboxStatus,
  SandboxTreeOptions,
} from "./types.js";

export class SandboxInstance {
  readonly #operations: SandboxInstanceOperations;

  readonly files: SandboxFiles;
  readonly id: string;
  readonly name: string;
  readonly status: SandboxStatus;
  readonly instanceId: string | null;
  readonly region: string | null;
  readonly projectId: string;
  readonly environmentId: string;
  readonly idleTimeoutMinutes: number;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(
    snapshot: SandboxSnapshot,
    operations: SandboxInstanceOperations,
  ) {
    this.#operations = operations;
    this.id = snapshot.id;
    this.name = snapshot.name;
    this.status = snapshot.status;
    this.instanceId = snapshot.instanceId ?? null;
    this.region = snapshot.region ?? null;
    this.projectId = snapshot.projectId;
    this.environmentId = snapshot.environmentId;
    this.idleTimeoutMinutes = snapshot.idleTimeoutMinutes;
    this.createdAt = snapshot.createdAt;
    this.updatedAt = snapshot.updatedAt;
    this.files = new SandboxFiles({ sandboxId: this.id, operations });
  }

  exec(
    command: string,
    options: SandboxExecOptions = {},
  ): Promise<SandboxExecResult> {
    return this.#operations.exec(this.id, command, options);
  }

  delete(): Promise<SandboxInstance> {
    return this.#operations.delete(this.id);
  }

  tree(options: SandboxTreeOptions = {}): Promise<SandboxTree> {
    return readSandboxTree({
      sandboxId: this.id,
      files: this.files,
      operations: this.#operations,
      options,
    });
  }

  toJSON(): SandboxSnapshot {
    return {
      id: this.id,
      name: this.name,
      status: this.status,
      instanceId: this.instanceId,
      region: this.region,
      projectId: this.projectId,
      environmentId: this.environmentId,
      idleTimeoutMinutes: this.idleTimeoutMinutes,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
