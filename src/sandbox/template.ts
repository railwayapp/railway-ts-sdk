import { engineFromOptions } from "./engine.js";
import { shellQuote } from "./shell.js";
import type { CompiledTemplate, TemplateBuildOptions } from "./types.js";

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
  /**
   * Set build-time environment variables available to the build instructions.
   * Values may use Railway references (e.g. `${{shared.FOO}}`), resolved at
   * build time. Build-time only — runtime env comes from `create({ env })`.
   */
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

export function compileSandboxTemplate(
  template: SandboxTemplate,
): CompiledTemplate {
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
    const compiled = this.compile();
    // Nothing to build without instructions; build-time env alone has no effect.
    if (compiled.instructions.length > 0) {
      await engineFromOptions(options).buildTemplateUntilReady(compiled);
    }
    return this;
  }

  compile(): CompiledTemplate {
    const instructions = [...this.#state.instructions];
    if (this.#state.env.length === 0) return { instructions };
    return { instructions, variables: Object.fromEntries(this.#state.env) };
  }

  #append(command: string): SandboxTemplate {
    const instruction = compileInstruction(command, this.#state.workdir);
    return new SandboxTemplateRecipe({
      ...this.#state,
      instructions: [...this.#state.instructions, instruction],
    });
  }
}

function compileInstruction(command: string, workdir: string | undefined): string {
  if (workdir === undefined) return command;
  const quoted = shellQuote(workdir);
  return `mkdir -p ${quoted} && cd ${quoted} && ${command}`;
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
