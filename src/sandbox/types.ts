import type { RailwayClientConfig } from "../core/config.js";
import type {
  RailwaySandboxCheckpointFieldsFragment,
  RailwaySandboxFieldsFragment,
  RailwaySandboxTemplateBuildFieldsFragment,
} from "../generated/graphql.js";

export type SandboxStatus = RailwaySandboxFieldsFragment["status"];
export type SandboxNetworkIsolation =
  RailwaySandboxFieldsFragment["networkIsolation"];
export type SandboxInfo = RailwaySandboxFieldsFragment;

/** Final outcome of an exec; identical shape for short and long-running commands. */
export interface ExecResult {
  /** Process exit code; -1 means terminated by a signal (e.g. after `kill()`). */
  exitCode: number | null;
  stdout: string;
  stderr: string;
  /** True when the server cut the output; the streams may be incomplete. */
  truncated: boolean;
  /** True when the client-side `timeoutSec` deadline killed the command. */
  timedOut: boolean;
}

/**
 * A bootable snapshot of a sandbox's disk. `key` is the user-given name for
 * checkpoints captured with `checkpoint`, or the recipe hash for built ones.
 */
export type SandboxCheckpointInfo = RailwaySandboxCheckpointFieldsFragment;

/** State of a recipe build; READY once its checkpoint exists. */
export type SandboxTemplateBuildInfo = RailwaySandboxTemplateBuildFieldsFragment;

/** A template recipe compiled into the inputs the backend understands. */
export interface CompiledTemplate {
  readonly instructions: readonly string[];
  /** Build-time env for the build instructions; omitted when empty. */
  readonly variables?: Record<string, string>;
}

/** Reference to a saved named checkpoint (from `checkpoint` or a prior build). */
export interface NamedTemplateRef {
  readonly name: string;
}

export type TemplateSource = CompiledTemplate | NamedTemplateRef;

/** Knobs shared by every sandbox-creating call: `create`, `create(template)`, and `fork`. */
export interface SandboxCreationOptions {
  idleTimeoutMinutes?: number;
  networkIsolation?: SandboxNetworkIsolation;
  /** Runtime env baked into the sandbox, available to every command. Values may use Railway references (e.g. `${{shared.FOO}}`). */
  env?: Record<string, string>;
}

export interface CreateOptions
  extends RailwayClientConfig,
    SandboxCreationOptions {
  environmentId?: string;
}

export type ForkOptions = SandboxCreationOptions;

export interface ConnectOptions extends RailwayClientConfig {
  environmentId?: string;
}

export interface ListOptions extends RailwayClientConfig {
  environmentId?: string;
  first?: number;
  after?: string;
}

/** Reattach to an exec started earlier (its name comes from `ExecHandle.sessionName`). */
export interface ExecReattachTarget {
  sessionName: string;
}

export type ExecTarget = string | ExecReattachTarget;

/** Signal names accepted by `ExecHandle.kill()` (sent to the process group). */
export type ExecSignal = "HUP" | "INT" | "QUIT" | "KILL" | "TERM";

export interface ExecOptions {
  /**
   * Kill the command after this many seconds and resolve with
   * `timedOut: true`. Enforced client-side by closing the exec session.
   */
  timeoutSec?: number;
  /** Receives each stdout chunk as it arrives. A throw rejects the exec. */
  onStdout?: (chunk: string) => void;
  /** Receives each stderr chunk as it arrives. A throw rejects the exec. */
  onStderr?: (chunk: string) => void;
  /**
   * On reattach (`exec({ sessionName })`), set `true` to resume from the
   * server's last-read cursor — exact, but lossy if a previous reading client
   * didn't keep up before detaching. Defaults to `false`: replay all retained
   * logs for the session (lossless, may repeat output an earlier reader saw).
   * Ignored on a fresh exec.
   */
  resumeFromLastRead?: boolean;
}

/** A directory entry or stat result from the sandbox filesystem. */
export interface SandboxFileEntry {
  /** Base name (no directory prefix). */
  name: string;
  /** Size in bytes. */
  size: number;
  /**
   * File mode. The low 9 bits (`mode & 0o777`) are the POSIX permission
   * bits; higher bits encode the file type in a non-POSIX layout, so use
   * `isDir` rather than masking type bits.
   */
  mode: number;
  isDir: boolean;
  /** Modification time, RFC 3339 UTC. */
  modTime: string;
}

export type FileReadFormat = "text" | "bytes" | "stream";

export interface FileReadOptions {
  /** Start reading at this non-negative byte offset. Mutually exclusive with `fromEnd`. */
  offset?: number;
  /** Read at most this many bytes (to EOF when omitted). Must be positive. */
  length?: number;
  /** Read the last `length` bytes (a tail read). Requires `length`. */
  fromEnd?: boolean;
}

/**
 * Content accepted by `files.write`. Streams and async iterables upload
 * without buffering, so pushes larger than memory are safe, but they are
 * one-shot: a dropped session can't be retried. Pass a factory
 * (`() => stream`) when the content can be produced again; the write is then
 * retried automatically like the in-memory forms.
 */
export type FileWriteData =
  | string
  | Uint8Array
  | ArrayBuffer
  | Blob
  | ReadableStream<Uint8Array>
  | AsyncIterable<Uint8Array>
  | (() => ReadableStream<Uint8Array> | AsyncIterable<Uint8Array>);

export interface FileWriteOptions {
  /**
   * POSIX permission bits for the file (e.g. `0o755`), applied right after
   * the upload completes. Files default to `0644` when omitted.
   */
  mode?: number;
}

export interface TemplateBuildOptions extends RailwayClientConfig {
  environmentId?: string;
}

/** Connection/environment options for the checkpoint statics (`Sandbox.checkpoints` etc.). */
export interface CheckpointOptions extends RailwayClientConfig {
  environmentId?: string;
}
