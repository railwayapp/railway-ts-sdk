import type { RailwayAuthType } from "../core/config.js";

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

export type AttributeValue = string | number | boolean;

/** Flat evaluation context. `key` is the stable bucketing identity for splits. */
export type Context = { key?: string } & Record<string, AttributeValue>;

/** Internal normalized shape used by the resolver pipeline. */
export interface FlagEvaluationContext {
  targetingKey?: string;
  attributes?: Record<string, unknown>;
}

export const SIGNAL_TARGETING_KEY_ATTR = "targetingKey";
export const SIGNAL_KEY_ATTR = "key";

export type Reason =
  | "TARGETING_MATCH"
  | "SPLIT"
  | "NO_MATCH"
  | "CONFLICT"
  | "NOT_FOUND"
  | "TYPE_MISMATCH"
  | "STALE"
  | "NO_KEY";

export interface TraceStep {
  ruleId: string;
  matched: boolean;
  value: unknown | null;
}

export interface Evaluation<T> {
  value: T;
  reason: Reason;
  trace: TraceStep[];
}

export type FlagsScope =
  | { workspaceId: string; projectId?: never }
  | { projectId: string; workspaceId?: never };

export interface FlagsInitOptions {
  /** Override token for off-platform/local dev. Defaults to `RAILWAY_API_TOKEN`. */
  token?: string;
  /** Override scope. Defaults to server-side inference from the token. */
  scope?: FlagsScope;
  /** Disable background polling after the initial load. */
  refresh?: false;
  /** Bound the initial sync wait (serverless cold starts). */
  timeoutMs?: number;
  /** Reject `init()` when the first registry sync fails. */
  required?: true;
  /** Auth header mode. Use `project-token` when passing a Railway project token. */
  authType?: RailwayAuthType;
  endpoint?: string;
  fetch?: typeof fetch;
  verbose?: boolean;
}

export interface RegistrySignalRow {
  name: string;
  type: string;
  default: unknown;
  rules: unknown;
  version: string;
}
