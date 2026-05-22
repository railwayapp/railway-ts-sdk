# Railway IaC examples

These examples show the declarative project definition surface. They are meant to be read as authored intent, not as serialized Railway API payloads.

The SDK keeps raw config buckets available (`source`, `build`, `deploy`, `networking`, `variables`, `volumeMounts`) but examples should prefer the intent layer where possible:

- `root` / `source: github(..., { rootDirectory })` instead of hand-writing source payloads
- `build` instead of `build.buildCommand`
- `start` instead of `deploy.startCommand`
- `preDeploy` instead of `deploy.preDeployCommand`
- `healthcheck` instead of `deploy.healthcheckPath`
- `regions` instead of `deploy.multiRegionConfig`
- `env` instead of `variables`
- `domains` / `tcp` for common networking

## Examples

- `minimal.ts` — one GitHub-backed web service.
- `todo-list.ts` — frontend + backend monorepo with Redis and regional replicas.
- `api-postgres-bucket.ts` — API service with Postgres, bucket, custom domain, generated secret.
- `workers.ts` — Redis-backed worker plus cron-style scheduler.
- `runtime-graph-context.ts` — runtime code reading the evaluated graph and using it as context for sandbox work.

## Runtime graph context

Runtime code should reference the evaluated graph, not the authoring code shape:

```ts
import { Sandbox, evaluateRailwayProject } from "railway";

const project = await evaluateRailwayProject();
const backend = project.service("backend");

const sandbox = new Sandbox({ token, projectId, environmentId });
const run = await sandbox.create({ name: `inspect-${backend.name}` });
```

`evaluateRailwayProject()` resolves the nearest `.railway/railway.ts` by walking upward from `process.cwd()`. Pass `{ file }` to evaluate a specific definition.

For autocomplete, generate a declaration file from the evaluated graph with `renderRailwayGraphTypes(graph)` and include it in the project, for example `.railway/generated/graph-types.d.ts`. That augments `railway/iac` so `project.service("...")`, `project.database("...")`, etc. complete known resource names.

## Direction

Declarative IaC answers “what should exist?” Runtime SDKs, including sandboxes, answer “what should happen now?”. They can live in the same package and meet at the evaluated graph/context layer, but should keep those concepts separate.
