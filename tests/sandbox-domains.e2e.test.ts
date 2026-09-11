import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { RailwayGraphQLError, Sandbox } from "../src/index.js";
import { createSandboxTracker, live } from "./sandbox-e2e-helpers.js";

/** Distinct responses prove each public route reaches the requested sandbox and port. */
async function expectPublicRoutes(sandbox: Sandbox): Promise<void> {
  const ports = sandbox.domains.map(domain => domain.port);
  await sandbox.files.write(
    "/tmp/domains-e2e.cjs",
    `const http = require("node:http");
const ports = ${JSON.stringify(ports)};
for (const port of ports) {
  http.createServer((request, response) => {
    response.setHeader("content-type", "text/plain");
    response.end(${JSON.stringify(sandbox.id)} + ":" + port + ":" + request.url);
  }).listen(port, "0.0.0.0", () => console.log("ready:" + port));
}
`,
  );

  let stdout = "";
  const server = sandbox.exec("node /tmp/domains-e2e.cjs", {
    timeoutSec: 180,
    onStdout: chunk => { stdout += chunk; },
  });
  try {
    await expect.poll(() => ports.every(port => stdout.includes(`ready:${port}`)), {
      timeout: 30_000,
      interval: 250,
    }).toBe(true);

    for (const { domain, port } of sandbox.domains) {
      await expect.poll(async () => {
        const response = await fetch(`https://${domain}/probe?port=${port}`, {
          signal: AbortSignal.timeout(5_000),
          redirect: "error",
        });
        return { status: response.status, body: await response.text() };
      }, { timeout: 60_000, interval: 1_000 }).toEqual({
        status: 200,
        body: `${sandbox.id}:${port}:/probe?port=${port}`,
      });
    }
  } finally {
    await server.kill();
    await server;
  }
}

describe.runIf(live)("domains e2e (live)", () => {
  const { track, cleanup } = createSandboxTracker();
  let source: Sandbox;

  beforeAll(async () => {
    source = track(await Sandbox.create({
      networkIsolation: "PRIVATE",
      idleTimeoutMinutes: 10,
      domains: [{ port: 8080 }, { prefix: "sdk-e2e-api", port: 3000 }],
    }));
  }, 240_000);

  afterAll(cleanup);

  it("publishes generated and explicit prefixes and preserves domain metadata", async () => {
    expect(source.networkIsolation).toBe("PRIVATE");
    expect(source.domains).toHaveLength(2);
    expect(source.domains).toEqual(expect.arrayContaining([
      { prefix: expect.any(String), port: 8080, domain: expect.any(String) },
      { prefix: "sdk-e2e-api", port: 3000, domain: expect.any(String) },
    ]));
    for (const domain of source.domains) {
      expect(domain.prefix.length).toBeGreaterThan(0);
      expect(new URL(`https://${domain.domain}`).hostname).toBe(domain.domain);
    }
    expect(new Set(source.domains.map(domain => domain.domain)).size).toBe(2);

    const domains = source.domains;
    expect((await Sandbox.connect(source.id)).domains).toEqual(domains);
    await source.refresh();
    expect(source.domains).toEqual(domains);
    expect((await Sandbox.list()).find(sandbox => sandbox.id === source.id)?.domains)
      .toEqual(domains);
    await expectPublicRoutes(source);
  }, 240_000);

  it("does not inherit source domains and can publish new routes on a fork", async () => {
    const unexposed = track(await source.fork({ networkIsolation: "PRIVATE" }));
    expect(unexposed.domains).toEqual([]);
    expect((await Sandbox.connect(unexposed.id)).domains).toEqual([]);

    const exposed = track(await source.fork({
      networkIsolation: "PRIVATE",
      domains: [{ prefix: "sdk-e2e-fork", port: 8080 }],
    }));
    expect(exposed.domains).toEqual([
      { prefix: "sdk-e2e-fork", port: 8080, domain: expect.any(String) },
    ]);
    expect(source.domains.map(domain => domain.domain))
      .not.toContain(exposed.domains[0]!.domain);
    await expectPublicRoutes(exposed);
  }, 240_000);

  it.each([undefined, "ISOLATED"] as const)(
    "rejects domains when networkIsolation is %s",
    async networkIsolation => {
      await expect(Sandbox.create({
        domains: [{ port: 8080 }],
        ...(networkIsolation === undefined ? {} : { networkIsolation }),
      }).then(track)).rejects.toBeInstanceOf(RailwayGraphQLError);
    },
    60_000,
  );
});
