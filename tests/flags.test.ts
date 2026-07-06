import { describe, expect, it } from "vitest";

import { signalBucketRatio } from "../src/flags/bucket.js";
import { FlagsClient } from "../src/flags/client.js";
import { evaluateFlagRulesetSync, parseRegistrySignal } from "../src/flags/resolver.js";
import type { SignalRuleset } from "../src/flags/types.js";

describe("signalBucketRatio", () => {
  it("is deterministic for the same salt and subject", () => {
    const a = signalBucketRatio("checkout.v2", "user-123");
    const b = signalBucketRatio("checkout.v2", "user-123");
    expect(a).toBe(b);
  });

  it("returns values in [0, 1)", () => {
    for (let i = 0; i < 100; i++) {
      const ratio = signalBucketRatio("flag", `subject-${i}`);
      expect(ratio).toBeGreaterThanOrEqual(0);
      expect(ratio).toBeLessThan(1);
    }
  });
});

describe("evaluateFlagRulesetSync", () => {
  const baseRuleset: SignalRuleset = {
    name: "checkout.v2",
    type: "bool",
    default: false,
    version: "1",
    rules: [
      {
        id: "enterprise",
        expression: { attr: "plan", op: "eq", value: "enterprise" },
        source: { type: "literal", value: true },
      },
    ],
  };

  it("returns default when no rules match", () => {
    const result = evaluateFlagRulesetSync(baseRuleset, {
      attributes: { plan: "free" },
    });
    expect(result.value).toBe(false);
    expect(result.reason).toBe("DEFAULT");
    expect(result.trace.outcome).toBe("no_match");
  });

  it("returns rule value when a rule matches", () => {
    const result = evaluateFlagRulesetSync(baseRuleset, {
      attributes: { plan: "enterprise" },
    });
    expect(result.value).toBe(true);
    expect(result.reason).toBe("TARGETING_MATCH");
    expect(result.trace.outcome).toBe("agreed");
  });

  it("falls back to default when matching rules disagree", () => {
    const ruleset: SignalRuleset = {
      ...baseRuleset,
      rules: [
        {
          id: "a",
          expression: { attr: "plan", op: "eq", value: "enterprise" },
          source: { type: "literal", value: true },
        },
        {
          id: "b",
          expression: { attr: "region", op: "eq", value: "us" },
          source: { type: "literal", value: false },
        },
      ],
    };

    const result = evaluateFlagRulesetSync(ruleset, {
      attributes: { plan: "enterprise", region: "us" },
    });
    expect(result.value).toBe(false);
    expect(result.reason).toBe("DEFAULT");
    expect(result.trace.outcome).toBe("disagreement");
  });

  it("classifies bucket matches as SPLIT", () => {
    const ruleset: SignalRuleset = {
      ...baseRuleset,
      rules: [
        {
          id: "canary",
          expression: {
            bucket: { attr: "targetingKey" },
            op: "lt",
            value: 1,
          },
          source: { type: "literal", value: true },
        },
      ],
    };

    const result = evaluateFlagRulesetSync(ruleset, {
      targetingKey: "user-123",
    });
    expect(result.value).toBe(true);
    expect(result.reason).toBe("SPLIT");
  });
});

describe("FlagsClient", () => {
  it("loads registry snapshots and resolves flags in-process", async () => {
    const flags = new FlagsClient();

    const fetch = viFetch([
      {
        data: {
          signals: [
            {
              name: "checkout.v2",
              type: "bool",
              default: false,
              version: "3",
              rules: [
                {
                  id: "enterprise",
                  expression: { attr: "plan", op: "eq", value: "enterprise" },
                  source: { type: "literal", value: true },
                },
              ],
            },
          ],
        },
      },
    ]);

    await flags.init({
      owner: "workspace:test",
      token: "token_123",
      pollIntervalMs: 0,
      fetch,
    });

    expect(
      flags.getBoolean("checkout.v2", false, {
        attributes: { plan: "enterprise" },
      }).value,
    ).toBe(true);
    expect(
      flags.getBoolean("checkout.v2", true, { attributes: { plan: "free" } }).value,
    ).toBe(false);
    expect(flags.list()).toEqual(["checkout.v2"]);

    flags.close();
  });

  it("returns errors as values and falls back for typed helpers", () => {
    const flags = new FlagsClient();

    const loading = flags.getBoolean("missing", false);
    expect(loading.value).toBe(false);
    expect(loading.loading).toBe(true);
    expect(loading.err?.name).toBe("FlagsNotInitializedError");
  });

  it("clears stale rulesets when re-initialized for an empty owner", async () => {
    const flags = new FlagsClient();
    const fetch = viFetch([
      {
        data: {
          signals: [
            {
              name: "checkout.v2",
              type: "BOOL",
              default: false,
              version: "3",
              rules: [],
            },
          ],
        },
      },
      { data: { signals: [] } },
    ]);

    await flags.init({
      owner: "workspace:one",
      token: "token_123",
      pollIntervalMs: 0,
      fetch,
    });
    expect(flags.has("checkout.v2")).toBe(true);

    await flags.init({
      owner: "workspace:two",
      token: "token_123",
      pollIntervalMs: 0,
      fetch,
    });

    expect(flags.has("checkout.v2")).toBe(false);
    const missing = flags.getBoolean("checkout.v2", false);
    expect(missing.value).toBe(false);
    expect(missing.loading).toBe(false);
    expect(missing.err?.name).toBe("FlagNotFoundError");

    flags.close();
  });
});

describe("parseRegistrySignal", () => {
  it("normalizes uppercase Prisma/GraphQL enum values to lowercase SDK types", () => {
    expect(
      parseRegistrySignal({
        name: "checkout.v2",
        type: "BOOL",
        default: false,
        rules: [],
        version: "1",
      }).type,
    ).toBe("bool");
  });
});

function viFetch(responses: Array<{ data: unknown }>): typeof fetch {
  let index = 0;
  return async () => {
    const body = responses[index++] ?? responses[responses.length - 1];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
