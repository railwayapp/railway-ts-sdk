import type { RailwayClientConfig } from "../core/config.js";
import type {
  RailwaySandboxFieldsFragment,
  RailwaySandboxTemplateFieldsFragment,
} from "../generated/graphql.js";

export type SandboxStatus = RailwaySandboxFieldsFragment["status"];
export type SandboxInfo = RailwaySandboxFieldsFragment;

/** Final outcome of an exec; identical shape for short and long-running commands. */
export interface ExecResult {
  /** Process exit code; -1 means terminated by a signal (e.g. after `kill()`). */
  exitCode: number | null;
  stdout: string;
  stderr: string;
  /** True when output was cut (server-side caps); the streams may be incomplete. */
  truncated: boolean;
  /** True when the client-side `timeoutSec` deadline killed the command. */
  timedOut: boolean;
}

export type SandboxTemplateInfo = RailwaySandboxTemplateFieldsFragment;

export interface CreateOptions extends RailwayClientConfig {
  environmentId?: string;
  idleTimeoutMinutes?: number;
}

export interface ConnectOptions extends RailwayClientConfig {
  environmentId?: string;
}

export interface ListOptions extends RailwayClientConfig {
  environmentId?: string;
  first?: number;
  after?: string;
}

/** Reattach to an exec started earlier (its id comes from `ExecHandle.execId`). */
export interface ExecReattachTarget {
  execId: string;
}

export type ExecTarget = string | ExecReattachTarget;

export interface ExecOptions {
  /**
   * Transport for this exec. `"backboard"` (default) runs the durable
   * `sandboxExec` mutation + subscription. `"ws"` streams over the tcp-proxy
   * `/ws/exec` bridge (experimental): separated stdout/stderr and a real exit
   * code. When durable sessions are enabled server-side, `execId` is the
   * VM-assigned session id and `exec({ execId }, { transport: "ws" })`
   * reattaches to it.
   */
  transport?: "backboard" | "ws";
  /**
   * Kill the command after this many seconds and resolve with
   * `timedOut: true`. Enforced client-side (SIGTERM, then SIGKILL after a
   * grace period); setting it streams from the start so the deadline is
   * honored precisely.
   */
  timeoutSec?: number;
  /** Receives each stdout chunk as it arrives. A throw rejects the exec. */
  onStdout?: (chunk: string) => void;
  /** Receives each stderr chunk as it arrives. A throw rejects the exec. */
  onStderr?: (chunk: string) => void;
  /**
   * How long (ms) the server may wait for the command to finish before
   * fast-returning so output can stream — clamped to [0, 25000]. Defaults to
   * `0` when `onStdout`/`onStderr` or `timeoutSec` is set (stream from the
   * start), otherwise the server default (~25s, short commands resolve inline
   * with no WebSocket). Set `0` to force immediate streaming without callbacks.
   */
  waitMs?: number;
}

export interface TemplateBuildOptions extends RailwayClientConfig {
  environmentId?: string;
}
