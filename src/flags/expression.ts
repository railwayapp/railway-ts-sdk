import type {
  RadarClause,
  SignalBucketCompare,
  SignalExpression,
} from "./types.js";
import type { AttributeResolver, ListResolver } from "./context.js";
import { evaluateClause } from "./clause.js";
import { signalBucketRatio } from "./bucket.js";

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

export async function evaluateSignalExpression(
  expr: SignalExpression,
  attrResolver: AttributeResolver,
  listResolver: ListResolver,
  opts: { signalName: string; bucketSalt?: string },
): Promise<boolean> {
  if (isClause(expr)) {
    return evaluateClause(expr, attrResolver, listResolver);
  }

  if (isBucketCompare(expr)) {
    const attrValue = await attrResolver.resolve(expr.bucket.attr);
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
    for (const sub of expr.and) {
      const matched = await evaluateSignalExpression(
        sub,
        attrResolver,
        listResolver,
        opts,
      );
      if (!matched) return false;
    }
    return true;
  }

  if ("or" in expr) {
    for (const sub of expr.or) {
      const matched = await evaluateSignalExpression(
        sub,
        attrResolver,
        listResolver,
        opts,
      );
      if (matched) return true;
    }
    return false;
  }

  if ("not" in expr) {
    const matched = await evaluateSignalExpression(
      expr.not,
      attrResolver,
      listResolver,
      opts,
    );
    return !matched;
  }

  return false;
}
