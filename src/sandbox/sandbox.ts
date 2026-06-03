import {
  engineFromOptions,
  type SandboxEngine,
} from "./engine.js";
import { SandboxNotFoundError } from "./errors.js";
import {
  compileSandboxTemplate,
  createSandboxTemplate,
  isSandboxTemplate,
  type SandboxTemplate,
} from "./template.js";
import type { ExecHandle } from "./exec.js";
import type {
  ConnectOptions,
  CreateOptions,
  ExecOptions,
  ExecReattachTarget,
  ExecTarget,
  ListOptions,
  SandboxInfo,
  SandboxStatus,
} from "./types.js";

/**
 * A live Railway sandbox. There is no separate client: a sandbox always comes
 * from somewhere — nothing (`Sandbox.create`), an id (`Sandbox.connect`), or a
 * reusable base (`Sandbox.template()`). The constructor is private; use the
 * static factories.
 */
export class Sandbox implements AsyncDisposable {
  readonly #engine: SandboxEngine;
  #info: SandboxInfo;

  private constructor(engine: SandboxEngine, info: SandboxInfo) {
    this.#engine = engine;
    this.#info = info;
  }

  get id(): string {
    return this.#info.id;
  }

  get status(): SandboxStatus {
    return this.#info.status;
  }

  get environmentId(): string {
    return this.#info.environmentId;
  }

  get region(): string {
    return this.#info.region;
  }

  get idleTimeoutMinutes(): number | null {
    return this.#info.idleTimeoutMinutes ?? null;
  }

  get createdAt(): string {
    return this.#info.createdAt;
  }

  /** Return a new immutable sandbox template. */
  static template(): SandboxTemplate {
    return createSandboxTemplate();
  }

  static create(
    template: SandboxTemplate,
    options?: CreateOptions,
  ): Promise<Sandbox>;
  static create(options?: CreateOptions): Promise<Sandbox>;
  static async create(
    sourceOrOptions: SandboxTemplate | CreateOptions = {},
    maybeOptions: CreateOptions = {},
  ): Promise<Sandbox> {
    if (isSandboxTemplate(sourceOrOptions)) {
      const engine = engineFromOptions(maybeOptions);
      const instructions = compileSandboxTemplate(sourceOrOptions);
      await engine.buildTemplateUntilReady(instructions);
      const info = await engine.create(maybeOptions, instructions);
      return new Sandbox(engine, info);
    }

    const engine = engineFromOptions(sourceOrOptions);
    const info = await engine.create(sourceOrOptions);
    return new Sandbox(engine, info);
  }

  static async connect(
    id: string,
    options: ConnectOptions = {},
  ): Promise<Sandbox> {
    const engine = engineFromOptions(options);
    const info = await engine.get(id);
    if (!info) {
      throw new SandboxNotFoundError({ id, environmentId: engine.environmentId });
    }
    return new Sandbox(engine, info);
  }

  static async list(options: ListOptions = {}): Promise<SandboxInfo[]> {
    const engine = engineFromOptions(options);
    return engine.list(options);
  }

  /**
   * Run a command. Awaiting the handle resolves the final `ExecResult` —
   * short commands return directly, long-running ones transparently stream
   * output (see `ExecOptions.onStdout`/`onStderr`) until the command exits.
   * The handle also exposes `execId` and `kill()`. A `timeoutSec` deadline
   * kills the command and resolves with `timedOut: true` rather than
   * rejecting.
   */
  exec(command: string, options?: ExecOptions): ExecHandle;
  /** Reattach to a running exec by id; replays all retained output. */
  exec(target: ExecReattachTarget, options?: ExecOptions): ExecHandle;
  exec(target: ExecTarget, options: ExecOptions = {}): ExecHandle {
    return this.#engine.exec(this.id, target, options);
  }

  async destroy(): Promise<void> {
    await this.#engine.destroy(this.id);
  }

  /** Re-reads the sandbox to refresh `status` and other fields in place. */
  async refresh(): Promise<this> {
    const info = await this.#engine.get(this.id);
    if (!info) {
      throw new SandboxNotFoundError({
        id: this.id,
        environmentId: this.environmentId,
      });
    }
    this.#info = info;
    return this;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    await this.destroy();
  }

  toJSON(): SandboxInfo {
    return { ...this.#info };
  }
}
