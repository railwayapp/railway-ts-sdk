import { Sandbox, evaluateRailwayProject } from "railway";

const project = await evaluateRailwayProject();

// If `.railway/generated/graph-types.d.ts` has been generated, these names
// autocomplete from the deterministic evaluated graph rather than from source.
const backend = project.service("backend");
const cache = project.database("api-cache");

console.log(`Running against ${project.name}/${backend.name} with ${cache.name}`);

const sandbox = new Sandbox({
  token: process.env.RAILWAY_API_TOKEN!,
  projectId: process.env.RAILWAY_PROJECT_ID!,
  environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
});

const run = await sandbox.create({ name: `inspect-${backend.name}` });
console.log((await run.exec("pwd", { timeoutSec: 30 })).stdout);
await run.delete();
