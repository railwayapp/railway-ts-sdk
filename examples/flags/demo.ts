/**
 * Live flags demo. Requires RAILWAY_API_TOKEN in `.env`.
 *
 * On Railway, `await flags.init()` uses `RAILWAY_PROJECT_ID` for project-scoped flags.
 * For workspace-scoped registries, pass an explicit scope:
 *   await flags.init({ scope: { workspaceId: "<workspace-id>" } });
 */
import { flags, type Evaluation, type Reason } from "../../src/index.ts";
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
    flags.getBoolean("example-flag");
    fail("expected read-before-init to throw");
  } catch (error) {
    pass(`throws: ${error instanceof Error ? error.message : String(error)}`);
  }

  section("init");
  await flags.init({ verbose: true });
  await flags.ready;
  pass(`synced=${flags.synced}`);

  section("registry");
  const names = flags.list();
  pass(`list=${names.length === 0 ? "(empty)" : names.join(", ")}`);

  section("emergency fallbacks");
  const cases: Case[] = [
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

  section("typed reads");
  if (flags.has("theme")) {
    cases.push({
      name: "TYPE_MISMATCH uses caller fallback",
      run: () => flags.evaluateBoolean("theme", undefined, false),
      expect: { value: false, reason: "TYPE_MISMATCH" },
    });
    logValue("theme", flags.getString("theme"));
  } else {
    pass("skip theme checks (flag not in registry)");
  }

  if (flags.has("checkout.v2")) {
    cases.push(
      {
        name: "checkout.v2 enterprise plan",
        run: () => flags.evaluateBoolean("checkout.v2", { plan: "enterprise" }),
        expect: { value: false, reason: "TARGETING_MATCH" },
      },
      {
        name: "checkout.v2 pro plan uses registry default",
        run: () => flags.evaluateBoolean("checkout.v2", { plan: "pro" }),
        expect: { value: true, reason: "NO_MATCH" },
      },
    );
    logValue("checkout.v2 default", flags.getBoolean("checkout.v2"));

    const traced = flags.evaluateBoolean("checkout.v2", { plan: "enterprise" });
    pass(`checkout.v2 trace steps=${traced.trace.length}`);
  } else {
    pass("skip checkout.v2 checks (flag not in registry)");
  }

  if (flags.has("beta.postgresHA")) {
    cases.push(
      {
        name: "beta.postgresHA priority_boarding rule",
        run: () =>
          flags.evaluateBoolean("beta.postgresHA", { priority_boarding: true }),
        expect: { value: true, reason: "TARGETING_MATCH" },
      },
      {
        name: "beta.postgresHA workspace_id bucket rule",
        run: () =>
          flags.evaluateBoolean("beta.postgresHA", {
            workspace_id: "00000000-0000-0000-0000-000000000001",
          }),
        expect: { reasonOneOf: ["SPLIT", "NO_MATCH"] },
      },
    );
  } else {
    pass("skip beta.postgresHA checks (flag not in registry)");
  }

  section("scoped view");
  const projectId = process.env.RAILWAY_PROJECT_ID;
  if (projectId != null && projectId !== "") {
    const scoped = flags.scope({ projectId });
    await scoped.refresh();
    pass(`scope.list count=${scoped.list().length}`);
  } else {
    pass("skip scoped view (RAILWAY_PROJECT_ID not set)");
  }

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
