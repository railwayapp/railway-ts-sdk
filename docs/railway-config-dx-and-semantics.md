# Railway Configuration DX, examples, field ownership, and apply semantics

This document is for product/API review before v0 release.

## What should v0 feel like?

The common path should be:

```bash
railway config init
railway config plan
railway config apply
railway up
```

For an existing project:

```bash
railway config pull --force
railway config plan
```

Expected user-facing language:

- “Railway configuration”
- “Changes”
- “Apply these changes”
- “Your Railway configuration is already up to date”

Avoid common-path language like:

- IaC
- Backboard
- EnvironmentConfigPatch
- ChangeSet
- ServiceInstance

Internally, `.railway/railway.ts` evaluates to `RailwayGraph`, diffs to `RailwayChangeSet`, and Backboard realizes the changes.

## Example projects

### 1. Tiny local app

No GitHub source. `railway up` uploads the current directory.

```ts
import { defineRailway, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("web", {
    build: "bun run build",
    start: "NODE_ENV=production bun src/index.ts",
  });

  return project("tiny-app", {
    environments: ["production"],
    services: [web],
  });
});
```

### 2. Static frontend from GitHub

```ts
import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const web = service("web", {
    source: github("acme/site", { branch: "main" }),
    build: "pnpm build",
    start: "pnpm start",
    domains: ["www.acme.com"],
  });

  return project("acme-site", {
    environments: ["production", "staging"],
    services: [web],
  });
});
```

### 3. API + Postgres

```ts
import { defineRailway, github, postgres, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");

  const api = service("api", {
    source: github("acme/api"),
    build: "pnpm build",
    start: "pnpm start",
    healthcheck: "/health",
    healthcheckTimeout: 30,
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
    },
  });

  return project("acme-api", {
    environments: ["production", "staging"],
    services: [db, api],
  });
});
```

### 4. Web + API + Redis

```ts
import { defineRailway, github, project, redis, service } from "railway/iac";

export default defineRailway(() => {
  const cache = redis("redis");

  const api = service("api", {
    source: github("acme/app", { rootDirectory: "apps/api" }),
    build: "pnpm build --filter api",
    start: "pnpm start --filter api",
    env: {
      REDIS_URL: cache.env.REDIS_URL,
    },
  });

  const web = service("web", {
    source: github("acme/app", { rootDirectory: "apps/web" }),
    build: "pnpm build --filter web",
    start: "pnpm start --filter web",
    env: {
      API_HOST: api.env.RAILWAY_PRIVATE_DOMAIN,
    },
  });

  return project("acme-app", {
    environments: ["production", "staging"],
    services: [cache, api, web],
  });
});
```

### 5. Docker image worker

```ts
import { defineRailway, image, project, service } from "railway/iac";

export default defineRailway(() => {
  const worker = service("worker", {
    source: image("ghcr.io/acme/worker:latest"),
    env: {
      QUEUE_NAME: "default",
    },
  });

  return project("worker", {
    environments: ["production"],
    services: [worker],
  });
});
```

### 6. Environment-aware replicas

```ts
import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway((ctx) => {
  const prod = ctx.isEnvironment("production");

  const web = service("web", {
    source: github("acme/web"),
    regions: prod
      ? { "us-west2": 2, "europe-west4": 1 }
      : { "us-west2": 1 },
  });

  return project("regional-web", {
    environments: ["production", "staging"],
    services: [web],
  });
});
```

### 7. App with object storage

```ts
import { bucket, defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() => {
  const media = bucket("media", { region: "iad" });

  const web = service("web", {
    source: github("acme/media-app"),
    env: {
      MEDIA_BUCKET: "media",
    },
  });

  return project("media-app", {
    environments: ["production"],
    services: [media, web],
  });
});
```

### 8. Imported production app with preserved secrets

```ts
import { defineRailway, github, postgres, preserve, project, redis, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("postgres");
  const cache = redis("redis");

  const api = service("api", {
    source: github("acme/api"),
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      STRIPE_SECRET_KEY: preserve(),
      SESSION_SECRET: preserve(),
    },
  });

  return project("acme", {
    environments: ["production", "staging"],
    services: [db, cache, api],
  });
});
```

### 9. Larger monorepo

```ts
import { bucket, defineRailway, github, postgres, preserve, project, redis, service } from "railway/iac";

export default defineRailway((ctx) => {
  const prod = ctx.environment === "production";

  const db = postgres("postgres");
  const cache = redis("redis");
  const uploads = bucket("uploads", { region: "iad" });

  const api = service("api", {
    source: github("acme/monorepo", { rootDirectory: "apps/api" }),
    build: "pnpm --filter api build",
    start: "pnpm --filter api start",
    healthcheck: "/health",
    regions: prod ? { "us-west2": 2, "europe-west4": 1 } : { "us-west2": 1 },
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
      UPLOAD_BUCKET: "uploads",
      JWT_SECRET: preserve(),
    },
  });

  const web = service("web", {
    source: github("acme/monorepo", { rootDirectory: "apps/web" }),
    build: "pnpm --filter web build",
    start: "pnpm --filter web start",
    domains: prod ? ["app.acme.com"] : [],
    env: {
      API_HOST: api.env.RAILWAY_PRIVATE_DOMAIN,
    },
  });

  const worker = service("worker", {
    source: github("acme/monorepo", { rootDirectory: "apps/worker" }),
    build: "pnpm --filter worker build",
    start: "pnpm --filter worker start",
    env: {
      DATABASE_URL: db.env.DATABASE_URL,
      REDIS_URL: cache.env.REDIS_URL,
    },
  });

  return project("acme", {
    environments: ["production", "staging"],
    services: [db, cache, uploads, api, web, worker],
  });
});
```

## Field ownership

### Required by backend / platform reality

These are required somewhere in Railway's backend model, but not always required in source because the CLI/Backboard can infer or create them.

- Project ID: required to apply; comes from CLI link/create flow.
- Environment ID: required to preview/apply; comes from CLI link/create flow.
- Service/resource identity: required remotely; source uses deterministic address from type + name.
- Environment name: required by project definition for desired env list, but current v0 apply is environment-scoped.
- Bucket region: required at bucket creation.
- Database product/template metadata: required by product realization, but hidden behind helpers like `postgres()`.
- Custom domain name: required for `domain.create`.

### Inferred

- Resource address: inferred from helper + name, e.g. `service.web`.
- Service kind: inferred from source:
  - GitHub source → `github`
  - image source → `docker-image`
  - template source → `template`
  - no source → `empty`
- Source branch: `github()` defaults to `main`.
- Build config: string expands to `{ buildCommand }`.
- Deploy config: `start`, `healthcheck`, `healthcheckTimeout`, `regions` expand to Railway deploy fields.
- Variable references: `db.env.DATABASE_URL` expands to a Railway variable reference.
- Local upload target: `railway up` infers linked service or single desired source-less/deployable service.
- Current project/environment context: passed by CLI into the runner.

### Defaults / platform-owned values

These should usually be omitted from source and suppressed during diff/import:

- default build environment / builder
- default runtime, e.g. `runtime: "V2"`
- `useLegacyStacker: false`
- `ipv6EgressEnabled: false`
- default single-region platform config
- disabled/null regions
- default GitHub branch `main` where it only adds noise
- transient source fields like `commitSha` and `upstreamUrl`
- generated Railway service domains
- empty source root directory
- empty `{ build: {} }` and `{ deploy: {} }`

### Railway-specific concepts intentionally exposed

These are Railway product concepts users may need to express:

- projects
- environments
- services
- databases
- buckets
- custom domains
- regions/replicas
- Railway-provided service variables
- private/public domains via variable refs
- source-less services for local upload with `railway up`
- `preserve()` for existing encrypted/unknown values

### Railway-specific concepts intentionally hidden

These should not be part of normal `.railway/railway.ts` authoring:

- Railway UUIDs
- `EnvironmentConfigPatch`
- Backboard implementation details
- ServiceInstance internals
- generated Railway service domains
- product/template canvas metadata
- volume mount IDs
- raw patch paths

## Apply semantics

`railway config apply` always plans first, renders the diff, and confirms unless `--yes` is provided.

```bash
railway config apply
railway config apply --yes
```

If the runner returns validation errors, apply must not call Backboard.

### Services

Creating a service:

- Desired graph has a service address not present remotely.
- ChangeSet emits `resource.create`.
- Backboard creates the service/resource and config.
- If deploy config/source changes are present, they may trigger deployment-related effects.

Updating a service:

- Changes to source/build/deploy/networking/config emit `resource.update`.
- Backboard applies through internal product/config paths.
- Platform defaults should not churn.

Deleting a service:

- Removing a previously managed service emits `resource.delete`.
- It is destructive and must be clearly called out.
- Interactive apply prompts; `--yes` intentionally proceeds.

### Environment variables

Literal variables:

```ts
env: { NODE_ENV: "production" }
```

- Emit `variable.set` when missing or changed.
- Apply sets the value in Railway.
- Unknown/encrypted remote values may come back as `preserve()` on pull.

References:

```ts
env: { DATABASE_URL: db.env.DATABASE_URL }
```

- Emit `variable.set` with reference intent.
- Backboard resolves references using Railway's variable/reference semantics.

Preserved variables:

```ts
env: { STRIPE_SECRET_KEY: preserve() }
```

- Means “leave current value alone”.
- Used mainly for imported secrets whose values are unavailable.
- Should not create a brand-new secret value from scratch.
- Should not overwrite a real remote value with a placeholder.

Deleting variables:

- Removing a variable from source can emit `variable.delete` once the service/resource is managed.
- Variable deletes are destructive and should be visible in the plan.

### Regions / replicas

```ts
regions: {
  "us-west2": 2,
  "europe-west4": 1,
}
```

- Compiles to Railway multi-region replica config.
- Changes emit `resource.update` on deploy config.
- Default single-region platform config is suppressed.
- Disabled/null regions from Railway are omitted.
- Region changes may cause deploy/runtime effects and should be rendered clearly.

### Domains

```ts
domains: ["app.example.com"]
```

- Emits `domain.create` for new custom domains.
- Backboard uses the custom domain product path.
- Apply result should surface useful DNS/verification output when available.
- Generated Railway service domains are ignored and not rendered.
- Pull should render custom domains back as `domains`, not `networking.customDomains`.

Port variant:

```ts
domains: [{ domain: "api.example.com", port: 3000 }]
```

- Port should round-trip.

### Databases

```ts
const db = postgres("postgres");
```

- Emits database product intent, not fake client-authored service/volume patch internals.
- Backboard realizes through product/template workflow today.
- Database variables are generated by Railway and can be referenced from services.
- Next plan should be no-op after product/config state settles.
- Volume/mount behavior must be conservative; v0 should not accidentally unmount volumes.

### Buckets

```ts
bucket("media", { region: "iad" })
```

Create:

- Emits create/update intent through bucket product/config path.
- Region is required at creation.

Region update:

- Bucket region cannot be changed after creation by policy.
- The SDK rejects this with a diagnostic instead of producing a fake applyable diff.
- User guidance should be: create a new bucket in the desired region and migrate data.

### Volumes

Volumes are present in the DSL but not a safe complete v0 lifecycle yet.

Current safety rule:

- Do not diff existing volume mounts.
- Never plan accidental unmounts because an imported config omitted a Railway-owned volume ID.

### `railway up`

If `.railway/railway.ts` exists:

1. Run config plan.
2. Show readable diff.
3. Ask to apply config changes unless `--yes`.
4. Apply config if confirmed.
5. Infer deploy target.
6. Upload/deploy local code.

Opt-out:

```bash
railway up --no-sync
```

This skips configuration apply and behaves like normal deploy.

## Open DX questions before release

- Should `project(..., { services: [...] })` be renamed/expanded to `resources` while keeping `services` as compat?
- Should string custom domains default to port `8080`, or should the backend infer the service port?
- Should `preserve()` be allowed for missing variables as a no-op, or should it warn that there is nothing to preserve?
- Which deploy fields deserve first-class DSL aliases beyond `start`, `healthcheck`, `regions`?
- Should volume helpers be hidden from v0 docs until lifecycle is safe?
- Should group helpers be hidden/export-gated until import/round-trip/apply semantics are complete?
- How much imported config should be environment-agnostic vs literal current-environment state?
