import {
  normalizeRailwayClientConfig,
  resolveEnvironmentId,
  type NormalizedRailwayClientConfig,
  type RailwayClientConfig,
} from "../core/config.js";
import { requestGraphQL } from "../core/graphql-client.js";
import {
  RailwaySandboxCreateDocument,
  RailwaySandboxDestroyDocument,
  RailwaySandboxDocument,
  RailwaySandboxesDocument,
  RailwaySandboxExecDocument,
  type RailwaySandboxCreateMutation,
  type RailwaySandboxCreateMutationVariables,
  type RailwaySandboxDestroyMutation,
  type RailwaySandboxDestroyMutationVariables,
  type RailwaySandboxExecMutation,
  type RailwaySandboxExecMutationVariables,
  type RailwaySandboxesQuery,
  type RailwaySandboxesQueryVariables,
  type RailwaySandboxQuery,
  type RailwaySandboxQueryVariables,
} from "../generated/graphql.js";
import type {
  CreateOptions,
  ExecOptions,
  ExecResult,
  ListOptions,
  SandboxInfo,
} from "./types.js";

interface SandboxEngineConfig extends NormalizedRailwayClientConfig {
  environmentId: string;
}

export interface SandboxOptions extends RailwayClientConfig {
  environmentId?: string;
}

/**
 * Binds resolved credentials + environment to the sandbox GraphQL operations.
 * Never exported as a public noun — `Sandbox` is the only thing callers hold.
 */
export class SandboxEngine {
  readonly #config: SandboxEngineConfig;

  constructor(config: SandboxEngineConfig) {
    this.#config = config;
  }

  get environmentId(): string {
    return this.#config.environmentId;
  }

  async create(options: CreateOptions = {}): Promise<SandboxInfo> {
    const input: RailwaySandboxCreateMutationVariables["input"] = {
      environmentId: this.#config.environmentId,
    };
    if (options.idleTimeoutMinutes !== undefined) {
      input.idleTimeoutMinutes = options.idleTimeoutMinutes;
    }

    const data = await requestGraphQL<
      RailwaySandboxCreateMutation,
      RailwaySandboxCreateMutationVariables
    >(this.#config, RailwaySandboxCreateDocument, { input });

    return data.sandboxCreate;
  }

  async exec(
    id: string,
    command: string,
    options: ExecOptions = {},
  ): Promise<ExecResult> {
    const variables: RailwaySandboxExecMutationVariables = {
      id,
      command,
      environmentId: this.#config.environmentId,
    };
    if (options.timeoutSec !== undefined) variables.timeoutSec = options.timeoutSec;

    const data = await requestGraphQL<
      RailwaySandboxExecMutation,
      RailwaySandboxExecMutationVariables
    >(this.#config, RailwaySandboxExecDocument, variables);

    return data.sandboxExec;
  }

  async destroy(id: string): Promise<void> {
    const variables: RailwaySandboxDestroyMutationVariables = {
      id,
      environmentId: this.#config.environmentId,
    };
    await requestGraphQL<
      RailwaySandboxDestroyMutation,
      RailwaySandboxDestroyMutationVariables
    >(this.#config, RailwaySandboxDestroyDocument, variables);
  }

  async get(id: string): Promise<SandboxInfo | null> {
    const variables: RailwaySandboxQueryVariables = {
      id,
      environmentId: this.#config.environmentId,
    };
    const data = await requestGraphQL<
      RailwaySandboxQuery,
      RailwaySandboxQueryVariables
    >(this.#config, RailwaySandboxDocument, variables);

    return data.sandbox ?? null;
  }

  async list(options: ListOptions = {}): Promise<SandboxInfo[]> {
    const variables: RailwaySandboxesQueryVariables = {
      environmentId: this.#config.environmentId,
    };
    if (options.first !== undefined) variables.first = options.first;
    if (options.after !== undefined) variables.after = options.after;

    const data = await requestGraphQL<
      RailwaySandboxesQuery,
      RailwaySandboxesQueryVariables
    >(this.#config, RailwaySandboxesDocument, variables);

    return data.sandboxes.edges.map(edge => edge.node);
  }
}

export function engineFromOptions(options: SandboxOptions = {}): SandboxEngine {
  const base = normalizeRailwayClientConfig(options);
  const environmentId = resolveEnvironmentId(options.environmentId);
  return new SandboxEngine({ ...base, environmentId });
}
