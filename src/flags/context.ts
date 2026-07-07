import type { Context, FlagEvaluationContext } from "./types.js";
import { SIGNAL_KEY_ATTR, SIGNAL_TARGETING_KEY_ATTR } from "./types.js";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

/** Normalize the public flat `Context` into the internal resolver shape. */
export function normalizeEvaluationContext(raw: unknown): FlagEvaluationContext {
  if (!isPlainObject(raw)) {
    return {};
  }

  const { key, targetingKey, attributes, ...rest } = raw;
  const resolvedKey =
    typeof key === "string" ? key : typeof targetingKey === "string" ? targetingKey : undefined;

  const normalizedAttributes: Record<string, unknown> = {
    ...rest,
    ...(isPlainObject(attributes) ? attributes : {}),
  };

  return {
    ...(resolvedKey !== undefined ? { targetingKey: resolvedKey } : {}),
    ...(Object.keys(normalizedAttributes).length > 0
      ? { attributes: normalizedAttributes }
      : {}),
  };
}

function flattenAttributes(
  value: unknown,
  prefix: string,
  out: Record<string, unknown>,
): void {
  if (value == null) {
    if (prefix) out[prefix] = value;
    return;
  }

  if (Array.isArray(value)) {
    out[prefix || "value"] = value;
    return;
  }

  if (isPlainObject(value)) {
    if (prefix === "") {
      for (const [key, nested] of Object.entries(value)) {
        flattenAttributes(nested, key, out);
      }
      return;
    }
    for (const [key, nested] of Object.entries(value)) {
      flattenAttributes(nested, `${prefix}.${key}`, out);
    }
    return;
  }

  out[prefix] = value;
}

export function flattenEvaluationContext(
  context: FlagEvaluationContext,
): Record<string, unknown> {
  const flat: Record<string, unknown> = {};

  if (context.targetingKey != null) {
    flat[SIGNAL_TARGETING_KEY_ATTR] = context.targetingKey;
    flat[SIGNAL_KEY_ATTR] = context.targetingKey;
  }

  if (context.attributes != null) {
    flattenAttributes(context.attributes, "", flat);
  }

  return flat;
}

export interface AttributeResolver {
  resolve(attr: string): Promise<unknown>;
}

export interface ListResolver {
  resolve(listName: string): Promise<string[]>;
}

export class StaticAttributeResolver implements AttributeResolver {
  constructor(private readonly attributes: Record<string, unknown>) {}

  resolve(attr: string): Promise<unknown> {
    return Promise.resolve(this.attributes[attr] ?? null);
  }
}

export class StaticListResolver implements ListResolver {
  constructor(private readonly lists: Record<string, string[]>) {}

  resolve(listName: string): Promise<string[]> {
    return Promise.resolve(this.lists[listName] ?? []);
  }
}

export function createResolversFromContext(context: FlagEvaluationContext): {
  attrResolver: AttributeResolver;
  listResolver: ListResolver;
} {
  const flat = flattenEvaluationContext(context);
  return {
    attrResolver: new StaticAttributeResolver(flat),
    listResolver: new StaticListResolver({}),
  };
}

export function contextFromPublic(ctx?: Context): FlagEvaluationContext {
  return normalizeEvaluationContext(ctx ?? {});
}
