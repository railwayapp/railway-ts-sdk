import { engineFromOptions } from "./engine.js";
import type { TemplateBuildOptions } from "./types.js";

interface TemplateState {
  readonly instructions: readonly string[];
  readonly env: ReadonlyArray<readonly [string, string]>;
  readonly workdir?: string;
}

const EMPTY_STATE: TemplateState = { instructions: [], env: [] };

/** Immutable sandbox base recipe returned by `Sandbox.template()`. */
export interface SandboxTemplate {
  /** Add a shell command build step. */
  run(command: string): SandboxTemplate;
  /** Install Debian packages with apt. */
  withPackages(...packages: string[]): SandboxTemplate;
  /** Set environment variables for later build steps. */
  withEnv(vars: Record<string, string>): SandboxTemplate;
  /** Set the working directory for later build steps. */
  workdir(dir: string): SandboxTemplate;
  /** Build the template before creating sandboxes from it. */
  build(options?: TemplateBuildOptions): Promise<SandboxTemplate>;
}

export function createSandboxTemplate(): SandboxTemplate {
  return new SandboxTemplateRecipe(EMPTY_STATE);
}

export function isSandboxTemplate(value: unknown): value is SandboxTemplate {
  return value instanceof SandboxTemplateRecipe;
}

export function compileSandboxTemplate(template: SandboxTemplate): string[] {
  if (!(template instanceof SandboxTemplateRecipe)) {
    throw new TypeError("Expected a SandboxTemplate returned by Sandbox.template().");
  }
  return template.compile();
}

class SandboxTemplateRecipe implements SandboxTemplate {
  readonly #state: TemplateState;

  constructor(state: TemplateState) {
    this.#state = state;
  }

  run(command: string): SandboxTemplate {
    return this.#append(command);
  }

  withPackages(...packages: string[]): SandboxTemplate {
    if (packages.length === 0) return this;
    return this.#append(
      `apt-get update && apt-get install -y --no-install-recommends ${packages.join(" ")}`,
    );
  }

  withEnv(vars: Record<string, string>): SandboxTemplate {
    let env = this.#state.env;
    for (const [key, value] of Object.entries(vars)) {
      env = upsertEnv(env, key, value);
    }
    return new SandboxTemplateRecipe({ ...this.#state, env });
  }

  workdir(dir: string): SandboxTemplate {
    return new SandboxTemplateRecipe({ ...this.#state, workdir: dir });
  }

  async build(options: TemplateBuildOptions = {}): Promise<SandboxTemplate> {
    const engine = engineFromOptions(options);
    await engine.buildTemplateUntilReady(this.compile());
    return this;
  }

  compile(): string[] {
    return [...this.#state.instructions];
  }

  #append(command: string): SandboxTemplate {
    const instruction = compile(command, this.#state.env, this.#state.workdir);
    return new SandboxTemplateRecipe({
      ...this.#state,
      instructions: [...this.#state.instructions, instruction],
    });
  }
}

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

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}
