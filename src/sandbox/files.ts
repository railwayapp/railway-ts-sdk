import {
  deriveFilesWsEndpoint,
  type NormalizedRailwayClientConfig,
} from "../core/config.js";
import {
  connectFilesWs,
  FilesRemoteError,
  type FilesWsConnection,
} from "../core/files-ws-client.js";
import { requestGraphQL } from "../core/graphql-client.js";
import {
  RailwayGenerateShellTokenDocument,
  type RailwayGenerateShellTokenMutation,
  type RailwayGenerateShellTokenMutationVariables,
} from "../generated/graphql.js";
import { SandboxFileNotFoundError, SandboxFilesError } from "./errors.js";
import { startExec } from "./exec.js";
import {
  canRetryWrite,
  isNotFound,
  retryDelay,
  startPull,
  uploadSource,
  type PullHandle,
  type UploadSource,
} from "./files-transfer.js";
import type {
  FileReadFormat,
  FileReadOptions,
  FileWriteData,
  FileWriteOptions,
  SandboxFileEntry,
} from "./types.js";

export interface FilesContext {
  config: NormalizedRailwayClientConfig;
  environmentId: string;
  sandboxId: string;
}

/** Read scope for inspection ops; the rw scope for anything that mutates. */
type FilesScope = "files:read" | "files:read files:write";

/** Module-internal access to SandboxFiles' private constructor. */
let constructFiles: (context: FilesContext) => SandboxFiles;

/**
 * How long an idle pooled `/ws/files` connection lingers before closing.
 * Long enough to carry a burst of sequential operations on one connection
 * (tcp-proxy rate-limits new WS connections per IP), short enough that a
 * script's process exit is barely delayed by an open socket.
 */
const FILES_IDLE_CLOSE_MS = 2_000;

/** Idle connections kept beyond this are closed on release instead of pooled. */
const FILES_MAX_IDLE_CONNECTIONS = 4;

/** A pooled files session: the raw connection plus the scope its token holds. */
interface PooledFilesConnection {
  connection: FilesWsConnection;
  scope: FilesScope;
  idleTimer?: ReturnType<typeof setTimeout>;
}

/**
 * File operations on a live sandbox, exposed as `sandbox.files`. Operations
 * run one at a time per tcp-proxy `/ws/files` session (the bridge serves one
 * request per connection), but sessions are pooled: a finished operation's
 * connection lingers briefly and the next operation reuses it instead of
 * minting a new token and dialing again. Concurrent operations still run
 * independently on their own connections.
 *
 * Paths are absolute within the sandbox filesystem. Content streams in
 * 64KB frames both ways: pushes accept streams without buffering, and
 * `read(path, { format: "stream" })` holds at most one transfer segment in
 * memory, so files larger than memory transfer safely.
 */
export class SandboxFiles {
  readonly #context: FilesContext;
  readonly #idleConnections: PooledFilesConnection[] = [];

  /** Constructed by `Sandbox#files`; not constructible from outside the SDK. */
  private constructor(context: FilesContext) {
    this.#context = context;
  }

  /** Read a file as text (UTF-8). */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  read(
    path: string,
    options?: FileReadOptions & { format?: "text" },
  ): Promise<string>;
  /** Read a file as raw bytes. */
  read(
    path: string,
    options: FileReadOptions & { format: "bytes" },
  ): Promise<Uint8Array>;
  /**
   * Read a file as a stream of byte chunks. Memory stays bounded regardless
   * of file size: a consumer slower than the network holds back the transfer
   * rather than buffering it. Cancelling the stream aborts the transfer.
   * Errors after the stream is returned (including a missing file) surface
   * through the stream.
   */
  read(
    path: string,
    options: FileReadOptions & { format: "stream" },
  ): Promise<ReadableStream<Uint8Array>>;
  async read(
    path: string,
    options: FileReadOptions & { format?: FileReadFormat } = {},
  ): Promise<string | Uint8Array | ReadableStream<Uint8Array>> {
    const target = validatePath(path);
    validateReadOptions(options);
    this.#log(`files read ${target} format=${options.format ?? "text"}`);

    if (options.format === "stream") {
      return this.#readAsStream(target, options);
    }

    const chunks: Uint8Array[] = [];
    try {
      await this.#startPull(target, options, bytes => chunks.push(bytes)).done;
    } catch (error) {
      throw this.#wrapError("read", target, error);
    }
    const bytes = concat(chunks);
    this.#log(`files read ${target} done (${bytes.length} bytes)`);
    return options.format === "bytes" ? bytes : new TextDecoder().decode(bytes);
  }

  /**
   * Write a file, creating it (and truncating any existing content). Missing
   * parent directories are created automatically. Strings, bytes, blobs, and
   * factory sources upload with retry if the session drops mid-transfer;
   * bare streams and async iterables upload unbuffered but are one-shot, so
   * a session dropped mid-stream surfaces as `RailwayConnectionError` (and a
   * partial file may remain at `path`).
   *
   * Files are created `0644`; pass `mode` to set permissions (applied right
   * after the upload completes).
   */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  async write(
    path: string,
    data: FileWriteData,
    options: FileWriteOptions = {},
  ): Promise<void> {
    const target = validatePath(path);
    const mode = validateMode(options.mode);
    const source = uploadSource(data);
    // The server does not apply the protocol's mode yet; it is still sent so
    // existing uploads pick it up natively once it does. Until then `mode`
    // is applied with a chmod over the exec primitive after the upload.
    const start = { path: target, mode: mode ?? 0, size: source.size };
    this.#log(
      `files write ${target} size=${source.size > 0 ? source.size : "stream"}`,
    );

    let retries = 0;
    for (;;) {
      try {
        await this.#writeOnce(target, start, source);
        break;
      } catch (error) {
        if (!canRetryWrite(error, source, ++retries)) {
          throw this.#wrapError("write", target, error);
        }
        this.#log(`files write ${target} retrying after connection loss`);
        await retryDelay();
      }
    }

    if (mode !== undefined) await this.#applyMode(target, mode);
    this.#log(`files write ${target} done`);
  }

  /** List a directory (entries carry name, size, mode, and modify time). */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  async list(path: string): Promise<SandboxFileEntry[]> {
    const target = validatePath(path);
    const data = await this.#call("ls", target, { path: target });
    return (data as { entries?: SandboxFileEntry[] } | undefined)?.entries ?? [];
  }

  /** Stat a path (follows symlinks). Throws `SandboxFileNotFoundError` if absent. */
  async stat(path: string): Promise<SandboxFileEntry> {
    const target = validatePath(path);
    const data = await this.#call("stat", target, { path: target });
    return data as SandboxFileEntry;
  }

  /** Whether a path exists (file or directory). */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  async exists(path: string): Promise<boolean> {
    try {
      await this.stat(path);
      return true;
    } catch (error) {
      if (error instanceof SandboxFileNotFoundError) return false;
      throw error;
    }
  }

  /** Create a directory, including missing parents (like `mkdir -p`). */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  async mkdir(path: string): Promise<void> {
    const target = validatePath(path);
    await this.#call("mkdir", target, { path: target });
  }

  /**
   * Remove a file or empty directory. For recursive deletes use
   * `sandbox.exec("rm -rf ...")`.
   */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  async remove(path: string): Promise<void> {
    const target = validatePath(path);
    await this.#call("rm", target, { path: target });
  }

  /** Rename (move) a file or directory within the sandbox. */
  // Public SDK API; consumed by library users, not in-repo code.
  // fallow-ignore-next-line unused-class-member
  async rename(oldPath: string, newPath: string): Promise<void> {
    const from = validatePath(oldPath);
    const to = validatePath(newPath);
    await this.#call("rename", from, { old: from, new: to });
  }

  /** One upload attempt on its own connection, creating missing parents. */
  async #writeOnce(
    target: string,
    start: { path: string; mode: number; size: number },
    source: UploadSource,
  ): Promise<void> {
    const connection = await this.#connect("files:read files:write");
    try {
      try {
        await connection.write(start, source.chunks());
      } catch (error) {
        const parent = parentDir(target);
        if (!isMissingParent(error) || !parent) throw error;
        // The parent directory does not exist; create it and retry once.
        // A `write_start` failure consumes no content, so the source is
        // still intact.
        await connection.call("mkdir", { path: parent });
        await connection.write(start, source.chunks());
      }
    } finally {
      connection.close();
    }
  }

  /** Sets `path`'s permissions with a chmod run through the exec primitive. */
  async #applyMode(path: string, mode: number): Promise<void> {
    const octal = mode.toString(8).padStart(3, "0");
    const result = await startExec(
      this.#context,
      `chmod ${octal} -- ${shellQuote(path)}`,
      { timeoutSec: 30 },
    );
    if (result.exitCode !== 0) {
      throw new SandboxFilesError({
        operation: "write",
        path,
        message:
          result.stderr.trim() ||
          `chmod ${octal} exited with code ${result.exitCode}`,
      });
    }
  }

  /** One-shot request/reply op on its own connection, with error mapping. */
  async #call(type: string, path: string, payload: unknown): Promise<unknown> {
    this.#log(`files ${type} ${path}`);
    const scope: FilesScope =
      type === "ls" || type === "stat"
        ? "files:read"
        : "files:read files:write";
    const connection = await this.#connect(scope);
    try {
      return await connection.call(type, payload);
    } catch (error) {
      throw this.#wrapError(type, path, error);
    } finally {
      connection.close();
    }
  }

  async #readAsStream(
    path: string,
    options: FileReadOptions,
  ): Promise<ReadableStream<Uint8Array>> {
    let controller!: ReadableStreamDefaultController<Uint8Array>;
    let pull!: PullHandle;
    let notifyPull: (() => void) | undefined;
    const stream = new ReadableStream<Uint8Array>({
      start: c => {
        controller = c;
      },
      pull: () => notifyPull?.(),
      cancel: () => {
        pull.abort();
        notifyPull?.(); // unblock a capacity wait so the pull loop can exit
      },
    });

    // Consumer backpressure: the next segment isn't requested until the
    // stream's queue has room, so a slow consumer holds at most one segment
    // in memory rather than the whole file.
    const waitForCapacity = (): Promise<void> => {
      if ((controller.desiredSize ?? 0) > 0) return Promise.resolve();
      return new Promise(resolve => {
        notifyPull = () => {
          notifyPull = undefined;
          resolve();
        };
      });
    };

    pull = this.#startPull(
      path,
      options,
      bytes => controller.enqueue(bytes),
      waitForCapacity,
    );
    pull.done
      .then(() => {
        try {
          controller.close();
        } catch {
          // already cancelled
        }
      })
      .catch((error: unknown) => {
        try {
          controller.error(this.#wrapError("read", path, error));
        } catch {
          // already cancelled
        }
      });
    return stream;
  }

  #startPull(
    path: string,
    options: FileReadOptions,
    onChunk: (bytes: Uint8Array) => void,
    waitForCapacity?: () => Promise<void>,
  ): PullHandle {
    return startPull({
      connect: () => this.#connect("files:read"),
      log: message => this.#log(message),
      path,
      options,
      onChunk,
      ...(waitForCapacity && { waitForCapacity }),
    });
  }

  /**
   * Leases a `/ws/files` session: an idle pooled connection whose token
   * covers `scope` when one exists, otherwise a fresh dial. The returned
   * connection's `close()` releases it back to the pool (dead or surplus
   * connections are really closed), so callers manage it exactly like an
   * owned connection.
   */
  async #connect(scope: FilesScope): Promise<FilesWsConnection> {
    for (;;) {
      const index = this.#idleConnections.findIndex(
        entry => entry.scope === "files:read files:write" || entry.scope === scope,
      );
      if (index === -1) break;
      const [entry] = this.#idleConnections.splice(index, 1);
      if (entry!.idleTimer) clearTimeout(entry!.idleTimer);
      if (entry!.connection.isOpen()) return this.#lease(entry!);
      entry!.connection.close();
    }
    return this.#lease({ connection: await this.#dial(scope), scope });
  }

  /**
   * Wraps a pooled entry so `close()` releases instead of destroying. Only a
   * connection whose every operation succeeded is worth pooling: a failure
   * may have poisoned the bridge's upstream stream even when the socket
   * itself stays open (the server reports that as "connection lost"), and
   * retry paths count on getting a genuinely fresh session.
   */
  #lease(entry: PooledFilesConnection): FilesWsConnection {
    let released = false;
    let failed = false;
    const guard = <A extends unknown[], R>(
      operation: (...args: A) => Promise<R>,
    ): ((...args: A) => Promise<R>) => {
      return async (...args) => {
        try {
          return await operation(...args);
        } catch (error) {
          failed = true;
          throw error;
        }
      };
    };
    return {
      isOpen: () => entry.connection.isOpen(),
      call: guard((type, data) => entry.connection.call(type, data)),
      read: guard((data, onChunk) => entry.connection.read(data, onChunk)),
      write: guard((start, chunks) => entry.connection.write(start, chunks)),
      close: () => {
        if (released) return;
        released = true;
        if (failed) {
          entry.connection.close();
          return;
        }
        this.#release(entry);
      },
    };
  }

  #release(entry: PooledFilesConnection): void {
    if (
      !entry.connection.isOpen() ||
      this.#idleConnections.length >= FILES_MAX_IDLE_CONNECTIONS
    ) {
      entry.connection.close();
      return;
    }
    const timer = setTimeout(() => {
      const index = this.#idleConnections.indexOf(entry);
      if (index !== -1) this.#idleConnections.splice(index, 1);
      entry.connection.close();
    }, FILES_IDLE_CLOSE_MS);
    // Node timers hold the event loop open; unref so the linger itself never
    // delays process exit (the socket still lingers at most the idle window).
    (timer as { unref?: () => void }).unref?.();
    entry.idleTimer = timer;
    this.#idleConnections.push(entry);
  }

  /** Mints a files-scoped token and opens a `/ws/files` session with it. */
  async #dial(scope: FilesScope): Promise<FilesWsConnection> {
    const { config, environmentId, sandboxId } = this.#context;
    const input: RailwayGenerateShellTokenMutationVariables["input"] = {
      environmentId,
      instanceId: sandboxId,
      kind: "sandbox",
      scope,
    };
    const tokenData = await requestGraphQL<
      RailwayGenerateShellTokenMutation,
      RailwayGenerateShellTokenMutationVariables
    >(config, RailwayGenerateShellTokenDocument, { input });
    return connectFilesWs({
      config,
      jwt: tokenData.generateShellToken,
      endpoint: deriveFilesWsEndpoint(config.tcpProxyWsEndpoint),
    });
  }

  #wrapError(operation: string, path: string, error: unknown): unknown {
    if (error instanceof FilesRemoteError) {
      const args = { operation, path, message: error.message };
      return isNotFound(error.message)
        ? new SandboxFileNotFoundError(args)
        : new SandboxFilesError(args);
    }
    return error;
  }

  #log(message: string): void {
    this.#context.config.log(`${message} sandbox=${this.#context.sandboxId}`);
  }

  static {
    constructFiles = context => new SandboxFiles(context);
  }
}

export function createSandboxFiles(context: FilesContext): SandboxFiles {
  return constructFiles(context);
}

function validatePath(path: string): string {
  if (typeof path !== "string" || path.trim() === "") {
    throw new TypeError("Path must be a non-empty string.");
  }
  return path;
}

function validateReadOptions(options: FileReadOptions): void {
  if (options.fromEnd && options.offset !== undefined) {
    throw new TypeError("`offset` and `fromEnd` are mutually exclusive.");
  }
  if (options.fromEnd && options.length === undefined) {
    throw new TypeError("`fromEnd` requires `length` (the tail size to read).");
  }
  requireIntegerAtLeast("offset", options.offset, 0);
  requireIntegerAtLeast("length", options.length, 1);
}

function requireIntegerAtLeast(
  name: string,
  value: number | undefined,
  min: number,
): void {
  if (value === undefined) return;
  if (!Number.isInteger(value) || value < min) {
    throw new TypeError(`\`${name}\` must be an integer >= ${min}.`);
  }
}

function validateMode(mode: number | undefined): number | undefined {
  if (mode === undefined) return undefined;
  if (!Number.isInteger(mode) || mode < 0 || mode > 0o7777) {
    throw new TypeError("`mode` must be POSIX permission bits (e.g. 0o755).");
  }
  return mode;
}

/** Single-quotes a path for the in-sandbox shell. */
function shellQuote(path: string): string {
  return `'${path.replaceAll("'", `'\\''`)}'`;
}

/** A `write_start` rejection caused by a missing parent directory. */
function isMissingParent(error: unknown): boolean {
  return (
    error instanceof FilesRemoteError &&
    error.stage === "start" &&
    isNotFound(error.message)
  );
}

/** POSIX dirname, or undefined for root-level or relative paths. */
function parentDir(path: string): string | undefined {
  const trimmed = path.replace(/\/+$/, "");
  const index = trimmed.lastIndexOf("/");
  return index > 0 ? trimmed.slice(0, index) : undefined;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  if (chunks.length === 1) return chunks[0]!;
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.length;
  }
  return merged;
}
