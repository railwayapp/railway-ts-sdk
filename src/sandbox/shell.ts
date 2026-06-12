import { RailwayError } from "../core/errors.js";

const SAFE_UNQUOTED = /^[A-Za-z0-9._\-/@:=]+$/;
const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Single-quote a value for POSIX sh; embedded quotes become `'\''`. */
export function shellQuote(value: string): string {
  if (SAFE_UNQUOTED.test(value)) return value;
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/**
 * Apply per-exec `cwd`/`env` by composing a shell prefix around the command —
 * the wire protocol carries only a command string, and the VM runs it via
 * `sh -c`. The prefix executes at top level while the user command is
 * re-quoted into a nested `sh -c`, so a failed `cd` cannot fall through into
 * a `;`-separated command. Env vars are plain POSIX prefix assignments
 * (inherited by children, no /usr/bin/env dependency).
 */
export function wrapCommand(
  command: string,
  options: { cwd?: string; env?: Record<string, string> },
): string {
  const env = Object.entries(options.env ?? {});
  if (options.cwd === undefined && env.length === 0) return command;

  for (const [name] of env) {
    if (!ENV_NAME.test(name)) {
      throw new RailwayError(
        `Invalid environment variable name: ${JSON.stringify(name)}`,
      );
    }
  }

  const assignments = env.map(([name, value]) => `${name}=${shellQuote(value)}`);
  const run = [...assignments, "sh", "-c", shellQuote(command)].join(" ");
  return options.cwd === undefined
    ? run
    : `cd ${shellQuote(options.cwd)} && ${run}`;
}
