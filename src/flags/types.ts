/** Radar-style attribute clause reused by signal expressions. */
export type RadarOperator =
  | "eq"
  | "neq"
  | "gt"
  | "lt"
  | "gte"
  | "lte"
  | "in_list"
  | "not_in_list"
  | "contains"
  | "not_contains"
  | "matches";

export interface RadarClause {
  attr: string;
  op: RadarOperator;
  value?: string | number | boolean;
  list?: string;
  match?: "exact" | "substring";
}

/** Percentage rollout: bucket(attr) compared to a threshold in [0, 1]. */
export interface SignalBucketCompare {
  bucket: {
    attr: string;
    salt?: string;
  };
  op: "lt" | "lte" | "gt" | "gte";
  value: number;
}

export type SignalExpression =
  | { and: SignalExpression[] }
  | { or: SignalExpression[] }
  | { not: SignalExpression }
  | RadarClause
  | SignalBucketCompare;

export type SignalType = "bool" | "string" | "number" | "json";

export type SignalSource =
  | { type: "literal"; value: unknown }
  | { type: "sandbox"; sandboxId: string };

export interface SignalRule {
  id: string;
  expression: SignalExpression;
  source: SignalSource;
}

export interface SignalSnapshot {
  default: unknown;
  rules: SignalRule[];
}

export interface SignalRuleset {
  name: string;
  type: SignalType;
  default: unknown;
  rules: SignalRule[];
  version: string;
}

export type SignalResolutionOutcome =
  | "default"
  | "agreed"
  | "disagreement"
  | "no_match";

export interface SignalResolutionRuleTrace {
  ruleId: string;
  matched: boolean;
  source: SignalSource;
  value: unknown | null;
}

export interface SignalResolutionTrace {
  signalName: string;
  default: unknown;
  matchedRules: SignalResolutionRuleTrace[];
  outcome: SignalResolutionOutcome;
  value: unknown;
}

export interface SignalResolveResult {
  value: unknown;
  trace: SignalResolutionTrace;
}

export interface FlagEvaluationContext {
  targetingKey?: string;
  attributes?: Record<string, unknown>;
}

export type FlagEvaluationReason = "DEFAULT" | "TARGETING_MATCH" | "SPLIT";

export interface FlagEvaluationResult<T = unknown> {
  value: T;
  reason: FlagEvaluationReason;
  trace: SignalResolutionTrace;
}

export const SIGNAL_TARGETING_KEY_ATTR = "targetingKey";

export interface FlagsInitOptions {
  /** Owner scope, e.g. `workspace:<id>`. Defaults to `RAILWAY_SIGNALS_OWNER`. */
  owner?: string;
  /** Registry poll interval in ms. Default 30_000. Set 0 to disable polling. */
  pollIntervalMs?: number;
  token?: string;
  endpoint?: string;
  fetch?: typeof fetch;
  verbose?: boolean;
}

export interface RegistrySignalRow {
  name: string;
  type: SignalType;
  default: unknown;
  rules: unknown;
  version: string;
}
