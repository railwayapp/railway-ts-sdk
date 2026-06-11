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
import type { SandboxFiles } from "./files.js";
import type {
  CheckpointOptions,
  ConnectOptions,
  CreateOptions,
  ExecOptions,
  ExecReattachTarget,
  ExecTarget,
  ForkOptions,
  ListOptions,
  SandboxCheckpointInfo,
  SandboxInfo,
  SandboxNetworkIsolation,
  SandboxStatus,
} from "./types.js";

/**
 * A live Railway sandbox. There is no separate client: a sandbox always comes
 * from somewhere — nothing (`Sandbox.create`), an id (`Sandbox.connect`), a
 * reusable base (`Sandbox.template()`), or a saved checkpoint
 * (`Sandbox.create(name)`). The constructor is private; use the
 * static factories.
 */
export class Sandbox implements AsyncDisposable {
  readonly #engine: SandboxEngine;
  #info: SandboxInfo;
  #files: SandboxFiles | undefined;

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

  /** Network access mode: `ISOLATED` (NAT egress only) or `PRIVATE` (joins the environment private network). */
  get networkIsolation(): SandboxNetworkIsolation {
    return this.#info.networkIsolation;
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

  /** Boot from a saved checkpoint (one captured with `checkpoint`). */
  static create(checkpointName: string, options?: CreateOptions): Promise<Sandbox>;
  static create(
    template: SandboxTemplate,
    options?: CreateOptions,
  ): Promise<Sandbox>;
  static create(source: Sandbox, options?: ForkOptions): Promise<Sandbox>;
  static create(options?: CreateOptions): Promise<Sandbox>;
  static async create(
    sourceOrOptions: string | SandboxTemplate | Sandbox | CreateOptions = {},
    maybeOptions: CreateOptions = {},
  ): Promise<Sandbox> {
    if (typeof sourceOrOptions === "string") {
      const name = sourceOrOptions.trim();
      if (name === "") {
        throw new TypeError("Checkpoint name must be a non-empty string.");
      }
      const engine = engineFromOptions(maybeOptions);
      const info = await engine.create(maybeOptions, { name });
      return new Sandbox(engine, info);
    }

    if (sourceOrOptions instanceof Sandbox) {
      return sourceOrOptions.fork(maybeOptions);
    }

    if (isSandboxTemplate(sourceOrOptions)) {
      const engine = engineFromOptions(maybeOptions);
      const compiled = compileSandboxTemplate(sourceOrOptions);
      if (compiled.instructions.length === 0) {
        // No build steps → nothing to build. Build-time variables have no
        // effect; runtime env still comes from `create({ env })`.
        return new Sandbox(engine, await engine.create(maybeOptions));
      }
      await engine.buildTemplateUntilReady(compiled);
      const info = await engine.create(maybeOptions, compiled);
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

  /** List the environment's named checkpoints (newest first). */
  static async checkpoints(
    options: CheckpointOptions = {},
  ): Promise<SandboxCheckpointInfo[]> {
    return engineFromOptions(options).listCheckpoints();
  }

  /** Rename a checkpoint by id; new sandboxes boot from it via the new name. */
  static async renameCheckpoint(
    id: string,
    name: string,
    options: CheckpointOptions = {},
  ): Promise<SandboxCheckpointInfo> {
    const trimmed = name.trim();
    if (trimmed === "") {
      throw new TypeError("Checkpoint name must be a non-empty string.");
    }
    return engineFromOptions(options).renameCheckpoint(id, trimmed);
  }

  /** Delete a checkpoint by id (find it by `key` via `Sandbox.checkpoints`). */
  static async deleteCheckpoint(
    id: string,
    options: CheckpointOptions = {},
  ): Promise<void> {
    await engineFromOptions(options).deleteCheckpoint(id);
  }

  /**
   * Run a command. Awaiting the handle resolves the final `ExecResult` —
   * short commands return directly, long-running ones transparently stream
   * output (see `ExecOptions.onStdout`/`onStderr`) until the command exits.
   * The handle also exposes `sessionName` and `kill()`. A `timeoutSec` deadline
   * kills the command and resolves with `timedOut: true` rather than
   * rejecting.
   */
  exec(command: string, options?: ExecOptions): ExecHandle;
  /** Reattach to a running exec by session name; resumes the retained output. */
  exec(target: ExecReattachTarget, options?: ExecOptions): ExecHandle;
  exec(target: ExecTarget, options: ExecOptions = {}): ExecHandle {
    return this.#engine.exec(this.id, target, options);
  }

  /**
   * File operations on this sandbox's filesystem: `read`, `write`, `list`,
   * `stat`, `exists`, `mkdir`, `remove`, `rename`. Reads and writes stream,
   * so arbitrarily large files transfer with bounded memory.
   */
  get files(): SandboxFiles {
    this.#files ??= this.#engine.files(this.id);
    return this.#files;
  }

  /**
   * Fork this running sandbox into a new, independent one. Clones the
   * filesystem (a fresh boot, not live processes) into the same environment.
   */
  async fork(options?: ForkOptions): Promise<Sandbox> {
    const info = await this.#engine.fork(this.id, options);
    return new Sandbox(this.#engine, info);
  }

  /**
   * Capture this sandbox's current disk into a reusable named checkpoint,
   * bootable as soon as this resolves. The sandbox must be running and the
   * name unused. Boot new sandboxes from it with `Sandbox.create(name)`.
   */
  async checkpoint(name: string): Promise<SandboxCheckpointInfo> {
    const trimmed = name.trim();
    if (trimmed === "") {
      throw new TypeError("Checkpoint name must be a non-empty string.");
    }
    return this.#engine.checkpoint(this.id, trimmed);
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
