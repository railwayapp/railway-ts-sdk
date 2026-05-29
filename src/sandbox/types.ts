import type { RailwayClientConfig } from "../core/config.js";
import type {
  RailwaySandboxExecMutation,
  RailwaySandboxFieldsFragment,
  RailwaySandboxTemplateFieldsFragment,
} from "../generated/graphql.js";

export type SandboxStatus = RailwaySandboxFieldsFragment["status"];
export type ExecResult = RailwaySandboxExecMutation["sandboxExec"];
export type SandboxInfo = RailwaySandboxFieldsFragment;

export type SandboxTemplateInfo = RailwaySandboxTemplateFieldsFragment;

export interface CreateOptions extends RailwayClientConfig {
  environmentId?: string;
  idleTimeoutMinutes?: number;
}

export interface ConnectOptions extends RailwayClientConfig {
  environmentId?: string;
}

export interface ListOptions extends RailwayClientConfig {
  environmentId?: string;
  first?: number;
  after?: string;
}

export interface ExecOptions {
  timeoutSec?: number;
}

export interface TemplateBuildOptions extends RailwayClientConfig {
  environmentId?: string;
}
