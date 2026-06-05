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

/** A template recipe compiled into the inputs the backend understands. */
export interface CompiledTemplate {
  readonly instructions: readonly string[];
  /** Build-time env for the build instructions; omitted when empty. */
  readonly variables?: Record<string, string>;
}

/** Knobs shared by every sandbox-creating call: `create`, `create(template)`, and `fork`. */
export interface SandboxCreationOptions {
  idleTimeoutMinutes?: number;
  networkIsolation?: SandboxNetworkIsolation;
  /** Runtime env baked into the sandbox, available to every command. Values may use Railway references (e.g. `${{shared.FOO}}`). */
  env?: Record<string, string>;
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
