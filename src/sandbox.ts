import type { RailwaySandboxes } from "./client.js";
import type {
  RailwaySandboxExecMutation,
  RailwaySandboxFieldsFragment,
} from "./generated/graphql.js";

export type SandboxStatus = RailwaySandboxFieldsFragment["status"];
export type SandboxExecResult = RailwaySandboxExecMutation["sandboxExec"];
export type SandboxSnapshot = RailwaySandboxFieldsFragment;

export interface CreateSandboxOptions {
  name?: string;
  idleTimeoutMinutes?: number;
}

export interface ExecOptions {
  timeoutSec?: number;
}

export class Sandbox {
  readonly #client: RailwaySandboxes;

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

  constructor(client: RailwaySandboxes, snapshot: SandboxSnapshot) {
    this.#client = client;
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
  }

  exec(command: string, options: ExecOptions = {}): Promise<SandboxExecResult> {
    return this.#client.exec(this.id, command, options);
  }

  delete(): Promise<Sandbox> {
    return this.#client.delete(this.id);
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
