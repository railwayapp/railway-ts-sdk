import { RailwayConnectionError } from "../core/errors.js";
import {
  FilesRemoteError,
  type FilesWsConnection,
} from "../core/files-ws-client.js";
import type { FileReadOptions, FileWriteData, SandboxFileEntry } from "./types.js";

/**
 * Transfer engine for `sandbox.files`: segmented, resumable downloads and
 * replayable upload sources. The policies here compensate for two server
 * behaviors (see AGENTS.md): sessions are killed when keepalive replies
 * stall behind a long-streaming read request, and dropped sessions are a
 * routine failure mode for multi-second transfers. Reads are therefore
 * issued as bounded range segments and resumed by byte position, and writes
 * retry when their source can produce the content again.
 */

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
 * Dropped sessions resume (reads) or restart (replayable writes) after a
 * short delay. The retry budget resets whenever bytes flow.
 */
const TRANSFER_MAX_RETRIES = 3;
const TRANSFER_RETRY_DELAY_MS = 300;

const sleep = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

/** The server reports a missing path with an `os.ErrNotExist`-style message. */
export function isNotFound(message: string): boolean {
  return /file does not exist|no such file|not found/i.test(message);
}

/**
 * A transport-level transfer failure: the session dropped, or the server
 * reported losing its own stream to the sandbox ("connection lost"). The WS
 * session is healthy in the latter case, but the operation failed the same
 * way.
 */
function isTransientTransfer(error: unknown): boolean {
  return (
    error instanceof RailwayConnectionError ||
    (error instanceof FilesRemoteError && /connection lost/i.test(error.message))
  );
}

/**
 * A dropped session is retriable when the source can still produce the full
 * content: it is replayable, or it was never pulled (a failure during the
 * write_start handshake consumes nothing, so even one-shot streams are
 * intact). The file is truncated again by the next write_start.
 */
export function canRetryWrite(
  error: unknown,
  source: UploadSource,
  retries: number,
): boolean {
  return (
    isTransientTransfer(error) &&
    (source.replayable || !source.consumed()) &&
    retries <= TRANSFER_MAX_RETRIES
  );
}

export async function retryDelay(): Promise<void> {
  await sleep(TRANSFER_RETRY_DELAY_MS);
}

/** An in-flight download; `abort()` stops it and resolves `done`. */
export interface PullHandle {
  done: Promise<void>;
  abort(): void;
}

/** Byte range under transfer; `position` advances as chunks arrive. */
interface PullRange {
  position: number;
  /** Exclusive end; `Infinity` reads until a short segment signals EOF. */
  end: number;
}

/**
 * Drives a complete download: adaptive range segments, with transparent
 * resume on a fresh connection when one drops (the byte position is tracked
 * client-side). Only `fromEnd` needs the file size (one stat); everything
 * else reads ranges until a short segment signals EOF, so missing files and
 * directories surface the server's error from the first read request.
 */
export function startPull(args: {
  connect: () => Promise<FilesWsConnection>;
  log: (message: string) => void;
  path: string;
  options: FileReadOptions;
  onChunk: (bytes: Uint8Array) => void;
  /** Resolves when the consumer has room for the next segment. */
  waitForCapacity?: () => Promise<void>;
}): PullHandle {
  const { connect, log, path, options, onChunk } = args;
  let connection: FilesWsConnection | undefined;
  let aborted = false;

  const done = (async () => {
    let range: PullRange | undefined;
    let retries = 0;
    for (;;) {
      if (aborted) return; // cancelled during a retry backoff
      try {
        connection = await connect();
        if (aborted) return;
        range ??= await resolveRange(connection, path, options);
        await pullSegments({
          connection,
          path,
          range,
          isAborted: () => aborted,
          onChunk: bytes => {
            retries = 0; // progress restores the retry budget
            onChunk(bytes);
          },
          ...(args.waitForCapacity && { waitForCapacity: args.waitForCapacity }),
        });
        return;
      } catch (error) {
        if (aborted) return;
        if (!canResumePull(error, ++retries)) throw error;
        log(`files read ${path} resuming after connection loss`);
        await retryDelay();
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

/** Every read is ranged, so any transport-level failure may resume. */
function canResumePull(error: unknown, retries: number): boolean {
  return isTransientTransfer(error) && retries <= TRANSFER_MAX_RETRIES;
}

/** Resolves read options to a byte range; stats only for tail reads. */
async function resolveRange(
  connection: FilesWsConnection,
  path: string,
  options: FileReadOptions,
): Promise<PullRange> {
  if (options.fromEnd) {
    // `length` is validated upstream to be present with `fromEnd`.
    const info = (await connection.call("stat", { path })) as SandboxFileEntry;
    return { position: Math.max(0, info.size - options.length!), end: info.size };
  }
  const start = options.offset ?? 0;
  return {
    position: start,
    end: options.length !== undefined ? start + options.length : Infinity,
  };
}

/**
 * Streams `[range.position, range.end)` as adaptive bounded segments,
 * advancing `range.position` as bytes arrive so a caller can resume after a
 * drop. A segment that comes back short is EOF.
 */
async function pullSegments(args: {
  connection: FilesWsConnection;
  path: string;
  range: PullRange;
  isAborted: () => boolean;
  onChunk: (bytes: Uint8Array) => void;
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

/** A normalized upload source; `size` 0 means unknown. */
export interface UploadSource {
  chunks: () => AsyncIterable<Uint8Array>;
  size: number;
  /** Whether `chunks()` can produce the content again (enables retry). */
  replayable: boolean;
  /** Whether the source has ever been pulled (one-shot sources can't replay after this). */
  consumed: () => boolean;
}

/**
 * Normalizes accepted write inputs to a chunk-source factory and tracks
 * whether the source was ever pulled: a one-shot source that was never
 * started is still safe to retry.
 */
export function uploadSource(data: FileWriteData): UploadSource {
  const source = normalizeSource(data);
  let consumed = false;
  return {
    ...source,
    chunks: () =>
      markOnFirstPull(source.chunks(), () => {
        consumed = true;
      }),
    consumed: () => consumed,
  };
}

/**
 * Wraps an iterable so `mark` fires when `next()` is first *called*, not when
 * it resolves: a one-shot generator loses the in-flight value to any replay
 * the moment it is pulled.
 */
function markOnFirstPull(
  iterable: AsyncIterable<Uint8Array>,
  mark: () => void,
): AsyncIterable<Uint8Array> {
  return {
    [Symbol.asyncIterator]() {
      const inner = iterable[Symbol.asyncIterator]();
      const iterator: AsyncIterator<Uint8Array> = {
        next: (...args) => {
          mark();
          return inner.next(...args);
        },
      };
      if (inner.return) iterator.return = inner.return.bind(inner);
      if (inner.throw) iterator.throw = inner.throw.bind(inner);
      return iterator;
    },
  };
}

interface NormalizedSource {
  chunks: () => AsyncIterable<Uint8Array>;
  size: number;
  replayable: boolean;
}

function normalizeSource(data: FileWriteData): NormalizedSource {
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
  const streaming = streamingSource(data);
  if (streaming) return streaming;
  throw new TypeError(
    "Unsupported write data: pass a string, Uint8Array, ArrayBuffer, Blob, " +
      "ReadableStream, AsyncIterable of Uint8Array, or a function returning " +
      "a stream or iterable.",
  );
}

/** The streaming-shaped write inputs; undefined when `data` is none of them. */
function streamingSource(data: FileWriteData): NormalizedSource | undefined {
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
  return undefined;
}

async function* single(bytes: Uint8Array): AsyncGenerator<Uint8Array> {
  if (bytes.length > 0) yield bytes;
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

function producedChunks(
  produced: ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>,
): AsyncIterable<Uint8Array> {
  return produced instanceof ReadableStream ? streamChunks(produced) : produced;
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
