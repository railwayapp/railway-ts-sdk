import {
  normalizeRailwayClientConfig,
  type NormalizedRailwayClientConfig,
} from "../core/config.js";
import { evaluateFlagRulesetSync, parseRegistrySignal } from "./resolver.js";
import { fetchRegistrySignals } from "./graphql.js";
import type {
  FlagEvaluationContext,
  FlagEvaluationResult,
  FlagsInitOptions,
  SignalRuleset,
  SignalType,
} from "./types.js";

const DEFAULT_POLL_INTERVAL_MS = 30_000;
const SIGNALS_OWNER_ENV = "RAILWAY_SIGNALS_OWNER";

export class FlagNotFoundError extends Error {
  constructor(name: string) {
    super(`Feature flag "${name}" is not registered for this owner scope.`);
    this.name = "FlagNotFoundError";
  }
}

export class FlagsNotInitializedError extends Error {
  constructor() {
    super("Call `await flags.init()` before reading feature flags.");
    this.name = "FlagsNotInitializedError";
  }
}

export class FlagsClient {
  #config?: NormalizedRailwayClientConfig;
  #owner?: string;
  #rulesets = new Map<string, SignalRuleset>();
  #versionFingerprint = "";
  #pollTimer: ReturnType<typeof setInterval> | null = null;
  #refreshInFlight: Promise<void> | null = null;

  async init(options: FlagsInitOptions = {}): Promise<void> {
    this.close();

    this.#config = normalizeRailwayClientConfig({
      ...(options.token !== undefined ? { token: options.token } : {}),
      ...(options.endpoint !== undefined ? { endpoint: options.endpoint } : {}),
      ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
      ...(options.verbose !== undefined ? { verbose: options.verbose } : {}),
    });

    this.#owner = resolveOwner(options.owner);
    await this.refresh();

    const pollIntervalMs = options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
    if (pollIntervalMs > 0) {
      this.#pollTimer = setInterval(() => {
        void this.refresh().catch((error: unknown) => {
          this.#config?.log(
            `flags refresh failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }, pollIntervalMs);
      if (typeof this.#pollTimer === "object" && "unref" in this.#pollTimer) {
        this.#pollTimer.unref();
      }
    }
  }

  /** Pull the latest registry snapshot when any signal version changes. */
  async refresh(): Promise<void> {
    if (this.#refreshInFlight) {
      return this.#refreshInFlight;
    }

    this.#refreshInFlight = this.#refreshOnce().finally(() => {
      this.#refreshInFlight = null;
    });
    return this.#refreshInFlight;
  }

  async #refreshOnce(): Promise<void> {
    const config = this.requireConfig();
    const owner = this.requireOwner();

    const rows = await fetchRegistrySignals(config, owner);
    const next = new Map<string, SignalRuleset>();
    const versions: string[] = [];

    for (const row of rows) {
      const ruleset = parseRegistrySignal(row);
      next.set(ruleset.name, ruleset);
      versions.push(`${ruleset.name}:${ruleset.version}`);
    }

    versions.sort();
    const fingerprint = versions.join("|");
    if (fingerprint !== this.#versionFingerprint) {
      this.#rulesets = next;
      this.#versionFingerprint = fingerprint;
      config.log(`flags refreshed: owner=${owner} count=${next.size}`);
    }
  }

  get<T = unknown>(
    name: string,
    context: FlagEvaluationContext = {},
  ): FlagEvaluationResult<T> {
    const ruleset = this.requireRuleset(name);
    const evaluation = evaluateFlagRulesetSync(ruleset, context);
    return {
      value: evaluation.value as T,
      reason: evaluation.reason,
      trace: evaluation.trace,
    };
  }

  getBoolean(name: string, context: FlagEvaluationContext = {}): boolean {
    return this.getTyped(name, "bool", context) as boolean;
  }

  getString(name: string, context: FlagEvaluationContext = {}): string {
    return this.getTyped(name, "string", context) as string;
  }

  getNumber(name: string, context: FlagEvaluationContext = {}): number {
    return this.getTyped(name, "number", context) as number;
  }

  getJson<T = unknown>(name: string, context: FlagEvaluationContext = {}): T {
    return this.getTyped(name, "json", context) as T;
  }

  has(name: string): boolean {
    return this.#rulesets.has(name);
  }

  list(): string[] {
    return [...this.#rulesets.keys()].sort();
  }

  close(): void {
    if (this.#pollTimer !== null) {
      clearInterval(this.#pollTimer);
      this.#pollTimer = null;
    }
  }

  private getTyped(
    name: string,
    expected: SignalType,
    context: FlagEvaluationContext,
  ): unknown {
    const ruleset = this.requireRuleset(name);
    if (ruleset.type !== expected) {
      throw new Error(
        `Feature flag "${name}" is type ${ruleset.type}, not ${expected}.`,
      );
    }
    return this.get(name, context).value;
  }

  private requireRuleset(name: string): SignalRuleset {
    if (!this.#config || !this.#owner) {
      throw new FlagsNotInitializedError();
    }
    const ruleset = this.#rulesets.get(name);
    if (!ruleset) {
      throw new FlagNotFoundError(name);
    }
    return ruleset;
  }

  private requireConfig(): NormalizedRailwayClientConfig {
    if (!this.#config) {
      throw new FlagsNotInitializedError();
    }
    return this.#config;
  }

  private requireOwner(): string {
    if (!this.#owner) {
      throw new FlagsNotInitializedError();
    }
    return this.#owner;
  }
}

function resolveOwner(explicit?: string): string {
  const owner =
    explicit ??
    (typeof process !== "undefined" ? process.env?.[SIGNALS_OWNER_ENV] : undefined);
  if (!owner?.trim()) {
    throw new Error(
      `Feature flags owner scope is required. Pass owner to flags.init() or set ${SIGNALS_OWNER_ENV}.`,
    );
  }
  return owner.trim();
}

/** Singleton client exported as `flags`. */
export const flags = new FlagsClient();
