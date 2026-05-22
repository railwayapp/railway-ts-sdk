import type { RailwayClientConfig } from "../core/config.js";
import type {
  RailwaySandboxExecMutation,
  RailwaySandboxFieldsFragment,
} from "../generated/graphql.js";

export interface SandboxConfig extends RailwayClientConfig {
  projectId: string;
  environmentId: string;
}

export type SandboxClientConfig = SandboxConfig;

export type SandboxStatus = RailwaySandboxFieldsFragment["status"];
export type SandboxExecResult = RailwaySandboxExecMutation["sandboxExec"];
export type SandboxSnapshot = RailwaySandboxFieldsFragment;

export interface SandboxCreateOptions {
  name?: string;
  idleTimeoutMinutes?: number;
}

export interface SandboxExecOptions {
  timeoutSec?: number;
}

export interface SandboxInstanceOperations {
  exec: (
    id: string,
    command: string,
    options: SandboxExecOptions,
  ) => Promise<SandboxExecResult>;
  delete: (id: string) => Promise<import("./instance.js").SandboxInstance>;
}
