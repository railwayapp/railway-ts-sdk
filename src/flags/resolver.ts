import type {
  FlagEvaluationContext,
  FlagEvaluationReason,
  SignalType,
  SignalResolutionOutcome,
  SignalResolutionTrace,
  SignalResolveResult,
  SignalRule,
  SignalRuleset,
  SignalSource,
} from "./types.js";
import type { AttributeResolver, ListResolver } from "./context.js";
import {
  createResolversFromContext,
  normalizeEvaluationContext,
} from "./context.js";
import { evaluateSignalExpression } from "./expression.js";
import {
  evaluateSignalExpressionSync,
  flattenContextAttributes,
} from "./expression-sync.js";

function sourceValue(source: SignalSource): unknown | null {
  if (source.type === "literal") {
    return source.value;
  }
  return null;
}

function valuesAgree(values: unknown[]): boolean {
  if (values.length <= 1) return true;
  const first = JSON.stringify(values[0]);
  return values.every((v) => JSON.stringify(v) === first);
}

export async function resolveSignal(
  ruleset: Pick<SignalRuleset, "name" | "default" | "rules">,
  attrResolver: AttributeResolver,
  listResolver: ListResolver,
): Promise<SignalResolveResult> {
  const matchedRules: SignalResolutionTrace["matchedRules"] = [];
  const matchedValues: unknown[] = [];

  for (const rule of ruleset.rules) {
    const matched = await evaluateSignalExpression(
      rule.expression,
      attrResolver,
      listResolver,
      { signalName: ruleset.name },
    );
    const value = matched ? sourceValue(rule.source) : null;

    matchedRules.push({
      ruleId: rule.id,
      matched,
      source: rule.source,
      value,
    });

    if (matched && value !== null) {
      matchedValues.push(value);
    }
  }

  let outcome: SignalResolutionOutcome;
  let value: unknown;

  if (matchedValues.length === 0) {
    outcome = "no_match";
    value = ruleset.default;
  } else if (!valuesAgree(matchedValues)) {
    outcome = "disagreement";
    value = ruleset.default;
  } else {
    outcome = "agreed";
    value = matchedValues[0];
  }

  return {
    value,
    trace: {
      signalName: ruleset.name,
      default: ruleset.default,
      matchedRules,
      outcome,
      value,
    },
  };
}

function isBucketExpression(expr: SignalRule["expression"]): boolean {
  return "bucket" in expr;
}

function evaluationReasonFromTrace(
  trace: SignalResolutionTrace,
  rules: SignalRule[],
): FlagEvaluationReason {
  if (trace.outcome === "no_match" || trace.outcome === "disagreement") {
    return "DEFAULT";
  }

  const matchedIds = new Set(
    trace.matchedRules
      .filter((entry) => entry.matched && entry.value !== null)
      .map((entry) => entry.ruleId),
  );

  for (const rule of rules) {
    if (matchedIds.has(rule.id) && isBucketExpression(rule.expression)) {
      return "SPLIT";
    }
  }

  return "TARGETING_MATCH";
}

export async function evaluateFlagRuleset(
  ruleset: SignalRuleset,
  context: FlagEvaluationContext,
): Promise<SignalResolveResult & { reason: FlagEvaluationReason }> {
  const normalized = normalizeEvaluationContext(context);
  const { attrResolver, listResolver } = createResolversFromContext(normalized);
  const result = await resolveSignal(ruleset, attrResolver, listResolver);

  return {
    ...result,
    reason: evaluationReasonFromTrace(result.trace, ruleset.rules),
  };
}

export function evaluateFlagRulesetSync(
  ruleset: SignalRuleset,
  context: FlagEvaluationContext,
): SignalResolveResult & { reason: FlagEvaluationReason } {
  const attributes = flattenContextAttributes(normalizeEvaluationContext(context));
  const matchedRules: SignalResolutionTrace["matchedRules"] = [];
  const matchedValues: unknown[] = [];

  for (const rule of ruleset.rules) {
    const matched = evaluateSignalExpressionSync(rule.expression, attributes, {
      signalName: ruleset.name,
    });
    const value = matched ? sourceValue(rule.source) : null;

    matchedRules.push({
      ruleId: rule.id,
      matched,
      source: rule.source,
      value,
    });

    if (matched && value !== null) {
      matchedValues.push(value);
    }
  }

  let outcome: SignalResolutionOutcome;
  let value: unknown;

  if (matchedValues.length === 0) {
    outcome = "no_match";
    value = ruleset.default;
  } else if (!valuesAgree(matchedValues)) {
    outcome = "disagreement";
    value = ruleset.default;
  } else {
    outcome = "agreed";
    value = matchedValues[0];
  }

  const trace: SignalResolutionTrace = {
    signalName: ruleset.name,
    default: ruleset.default,
    matchedRules,
    outcome,
    value,
  };

  return {
    value,
    trace,
    reason: evaluationReasonFromTrace(trace, ruleset.rules),
  };
}

export function parseSignalRules(raw: unknown): SignalRule[] {
  if (!Array.isArray(raw)) {
    throw new Error("invalid signal rules");
  }
  return raw as SignalRule[];
}

export function parseRegistrySignal(row: {
  name: string;
  type: string;
  default: unknown;
  rules: unknown;
  version: string;
}): SignalRuleset {
  const type = normalizeSignalType(row.type);
  if (type !== "bool" && type !== "string" && type !== "number" && type !== "json") {
    throw new Error(`unsupported signal type: ${row.type}`);
  }

  return {
    name: row.name,
    type,
    default: row.default,
    rules: parseSignalRules(row.rules),
    version: row.version,
  };
}

function normalizeSignalType(type: string): SignalType | string {
  return type.toLowerCase();
}
