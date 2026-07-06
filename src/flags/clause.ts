import type { RadarClause } from "./types.js";
import type { AttributeResolver, ListResolver } from "./context.js";

export async function evaluateClause(
  clause: RadarClause,
  attrResolver: AttributeResolver,
  listResolver: ListResolver,
): Promise<boolean> {
  const result = await evaluateClauseNullable(clause, attrResolver, listResolver);
  return result === true;
}

async function evaluateClauseNullable(
  clause: RadarClause,
  attrResolver: AttributeResolver,
  listResolver: ListResolver,
): Promise<boolean | null> {
  const attrValue = await attrResolver.resolve(clause.attr);

  if (attrValue === null || attrValue === undefined) {
    return null;
  }

  switch (clause.op) {
    case "eq":
      return attrValue === clause.value;
    case "neq":
      return attrValue !== clause.value;
    case "gt":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return null;
      }
      return attrValue > clause.value;
    case "lt":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return null;
      }
      return attrValue < clause.value;
    case "gte":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return null;
      }
      return attrValue >= clause.value;
    case "lte":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return null;
      }
      return attrValue <= clause.value;
    case "contains":
      if (typeof attrValue !== "string" || typeof clause.value !== "string") {
        return null;
      }
      return attrValue.includes(clause.value);
    case "not_contains":
      if (typeof attrValue !== "string" || typeof clause.value !== "string") {
        return null;
      }
      return !attrValue.includes(clause.value);
    case "matches":
      if (typeof attrValue !== "string" || typeof clause.value !== "string") {
        return null;
      }
      try {
        return new RegExp(clause.value).test(attrValue);
      } catch {
        return false;
      }
    case "in_list":
      return evaluateListOp(attrValue, clause, listResolver, false);
    case "not_in_list":
      return evaluateListOp(attrValue, clause, listResolver, true);
    default:
      return false;
  }
}

async function evaluateListOp(
  attrValue: unknown,
  clause: RadarClause,
  listResolver: ListResolver,
  negate: boolean,
): Promise<boolean | null> {
  if (typeof attrValue !== "string" || !clause.list) {
    return null;
  }

  const items = await listResolver.resolve(clause.list);
  const matchMode = clause.match ?? "exact";

  let found: boolean;
  if (matchMode === "substring") {
    found = items.some((item) => attrValue.includes(item));
  } else {
    found = items.includes(attrValue);
  }

  return negate ? !found : found;
}

export function evaluateClauseSync(
  clause: RadarClause,
  attributes: Record<string, unknown>,
  lists: Record<string, string[]> = {},
): boolean {
  const attrValue = attributes[clause.attr];

  if (attrValue === null || attrValue === undefined) {
    return false;
  }

  switch (clause.op) {
    case "eq":
      return attrValue === clause.value;
    case "neq":
      return attrValue !== clause.value;
    case "gt":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return false;
      }
      return attrValue > clause.value;
    case "lt":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return false;
      }
      return attrValue < clause.value;
    case "gte":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return false;
      }
      return attrValue >= clause.value;
    case "lte":
      if (typeof attrValue !== "number" || typeof clause.value !== "number") {
        return false;
      }
      return attrValue <= clause.value;
    case "contains":
      if (typeof attrValue !== "string" || typeof clause.value !== "string") {
        return false;
      }
      return attrValue.includes(clause.value);
    case "not_contains":
      if (typeof attrValue !== "string" || typeof clause.value !== "string") {
        return false;
      }
      return !attrValue.includes(clause.value);
    case "matches":
      if (typeof attrValue !== "string" || typeof clause.value !== "string") {
        return false;
      }
      try {
        return new RegExp(clause.value).test(attrValue);
      } catch {
        return false;
      }
    case "in_list":
      return evaluateListOpSync(attrValue, clause, lists, false);
    case "not_in_list":
      return evaluateListOpSync(attrValue, clause, lists, true);
    default:
      return false;
  }
}

function evaluateListOpSync(
  attrValue: unknown,
  clause: RadarClause,
  lists: Record<string, string[]>,
  negate: boolean,
): boolean {
  if (typeof attrValue !== "string" || !clause.list) {
    return false;
  }

  const items = lists[clause.list] ?? [];
  const matchMode = clause.match ?? "exact";

  let found: boolean;
  if (matchMode === "substring") {
    found = items.some((item) => attrValue.includes(item));
  } else {
    found = items.includes(attrValue);
  }

  return negate ? !found : found;
}
