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
} from "../generated/graphql.js";
import {
  SandboxFailedError,
  SandboxNotFoundError,
  SandboxTemplateBuildError,
  SandboxTimeoutError,
} from "./errors.js";
import type {
  CreateOptions,
  ExecOptions,
  ExecResult,
  ListOptions,
  SandboxInfo,
  SandboxTemplateInfo,
} from "./types.js";

/** Readiness wait ceiling — mirrors the server exec timeout cap. Not a public option. */
const READY_TIMEOUT_MS = 5 * 60_000;
const POLL_INITIAL_DELAY_MS = 500;
const POLL_MAX_DELAY_MS = 5_000;
const POLL_BACKOFF_FACTOR = 2;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

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

  async create(
    options: CreateOptions = {},
    templateInstructions?: readonly string[],
  ): Promise<SandboxInfo> {
    const input: RailwaySandboxCreateMutationVariables["input"] = {
      environmentId: this.#config.environmentId,
    };
    if (options.idleTimeoutMinutes !== undefined) {
      input.idleTimeoutMinutes = options.idleTimeoutMinutes;
    }
    if (templateInstructions !== undefined) {
      input.template = { instructions: [...templateInstructions] };
    }

    const data = await requestGraphQL<
      RailwaySandboxCreateMutation,
      RailwaySandboxCreateMutationVariables
    >(this.#config, RailwaySandboxCreateDocument, { input });

    return this.#waitForRunning(data.sandboxCreate);
  }

  async buildTemplate(input: {
    instructions: readonly string[];
  }): Promise<SandboxTemplateInfo> {
    const variables: RailwaySandboxTemplateBuildMutationVariables = {
      environmentId: this.#config.environmentId,
      input: { instructions: [...input.instructions] },
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

  /** Builds the template if needed and resolves only once it is READY. Idempotent. */
  async buildTemplateUntilReady(
    instructions: readonly string[],
  ): Promise<SandboxTemplateInfo> {
    const built = await this.buildTemplate({ instructions });
    if (built.status === "READY") return built;
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
          timeoutMs: READY_TIMEOUT_MS,
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
      onTerminal: info => {
        throw new SandboxFailedError({ id: info.id, status: info.status });
      },
      onTimeout: info => {
        throw new SandboxTimeoutError({
          resource: "sandbox",
          id: info.id,
          lastStatus: info.status,
          timeoutMs: READY_TIMEOUT_MS,
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

  /**
   * Polls `args.poll` with exponential backoff until ready, throwing on a
   * terminal state or once the readiness ceiling is hit. Shared by both the
   * template → READY and sandbox → RUNNING waits.
   */
  async #pollUntilReady<T>(args: {
    poll: () => Promise<T>;
    isReady: (value: T) => boolean;
    isTerminal: (value: T) => boolean;
    onTerminal: (value: T) => never;
    onTimeout: (value: T) => never;
  }): Promise<T> {
    const start = Date.now();
    let delay = POLL_INITIAL_DELAY_MS;
    let last: T;
    do {
      await sleep(delay);
      last = await args.poll();
      if (args.isReady(last)) return last;
      if (args.isTerminal(last)) return args.onTerminal(last);
      delay = Math.min(delay * POLL_BACKOFF_FACTOR, POLL_MAX_DELAY_MS);
    } while (Date.now() - start < READY_TIMEOUT_MS);
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

function isSandboxTerminal(status: SandboxInfo["status"]): boolean {
  return status === "FAILED" || status === "DESTROYED" || status === "DESTROYING";
}

export function engineFromOptions(options: SandboxOptions = {}): SandboxEngine {
  const base = normalizeRailwayClientConfig(options);
  const environmentId = resolveEnvironmentId(options.environmentId);
  return new SandboxEngine({ ...base, environmentId });
}
