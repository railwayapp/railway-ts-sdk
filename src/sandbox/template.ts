import { engineFromOptions } from "./engine.js";
import { COMPILE } from "./internal.js";
import type { TemplateBuildOptions } from "./types.js";

/** Ambient build state carried forward by the immutable builder. */
interface TemplateState {
  readonly instructions: readonly string[];
  /** Ordered [key, value] pairs; insertion order preserved, override-in-place. */
  readonly env: ReadonlyArray<readonly [string, string]>;
  readonly workdir?: string;
}

const EMPTY_STATE: TemplateState = { instructions: [], env: [] };

/**
 * A fluent, immutable recipe for a server-side sandbox base. Every builder step
 * returns a NEW template — nothing mutates in place — so a base can branch into
 * variants safely. Obtain one with `Sandbox.template()`; it is a pure value and
 * does no network until `build()` or `Sandbox.create(template)`.
 *
 * Each instruction runs in its own shell server-side, so `env`/`workdir` do not
 * persist between instructions — they are folded into every subsequent command.
 */
export class SandboxTemplate {
  readonly #state: TemplateState;

  private constructor(state: TemplateState) {
    this.#state = state;
  }

  /** Internal entry used by `Sandbox.template()`. Not reachable by consumers. */
  static blank(): SandboxTemplate {
    return new SandboxTemplate(EMPTY_STATE);
  }

  /** Runs a raw shell command as a build step. */
  run(command: string): SandboxTemplate {
    return this.#append(command);
  }

  /** Installs Debian packages via apt (the base image ships no apt index). */
  withPackages(...packages: string[]): SandboxTemplate {
    if (packages.length === 0) return this;
    return this.#append(
      `apt-get update && apt-get install -y --no-install-recommends ${packages.join(" ")}`,
    );
  }

  /** Sets environment variables folded into every subsequent build step. */
  withEnv(vars: Record<string, string>): SandboxTemplate {
    let env = this.#state.env;
    for (const [key, value] of Object.entries(vars)) {
      env = upsertEnv(env, key, value);
    }
    return new SandboxTemplate({ ...this.#state, env });
  }

  /** Sets the working directory for every subsequent build step. */
  workdir(dir: string): SandboxTemplate {
    return new SandboxTemplate({ ...this.#state, workdir: dir });
  }

  /** Builds the template server-side, resolving only once it is READY. Returns itself for chaining. */
  async build(options: TemplateBuildOptions = {}): Promise<SandboxTemplate> {
    const engine = engineFromOptions(options);
    await engine.buildTemplateUntilReady(this[COMPILE]());
    return this;
  }

  /** @internal compiled instructions, read by `Sandbox.create`. */
  [COMPILE](): string[] {
    return [...this.#state.instructions];
  }

  #append(command: string): SandboxTemplate {
    const instruction = compile(command, this.#state.env, this.#state.workdir);
    return new SandboxTemplate({
      ...this.#state,
      instructions: [...this.#state.instructions, instruction],
    });
  }
}

/**
 * Folds accumulated env + active workdir into a single instruction. Each
 * instruction is a fresh shell server-side, so exports and `cd` are re-applied
 * per step; the workdir is created (`mkdir -p`) so `cd` always succeeds.
 */
function compile(
  command: string,
  env: ReadonlyArray<readonly [string, string]>,
  workdir: string | undefined,
): string {
  const parts: string[] = [];
  for (const [key, value] of env) parts.push(`export ${key}=${shellQuote(value)}`);
  if (workdir !== undefined) {
    const quoted = shellQuote(workdir);
    parts.push(`mkdir -p ${quoted}`, `cd ${quoted}`);
  }
  parts.push(command);
  return parts.join(" && ");
}

function upsertEnv(
  env: ReadonlyArray<readonly [string, string]>,
  key: string,
  value: string,
): ReadonlyArray<readonly [string, string]> {
  const index = env.findIndex(([k]) => k === key);
  if (index === -1) return [...env, [key, value]];
  const next = env.slice();
  next[index] = [key, value];
  return next;
}

/** POSIX single-quote escaping so values with spaces/quotes survive the shell. */
function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
