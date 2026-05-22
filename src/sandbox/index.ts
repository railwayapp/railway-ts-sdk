import { SandboxClient } from "./client.js";

export const Sandbox = Object.freeze({
  Client: SandboxClient,
});

export { SandboxClient } from "./client.js";
export { SandboxInstance } from "./instance.js";
export type {
  SandboxClientConfig,
  SandboxCreateOptions,
  SandboxExecOptions,
  SandboxExecResult,
  SandboxSnapshot,
  SandboxStatus,
} from "./types.js";
