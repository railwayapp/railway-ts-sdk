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
  RailwaySandboxCheckpointCreateDocument,
  RailwaySandboxCheckpointDeleteDocument,
  RailwaySandboxCheckpointRenameDocument,
  RailwaySandboxCheckpointsDocument,
  RailwaySandboxTemplateBuildDocument,
  RailwaySandboxTemplateBuildStatusDocument,
  type RailwaySandboxCheckpointCreateMutation,
  type RailwaySandboxCheckpointCreateMutationVariables,
  type RailwaySandboxCheckpointDeleteMutation,
  type RailwaySandboxCheckpointDeleteMutationVariables,
  type RailwaySandboxCheckpointRenameMutation,
  type RailwaySandboxCheckpointRenameMutationVariables,
  type RailwaySandboxCheckpointsQuery,
  type RailwaySandboxCheckpointsQueryVariables,
  type RailwaySandboxCreateMutation,
  type RailwaySandboxCreateMutationVariables,
  type RailwaySandboxDestroyMutation,
  type RailwaySandboxDestroyMutationVariables,
  type RailwaySandboxesQuery,
  type RailwaySandboxesQueryVariables,
  type RailwaySandboxQuery,
  type RailwaySandboxQueryVariables,
  type RailwaySandboxTemplateBuildMutation,
  type RailwaySandboxTemplateBuildMutationVariables,
  type RailwaySandboxTemplateBuildStatusQuery,
  type RailwaySandboxTemplateBuildStatusQueryVariables,
  type SandboxTemplateInput,
} from "../generated/graphql.js";
import {
  SandboxFailedError,
  SandboxNotFoundError,
  SandboxTemplateBuildError,
  SandboxTimeoutError,
} from "./errors.js";
import { startExec, type ExecContext, type ExecHandle } from "./exec.js";
import type {
  CompiledTemplate,
  CreateOptions,
  ExecOptions,
  ExecTarget,
  ForkOptions,
  ListOptions,
  SandboxCheckpointInfo,
  SandboxCreationOptions,
  SandboxInfo,
  SandboxTemplateBuildInfo,
  TemplateSource,
} from "./types.js";

const READINESS_TIMEOUT_MS = 5 * 60_000;
const POLL_INITIAL_DELAY_MS = 500;
const POLL_MAX_DELAY_MS = 5_000;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

interface SandboxEngineConfig extends NormalizedRailwayClientConfig {
  environmentId: string;
}

export interface SandboxOptions extends RailwayClientConfig {
  environmentId?: string;
}

/**
 * Binds resolved credentials and environment to sandbox GraphQL operations.
 */
export class SandboxEngine {
  readonly #config: SandboxEngineConfig;

  constructor(config: SandboxEngineConfig) {
    this.#config = config;
  }

  get environmentId(): string {
    return this.#config.environmentId;
  }

  async create(
    options: CreateOptions = {},
    template?: TemplateSource,
  ): Promise<SandboxInfo> {
    const input: RailwaySandboxCreateMutationVariables["input"] = {
      environmentId: this.#config.environmentId,
    };
    if (template !== undefined) {
      // For a compiled recipe, echo its build-time variables so the backend
      // hash matches the built snapshot and forks from it.
      input.template = toTemplateInput(template);
    }

    return this.#createAndWait(input, options);
  }

  async fork(
    sourceSandboxId: string,
    options: ForkOptions = {},
  ): Promise<SandboxInfo> {
    return this.#createAndWait(
      { environmentId: this.#config.environmentId, sourceSandboxId },
      options,
    );
  }

  /** Applies the shared creation knobs, runs the create mutation, and waits for RUNNING. */
  async #createAndWait(
    input: RailwaySandboxCreateMutationVariables["input"],
    options: SandboxCreationOptions,
  ): Promise<SandboxInfo> {
    if (options.idleTimeoutMinutes !== undefined) {
      input.idleTimeoutMinutes = options.idleTimeoutMinutes;
    }
    if (options.networkIsolation !== undefined) {
      input.networkIsolation = options.networkIsolation;
    }
    if (options.env !== undefined) {
      input.variables = options.env;
    }

    this.#config.log(creationLine(input));

    const data = await requestGraphQL<
      RailwaySandboxCreateMutation,
      RailwaySandboxCreateMutationVariables
    >(this.#config, RailwaySandboxCreateDocument, { input });

    this.#config.log(
      `created sandbox ${data.sandboxCreate.id} status=${data.sandboxCreate.status}`,
    );

    return this.#waitForRunning(data.sandboxCreate);
  }

  async buildTemplate(
    template: CompiledTemplate,
  ): Promise<SandboxTemplateBuildInfo> {
    const variables: RailwaySandboxTemplateBuildMutationVariables = {
      environmentId: this.#config.environmentId,
      input: toTemplateInput(template),
    };
    const data = await requestGraphQL<
      RailwaySandboxTemplateBuildMutation,
      RailwaySandboxTemplateBuildMutationVariables
    >(this.#config, RailwaySandboxTemplateBuildDocument, variables);

    return data.sandboxTemplateBuild;
  }

  async getTemplateBuild(id: string): Promise<SandboxTemplateBuildInfo> {
    const variables: RailwaySandboxTemplateBuildStatusQueryVariables = {
      id,
      environmentId: this.#config.environmentId,
    };
    const data = await requestGraphQL<
      RailwaySandboxTemplateBuildStatusQuery,
      RailwaySandboxTemplateBuildStatusQueryVariables
    >(this.#config, RailwaySandboxTemplateBuildStatusDocument, variables);

    return data.sandboxTemplateBuild;
  }

  async buildTemplateUntilReady(
    template: CompiledTemplate,
  ): Promise<SandboxTemplateBuildInfo> {
    const varCount = template.variables
      ? Object.keys(template.variables).length
      : 0;
    this.#config.log(
      `build template (${template.instructions.length} steps, vars=${varCount})`,
    );
    return this.#waitForBuildReady(await this.buildTemplate(template));
  }

  /**
   * Capture a running sandbox's disk into a named checkpoint. Synchronous on
   * the backend: the checkpoint is bootable when this resolves.
   */
  async checkpoint(
    sandboxId: string,
    name: string,
  ): Promise<SandboxCheckpointInfo> {
    this.#config.log(`checkpoint sandbox ${sandboxId} -> "${name}"`);
    const variables: RailwaySandboxCheckpointCreateMutationVariables = {
      environmentId: this.#config.environmentId,
      name,
      sandboxId,
    };
    const data = await requestGraphQL<
      RailwaySandboxCheckpointCreateMutation,
      RailwaySandboxCheckpointCreateMutationVariables
    >(this.#config, RailwaySandboxCheckpointCreateDocument, variables);

    this.#config.log(`checkpoint ${data.sandboxCheckpointCreate.id} ready`);
    return data.sandboxCheckpointCreate;
  }

  async listCheckpoints(): Promise<SandboxCheckpointInfo[]> {
    const data = await requestGraphQL<
      RailwaySandboxCheckpointsQuery,
      RailwaySandboxCheckpointsQueryVariables
    >(this.#config, RailwaySandboxCheckpointsDocument, {
      environmentId: this.#config.environmentId,
    });

    return data.sandboxCheckpoints;
  }

  async renameCheckpoint(
    id: string,
    name: string,
  ): Promise<SandboxCheckpointInfo> {
    this.#config.log(`rename checkpoint ${id} -> "${name}"`);
    const data = await requestGraphQL<
      RailwaySandboxCheckpointRenameMutation,
      RailwaySandboxCheckpointRenameMutationVariables
    >(this.#config, RailwaySandboxCheckpointRenameDocument, {
      environmentId: this.#config.environmentId,
      id,
      name,
    });

    return data.sandboxCheckpointRename;
  }

  async deleteCheckpoint(id: string): Promise<void> {
    this.#config.log(`delete checkpoint ${id}`);
    await requestGraphQL<
      RailwaySandboxCheckpointDeleteMutation,
      RailwaySandboxCheckpointDeleteMutationVariables
    >(this.#config, RailwaySandboxCheckpointDeleteDocument, {
      environmentId: this.#config.environmentId,
      id,
    });
  }

  /**
   * Resolves once the build is READY (its checkpoint exists). PENDING (no
   * workflow yet) and BUILDING keep polling; only FAILED is terminal.
   */
  async #waitForBuildReady(
    build: SandboxTemplateBuildInfo,
  ): Promise<SandboxTemplateBuildInfo> {
    if (build.status === "READY") {
      this.#config.log(`template build ${build.id} ready (cached)`);
      return build;
    }
    if (build.status === "FAILED") {
      throw new SandboxTemplateBuildError({
        templateId: build.id,
        environmentId: this.environmentId,
      });
    }

    return this.#pollUntilReady({
      poll: () => this.getTemplateBuild(build.id),
      isReady: build => build.status === "READY",
      isTerminal: build => build.status === "FAILED",
      describe: build => `template build ${build.id} status=${build.status}`,
      onTerminal: build => {
        throw new SandboxTemplateBuildError({
          templateId: build.id,
          environmentId: this.environmentId,
        });
      },
      onTimeout: build => {
        throw new SandboxTimeoutError({
          resource: "template",
          id: build.id,
          lastStatus: build.status,
          timeoutMs: READINESS_TIMEOUT_MS,
        });
      },
    });
  }

  async #waitForRunning(created: SandboxInfo): Promise<SandboxInfo> {
    if (created.status === "RUNNING") return created;
    if (isSandboxTerminal(created.status)) {
      throw new SandboxFailedError({ id: created.id, status: created.status });
    }

    return this.#pollUntilReady({
      poll: () => this.#getOrThrow(created.id),
      isReady: info => info.status === "RUNNING",
      isTerminal: info => isSandboxTerminal(info.status),
      describe: info => `sandbox ${info.id} status=${info.status}`,
      onTerminal: info => {
        throw new SandboxFailedError({ id: info.id, status: info.status });
      },
      onTimeout: info => {
        throw new SandboxTimeoutError({
          resource: "sandbox",
          id: info.id,
          lastStatus: info.status,
          timeoutMs: READINESS_TIMEOUT_MS,
        });
      },
    });
  }

  async #getOrThrow(id: string): Promise<SandboxInfo> {
    const info = await this.get(id);
    if (!info) {
      throw new SandboxNotFoundError({ id, environmentId: this.environmentId });
    }
    return info;
  }

  async #pollUntilReady<T>(args: {
    poll: () => Promise<T>;
    isReady: (value: T) => boolean;
    isTerminal: (value: T) => boolean;
    onTerminal: (value: T) => never;
    onTimeout: (value: T) => never;
    describe?: (value: T) => string;
  }): Promise<T> {
    const start = Date.now();
    const describe = args.describe;
    let delay = POLL_INITIAL_DELAY_MS;
    let last: T;
    do {
      await sleep(delay);
      last = await args.poll();
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      if (args.isReady(last)) {
        if (describe) this.#config.log(`${describe(last)} ready after ${elapsedSec}s`);
        return last;
      }
      if (args.isTerminal(last)) {
        if (describe) this.#config.log(`${describe(last)} hit terminal state`);
        return args.onTerminal(last);
      }
      delay = Math.min(delay * 2, POLL_MAX_DELAY_MS);
      if (describe) {
        this.#config.log(
          `waiting on ${describe(last)}, retry in ${delay}ms (elapsed ${elapsedSec}s)`,
        );
      }
    } while (Date.now() - start < READINESS_TIMEOUT_MS);
    if (describe) {
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      this.#config.log(`${describe(last)} timed out after ${elapsedSec}s`);
    }
    return args.onTimeout(last);
  }

  exec(id: string, target: ExecTarget, options: ExecOptions = {}): ExecHandle {
    const context: ExecContext = {
      config: this.#config,
      environmentId: this.#config.environmentId,
      sandboxId: id,
    };
    return startExec(context, target, options);
  }

  async destroy(id: string): Promise<void> {
    const variables: RailwaySandboxDestroyMutationVariables = {
      id,
      environmentId: this.#config.environmentId,
    };
    this.#config.log(`destroy sandbox ${id}`);
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

    const info = data.sandbox ?? null;
    if (!info) {
      this.#config.log(`sandbox ${id} not found (env=${this.environmentId})`);
    }
    return info;
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

function isSandboxTerminal(status: SandboxInfo["status"]): boolean {
  return status === "FAILED" || status === "DESTROYED" || status === "DESTROYING";
}

function toTemplateInput(template: TemplateSource): SandboxTemplateInput {
  if ("name" in template) {
    return { name: template.name };
  }
  return {
    instructions: [...template.instructions],
    ...(template.variables && { variables: template.variables }),
  };
}

function creationKind(
  input: RailwaySandboxCreateMutationVariables["input"],
): string {
  if (input.sourceSandboxId) return "fork";
  if (input.template?.name) return "create-from-checkpoint";
  if (input.template) return "create-from-template";
  return "create";
}

/** Verbose line for a create/fork/template create. Logs env key names, never values. */
function creationLine(
  input: RailwaySandboxCreateMutationVariables["input"],
): string {
  const kind = creationKind(input);
  const envKeys = input.variables ? Object.keys(input.variables) : [];
  const parts = [
    kind,
    `env=${input.environmentId}`,
    `idleTimeout=${input.idleTimeoutMinutes ?? "none"}`,
    `network=${input.networkIsolation ?? "default"}`,
    `envKeys=[${envKeys.join(",")}]`,
  ];
  if (input.sourceSandboxId) parts.push(`source=${input.sourceSandboxId}`);
  if (input.template?.name) parts.push(`checkpoint="${input.template.name}"`);
  return parts.join(" ");
}

export function engineFromOptions(options: SandboxOptions = {}): SandboxEngine {
  const base = normalizeRailwayClientConfig(options);
  const environmentId = resolveEnvironmentId(options.environmentId);
  return new SandboxEngine({ ...base, environmentId });
}
