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
  /** True when the server cut the output; the streams may be incomplete. */
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

export interface TemplateBuildOptions extends RailwayClientConfig {
  environmentId?: string;
}
