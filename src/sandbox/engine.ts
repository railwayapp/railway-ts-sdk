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
  RailwaySandboxTemplateBuildDocument,
  RailwaySandboxTemplateDocument,
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
  type RailwaySandboxTemplateBuildMutation,
  type RailwaySandboxTemplateBuildMutationVariables,
  type RailwaySandboxTemplateQuery,
  type RailwaySandboxTemplateQueryVariables,
  type SandboxTemplateInput,
} from "../generated/graphql.js";
import {
  SandboxFailedError,
  SandboxNotFoundError,
  SandboxTemplateBuildError,
  SandboxTimeoutError,
} from "./errors.js";
import type {
  CompiledTemplate,
  CreateOptions,
  ExecOptions,
  ExecResult,
  ForkOptions,
  ListOptions,
  SandboxCreationOptions,
  SandboxInfo,
  SandboxTemplateInfo,
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
    template?: CompiledTemplate,
  ): Promise<SandboxInfo> {
    const input: RailwaySandboxCreateMutationVariables["input"] = {
      environmentId: this.#config.environmentId,
    };
    if (template !== undefined) {
      // Echo the template's build-time variables so the backend hash matches
      // the built snapshot and forks from it.
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

  async buildTemplate(template: CompiledTemplate): Promise<SandboxTemplateInfo> {
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

  async getTemplate(id: string): Promise<SandboxTemplateInfo> {
    const variables: RailwaySandboxTemplateQueryVariables = {
      id,
      environmentId: this.#config.environmentId,
    };
    const data = await requestGraphQL<
      RailwaySandboxTemplateQuery,
      RailwaySandboxTemplateQueryVariables
    >(this.#config, RailwaySandboxTemplateDocument, variables);

    return data.sandboxTemplate;
  }

  async buildTemplateUntilReady(
    template: CompiledTemplate,
  ): Promise<SandboxTemplateInfo> {
    const varCount = template.variables
      ? Object.keys(template.variables).length
      : 0;
    this.#config.log(
      `build template (${template.instructions.length} steps, vars=${varCount})`,
    );
    const built = await this.buildTemplate(template);
    if (built.status === "READY") {
      this.#config.log(`template ${built.id} ready (cached)`);
      return built;
    }
    if (built.status === "FAILED") {
      throw new SandboxTemplateBuildError({
        templateId: built.id,
        environmentId: this.environmentId,
      });
    }

    return this.#pollUntilReady({
      poll: () => this.getTemplate(built.id),
      isReady: template => template.status === "READY",
      isTerminal: template => template.status === "FAILED",
      describe: template => `template ${template.id} status=${template.status}`,
      onTerminal: template => {
        throw new SandboxTemplateBuildError({
          templateId: template.id,
          environmentId: this.environmentId,
        });
      },
      onTimeout: template => {
        throw new SandboxTimeoutError({
          resource: "template",
          id: template.id,
          lastStatus: template.status,
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
    let delay = POLL_INITIAL_DELAY_MS;
    let last: T;
    do {
      await sleep(delay);
      last = await args.poll();
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      const describe = args.describe;
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
    if (args.describe) {
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      this.#config.log(`${args.describe(last)} timed out after ${elapsedSec}s`);
    }
    return args.onTimeout(last);
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

    this.#config.log(
      `exec ${id}: ${truncate(command, 80)} timeout=${options.timeoutSec ?? "none"}`,
    );

    const data = await requestGraphQL<
      RailwaySandboxExecMutation,
      RailwaySandboxExecMutationVariables
    >(this.#config, RailwaySandboxExecDocument, variables);

    const result = data.sandboxExec;
    this.#config.log(
      `exec ${id} done exit=${result.exitCode} timedOut=${result.timedOut} (stdout ${result.stdout.length}b / stderr ${result.stderr.length}b)`,
    );

    return result;
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

function toTemplateInput(template: CompiledTemplate): SandboxTemplateInput {
  return {
    instructions: [...template.instructions],
    ...(template.variables && { variables: template.variables }),
  };
}

/** Verbose line for a create/fork/template create. Logs env key names, never values. */
function creationLine(
  input: RailwaySandboxCreateMutationVariables["input"],
): string {
  const kind = input.sourceSandboxId
    ? "fork"
    : input.template
      ? "create-from-template"
      : "create";
  const envKeys = input.variables ? Object.keys(input.variables) : [];
  const parts = [
    kind,
    `env=${input.environmentId}`,
    `idleTimeout=${input.idleTimeoutMinutes ?? "none"}`,
    `network=${input.networkIsolation ?? "default"}`,
    `envKeys=[${envKeys.join(",")}]`,
  ];
  if (input.sourceSandboxId) parts.push(`source=${input.sourceSandboxId}`);
  return parts.join(" ");
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max)}…`;
}

export function engineFromOptions(options: SandboxOptions = {}): SandboxEngine {
  const base = normalizeRailwayClientConfig(options);
  const environmentId = resolveEnvironmentId(options.environmentId);
  return new SandboxEngine({ ...base, environmentId });
}
