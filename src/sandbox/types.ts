import type { RailwayClientConfig } from "../core/config.js";
import type {
  RailwaySandboxExecMutation,
  RailwaySandboxFieldsFragment,
} from "../generated/graphql.js";

export interface SandboxConfig extends RailwayClientConfig {
  projectId: string;
  environmentId: string;
}

export type SandboxClientConfig = SandboxConfig;

export type SandboxStatus = RailwaySandboxFieldsFragment["status"];
export type SandboxExecResult = RailwaySandboxExecMutation["sandboxExec"];
export type SandboxSnapshot = RailwaySandboxFieldsFragment;

export interface SandboxCreateOptions {
  name?: string;
  idleTimeoutMinutes?: number;
}

export interface SandboxExecOptions {
  timeoutSec?: number;
}

export type SandboxFileType = "FILE" | "DIRECTORY" | "SYMLINK" | "OTHER";

export type SandboxFileData = string | Uint8Array | ArrayBuffer | Blob;

export interface SandboxFileInfo {
  path: string;
  size: number;
  mode: string;
  modifiedAt: string;
  type: SandboxFileType;
}

export interface SandboxFileReadOptions {
  offset?: number;
  length?: number;
}

export interface SandboxFileReadTextOptions extends SandboxFileReadOptions {
  encoding?: string;
}

export interface SandboxFileListEntry {
  name: string;
  path: string;
  size: number;
  modifiedAt: string;
  type: SandboxFileType;
}

export interface SandboxTreeOptions {
  path?: string;
  depth?: number;
}

export interface SandboxTreeNode extends SandboxFileListEntry {
  children: SandboxTreeNode[];
}

export interface SandboxInstanceOperations {
  exec: (
    id: string,
    command: string,
    options: SandboxExecOptions,
  ) => Promise<SandboxExecResult>;
  delete: (id: string) => Promise<import("./instance.js").SandboxInstance>;
  fileRequest: (
    id: string,
    path: string,
    init: RequestInit,
  ) => Promise<Response>;
}
