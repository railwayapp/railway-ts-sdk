// Runs each argv command in turn against a local exec server, prints each
// result, then "done", and leaves nothing for the event loop to wait on.
// Usage: exec-then-idle.ts <tcpProxyWsEndpoint> <pool JSON | "default"> <command>...
import { Sandbox, type RailwayClientConfig } from "../../src/index.js";

const [endpoint, pool, ...commands] = process.argv.slice(2);
if (!endpoint || !pool || commands.length === 0) {
  console.error("usage: exec-then-idle.ts <endpoint> <pool JSON | default> <command>...");
  process.exit(2);
}

const now = Math.floor(Date.now() / 1000);
const payload = Buffer.from(JSON.stringify({ iat: now, exp: now + 300 })).toString("base64url");
const sandboxInfo = {
  id: "sandbox_123",
  status: "RUNNING",
  networkIsolation: "ISOLATED",
  domains: [],
  environmentId: "environment_123",
  region: "us-west2",
  idleTimeoutMinutes: 5,
  createdAt: "2026-05-13T00:00:00.000Z",
};
const fetchStub: typeof fetch = async (_input, init) => {
  const { query } = JSON.parse(String(init?.body)) as { query: string };
  const data = query.includes("generateShellToken")
    ? { generateShellToken: `eyJhbGciOiJFUzI1NiJ9.${payload}.sig` }
    : { sandboxCreate: sandboxInfo };
  return new Response(JSON.stringify({ data }), { headers: { "Content-Type": "application/json" } });
};

const sandbox = await Sandbox.create({
  token: "token_123",
  environmentId: "environment_123",
  fetch: fetchStub,
  tcpProxyWsEndpoint: endpoint,
  ...(pool === "default" ? {} : { execSocketPool: JSON.parse(pool) as NonNullable<RailwayClientConfig["execSocketPool"]> }),
});
for (const command of commands) {
  const result = await sandbox.exec(command);
  console.log(JSON.stringify({ exitCode: result.exitCode, stdout: result.stdout }));
}
console.log("done");
