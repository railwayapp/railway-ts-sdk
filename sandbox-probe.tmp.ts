// In-region discriminator: run the same 16MB upload N times from INSIDE a
// sandbox against /ws/files, using a minimal protocol client (push-probe.js).
import { readFileSync } from "node:fs";
import { Sandbox } from "./src/index.ts";
import { normalizeRailwayClientConfig, resolveEnvironmentId } from "./src/core/config.ts";
import { requestGraphQL } from "./src/core/graphql-client.ts";
import { RailwayGenerateShellTokenDocument } from "./src/generated/graphql.ts";
import { config } from "dotenv";
config({ override: true });

const N = 8;
console.log("building node sandbox (cached after first run)...");
await using sandbox = await Sandbox.create(
  Sandbox.template().withPackages("nodejs", "npm", "ca-certificates"),
);
console.log("sandbox", sandbox.id);

await sandbox.files.write("/probe/push-probe.js", readFileSync("/tmp/probe/push.js", "utf8"));
const install = await sandbox.exec("cd /probe && npm install ws --no-audit --no-fund 2>&1 | tail -1", { timeoutSec: 120 });
console.log("npm:", install.stdout.trim() || install.stderr.trim());

const cfg = normalizeRailwayClientConfig({});
const environmentId = resolveEnvironmentId();
let deaths = 0;
for (let i = 1; i <= N; i++) {
  const token = await requestGraphQL(cfg, RailwayGenerateShellTokenDocument, {
    input: { environmentId, instanceId: sandbox.id, kind: "sandbox", scope: "files:read files:write" },
  });
  const jwt = (token as { generateShellToken: string }).generateShellToken;
  const result = await sandbox.exec(`cd /probe && node push-probe.js '${jwt}' 16`, { timeoutSec: 300 });
  const line = (result.stdout + result.stderr).trim().split("\n").pop();
  if (!line?.startsWith("OK")) deaths++;
  console.log(`in-sandbox push ${i}: ${line}`);
}
console.log(`in-sandbox result: ${deaths}/${N} died`);
