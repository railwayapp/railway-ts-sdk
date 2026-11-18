import {
  normalizeRailwayClientConfig,
  resolveEnvironmentId,
  resolvePrewarm,
  type NormalizedRailwayClientConfig,
  type RailwayClientConfig,
} from "../core/config.js";
import { RailwayConnectionError, RailwayGraphQLError, RailwayRateLimitError } from "../core/errors.js";
import { openExecWs } from "../core/exec-ws-client.js";
import { requestGraphQL } from "../core/graphql-client.js";
import {
  RailwaySandboxCreateDocument,
  RailwaySandboxExecDocument,
  RailwaySandboxSessionsDocument,
  RailwaySandboxDestroyDocument,
  RailwaySandboxHeartbeatDocument,
  RailwaySandboxDocument,
  RailwaySandboxesDocument,
  RailwaySandboxCheckpointCreateDocument,
  RailwaySandboxCheckpointDeleteDocument,
  RailwaySandboxCheckpointRenameDocument,
  RailwaySandboxCheckpointsDocument,
  RailwaySandboxTemplateBuildDocument,
  RailwaySandboxTemplateBuildStatusDocument,
  RailwayGenerateShellTokenDocument,
  type RailwayGenerateShellTokenMutation,
  type RailwayGenerateShellTokenMutationVariables,
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
  type RailwaySandboxHeartbeatMutation,
  type RailwaySandboxHeartbeatMutationVariables,
  type RailwaySandboxSessionFieldsFragment,
  type RailwaySandboxExecMutation,
  type RailwaySandboxExecMutationVariables,
  type RailwaySandboxSessionsQuery,
  type RailwaySandboxSessionsQueryVariables,
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
import { Prewarm } from "./prewarm.js";
import { ShellTokenCache } from "./shell-token.js";
import { createSandboxFiles, type SandboxFiles } from "./files.js";
import type {
  CompiledTemplate,
  CreateOptions,
  ExecOptions,
  ExecTarget,
  ForkOptions,
  ListOptions,
  ExecHttpOptions,
  ExecHttpResult,
  SandboxCheckpointInfo,
  SandboxCreationOptions,
  SandboxInfo,
  SandboxResources,
  SandboxSessionInfo,
  SandboxTemplateBuildInfo,
  TemplateSource,
} from "./types.js";

const READINESS_TIMEOUT_MS = 5 * 60_000;
/** Upper bound on `sessions()` paging; a sandbox holds far fewer sessions. */
const MAX_SESSION_PAGES = 20;
const POLL_INITIAL_DELAY_MS = 500;
const POLL_MAX_DELAY_MS = 5_000;
/**
 * A sandbox normally reaches RUNNING about two seconds after the create
 * mutation. Backing off from the first poll put the checks at ~0.5s, ~1.5s,
 * ~3.5s and ~7.5s, so a boot that missed one check by a few milliseconds was
 * reported seconds late. Poll at a fixed interval while a normal boot is still
 * plausible and back off only after that. Every poll counts against the
 * token's hourly API limit (as low as 100/hour), so the interval stays coarse.
 */
const SANDBOX_POLL_FAST_DELAY_MS = 500;
const SANDBOX_POLL_FAST_WINDOW_MS = 6_000;
/** First backed-off delay after the fixed-interval window. */
const SANDBOX_POLL_BACKOFF_START_MS = 1_000;
/**
 * Longest `Retry-After` a readiness poll waits out. A token past its hourly
 * budget is told to wait many minutes; polling blindly through that only ends
 * in a timeout that misreports the state, so a longer wait fails at once.
 */
const POLL_MAX_RETRY_AFTER_MS = 60_000;
/** The exec bridge's token scope. */
const SHELL_SCOPE = "shell";

/** A poll failure worth polling through: rate limited, a server error, or the network. */
function isTransientPollError(error: unknown): boolean {
  if (error instanceof RailwayGraphQLError) {
    return error.status === 429 || error.status >= 500;
  }
  // fetch rejects a network failure with a TypeError; aborts are DOMExceptions.
  return error instanceof TypeError;
}

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
  readonly #tokens = new Map<string, ShellTokenCache>();
  readonly #prewarms = new Map<string, Prewarm>();

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
    if (options.resources !== undefined) {
      input.resources = validResources(options.resources);
    }
    if (options.domains !== undefined) {
      input.publicDomains = options.domains;
    }
    if (options.region !== undefined) {
      input.region = options.region;
    }
    if (options.env !== undefined) {
      input.variables = options.env;
    }

    this.#config.log(creationLine(input));

    const data = await requestGraphQL<
      RailwaySandboxCreateMutation,
      RailwaySandboxCreateMutationVariables
    >(this.#config, RailwaySandboxCreateDocument, { input });

    const created = data.sandboxCreate;
    this.#config.log(`created sandbox ${created.id} status=${created.status}`);

    const prewarm = resolvePrewarm(options.prewarm);
    if (prewarm === "off" || isSandboxTerminal(created.status)) {
      return this.#waitForRunning(created);
    }

    // Mint the first exec's shell token while the sandbox boots, so that exec
    // skips the round trip. Minting is not an access and leaves no audit trace.
    const id = created.id;
    void this.#shellTokens(id).get(SHELL_SCOPE).catch(() => {});
    try {
      const info = await this.#waitForRunning(created);
      // Opt-in: open the first exec's socket now that the sandbox routes.
      // Its session is authorized (and audited as an exec) when it opens.
      if (prewarm === "socket") this.#prewarm(id);
      return info;
    } catch (error) {
      this.#tokens.delete(id);
      throw error;
    }
  }

  #shellTokens(sandboxId: string): ShellTokenCache {
    let cache = this.#tokens.get(sandboxId);
    if (!cache) {
      cache = new ShellTokenCache(async (scope, signal) => {
        const input: RailwayGenerateShellTokenMutationVariables["input"] = {
          environmentId: this.#config.environmentId,
          instanceId: sandboxId,
          kind: "sandbox",
          scope,
        };
        const data = await requestGraphQL<
          RailwayGenerateShellTokenMutation,
          RailwayGenerateShellTokenMutationVariables
        >(this.#config, RailwayGenerateShellTokenDocument, { input }, signal);
        return data.generateShellToken;
      });
      this.#tokens.set(sandboxId, cache);
    }
    return cache;
  }

  /** Opens the sandbox's single-use exec socket ahead of its first exec. */
  #prewarm(sandboxId: string): Prewarm {
    this.#discardPrewarm(sandboxId);
    const prewarm: Prewarm = new Prewarm({
      jwt: this.#shellTokens(sandboxId).get(SHELL_SCOPE),
      open: jwt => openExecWs({ config: this.#config, jwt }),
      onIdleClose: () => {
        if (this.#prewarms.get(sandboxId) === prewarm) this.#prewarms.delete(sandboxId);
        this.#config.log(`exec prewarm for sandbox ${sandboxId} closed unused`);
      },
    });
    this.#prewarms.set(sandboxId, prewarm);
    prewarm.ready.catch(error => {
      if (this.#prewarms.get(sandboxId) === prewarm) this.#prewarms.delete(sandboxId);
      this.#config.log(`exec prewarm for sandbox ${sandboxId} unavailable: ${(error as Error).message}`);
    });
    return prewarm;
  }

  #discardPrewarm(sandboxId: string): void {
    this.#prewarms.get(sandboxId)?.close();
    this.#prewarms.delete(sandboxId);
  }

  /** The prewarmed socket for one exec to adopt, if one is open or opening. */
  #takePrewarm(sandboxId: string): Prewarm | undefined {
    const prewarm = this.#prewarms.get(sandboxId);
    this.#prewarms.delete(sandboxId);
    return prewarm?.live ? prewarm : undefined;
  }

  async buildTemplate(
    template: CompiledTemplate,
    region?: string,
  ): Promise<SandboxTemplateBuildInfo> {
    const variables: RailwaySandboxTemplateBuildMutationVariables = {
      environmentId: this.#config.environmentId,
      input: { ...toTemplateInput(template), ...(region && { region }) },
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
    region?: string,
  ): Promise<SandboxTemplateBuildInfo> {
    const varCount = template.variables
      ? Object.keys(template.variables).length
      : 0;
    this.#config.log(
      `build template (${template.instructions.length} steps, vars=${varCount})`,
    );
    return this.#waitForBuildReady(await this.buildTemplate(template, region));
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

  /**
   * Every session in the sandbox (all pages), or null when its runtime cannot
   * list them. A sandbox holds few sessions, so callers get the whole set.
   */
  async sessions(sandboxId: string): Promise<SandboxSessionInfo[] | null> {
    const sessions: SandboxSessionInfo[] = [];
    let after: string | undefined;
    for (let page = 0; page < MAX_SESSION_PAGES; page++) {
      const variables: RailwaySandboxSessionsQueryVariables = {
        environmentId: this.#config.environmentId,
        id: sandboxId,
        ...(after !== undefined ? { after } : {}),
      };
      const data = await requestGraphQL<
        RailwaySandboxSessionsQuery,
        RailwaySandboxSessionsQueryVariables
      >(this.#config, RailwaySandboxSessionsDocument, variables);
      if (data.sandboxSessions == null) return null;
      for (const { node } of data.sandboxSessions.edges) sessions.push(toSessionInfo(node));
      const { hasNextPage, endCursor } = data.sandboxSessions.pageInfo;
      if (!hasNextPage || !endCursor) return sessions;
      after = endCursor;
    }
    this.#config.log(`sessions: stopped after ${MAX_SESSION_PAGES} pages in sandbox ${sandboxId}`);
    return sessions;
  }

  /** One-request exec over HTTPS: no streaming, stdin, or cancellation. */
  async execHttp(
    sandboxId: string,
    command: string,
    options: ExecHttpOptions = {},
  ): Promise<ExecHttpResult> {
    if (
      options.timeoutSec !== undefined &&
      !(Number.isInteger(options.timeoutSec) && options.timeoutSec > 0)
    ) {
      // The HTTPS exec takes whole seconds, unlike the streaming exec's timer.
      throw new TypeError("`timeoutSec` must be a positive whole number of seconds.");
    }
    this.#config.log(`execHttp in sandbox ${sandboxId}`);
    const data = await requestGraphQL<
      RailwaySandboxExecMutation,
      RailwaySandboxExecMutationVariables
    >(this.#config, RailwaySandboxExecDocument, {
      environmentId: this.#config.environmentId,
      id: sandboxId,
      command,
      ...(options.timeoutSec !== undefined ? { timeoutSec: options.timeoutSec } : {}),
    });
    return { ...data.sandboxExec };
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
      label: `template build ${build.id}`,
      resourceId: build.id,
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
      label: `sandbox ${created.id}`,
      resourceId: created.id,
      fast: {
        delayMs: SANDBOX_POLL_FAST_DELAY_MS,
        windowMs: SANDBOX_POLL_FAST_WINDOW_MS,
        backoffStartMs: SANDBOX_POLL_BACKOFF_START_MS,
      },
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
    /** Poll every `delayMs` for the first `windowMs`, then back off from `backoffStartMs`. */
    fast?: { delayMs: number; windowMs: number; backoffStartMs: number };
    /** What is being waited on, for errors ("sandbox <id>"). */
    label: string;
    resourceId: string;
  }): Promise<T> {
    const start = Date.now();
    const describe = args.describe;
    const fast = args.fast;
    let delay = fast ? fast.delayMs : POLL_INITIAL_DELAY_MS;
    // The delay the next backed-off poll waits.
    let backoff = fast
      ? fast.backoffStartMs
      : Math.min(POLL_INITIAL_DELAY_MS * 2, POLL_MAX_DELAY_MS);
    let last: T | undefined;
    do {
      await sleep(delay);
      try {
        last = await args.poll();
      } catch (error) {
        // A sandbox already exists here; a rate limit or blip must not lose it.
        if (!isTransientPollError(error)) throw error;
        const retryAfterMs = error instanceof RailwayGraphQLError ? error.retryAfterMs : undefined;
        if (retryAfterMs !== undefined) {
          const remaining = READINESS_TIMEOUT_MS - (Date.now() - start);
          if (retryAfterMs > POLL_MAX_RETRY_AFTER_MS || retryAfterMs > remaining) {
            throw new RailwayRateLimitError({
              message:
                `Rate limited while waiting for ${args.label} to become ready: Railway asks to retry ` +
                `in ${Math.ceil(retryAfterMs / 1000)}s. It was created and keeps starting; reach it with ` +
                `its id once the limit resets.`,
              retryAfterMs,
              resourceId: args.resourceId,
              cause: error as RailwayGraphQLError,
            });
          }
          this.#config.log(`readiness poll rate limited; retrying in ${Math.ceil(retryAfterMs / 1000)}s`);
          delay = retryAfterMs;
          continue;
        }
        this.#config.log(`readiness poll failed (${(error as Error).message}); polling on`);
        delay = Math.min(Math.max(delay, backoff), POLL_MAX_DELAY_MS);
        continue;
      }
      const elapsedSec = ((Date.now() - start) / 1000).toFixed(1);
      if (args.isReady(last)) {
        if (describe) this.#config.log(`${describe(last)} ready after ${elapsedSec}s`);
        return last;
      }
      if (args.isTerminal(last)) {
        if (describe) this.#config.log(`${describe(last)} hit terminal state`);
        return args.onTerminal(last);
      }
      if (fast && Date.now() - start < fast.windowMs) {
        delay = fast.delayMs;
      } else {
        delay = backoff;
        backoff = Math.min(backoff * 2, POLL_MAX_DELAY_MS);
      }
      if (describe) {
        this.#config.log(
          `waiting on ${describe(last)}, retry in ${delay}ms (elapsed ${elapsedSec}s)`,
        );
      }
    } while (Date.now() - start < READINESS_TIMEOUT_MS);
    if (last === undefined) {
      throw new RailwayConnectionError({
        message: `Readiness polling failed for ${READINESS_TIMEOUT_MS / 1000}s; the resource's state is unknown.`,
      });
    }
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
      shellToken: (fresh, signal) =>
        this.#shellTokens(id).get(SHELL_SCOPE, { fresh, signal }),
      takePrewarm: () => this.#takePrewarm(id),
    };
    return startExec(context, target, options);
  }

  files(id: string): SandboxFiles {
    return createSandboxFiles({
      config: this.#config,
      environmentId: this.#config.environmentId,
      sandboxId: id,
      exec: (command, options) => this.exec(id, command, options),
    });
  }

  async destroy(id: string): Promise<void> {
    const variables: RailwaySandboxDestroyMutationVariables = {
      id,
      environmentId: this.#config.environmentId,
    };
    this.#config.log(`destroy sandbox ${id}`);
    this.#discardPrewarm(id);
    this.#tokens.delete(id);
    await requestGraphQL<
      RailwaySandboxDestroyMutation,
      RailwaySandboxDestroyMutationVariables
    >(this.#config, RailwaySandboxDestroyDocument, variables);
  }

  async heartbeat(id: string): Promise<SandboxInfo> {
    const variables: RailwaySandboxHeartbeatMutationVariables = {
      id,
      environmentId: this.#config.environmentId,
    };
    this.#config.log(`heartbeat sandbox ${id}`);
    const data = await requestGraphQL<
      RailwaySandboxHeartbeatMutation,
      RailwaySandboxHeartbeatMutationVariables
    >(this.#config, RailwaySandboxHeartbeatDocument, variables);
    if (!data.sandboxHeartbeat) {
      throw new SandboxNotFoundError({ id, environmentId: this.environmentId });
    }
    return data.sandboxHeartbeat;
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
  const domains = (input.publicDomains ?? []).map(domain =>
    domain.prefix ? `${domain.prefix}:${domain.port}` : String(domain.port),
  );
  const parts = [
    kind,
    `env=${input.environmentId}`,
    `idleTimeout=${input.idleTimeoutMinutes ?? "none"}`,
    `network=${input.networkIsolation ?? "default"}`,
    `region=${input.region ?? "default"}`,
    `envKeys=[${envKeys.join(",")}]`,
    `domains=[${domains.join(",")}]`,
  ];
  if (input.resources) {
    parts.push(`resources=cpu:${input.resources.cpu ?? "default"},memGB:${input.resources.memoryGB ?? "default"}`);
  }
  if (input.sourceSandboxId) parts.push(`source=${input.sourceSandboxId}`);
  if (input.template?.name) parts.push(`checkpoint="${input.template.name}"`);
  return parts.join(" ");
}

export async function engineFromOptions(
  options: SandboxOptions = {},
): Promise<SandboxEngine> {
  const base = normalizeRailwayClientConfig(options);
  const environmentId = await resolveEnvironmentId(base, options.environmentId);
  return new SandboxEngine({ ...base, environmentId });
}

/**
 * The platform validates sizes, but NaN and Infinity serialize to JSON `null`,
 * which it would silently read as "use the default". Reject them here.
 */
function validResources(resources: SandboxResources): SandboxResources {
  for (const key of ["cpu", "memoryGB"] as const) {
    const value = resources[key];
    if (value !== undefined && !(Number.isFinite(value) && value > 0)) {
      throw new TypeError(`\`resources.${key}\` must be a positive finite number.`);
    }
  }
  return {
    ...(resources.cpu !== undefined ? { cpu: resources.cpu } : {}),
    ...(resources.memoryGB !== undefined ? { memoryGB: resources.memoryGB } : {}),
  };
}

/**
 * Flattens the run state. The schema reports `exitCode: 0` while a session is
 * still running, so a running session reports `null` instead.
 */
function toSessionInfo(node: RailwaySandboxSessionFieldsFragment): SandboxSessionInfo {
  return {
    name: node.name,
    kind: node.kind,
    running: node.runState.running,
    exitCode: node.runState.running ? null : node.runState.exitCode,
    exitedAt: node.runState.exitedAt ?? null,
    attached: node.attached,
    command: node.command,
    foregroundActive: node.foregroundActive ?? null,
    createdAt: node.createdAt ?? null,
  };
}
