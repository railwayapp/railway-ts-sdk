# Railway Configuration / IaC RFC

## Current state

Railway Configuration is now an end-to-end v0 flow:

```txt
.railway/railway.ts
  → RailwayGraph
  → RailwayChangeSet
  → Backboard preview/apply
  → railway config plan/apply
  → railway up
```

The goal is to let users define Railway project infrastructure in code while keeping Railway's product semantics, safety model, and CLI experience intact.

## Problem

Railway project configuration is edited through many surfaces: Dashboard, CLI, templates, agents, MCP, SDKs, and direct GraphQL calls. Before this initiative, those surfaces did not share a stable intent protocol. Automation either had to recreate Dashboard flows or leak internal `EnvironmentConfigPatch` details.

This project introduces:

- A TypeScript authoring layer centered on `.railway/railway.ts`.
- A deterministic `RailwayGraph` intermediate representation.
- A `RailwayChangeSet` intent protocol for previewing and applying changes.
- Backboard APIs that accept ChangeSets and realize them through Railway product paths.
- CLI commands for initialization, import, planning, applying, and deploy integration.

It explicitly does **not** make `EnvironmentConfigPatch` a public producer contract.

## Why ChangeSet matters

`RailwayChangeSet` is the shared language between authoring layers and Railway.

Instead of every client knowing Backboard internals, clients say:

```txt
create service web
set variable web.DATABASE_URL
create database postgres
create domain app.example.com
```

Backboard then validates and realizes that intent using the right product semantics.

This gives us:

- One intent model for SDK, CLI, Web, MCP, agents, and future GitHub automation.
- Backboard-owned authorization, validation, ID resolution, and product realization.
- No public dependency on `EnvironmentConfigPatch`, service instance details, or Railway UUIDs in source.
- Better operation results: ChangeSet in, ChangeSet-shaped result out.

## Architecture

```txt
.railway/railway.ts
  ↓ evaluate
RailwayGraph
  ↓ diff current Railway state vs desired graph
RailwayChangeSet
  ↓ environmentPreviewChangeSet / environmentApplyChangeSet
Backboard realization
  ├─ services / variables / buckets through internal patch/product paths
  ├─ databases through product/template workflow today
  ├─ custom domains through domain product workflow
  └─ future resources through product-owned realization
  ↓
ChangeSetApplyResult
```

### Graph identity

`RailwayGraph` uses deterministic addresses, not Railway UUIDs:

```txt
service.web
database.postgres
bucket.media
```

Railway remote IDs remain Backboard/apply-time reality. They do not belong in `.railway/railway.ts`.

## Current CLI commands

The v0 CLI namespace is `railway config`:

```bash
railway config init
railway config pull
railway config plan
railway config apply
railway up
```

### `railway config init`

Creates:

```txt
.railway/railway.ts
.railway/README.md
.agents/skills/railway-config/SKILL.md
```

Interactive prompt:

```txt
Initialize Railway configuration
Railway will create the files that define your project infrastructure as code.
Main file .railway/railway.ts

? How should Railway start?
  Scan this directory and suggest a basic setup
  Import an existing Railway project
  Create an empty configuration file
```

Directory scanning currently detects JavaScript package managers and scripts:

- `bun.lock` / `bun.lockb` → Bun
- `pnpm-lock.yaml` → pnpm
- `yarn.lock` → Yarn
- otherwise npm

It can prefill `build` and `start` from `package.json` and detects GitHub remotes when available.

If no GitHub remote exists, the service remains source-less. `railway up` owns local-directory upload.

### `railway config pull`

Imports the linked Railway project's current configuration into `.railway/railway.ts` and creates the same README/skill support files if missing.

`pull --json` remains read-only and prints the imported graph.

The importer renders product DSL, not Backboard internals:

- `regions`, not `multiRegionConfig`
- `domains`, not `networking.customDomains`
- `preserve()`, not empty strings for unknown secrets
- no generated Railway service domains
- no Railway UUIDs in source

### `railway config plan`

Evaluates `.railway/railway.ts`, computes current Railway state, diffs the graph, previews the ChangeSet with Backboard, and prints readable changes.

Example:

```txt
✓ Checked Railway configuration
Railway configuration
Using .railway/railway.ts
Environment production

Changes (1)
  ~ Update variable web.NODE_ENV
    └ web.NODE_ENV (preserve() → "production")

Next
  • Run railway config apply to apply these changes.
```

Field-level details are shown by default. `--verbose` adds extra metadata like project IDs and operation outputs.

### `railway config apply`

Runs a plan first, shows the same diff, asks for confirmation, then applies via `environmentApplyChangeSet`.

- Interactive apply prompts before changing Railway.
- `--yes` applies non-interactively.
- Destructive changes are called out before confirmation.

Apply output is compressed to one change list:

```txt
✓ Applied Railway configuration
Railway configuration
Using .railway/railway.ts
Environment production

Changes (1)
  ✓ Create service web
```

### `railway up`

If `.railway/railway.ts` exists, `railway up` runs a config plan before deploy.

If changes exist, it shows the diff and asks:

```txt
Apply these Railway configuration changes before deploying?
```

Then it applies config and deploys local code.

Deploy service inference order for v0:

1. Existing linked service.
2. Exactly one service in desired graph.
3. Exactly one local/source-less deployable service.
4. Prompt user and link selected service for future deploys.

This keeps local upload as CLI context, not graph state.

## Backboard API

Backboard exposes ChangeSet-shaped APIs:

```graphql
environmentPreviewChangeSet(environmentId: String!, input: JSON!): ChangeSetPreview!
environmentApplyChangeSet(environmentId: String!, input: JSON!, commitMessage: String): ChangeSetApplyResult!
```

Result types:

```graphql
type ChangeSetPreview {
  changeSet: JSON!
  diagnostics: JSON!
  effects: JSON!
}

type ChangeSetApplyResult {
  id: String!
  status: String!
  changes: [ChangeOperationResult!]!
  diagnostics: JSON!
  deploymentId: String
  stagedPatchId: String
}

type ChangeOperationResult {
  kind: String!
  path: String
  summary: String
  status: String!
  outputs: JSON
}
```

Temporary prototype mutations were removed from the intended v0 path:

```txt
environmentStageChangeSet
environmentApplyChangeSetOperations
```

## Operation realization today

| ChangeSet operation | Current realization |
| --- | --- |
| `resource.create` service | Internal service/config path |
| `resource.update` service | Internal config path |
| `resource.delete` service | Internal config path |
| `variable.set` / `variable.delete` | Internal config/variable path |
| `resource.create` database | Backboard product/template workflow |
| `domain.create` | Backboard custom domain product workflow |
| `resource.create` bucket | Bucket product path/config update |

Database provisioning is intentionally not fake patch synthesis. Databases are product resources; Backboard decides how to realize them.

## Current normalization / round-trip behavior

The goal for import is:

```txt
railway config pull --force
railway config plan
→ no-op
```

For large projects, a clean plan means we are correctly importing/rendering or intentionally suppressing:

- Services, sources, build/start, healthchecks, deploy settings.
- Variables, including encrypted/unknown values as `preserve()`.
- Database-like services as product database resources where safe.
- Buckets and bucket regions.
- Custom domains and target ports.
- Regions/replicas as DSL `regions`.
- Generated Railway service domains.
- Platform defaults such as runtime, legacy stacker, IPv6 egress, default builders, disabled/null regions.
- Transient Git fields like `commitSha`, `upstreamUrl`, and default branch noise.
- Volume mounts, which v0 must never accidentally unmount.

## Support files

Both `config init` and `config pull` create support files if missing:

```txt
.railway/README.md
.agents/skills/railway-config/SKILL.md
```

The skill file includes frontmatter so agents can discover it:

```yaml
---
name: railway-config
description: Edit this project's Railway infrastructure-as-code configuration. Use this skill whenever the user asks to create, change, import, review, deploy, or troubleshoot Railway project infrastructure for the current repository, including services, databases, buckets, custom domains, regions, environment variables, `railway config *`, `.railway/railway.ts`, or `railway up` behavior.
---
```

## Safety principles

- `plan` is always safe.
- `apply` asks before changing Railway unless `--yes` is provided.
- `up` previews config changes before applying them.
- Unknown secrets use `preserve()` and are not overwritten.
- Generated service domains are not user intent.
- Volume mounts are not diffed in v0 to avoid accidental unmounts.
- Platform defaults are suppressed instead of churned.
- Railway UUIDs do not belong in source.

## Deferred work

### 1. Environment-agnostic configuration

Today config is still effectively tied to the linked environment during plan/apply. The next major design step is making `.railway/railway.ts` generic and context-aware.

Target shape:

```ts
export default defineRailway(ctx => {
  const isProduction = ctx.environment === "production";

  const web = service("web", {
    regions: isProduction
      ? { "us-west2": 2, "europe-west4": 1 }
      : { "us-west2": 1 },
  });

  return project("my-app", {
    environments: ["production", "staging"],
    services: [web],
  });
});
```

The CLI/runner should pass context such as project, environment, workspace, and command so the same source file can render different desired state for different environments.

### 2. Persisted ChangeSets

Persisted `EnvironmentChangeSet` is deferred until after v0 polish.

Future model should support:

- Staging ChangeSets.
- Applying a staged ChangeSet later.
- UI visibility/history.
- PR previews and approval flows.
- Conflict/staleness checks.

The persisted model should be named `EnvironmentChangeSet`, not reuse the old legacy `Changeset` table.

### 3. Broader resource coverage

Still deferred:

- First-class safe volume lifecycle.
- More database configuration knobs.
- Full bucket lifecycle.
- Better domain DNS output rendering.
- Strong JSON/schema validation for ChangeSet input.
- Multi-language runner support beyond TypeScript.
- GitHub PR integration.

## Old legacy Changeset cleanup

The old `Changeset` table was legacy environment-merge state and unrelated to the new `RailwayChangeSet` protocol.

Cleanup path:

1. First PR globally omitted `Environment.sourceChangesetPrivateId` from Prisma clients.
2. Second PR drops only the old `Changeset` table with a fail-fast lock timeout.
3. The old `Environment.sourceChangesetPrivateId` column may remain temporarily as `@ignore` to avoid taking an `Environment` exclusive lock during the table-drop deploy.
4. New persistence, when added, should use `EnvironmentChangeSet`.

## Current out-the-door criteria

v0 is ready when these are reliable:

```bash
railway config init
railway config pull --force
railway config plan
railway config apply
railway up
```

Acceptance checks:

- Fresh local project can initialize, create a Railway project, plan, apply, and deploy.
- Existing small project can pull and plan no-op.
- Existing large project can pull and plan no-op or only show explainable diffs.
- Database, bucket, custom domain, region, and variable changes render clearly.
- Destructive changes are guarded.
- `railway up` previews config changes before deploy.
- Common output avoids Backboard/Patch/internal language.
