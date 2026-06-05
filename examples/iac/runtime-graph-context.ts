import { Sandbox, evaluateRailwayProject } from "railway";

const project = await evaluateRailwayProject();

// If graph types have been generated, these names autocomplete from the deterministic evaluated graph.
const backend = project.service("backend");
const cache = project.database("Redis");

console.log(
  `Running against ${project.name}/${backend.name} with ${cache.name}`,
);

const sandbox = await Sandbox.create({
  token: process.env.RAILWAY_API_TOKEN!,
  environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
});

console.log((await sandbox.exec("pwd", { timeoutSec: 30 })).stdout);
await sandbox.destroy();
