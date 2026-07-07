import { parse } from "graphql";

import { normalizeRailwayClientConfig } from "../../src/core/config.js";
import { requestGraphQL } from "../../src/core/graphql-client.js";
import { flags, type Evaluation, type Reason } from "../../dist/index.js";
import { runExample } from "./helpers.ts";

type Expectation = {
  value?: unknown;
  reason?: Reason;
  reasonOneOf?: Reason[];
};

type Case = {
  name: string;
  run: () => Evaluation<unknown>;
  expect: Expectation;
};

await runExample(async () => {
  section("read-before-init");
  try {
    flags.getBoolean("checkout.v2");
    fail("expected read-before-init to throw");
  } catch (error) {
    pass(`throws: ${error instanceof Error ? error.message : String(error)}`);
  }

  section("resolve scope");
  const workspaces = await fetchWorkspaces();
  const workspaceId = resolveWorkspaceId(workspaces);
  pass(`using workspaceId=${workspaceId}`);

  section("init");
  await flags.init({ scope: { workspaceId }, verbose: true });
  await flags.ready;
  pass(`synced=${flags.synced}`);

  section("registry");
  const names = flags.list();
  pass(`list=${names.join(", ")}`);
  for (const name of ["beta.postgresHA", "checkout.v2", "theme"]) {
    pass(`has(${name})=${flags.has(name)}`);
  }

  section("primitive reads");
  logValue("checkout.v2 default", flags.getBoolean("checkout.v2"));
  logValue("theme default", flags.getString("theme"));

  const cases: Case[] = [
    {
      name: "checkout.v2 enterprise plan forces false",
      run: () => flags.evaluateBoolean("checkout.v2", { plan: "enterprise" }),
      expect: { value: false, reason: "TARGETING_MATCH" },
    },
    {
      name: "checkout.v2 legacy plan forces false",
      run: () => flags.evaluateBoolean("checkout.v2", { plan: "legacy" }),
      expect: { value: false, reason: "TARGETING_MATCH" },
    },
    {
      name: "checkout.v2 pro plan uses registry default (true)",
      run: () => flags.evaluateBoolean("checkout.v2", { plan: "pro" }),
      expect: { value: true, reason: "NO_MATCH" },
    },
    {
      name: "checkout.v2 empty context uses registry default",
      run: () => flags.evaluateBoolean("checkout.v2"),
      expect: { value: true, reason: "NO_MATCH" },
    },
    {
      name: "theme registry default",
      run: () => flags.evaluateString("theme"),
      expect: { value: "dark", reason: "NO_MATCH" },
    },
    {
      name: "theme via getBoolean → TYPE_MISMATCH + fallback",
      run: () => flags.evaluateBoolean("theme", undefined, false),
      expect: { value: false, reason: "TYPE_MISMATCH" },
    },
    {
      name: "beta.postgresHA priority_boarding rule",
      run: () =>
        flags.evaluateBoolean("beta.postgresHA", { priority_boarding: true }),
      expect: { value: true, reason: "TARGETING_MATCH" },
    },
    {
      name: "beta.postgresHA no attrs → registry default false",
      run: () => flags.evaluateBoolean("beta.postgresHA"),
      expect: { value: false, reason: "NO_MATCH" },
    },
    {
      name: "beta.postgresHA workspace_id bucket rule",
      run: () =>
        flags.evaluateBoolean("beta.postgresHA", { workspace_id: workspaceId }),
      expect: { reasonOneOf: ["SPLIT", "NO_MATCH"] },
    },
    {
      name: "NOT_FOUND uses caller fallback",
      run: () => flags.evaluateBoolean("does-not-exist", undefined, true),
      expect: { value: true, reason: "NOT_FOUND" },
    },
    {
      name: "NOT_FOUND without fallback → type zero",
      run: () => flags.evaluateBoolean("does-not-exist"),
      expect: { value: false, reason: "NOT_FOUND" },
    },
  ];

  section("evaluate* trace");
  const traced = flags.evaluateBoolean("checkout.v2", { plan: "enterprise" });
  pass(`trace steps=${traced.trace.length}`);
  for (const step of traced.trace) {
    pass(
      `  rule ${step.ruleId} matched=${step.matched} value=${JSON.stringify(step.value)}`,
    );
  }

  section("scoped view");
  const scoped = flags.scope({ workspaceId });
  await scoped.refresh();
  const scopedList = scoped.list();
  pass(
    `scope.list matches default=${JSON.stringify(scopedList) === JSON.stringify(names)}`,
  );
  const scopedCheckout = scoped.evaluateBoolean("checkout.v2", { plan: "pro" });
  pass(
    `scope checkout.v2 pro=${scopedCheckout.value} reason=${scopedCheckout.reason}`,
  );

  section("assertions");
  let failed = 0;
  for (const testCase of cases) {
    const evaluation = testCase.run();
    const errors = assertEvaluation(evaluation, testCase.expect);
    if (errors.length > 0) {
      failed++;
      fail(
        `${testCase.name}: ${errors.join("; ")} (got value=${JSON.stringify(evaluation.value)} reason=${evaluation.reason})`,
      );
    } else {
      pass(
        `${testCase.name}: value=${JSON.stringify(evaluation.value)} reason=${evaluation.reason}`,
      );
    }
  }

  if (failed > 0) {
    throw new Error(`${failed} assertion(s) failed`);
  }

  pass("all cases passed");
  flags.close();
});

function resolveWorkspaceId(workspaces: Array<{ id: string; name: string }>): string {
  const explicit = process.env.RAILWAY_FLAGS_WORKSPACE_ID;
  if (explicit != null && explicit !== "") {
    return explicit;
  }

  const railway = workspaces.find((workspace) => workspace.name === "Railway");
  if (railway != null) {
    return railway.id;
  }

  if (workspaces.length === 1) {
    return workspaces[0]!.id;
  }

  throw new Error(
    `token has ${workspaces.length} workspaces; set RAILWAY_FLAGS_WORKSPACE_ID to the one with flags`,
  );
}

function assertEvaluation(evaluation: Evaluation<unknown>, expect: Expectation): string[] {
  const errors: string[] = [];
  if (expect.value !== undefined && evaluation.value !== expect.value) {
    errors.push(
      `value ${JSON.stringify(evaluation.value)} !== ${JSON.stringify(expect.value)}`,
    );
  }
  if (expect.reason !== undefined && evaluation.reason !== expect.reason) {
    errors.push(`reason ${evaluation.reason} !== ${expect.reason}`);
  }
  if (expect.reasonOneOf != null && !expect.reasonOneOf.includes(evaluation.reason)) {
    errors.push(`reason ${evaluation.reason} not in ${expect.reasonOneOf.join("|")}`);
  }
  return errors;
}

function section(title: string): void {
  console.log(`\n=== ${title} ===`);
}

function pass(message: string): void {
  console.log(`✓ ${message}`);
}

function fail(message: string): void {
  console.error(`✗ ${message}`);
}

function logValue(name: string, value: unknown): void {
  console.log(`• ${name}: ${JSON.stringify(value)}`);
}

async function fetchWorkspaces(): Promise<Array<{ id: string; name: string }>> {
  const config = normalizeRailwayClientConfig({});
  const document = parse(`
    query FlagsExampleApiToken {
      apiToken {
        workspaces {
          id
          name
        }
      }
    }
  `);
  const data = await requestGraphQL(config, document as never, {});
  const workspaces = (data as { apiToken?: { workspaces?: Array<{ id: string; name: string }> } })
    .apiToken?.workspaces;
  for (const workspace of workspaces ?? []) {
    pass(`token workspace ${workspace.name} (${workspace.id})`);
  }
  return workspaces ?? [];
}
