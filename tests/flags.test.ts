import { afterEach, describe, expect, it, vi } from "vitest";

import { signalBucketRatio } from "../src/flags/bucket.js";
import { flags } from "../src/flags/client.js";
import { evaluateFlagRulesetSync, parseRegistrySignal } from "../src/flags/resolver.js";
import type { SignalRuleset } from "../src/flags/types.js";

afterEach(() => {
  flags.close();
});

describe("signalBucketRatio", () => {
  it("is deterministic for the same salt and subject", () => {
    const a = signalBucketRatio("checkout-v2", "user-123");
    const b = signalBucketRatio("checkout-v2", "user-123");
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
    name: "checkout-v2",
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

  it("returns registry default with NO_MATCH when no rules match", () => {
    const result = evaluateFlagRulesetSync(baseRuleset, { plan: "free" });
    expect(result.value).toBe(false);
    expect(result.reason).toBe("NO_MATCH");
    expect(result.trace.outcome).toBe("no_match");
  });

  it("returns rule value when a rule matches", () => {
    const result = evaluateFlagRulesetSync(baseRuleset, { plan: "enterprise" });
    expect(result.value).toBe(true);
    expect(result.reason).toBe("TARGETING_MATCH");
    expect(result.trace.outcome).toBe("agreed");
  });

  it("returns registry default with CONFLICT when matching rules disagree", () => {
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

    const result = evaluateFlagRulesetSync(ruleset, { plan: "enterprise", region: "us" });
    expect(result.value).toBe(false);
    expect(result.reason).toBe("CONFLICT");
    expect(result.trace.outcome).toBe("disagreement");
  });

  it("classifies bucket matches as SPLIT", () => {
    const ruleset: SignalRuleset = {
      ...baseRuleset,
      rules: [
        {
          id: "canary",
          expression: {
            bucket: { attr: "key" },
            op: "lt",
            value: 1,
          },
          source: { type: "literal", value: true },
        },
      ],
    };

    const result = evaluateFlagRulesetSync(ruleset, { key: "user-123" });
    expect(result.value).toBe(true);
    expect(result.reason).toBe("SPLIT");
  });

  it("returns NO_KEY for split flags evaluated without a bucketing key", () => {
    const ruleset: SignalRuleset = {
      ...baseRuleset,
      rules: [
        {
          id: "canary",
          expression: {
            bucket: { attr: "key" },
            op: "lt",
            value: 1,
          },
          source: { type: "literal", value: true },
        },
      ],
    };

    const result = evaluateFlagRulesetSync(ruleset, { plan: "pro" });
    expect(result.value).toBe(false);
    expect(result.reason).toBe("NO_KEY");
  });
});

describe("flags module", () => {
  it("matches the canonical quickstart", async () => {
    const fetch = viFetch([
      {
        data: {
          signals: [
            {
              name: "checkout-v2",
              type: "bool",
              default: false,
              version: "1",
              rules: [
                {
                  id: "pro",
                  expression: { attr: "plan", op: "eq", value: "pro" },
                  source: { type: "literal", value: true },
                },
              ],
            },
          ],
        },
      },
    ]);

    await flags.init({ token: "token_123", refresh: false, fetch });

    const userId = "user-123";
    if (flags.getBoolean("checkout-v2", { key: userId, plan: "pro" })) {
      expect(true).toBe(true);
    } else {
      throw new Error("expected checkout-v2 to be enabled for pro users");
    }
  });

  it("throws when reading before init", () => {
    expect(() => flags.getBoolean("checkout-v2")).toThrow(/await flags\.init\(\)/);
  });

  it("loads registry snapshots and resolves flags in-process", async () => {
    const fetch = viFetch([
      {
        data: {
          signals: [
            {
              name: "checkout-v2",
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
      scope: { workspaceId: "test" },
      token: "token_123",
      refresh: false,
      fetch,
    });

    expect(flags.getBoolean("checkout-v2", { plan: "enterprise" })).toBe(true);
    expect(flags.getBoolean("checkout-v2", { plan: "free" })).toBe(false);
    expect(flags.evaluateBoolean("checkout-v2", { plan: "free" }).reason).toBe("NO_MATCH");
    expect(flags.list()).toEqual(["checkout-v2"]);
    expect(flags.synced).toBe(true);
    await flags.ready;
  });

  it("coalesces concurrent init calls with equivalent options", async () => {
    let calls = 0;
    const fetch: typeof globalThis.fetch = async () => {
      calls++;
      await Promise.resolve();
      return new Response(JSON.stringify({ data: { signals: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await Promise.all([
      flags.init({
        scope: { workspaceId: "factory" },
        token: "token_123",
        refresh: false,
        fetch,
      }),
      flags.init({
        scope: { workspaceId: "factory" },
        token: "token_123",
        refresh: false,
        fetch,
      }),
    ]);

    expect(calls).toBe(1);
  });

  it("throws when init is called again with conflicting options", async () => {
    const fetch = viFetch([{ data: { signals: [] } }]);

    await flags.init({
      scope: { workspaceId: "one" },
      token: "token_123",
      refresh: false,
      fetch,
    });

    await expect(
      flags.init({
        scope: { workspaceId: "two" },
        token: "token_123",
        refresh: false,
        fetch,
      }),
    ).rejects.toThrow(/conflicting options/);
  });

  it("returns STALE fallbacks when init sync fails and required is not set", async () => {
    const fetch: typeof globalThis.fetch = async () => {
      throw new Error("network down");
    };

    await flags.init({ token: "token_123", refresh: false, fetch });

    const result = flags.evaluateBoolean("missing", { key: "user" }, true);
    expect(result.value).toBe(true);
    expect(result.reason).toBe("STALE");
    expect(flags.synced).toBe(false);
  });

  it("rejects init when required is true and sync fails", async () => {
    const fetch: typeof globalThis.fetch = async () => {
      throw new Error("network down");
    };

    await expect(
      flags.init({ token: "token_123", refresh: false, required: true, fetch }),
    ).rejects.toThrow(/network down/);
  });

  it("returns NOT_FOUND with caller fallback for unknown flags", async () => {
    await flags.init({
      token: "token_123",
      refresh: false,
      fetch: viFetch([{ data: { signals: [] } }]),
    });

    const result = flags.evaluateBoolean("checkout-v2", undefined, true);
    expect(result.value).toBe(true);
    expect(result.reason).toBe("NOT_FOUND");
  });

  it("returns TYPE_MISMATCH with caller fallback for wrong typed reads", async () => {
    await flags.init({
      token: "token_123",
      refresh: false,
      fetch: viFetch([
        {
          data: {
            signals: [
              {
                name: "checkout-v2",
                type: "string",
                default: "off",
                version: "1",
                rules: [],
              },
            ],
          },
        },
      ]),
    });

    const result = flags.evaluateBoolean("checkout-v2", undefined, false);
    expect(result.value).toBe(false);
    expect(result.reason).toBe("TYPE_MISMATCH");
  });

  it("coalesces concurrent registry refreshes", async () => {
    let calls = 0;
    const fetch: typeof globalThis.fetch = async () => {
      calls++;
      await Promise.resolve();
      return new Response(JSON.stringify({ data: { signals: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await Promise.all([
      flags.init({
        scope: { workspaceId: "test" },
        token: "token_123",
        refresh: false,
        fetch,
      }),
      flags.refresh(),
    ]);

    expect(calls).toBe(1);
  });

  it("backs off idle refreshes but refreshes on active reads", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    let calls = 0;
    const fetch = viFetch(
      [
        {
          data: {
            signals: [
              {
                name: "checkout-v2",
                type: "bool",
                default: false,
                version: "1",
                rules: [],
              },
            ],
          },
        },
        {
          data: {
            signals: [
              {
                name: "checkout-v2",
                type: "bool",
                default: true,
                version: "2",
                rules: [],
              },
            ],
          },
        },
      ],
      () => {
        calls++;
      },
    );

    await flags.init({
      scope: { workspaceId: "test" },
      token: "token_123",
      fetch,
    });

    expect(calls).toBe(1);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(calls).toBe(1);

    flags.getBoolean("checkout-v2");
    await Promise.resolve();
    await vi.runOnlyPendingTimersAsync();

    expect(calls).toBeGreaterThanOrEqual(2);
    vi.useRealTimers();
  });

  it("sends explicit scope when provided", async () => {
    const requests: unknown[] = [];
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ data: { signals: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await flags.init({
      scope: { projectId: "project_123" },
      token: "token_123",
      refresh: false,
      fetch,
    });

    expect(requests).toMatchObject([
      {
        variables: { owner: "project:project_123" },
      },
    ]);
  });

  it("omits scope so Backboard can infer it from auth", async () => {
    const requests: unknown[] = [];
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)));
      return new Response(JSON.stringify({ data: { signals: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await flags.init({
      token: "token_123",
      refresh: false,
      fetch,
    });

    expect(requests).toMatchObject([
      {
        variables: {},
      },
    ]);
  });

  it("exposes scoped views that share transport but use separate caches", async () => {
    const requests: unknown[] = [];
    const fetch: typeof globalThis.fetch = async (_input, init) => {
      requests.push(JSON.parse(String(init?.body)));
      const body = JSON.parse(String(init?.body)) as { variables?: { owner?: string } };
      const owner = body.variables?.owner;
      const signals =
        owner === "project:project_123"
          ? [
              {
                name: "checkout-v2",
                type: "bool",
                default: true,
                version: "1",
                rules: [],
              },
            ]
          : [];

      return new Response(JSON.stringify({ data: { signals } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    };

    await flags.init({ token: "token_123", refresh: false, fetch });

    const project = flags.scope({ projectId: "project_123" });
    await project.refresh();
    expect(project.getBoolean("checkout-v2")).toBe(true);
    expect(flags.has("checkout-v2")).toBe(false);
    expect(requests.some((req) => (req as { variables?: { owner?: string } }).variables?.owner === "project:project_123")).toBe(true);
  });
});

describe("parseRegistrySignal", () => {
  it("normalizes uppercase Prisma/GraphQL enum values to lowercase SDK types", () => {
    expect(
      parseRegistrySignal({
        name: "checkout-v2",
        type: "BOOL",
        default: false,
        rules: [],
        version: "1",
      }).type,
    ).toBe("bool");
  });
});

function viFetch(
  responses: Array<{ data: unknown }>,
  onCall?: () => void,
): typeof fetch {
  let index = 0;
  return async () => {
    onCall?.();
    const body = responses[index++] ?? responses[responses.length - 1];
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
}
