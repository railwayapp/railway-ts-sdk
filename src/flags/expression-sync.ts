import type { RadarClause, SignalBucketCompare, SignalExpression } from "./types.js";
import { signalBucketRatio } from "./bucket.js";
import { flattenEvaluationContext } from "./context.js";
import type { FlagEvaluationContext } from "./types.js";
import { evaluateClauseSync } from "./clause.js";

function isClause(expr: SignalExpression): expr is RadarClause {
  return "attr" in expr && "op" in expr;
}

function isBucketCompare(expr: SignalExpression): expr is SignalBucketCompare {
  return "bucket" in expr && "op" in expr && "value" in expr;
}

function compareBucket(
  ratio: number,
  op: SignalBucketCompare["op"],
  threshold: number,
): boolean {
  switch (op) {
    case "lt":
      return ratio < threshold;
    case "lte":
      return ratio <= threshold;
    case "gt":
      return ratio > threshold;
    case "gte":
      return ratio >= threshold;
    default: {
      const _exhaustive: never = op;
      return _exhaustive;
    }
  }
}

export function evaluateSignalExpressionSync(
  expr: SignalExpression,
  attributes: Record<string, unknown>,
  opts: { signalName: string; bucketSalt?: string },
): boolean {
  if (isClause(expr)) {
    return evaluateClauseSync(expr, attributes);
  }

  if (isBucketCompare(expr)) {
    const attrValue = attributes[expr.bucket.attr];
    if (attrValue === null || attrValue === undefined) {
      return false;
    }
    if (typeof attrValue !== "string" && typeof attrValue !== "number") {
      return false;
    }

    const salt = expr.bucket.salt ?? opts.bucketSalt ?? opts.signalName;
    const ratio = signalBucketRatio(salt, String(attrValue));
    return compareBucket(ratio, expr.op, expr.value);
  }

  if ("and" in expr) {
    return expr.and.every((sub) =>
      evaluateSignalExpressionSync(sub, attributes, opts),
    );
  }

  if ("or" in expr) {
    return expr.or.some((sub) =>
      evaluateSignalExpressionSync(sub, attributes, opts),
    );
  }

  if ("not" in expr) {
    return !evaluateSignalExpressionSync(expr.not, attributes, opts);
  }

  return false;
}

export function flattenContextAttributes(
  context: FlagEvaluationContext,
): Record<string, unknown> {
  return flattenEvaluationContext(context);
}
