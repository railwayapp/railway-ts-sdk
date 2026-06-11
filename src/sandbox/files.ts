import {
  deriveFilesWsEndpoint,
  type NormalizedRailwayClientConfig,
} from "../core/config.js";
import { RailwayConnectionError } from "../core/errors.js";
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

/**
 * Reads are issued as bounded range requests rather than one whole-file
 * read: the server ends a session whose keepalive replies stall behind a
 * long-streaming read request (observed at ~15s), so no single request may
 * run that long. Segment size adapts toward the target duration, so faster
 * links use fewer round trips.
 */
const READ_SEGMENT_TARGET_MS = 5_000;
const READ_SEGMENT_MIN_BYTES = 256 * 1024;
const READ_SEGMENT_MAX_BYTES = 32 * 1024 * 1024;
const READ_SEGMENT_INITIAL_BYTES = 2 * 1024 * 1024;

/**
 * Transfers ride sessions the server may drop mid-flight (e.g. when its
 * keepalive stalls); dropped reads resume from the exact byte position on a
 * fresh connection, and dropped writes of replayable sources restart from
 * scratch. The retry budget resets whenever bytes flow.
 */
const TRANSFER_MAX_RETRIES = 3;
const TRANSFER_RETRY_DELAY_MS = 300;

/** Read scope for inspection ops; the rw scope for anything that mutates. */
type FilesScope = "files:read" | "files:read files:write";

/** Module-internal access to SandboxFiles' private constructor. */
let constructFiles: (context: FilesContext) => SandboxFiles;

/**
 * File operations on a live sandbox, exposed as `sandbox.files`. Each
 * operation mints a short-lived `files`-scoped token and opens its own
 * tcp-proxy `/ws/files` session (the bridge serves one request per
 * connection), so concurrent operations run independently.
 *
 * Paths are absolute within the sandbox filesystem. Content streams in
 * 64KB frames both ways: pushes accept streams without buffering, and
 * `read(path, { format: "stream" })` holds at most one transfer segment in
 * memory, so massive files transfer with bounded memory.
 */
export class SandboxFiles {
  readonly #context: FilesContext;

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
   * Read a file as a stream of byte chunks — memory stays bounded regardless
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
   * parent directories are created automatically. Strings, bytes, and blobs
   * upload with their size declared and are retried automatically if the
   * session drops mid-transfer; streams and async iterables upload
   * unbuffered but are one-shot, so a dropped session surfaces as
   * `RailwayConnectionError` (and a partial file may remain at `path`).
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
        if (!canRetryWrite(error, source.replayable, ++retries)) {
          throw this.#wrapError("write", target, error);
        }
        this.#log(`files write ${target} retrying after connection loss`);
        await sleep(TRANSFER_RETRY_DELAY_MS);
      }
    }

    if (mode !== undefined) await this.#applyMode(target, mode);
    this.#log(`files write ${target} done`);
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

  /** One upload attempt on its own connection, creating missing parents. */
  async #writeOnce(
    target: string,
    start: { path: string; mode: number; size: number },
    source: { chunks: () => AsyncIterable<Uint8Array> },
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

  /**
   * Drives a complete download: stat, adaptive range segments, and — because
   * the byte position is tracked client-side — transparent resume on a new
   * connection when one drops. Zero-size and directory paths fall back to a
   * single direct read so empty files resolve instantly, pseudo files that
   * stat as 0 bytes still stream, and directories surface the server's
   * canonical error.
   */
  #startPull(
    path: string,
    options: FileReadOptions,
    onChunk: (bytes: Uint8Array) => void,
    waitForCapacity?: () => Promise<void>,
  ): PullHandle {
    let connection: FilesWsConnection | undefined;
    let aborted = false;

    const state: PullState = { direct: false, directDelivered: 0 };
    const done = (async () => {
      let retries = 0;
      for (;;) {
        if (aborted) return; // cancelled during a retry backoff
        try {
          connection = await this.#connect("files:read");
          if (aborted) return;
          await runPullAttempt({
            connection,
            path,
            options,
            state,
            isAborted: () => aborted,
            onChunk: bytes => {
              retries = 0; // progress restores the retry budget
              onChunk(bytes);
            },
            ...(waitForCapacity && { waitForCapacity }),
          });
          return;
        } catch (error) {
          if (aborted) return;
          if (!canResumePull(error, state, ++retries)) throw error;
          this.#log(`files read ${path} resuming after connection loss`);
          await sleep(TRANSFER_RETRY_DELAY_MS);
        } finally {
          connection?.close();
          connection = undefined;
        }
      }
    })();

    return {
      done,
      abort: () => {
        aborted = true;
        connection?.close();
      },
    };
  }

  /** Mints a files-scoped token and opens a `/ws/files` session with it. */
  async #connect(scope: FilesScope): Promise<FilesWsConnection> {
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

/**
 * A dropped session — or the server losing its own stream to the sandbox —
 * is retriable when the source can be replayed (the file is truncated again
 * by the next write_start). One-shot streams can't be, so the error surfaces.
 */
function canRetryWrite(
  error: unknown,
  replayable: boolean,
  retries: number,
): boolean {
  return (
    (error instanceof RailwayConnectionError || isTransientRemote(error)) &&
    replayable &&
    retries <= TRANSFER_MAX_RETRIES
  );
}

/**
 * Whether a failed pull attempt may resume: only transport-level failures
 * (dropped session or the server losing its stream to the sandbox), never a
 * direct (unsegmented) read that already delivered bytes — re-reading those
 * would duplicate them.
 */
function canResumePull(
  error: unknown,
  state: PullState,
  retries: number,
): boolean {
  return (
    (error instanceof RailwayConnectionError || isTransientRemote(error)) &&
    !(state.direct && state.directDelivered > 0) &&
    retries <= TRANSFER_MAX_RETRIES
  );
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

/** An in-flight download; `abort()` stops it and resolves `done`. */
interface PullHandle {
  done: Promise<void>;
  abort(): void;
}

/** Download progress shared across resume attempts. */
interface PullState {
  /** Set once stat resolves a normal file; `position` advances per chunk. */
  range?: { position: number; end: number };
  /** Zero-size or directory path: a single unsegmented read. */
  direct: boolean;
  directDelivered: number;
}

/** One download attempt: resolve the plan if needed, then stream from it. */
async function runPullAttempt(args: {
  connection: FilesWsConnection;
  path: string;
  options: FileReadOptions;
  state: PullState;
  isAborted: () => boolean;
  onChunk: (bytes: Uint8Array) => void;
  waitForCapacity?: () => Promise<void>;
}): Promise<void> {
  const { connection, path, options, state, isAborted, onChunk } = args;

  if (!state.range && !state.direct) {
    const info = (await connection.call("stat", { path })) as SandboxFileEntry;
    if (!info.size || info.isDir) {
      state.direct = true;
    } else {
      const [position, end] = readRange(info.size, options);
      state.range = { position, end };
    }
  }

  if (state.direct) {
    await connection.read(directReadPayload(path, options), bytes => {
      state.directDelivered += bytes.length;
      onChunk(bytes);
    });
    return;
  }

  await pullSegments({
    connection,
    path,
    range: state.range!,
    isAborted,
    onChunk,
    ...(args.waitForCapacity && { waitForCapacity: args.waitForCapacity }),
  });
}

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Streams `[range.position, range.end)` as adaptive bounded segments,
 * advancing `range.position` as bytes arrive so a caller can resume after a
 * drop. A segment that comes back short is EOF (the file shrank since stat).
 */
async function pullSegments(args: {
  connection: FilesWsConnection;
  path: string;
  range: { position: number; end: number };
  isAborted: () => boolean;
  onChunk: (bytes: Uint8Array) => void;
  /** Resolves when the consumer has room for the next segment. */
  waitForCapacity?: () => Promise<void>;
}): Promise<void> {
  const { connection, path, range, isAborted, onChunk } = args;
  let segmentBytes = READ_SEGMENT_INITIAL_BYTES;
  while (range.position < range.end) {
    await args.waitForCapacity?.();
    if (isAborted()) return;
    const length = Math.min(segmentBytes, range.end - range.position);
    const started = Date.now();
    let received = 0;
    await connection.read({ path, offset: range.position, length }, bytes => {
      received += bytes.length;
      range.position += bytes.length;
      onChunk(bytes);
    });
    if (received < length) return; // EOF before the requested range
    segmentBytes = nextSegmentSize(segmentBytes, Date.now() - started);
  }
}

/**
 * Scales the segment size toward the per-segment duration target. Growth is
 * capped at 4x per step so one unusually fast segment can't jump straight to
 * a size that takes far longer than the target if bandwidth drops.
 */
function nextSegmentSize(current: number, elapsedMs: number): number {
  const scaled = Math.round(
    (current * READ_SEGMENT_TARGET_MS) / Math.max(elapsedMs, 1),
  );
  return Math.min(
    READ_SEGMENT_MAX_BYTES,
    current * 4,
    Math.max(READ_SEGMENT_MIN_BYTES, scaled),
  );
}

/** Resolves read options against the stat-reported size to a `[start, end)` range. */
function readRange(size: number, options: FileReadOptions): [number, number] {
  if (options.fromEnd) {
    const length = options.length ?? size;
    return [Math.max(0, size - length), size];
  }
  const start = Math.min(options.offset ?? 0, size);
  const end =
    options.length !== undefined ? Math.min(start + options.length, size) : size;
  return [start, end];
}

/** Single-request read payload, passing the caller's range through verbatim. */
function directReadPayload(
  path: string,
  options: FileReadOptions,
): Record<string, unknown> {
  return {
    path,
    ...(options.offset !== undefined && { offset: options.offset }),
    ...(options.length !== undefined && { length: options.length }),
    ...(options.fromEnd !== undefined && { fromEnd: options.fromEnd }),
  };
}

/** The server reports a missing path with an `os.ErrNotExist`-style message. */
function isNotFound(message: string): boolean {
  return /file does not exist|no such file|not found/i.test(message);
}

/**
 * A remote error frame reporting that the server's own stream to the sandbox
 * died mid-transfer. The WS session is still healthy, but the operation is as
 * retriable as a dropped connection.
 */
function isTransientRemote(error: unknown): boolean {
  return error instanceof FilesRemoteError && /connection lost/i.test(error.message);
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

/**
 * Normalizes accepted write inputs to a chunk-source factory; size 0 means
 * unknown. Replayable sources (the factory yields fresh content each call)
 * let `write` retry a dropped transfer; streams and iterables are one-shot.
 */
function uploadSource(data: FileWriteData): {
  chunks: () => AsyncIterable<Uint8Array>;
  size: number;
  replayable: boolean;
} {
  if (typeof data === "string") {
    const bytes = new TextEncoder().encode(data);
    return { chunks: () => single(bytes), size: bytes.length, replayable: true };
  }
  if (data instanceof Uint8Array) {
    return { chunks: () => single(data), size: data.length, replayable: true };
  }
  if (data instanceof ArrayBuffer) {
    const bytes = new Uint8Array(data);
    return { chunks: () => single(bytes), size: bytes.length, replayable: true };
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) {
    return {
      chunks: () => streamChunks(data.stream()),
      size: data.size,
      replayable: true,
    };
  }
  if (typeof ReadableStream !== "undefined" && data instanceof ReadableStream) {
    const chunks = streamChunks(data);
    return { chunks: () => chunks, size: 0, replayable: false };
  }
  if (isAsyncIterable(data)) {
    return { chunks: () => data, size: 0, replayable: false };
  }
  if (typeof data === "function") {
    // A factory produces fresh content per call, so the write may retry.
    return { chunks: () => producedChunks(data()), size: 0, replayable: true };
  }
  throw new TypeError(
    "Unsupported write data: pass a string, Uint8Array, ArrayBuffer, Blob, " +
      "ReadableStream, AsyncIterable of Uint8Array, or a function returning " +
      "a stream or iterable.",
  );
}

async function* single(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  if (bytes.length > 0) yield bytes;
}

function producedChunks(
  produced: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
): AsyncIterable<Uint8Array> {
  return produced instanceof ReadableStream ? streamChunks(produced) : produced;
}

async function* streamChunks(
  stream: ReadableStream<Uint8Array>,
): AsyncGenerator<Uint8Array> {
  const reader = stream.getReader();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      if (value && value.length > 0) yield value;
    }
  } finally {
    // Covers abnormal exits too (transfer failure): release the source.
    try {
      await reader.cancel();
    } catch {
      // source may already be errored
    }
    reader.releaseLock();
  }
}

function isAsyncIterable(value: unknown): value is AsyncIterable<Uint8Array> {
  return (
    typeof value === "object" &&
    value !== null &&
    Symbol.asyncIterator in value &&
    typeof (value as AsyncIterable<Uint8Array>)[Symbol.asyncIterator] ===
      "function"
  );
}
