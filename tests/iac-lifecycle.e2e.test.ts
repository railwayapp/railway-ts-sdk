import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { bucket, image, postgres, project, service } from "../src/index.js";
import { projectDefinitionToGraph } from "../src/iac/compiler.js";
import {
  applyDesired,
  backboard,
  type BackboardContext,
  clientFor,
  currentState,
  liveEnabled,
  waitFor,
} from "./support/iac-live.js";
import type { IacClient } from "../src/iac/client.js";

/**
 * Full-framework live lifecycle: create → idempotency → update → cross-service
 * reference → database → bucket → destructive delete against real backboard.
 * Mutating but self-cleaning (run-scoped names + afterAll teardown), gated on
 * IAC_E2E_* so it only runs against a throwaway env.
 *
 * Every operation here completes in seconds, so waitFor caps at 45s and tests at
 * 60s: a longer wait means something is wedged, and we want that to fail fast.
 */
const sfx = Date.now().toString(36).slice(-6);
const WEB = `e2e-web-${sfx}`;
const WORKER = `e2e-worker-${sfx}`;
const DB = `e2e-db-${sfx}`;
const BUCKET = `e2e-bucket-${sfx}`;
const IMG = "nginx:alpine";

const graphOf = (resources: unknown[]) =>
  projectDefinitionToGraph(project("iac-e2e-live", { resources: resources as never[] }));

const webNode = (greeting: string) => service(WEB, { source: image(IMG), env: { GREETING: greeting } });

const isEmpty = async (client: IacClient, bb: BackboardContext) => {
  const s = await currentState(client, bb);
  return s.serviceNames.length === 0 && s.bucketNames.length === 0;
};

let bb: BackboardContext;
let client: IacClient;

describe.skipIf(!liveEnabled)("IaC live — full framework lifecycle", () => {
  beforeAll(async () => {
    bb = backboard();
    client = clientFor(bb);
    await applyDesired(client, bb, graphOf([]));
    await waitFor("env empty at start", () => isEmpty(client, bb));
  }, 60_000);

  afterAll(async () => {
    if (!liveEnabled) return;
    await applyDesired(client, bb, graphOf([]));
    await waitFor("env empty at teardown", () => isEmpty(client, bb)).catch(() => {});
  }, 60_000);

  it("creates a service with a variable", async () => {
    const cs = await applyDesired(client, bb, graphOf([webNode("hi")]));
    expect(cs.changes.some(c => c.kind === "resource.create")).toBe(true);

    await waitFor(`${WEB} created with GREETING`, async () => {
      const s = await currentState(client, bb);
      return s.serviceNames.includes(WEB) && s.variablesOf(WEB)?.GREETING?.value === "hi";
    });
  }, 60_000);

  it("re-plans to zero changes (live idempotency — the GA gate)", async () => {
    const cs = await applyDesired(client, bb, graphOf([webNode("hi")]));
    expect(cs.changes).toEqual([]);
    expect(cs.diagnostics).toEqual([]);
  }, 30_000);

  it("updates a variable", async () => {
    await applyDesired(client, bb, graphOf([webNode("updated")]));
    await waitFor(`${WEB}.GREETING updated`, async () => {
      const s = await currentState(client, bb);
      return s.variablesOf(WEB)?.GREETING?.value === "updated";
    });
  }, 60_000);

  it("adds a second service that references the first", async () => {
    const web = webNode("updated");
    const worker = service(WORKER, { source: image(IMG), env: { WEB_HOST: web.env.RAILWAY_PRIVATE_DOMAIN } });
    await applyDesired(client, bb, graphOf([web, worker]));

    await waitFor(`${WORKER} created with reference`, async () => {
      const s = await currentState(client, bb);
      const ref = s.variablesOf(WORKER)?.WEB_HOST?.value ?? "";
      return s.serviceNames.includes(WORKER) && ref.includes(WEB) && ref.includes("RAILWAY_PRIVATE_DOMAIN");
    });
  }, 60_000);

  it("provisions a postgres database", async () => {
    const web = webNode("updated");
    const worker = service(WORKER, { source: image(IMG), env: { WEB_HOST: web.env.RAILWAY_PRIVATE_DOMAIN } });
    await applyDesired(client, bb, graphOf([web, worker, postgres(DB)]));

    await waitFor(`${DB} provisioned`, async () => (await currentState(client, bb)).serviceNames.includes(DB));
  }, 60_000);

  it("creates a bucket", async () => {
    const web = webNode("updated");
    const worker = service(WORKER, { source: image(IMG), env: { WEB_HOST: web.env.RAILWAY_PRIVATE_DOMAIN } });
    // Region immutability is a pure diff-engine diagnostic (covered offline in
    // iac.test.ts); here we just verify live creation.
    await applyDesired(client, bb, graphOf([web, worker, postgres(DB), bucket(BUCKET, { region: "sjc" })]));
    await waitFor(`${BUCKET} created`, async () => (await currentState(client, bb)).bucketNames.includes(BUCKET));
  }, 60_000);

  it("destructively deletes every resource", async () => {
    const cs = await applyDesired(client, bb, graphOf([]));
    expect(cs.changes.some(c => c.kind === "resource.delete" && c.severity === "destructive")).toBe(true);

    await waitFor("all resources deleted", () => isEmpty(client, bb));
  }, 60_000);
});
