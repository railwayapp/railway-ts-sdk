import {
  normalizeRailwayClientConfig,
  type NormalizedRailwayClientConfig,
} from "../core/config.js";
import { resolveFlagsRegistryOwner, serializeScope } from "./scope.js";
import { contextFromPublic } from "./context.js";
import {
  evaluateFlagRulesetSync,
  parseRegistrySignal,
  traceToSteps,
} from "./resolver.js";
import { fetchRegistrySignals } from "./graphql.js";
import type {
  Context,
  Evaluation,
  FlagsInitOptions,
  FlagsScope,
  Reason,
  RegistrySignalRow,
  SignalRuleset,
  SignalType,
  TraceStep,
} from "./types.js";

const DEFAULT_ACTIVE_REFRESH_INTERVAL_MS = 10_000;
const DEFAULT_IDLE_REFRESH_INTERVAL_MS = 300_000;
const DEFAULT_ACTIVE_WINDOW_MS = 120_000;
const DEFAULT_REFRESH_JITTER = 0.2;
const DEFAULT_BACKOFF_MULTIPLIER = 2;
const DEFAULT_MAX_BACKOFF_MS = 300_000;
const DEFAULT_MIN_REFRESH_INTERVAL_MS = 1_000;

const sharedRefreshes = new Map<string, Promise<RegistrySignalRow[]>>();
const fetchIds = new WeakMap<object, number>();
let nextFetchId = 1;

type ConflictReporter = (flagName: string, scopeOwner: string | undefined) => void;

class FlagsRegistry {
  #rulesets = new Map<string, SignalRuleset>();
  #versionFingerprint = "";
  synced = false;
  stale = false;

  constructor(readonly scopeOwner: string | undefined) {}

  has(name: string): boolean {
    return this.#rulesets.has(name);
  }

  list(): string[] {
    return [...this.#rulesets.keys()].sort();
  }

  async load(config: NormalizedRailwayClientConfig): Promise<void> {
    const rows = await fetchRegistrySignalsShared(config, this.scopeOwner);
    const next = new Map<string, SignalRuleset>();
    const versions: string[] = [];

    for (const row of rows) {
      const ruleset = parseRegistrySignal(row);
      next.set(ruleset.name, ruleset);
      versions.push(`${ruleset.name}:${ruleset.version}`);
    }

    versions.sort();
    const fingerprint = versions.join("|");
    this.#rulesets = next;
    this.#versionFingerprint = fingerprint;
    this.synced = true;
    this.stale = false;
    config.log(`flags refreshed: scope=${this.scopeOwner ?? "default"} count=${next.size}`);
    void this.#versionFingerprint;
  }

  markStale(): void {
    this.stale = true;
    this.synced = false;
  }

  evaluate<T>(
    name: string,
    expected: SignalType | null,
    ctx: Context | undefined,
    fallback: T,
    zero: T,
    onConflict: ConflictReporter,
  ): Evaluation<T> {
    if (this.stale) {
      return evaluation(fallback ?? zero, "STALE", []);
    }

    const ruleset = this.#rulesets.get(name);
    if (!ruleset) {
      return evaluation(fallback ?? zero, "NOT_FOUND", []);
    }

    if (expected != null && ruleset.type !== expected) {
      return evaluation(fallback ?? zero, "TYPE_MISMATCH", []);
    }

    const result = evaluateFlagRulesetSync(ruleset, contextFromPublic(ctx));
    if (result.reason === "CONFLICT") {
      onConflict(name, this.scopeOwner);
    }

    return evaluation(result.value as T, result.reason, traceToSteps(result.trace));
  }
}

class FlagsReadSurface {
  constructor(
    private readonly registry: FlagsRegistry,
    private readonly assertReady: () => void,
    private readonly onConflict: ConflictReporter,
    private readonly getConfig: () => NormalizedRailwayClientConfig,
  ) {}

  getBoolean(name: string, ctx?: Context, fallback?: boolean): boolean {
    return this.evaluateBoolean(name, ctx, fallback).value;
  }

  getString(name: string, ctx?: Context, fallback?: string): string {
    return this.evaluateString(name, ctx, fallback).value;
  }

  getNumber(name: string, ctx?: Context, fallback?: number): number {
    return this.evaluateNumber(name, ctx, fallback).value;
  }

  getJson<T = Record<string, never>>(name: string, ctx?: Context, fallback?: T): T {
    return this.evaluateJson<T>(name, ctx, fallback).value;
  }

  /** Untyped read — returns the resolved value as `unknown` (assert at the call site). */
  get(name: string, ctx?: Context, fallback?: unknown): unknown {
    return this.evaluate(name, ctx, fallback).value;
  }

  evaluate(name: string, ctx?: Context, fallback?: unknown): Evaluation<unknown> {
    this.assertReady();
    return this.registry.evaluate(
      name,
      null,
      ctx,
      fallback,
      undefined,
      this.onConflict,
    );
  }

  evaluateBoolean(name: string, ctx?: Context, fallback?: boolean): Evaluation<boolean> {
    this.assertReady();
    return this.registry.evaluate(
      name,
      "bool",
      ctx,
      fallback ?? false,
      false,
      this.onConflict,
    );
  }

  evaluateString(name: string, ctx?: Context, fallback?: string): Evaluation<string> {
    this.assertReady();
    return this.registry.evaluate(name, "string", ctx, fallback ?? "", "", this.onConflict);
  }

  evaluateNumber(name: string, ctx?: Context, fallback?: number): Evaluation<number> {
    this.assertReady();
    return this.registry.evaluate(name, "number", ctx, fallback ?? 0, 0, this.onConflict);
  }

  evaluateJson<T = Record<string, never>>(
    name: string,
    ctx?: Context,
    fallback?: T,
  ): Evaluation<T> {
    this.assertReady();
    return this.registry.evaluate(name, "json", ctx, fallback ?? ({} as T), {} as T, this.onConflict);
  }

  has(name: string): boolean {
    this.assertReady();
    return this.registry.has(name);
  }

  list(): string[] {
    this.assertReady();
    return this.registry.list();
  }

  async refresh(): Promise<void> {
    this.assertReady();
    await refreshRegistry(this.registry, this.getConfig());
  }
}

class FlagsModule {
  #initialized = false;
  #initOptionsKey: string | undefined;
  #initPromise: Promise<void> | undefined;
  #readyResolve: (() => void) | undefined;
  #ready: Promise<void> = Promise.resolve();
  #config: NormalizedRailwayClientConfig | undefined;
  #refreshEnabled = true;
  #defaultRegistry = new FlagsRegistry(undefined);
  #scopedRegistries = new Map<string, FlagsRegistry>();
  #refreshTimer: ReturnType<typeof setTimeout> | null = null;
  #refreshInFlight: Promise<void> | null = null;
  #lastActivityAt = Number.NEGATIVE_INFINITY;
  #lastRefreshStartedAt = 0;
  #currentBackoffMs = 0;

  get ready(): Promise<void> {
    return this.#ready;
  }

  get synced(): boolean {
    return this.#defaultRegistry.synced;
  }

  async init(options: FlagsInitOptions = {}): Promise<void> {
    const optionsKey = initOptionsKey(options);
    if (this.#initOptionsKey != null && this.#initOptionsKey !== optionsKey) {
      throw new Error("flags.init() called with conflicting options");
    }

    if (this.#initPromise) {
      return this.#initPromise;
    }

    this.#initOptionsKey = optionsKey;
    this.#initPromise = this.#initialize(options).catch((error: unknown) => {
      if (options.required) {
        this.#initialized = false;
        this.#initPromise = undefined;
        this.#initOptionsKey = undefined;
        this.#config = undefined;
      }
      throw error;
    });
    return this.#initPromise;
  }

  scope(scope: FlagsScope): FlagsReadSurface {
    const owner = serializeScope(scope);
    let registry = this.#scopedRegistries.get(owner);
    if (!registry) {
      registry = new FlagsRegistry(owner);
      this.#scopedRegistries.set(owner, registry);
      if (this.#config) {
        void refreshRegistry(registry, this.#config).catch((error: unknown) => {
          this.#config?.log(
            `flags scope refresh failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        });
      }
    }
    return this.#readSurface(registry);
  }

  getBoolean(name: string, ctx?: Context, fallback?: boolean): boolean {
    return this.#defaultSurface().getBoolean(name, ctx, fallback);
  }

  getString(name: string, ctx?: Context, fallback?: string): string {
    return this.#defaultSurface().getString(name, ctx, fallback);
  }

  getNumber(name: string, ctx?: Context, fallback?: number): number {
    return this.#defaultSurface().getNumber(name, ctx, fallback);
  }

  getJson<T = Record<string, never>>(name: string, ctx?: Context, fallback?: T): T {
    return this.#defaultSurface().getJson<T>(name, ctx, fallback);
  }

  get(name: string, ctx?: Context, fallback?: unknown): unknown {
    return this.#defaultSurface().get(name, ctx, fallback);
  }

  evaluate(name: string, ctx?: Context, fallback?: unknown): Evaluation<unknown> {
    return this.#defaultSurface().evaluate(name, ctx, fallback);
  }

  evaluateBoolean(name: string, ctx?: Context, fallback?: boolean): Evaluation<boolean> {
    return this.#defaultSurface().evaluateBoolean(name, ctx, fallback);
  }

  evaluateString(name: string, ctx?: Context, fallback?: string): Evaluation<string> {
    return this.#defaultSurface().evaluateString(name, ctx, fallback);
  }

  evaluateNumber(name: string, ctx?: Context, fallback?: number): Evaluation<number> {
    return this.#defaultSurface().evaluateNumber(name, ctx, fallback);
  }

  evaluateJson<T = Record<string, never>>(
    name: string,
    ctx?: Context,
    fallback?: T,
  ): Evaluation<T> {
    return this.#defaultSurface().evaluateJson<T>(name, ctx, fallback);
  }

  has(name: string): boolean {
    return this.#defaultSurface().has(name);
  }

  list(): string[] {
    return this.#defaultSurface().list();
  }

  async refresh(): Promise<void> {
    await this.#defaultSurface().refresh();
  }

  close(): void {
    if (this.#refreshTimer !== null) {
      clearTimeout(this.#refreshTimer);
      this.#refreshTimer = null;
    }
    this.#initialized = false;
    this.#initPromise = undefined;
    this.#initOptionsKey = undefined;
    this.#ready = Promise.resolve();
    this.#readyResolve = undefined;
    this.#config = undefined;
    this.#refreshEnabled = true;
    this.#defaultRegistry = new FlagsRegistry(undefined);
    this.#scopedRegistries.clear();
    this.#refreshInFlight = null;
    this.#currentBackoffMs = 0;
    this.#lastActivityAt = Number.NEGATIVE_INFINITY;
    this.#lastRefreshStartedAt = 0;
  }

  async #initialize(options: FlagsInitOptions): Promise<void> {
    this.#initialized = true;
    this.#config = normalizeFlagsConfig(options);
    this.#refreshEnabled = options.refresh !== false;
    this.#defaultRegistry = new FlagsRegistry(
      resolveFlagsRegistryOwner(options, this.#config),
    );
    this.#scopedRegistries.clear();

    this.#ready = new Promise<void>((resolve) => {
      this.#readyResolve = resolve;
    });

    try {
      await syncRegistryWithPolicy(this.#defaultRegistry, this.#config, options);
      if (this.#refreshEnabled) {
        this.#scheduleNextRefresh();
      }
    } finally {
      this.#readyResolve?.();
      this.#readyResolve = undefined;
    }
  }

  #defaultSurface(): FlagsReadSurface {
    return this.#readSurface(this.#defaultRegistry);
  }

  #readSurface(registry: FlagsRegistry): FlagsReadSurface {
    return new FlagsReadSurface(
      registry,
      () => this.#assertInitialized(),
      (name, scopeOwner) => {
        this.#config?.log(
          `flags conflict: flag=${name} scope=${scopeOwner ?? "default"} — matching rules disagreed`,
        );
      },
      () => {
        if (!this.#config) {
          throw new Error("Call `await flags.init()` at startup before reading feature flags.");
        }
        return this.#config;
      },
    );
  }

  #assertInitialized(): void {
    if (!this.#initialized) {
      throw new Error("Call `await flags.init()` at startup before reading feature flags.");
    }
    this.#markActiveAndMaybeRefresh();
  }

  #markActiveAndMaybeRefresh(): void {
    if (!this.#config || !this.#refreshEnabled) {
      return;
    }

    const now = Date.now();
    this.#lastActivityAt = now;
    if (
      !this.#refreshInFlight &&
      now - this.#lastRefreshStartedAt >= DEFAULT_ACTIVE_REFRESH_INTERVAL_MS
    ) {
      void this.#refreshAll().catch((error: unknown) => {
        this.#config?.log(
          `flags refresh failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      });
    }
    this.#scheduleNextRefresh();
  }

  #scheduleNextRefresh(): void {
    if (this.#refreshTimer !== null) {
      clearTimeout(this.#refreshTimer);
      this.#refreshTimer = null;
    }
    if (!this.#config || !this.#refreshEnabled) {
      return;
    }

    const delay = this.#nextRefreshDelayMs();
    this.#refreshTimer = setTimeout(() => {
      this.#refreshTimer = null;
      void this.#refreshAll()
        .catch((error: unknown) => {
          this.#config?.log(
            `flags refresh failed: ${error instanceof Error ? error.message : String(error)}`,
          );
        })
        .finally(() => {
          this.#scheduleNextRefresh();
        });
    }, delay);
    if (typeof this.#refreshTimer === "object" && "unref" in this.#refreshTimer) {
      this.#refreshTimer.unref();
    }
  }

  #nextRefreshDelayMs(): number {
    const now = Date.now();
    const active = now - this.#lastActivityAt <= DEFAULT_ACTIVE_WINDOW_MS;
    const base = active
      ? DEFAULT_ACTIVE_REFRESH_INTERVAL_MS
      : DEFAULT_IDLE_REFRESH_INTERVAL_MS;
    const withBackoff = Math.max(base, this.#currentBackoffMs);
    const elapsed = now - this.#lastRefreshStartedAt;
    const minimumDelay = Math.max(0, DEFAULT_MIN_REFRESH_INTERVAL_MS - elapsed);
    return Math.max(minimumDelay, applyJitter(withBackoff, DEFAULT_REFRESH_JITTER));
  }

  async #refreshAll(): Promise<void> {
    if (this.#refreshInFlight) {
      return this.#refreshInFlight;
    }

    if (!this.#config) {
      return;
    }

    this.#lastRefreshStartedAt = Date.now();
    this.#refreshInFlight = (async () => {
      const registries = [this.#defaultRegistry, ...this.#scopedRegistries.values()];
      try {
        await Promise.all(registries.map((registry) => refreshRegistry(registry, this.#config!)));
        this.#currentBackoffMs = 0;
      } catch {
        for (const registry of registries) {
          registry.markStale();
        }
        this.#currentBackoffMs =
          this.#currentBackoffMs > 0
            ? Math.min(
                this.#currentBackoffMs * DEFAULT_BACKOFF_MULTIPLIER,
                DEFAULT_MAX_BACKOFF_MS,
              )
            : Math.min(DEFAULT_ACTIVE_REFRESH_INTERVAL_MS, DEFAULT_MAX_BACKOFF_MS);
        throw new Error("flags registry refresh failed");
      }
    })().finally(() => {
      this.#refreshInFlight = null;
    });

    return this.#refreshInFlight;
  }
}

function evaluation<T>(value: T, reason: Reason, trace: TraceStep[]): Evaluation<T> {
  return { value, reason, trace };
}

async function syncRegistryWithPolicy(
  registry: FlagsRegistry,
  config: NormalizedRailwayClientConfig,
  options: FlagsInitOptions,
): Promise<void> {
  const sync = refreshRegistry(registry, config);
  if (options.timeoutMs == null) {
    try {
      await sync;
    } catch (error) {
      registry.markStale();
      if (options.required) {
        throw error;
      }
    }
    return;
  }

  try {
    await Promise.race([
      sync,
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("flags init timed out")), options.timeoutMs);
      }),
    ]);
  } catch (error) {
    registry.markStale();
    if (options.required) {
      throw error;
    }
  }
}

async function refreshRegistry(
  registry: FlagsRegistry,
  config: NormalizedRailwayClientConfig,
): Promise<void> {
  await registry.load(config);
}

function normalizeFlagsConfig(options: FlagsInitOptions): NormalizedRailwayClientConfig {
  return normalizeRailwayClientConfig({
    ...(options.token !== undefined ? { token: options.token } : {}),
    ...(options.authType !== undefined ? { authType: options.authType } : {}),
    ...(options.endpoint !== undefined ? { endpoint: options.endpoint } : {}),
    ...(options.fetch !== undefined ? { fetch: options.fetch } : {}),
    ...(options.verbose !== undefined ? { verbose: options.verbose } : {}),
  });
}

function initOptionsKey(options: FlagsInitOptions): string {
  return JSON.stringify({
    token: options.token,
    scope: options.scope,
    refresh: options.refresh,
    timeoutMs: options.timeoutMs,
    required: options.required,
    authType: options.authType,
    endpoint: options.endpoint,
    verbose: options.verbose,
  });
}

function applyJitter(delayMs: number, jitter: number): number {
  if (delayMs <= 0 || jitter <= 0) {
    return delayMs;
  }
  const boundedJitter = Math.min(Math.max(jitter, 0), 1);
  const factor = 1 + (Math.random() * 2 - 1) * boundedJitter;
  return Math.max(0, Math.round(delayMs * factor));
}

async function fetchRegistrySignalsShared(
  config: NormalizedRailwayClientConfig,
  scopeOwner: string | undefined,
): Promise<RegistrySignalRow[]> {
  const key = refreshKey(config, scopeOwner);
  const existing = sharedRefreshes.get(key);
  if (existing) {
    return existing;
  }

  const refresh = fetchRegistrySignals(config, scopeOwner).finally(() => {
    sharedRefreshes.delete(key);
  });
  sharedRefreshes.set(key, refresh);
  return refresh;
}

function refreshKey(
  config: NormalizedRailwayClientConfig,
  scopeOwner: string | undefined,
): string {
  return [
    config.endpoint,
    scopeOwner ?? "default",
    config.token,
    fetchIdentity(config.fetch),
  ].join("\0");
}

function fetchIdentity(fetchImpl: typeof fetch): number {
  const key = fetchImpl as unknown as object;
  const existing = fetchIds.get(key);
  if (existing !== undefined) {
    return existing;
  }
  const id = nextFetchId++;
  fetchIds.set(key, id);
  return id;
}

/** Module singleton. Call `await flags.init()` once at startup, then read from `flags`. */
export const flags = new FlagsModule();

export type { FlagsReadSurface };
