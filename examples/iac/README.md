# Railway IaC examples

These examples show the declarative project definition surface. They are meant to be read as authored intent, not as serialized Railway API payloads.

The SDK keeps raw config buckets available (`source`, `build`, `deploy`, `networking`, `variables`, `volumeMounts`) but examples should prefer the intent layer where possible:

- `root` / `source: github(..., { rootDirectory })` instead of hand-writing source payloads
- `build` instead of `build.buildCommand`
- `start` instead of `deploy.startCommand`
- `preDeploy` instead of `deploy.preDeployCommand`
- `healthcheck` instead of `deploy.healthcheckPath`
- `replicas` instead of `deploy.multiRegionConfig`
- `env` instead of `variables`
- `domains` / `tcp` for common networking

## Examples

- `minimal.ts` — one GitHub-backed web service.
- `todo-list.ts` — frontend + backend monorepo with Redis and regional replicas.
- `api-postgres-bucket.ts` — API service with Postgres, bucket, custom domain, generated secret.
- `workers.ts` — Redis-backed worker plus cron-style scheduler.

## Evaluation lives in the CLI

`railway/iac` is a thin authoring layer: it helps you write the project definition, and that's it. The Railway CLI evaluates `.railway/railway.ts`, computes the plan, and applies it (`railway config plan` / `railway config apply`). There is no evaluation, diffing, or GraphQL in this package — the same split as the Python (`railway_iac`) and Go (`iac`) authoring packages.
