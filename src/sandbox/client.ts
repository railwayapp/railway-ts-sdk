import {
  assertNonEmpty,
  normalizeRailwayClientConfig,
  type NormalizedRailwayClientConfig,
} from "../core/config.js";
import { requestGraphQL } from "../core/graphql-client.js";
import {
  RailwaySandboxCreateDocument,
  RailwaySandboxDestroyDocument,
  RailwaySandboxExecDocument,
  type RailwaySandboxCreateMutation,
  type RailwaySandboxCreateMutationVariables,
  type RailwaySandboxDestroyMutation,
  type RailwaySandboxDestroyMutationVariables,
  type RailwaySandboxExecMutation,
  type RailwaySandboxExecMutationVariables,
} from "../generated/graphql.js";
import { SandboxInstance } from "./instance.js";
import type {
  SandboxConfig,
  SandboxCreateOptions,
  SandboxExecOptions,
  SandboxExecResult,
  SandboxInstanceOperations,
  SandboxSnapshot,
} from "./types.js";

interface NormalizedSandboxConfig extends NormalizedRailwayClientConfig {
  projectId: string;
  environmentId: string;
}

export class Sandbox {
  readonly #config: NormalizedSandboxConfig;
  readonly #operations: SandboxInstanceOperations;

  constructor(config: SandboxConfig) {
    this.#config = normalizeSandboxConfig(config);
    this.#operations = {
      exec: (id, command, options) => this.#exec(id, command, options),
      delete: id => this.#delete(id),
    };
  }

  get endpoint(): string {
    return this.#config.endpoint;
  }

  async create(
    options: SandboxCreateOptions = {},
  ): Promise<SandboxInstance> {
    const input: RailwaySandboxCreateMutationVariables["input"] = {
      projectId: this.#config.projectId,
      environmentId: this.#config.environmentId,
    };

    if (options.name !== undefined) input.name = options.name;
    if (options.idleTimeoutMinutes !== undefined) {
      input.idleTimeoutMinutes = options.idleTimeoutMinutes;
    }

    const data = await requestGraphQL<
      RailwaySandboxCreateMutation,
      RailwaySandboxCreateMutationVariables
    >(this.#config, RailwaySandboxCreateDocument, { input });

    return this.#instance(data.sandboxCreate);
  }

  async #exec(
    id: string,
    command: string,
    options: SandboxExecOptions = {},
  ): Promise<SandboxExecResult> {
    const variables: RailwaySandboxExecMutationVariables = { id, command };

    if (options.timeoutSec !== undefined) variables.timeoutSec = options.timeoutSec;

    const data = await requestGraphQL<
      RailwaySandboxExecMutation,
      RailwaySandboxExecMutationVariables
    >(this.#config, RailwaySandboxExecDocument, variables);

    return data.sandboxExec;
  }

  async #delete(id: string): Promise<SandboxInstance> {
    const variables: RailwaySandboxDestroyMutationVariables = { id };
    const data = await requestGraphQL<
      RailwaySandboxDestroyMutation,
      RailwaySandboxDestroyMutationVariables
    >(this.#config, RailwaySandboxDestroyDocument, variables);

    return this.#instance(data.sandboxDestroy);
  }

  #instance(snapshot: SandboxSnapshot): SandboxInstance {
    return new SandboxInstance(snapshot, this.#operations);
  }
}

function normalizeSandboxConfig(
  config: SandboxConfig,
): NormalizedSandboxConfig {
  assertNonEmpty("projectId", config.projectId);
  assertNonEmpty("environmentId", config.environmentId);

  return {
    ...normalizeRailwayClientConfig(config),
    projectId: config.projectId,
    environmentId: config.environmentId,
  };
}
