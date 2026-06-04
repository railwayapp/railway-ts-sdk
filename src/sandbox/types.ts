import type { RailwayClientConfig } from "../core/config.js";
import type {
  RailwaySandboxExecMutation,
  RailwaySandboxFieldsFragment,
  RailwaySandboxTemplateFieldsFragment,
} from "../generated/graphql.js";

export type SandboxStatus = RailwaySandboxFieldsFragment["status"];
export type SandboxNetworkIsolation =
  RailwaySandboxFieldsFragment["networkIsolation"];
export type ExecResult = RailwaySandboxExecMutation["sandboxExec"];
export type SandboxInfo = RailwaySandboxFieldsFragment;

export type SandboxTemplateInfo = RailwaySandboxTemplateFieldsFragment;

/** Knobs shared by every sandbox-creating call: `create`, `create(template)`, and `fork`. */
export interface SandboxCreationOptions {
  idleTimeoutMinutes?: number;
  networkIsolation?: SandboxNetworkIsolation;
}

export interface CreateOptions
  extends RailwayClientConfig,
    SandboxCreationOptions {
  environmentId?: string;
}

export type ForkOptions = SandboxCreationOptions;

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
