# Railway Configuration DSL

This document describes the public TypeScript authoring surface for `.railway/railway.ts`.

## Import surface

```ts
import {
  defineRailway,
  define,
  project,
  service,
  fn,
  github,
  image,
  template,
  empty,
  postgres,
  redis,
  mysql,
  mongo,
  database,
  bucket,
  volume,
  group,
  ref,
  preserve,
} from "railway/iac";
```

## File shape

```ts
export default defineRailway((ctx) => {
  const web = service("web");

  return project("my-project", {
    resources: [web],
  });
});
```

Zero-argument programs are also valid:

```ts
export default defineRailway(() => {
  return project("my-project", {
    resources: [service("web")],
  });
});
```

## `defineRailway(program)`

```ts
defineRailway(
  program: (ctx: RailwayContext, project: typeof project) =>
    ProjectDefinition | Promise<ProjectDefinition>
)
```

Alias:

```ts
define(program)
```

### `RailwayContext`

The CLI passes runtime context so one file can render different desired state per environment.

```ts
interface RailwayContext {
  command?: string;
  projectId?: string;
  projectName?: string;
  environmentId?: string;
  environment?: string;
  environmentName?: string;

  isEnvironment(name: string): boolean;
  randomString(label?: string, bytes?: number): string;
}
```

Example:

```ts
export default defineRailway((ctx) => {
  const prod = ctx.isEnvironment("production");

  const web = service("web", {
    replicas: prod ? { "us-west2": 2, "europe-west4": 1 } : 1,
  });

  return project("my-app", {
    resources: [web],
  });
});
```

## `project(name, definition)`

```ts
project(name: string, definition: {
  resources: ResourceNode[];
})
```

`resources` is the collection for all top-level resources, including services, databases, buckets, volumes, and groups.

```ts
return project("acme", {
  resources: [web, worker, db, cache, media],
});
```

## Sources

### `github(repo, options?)`

```ts
github(repo: string, options?: {
  branch?: string;
  rootDirectory?: string;
  autoDeploy?: boolean;
  watchPatterns?: string[];
  [key: string]: unknown;
})
```

```ts
service("web", {
  source: github("railwayapp/starters", {
    branch: "main",
    rootDirectory: "examples/nextjs",
  }),
});
```

### `image(imageName, options?)`

```ts
image(imageName: string, options?: {
  rootDirectory?: string;
  autoUpdates?: {
    type?: "disabled" | "patch" | "minor";
    schedule?: { day: number; startHour: number; endHour: number }[];
    tagMode?: "semver" | "sha";
  };
})
```

```ts
service("nginx", {
  source: image("nginx:latest"),
});
```

#### Image auto-updates

`autoUpdates` has Railway redeploy the service when a newer image tag is
published. `type` picks which bumps are taken: `"patch"` or `"minor"` semver
steps, or `"disabled"`. `schedule` restricts the redeploy to weekly UTC
maintenance windows; leave it out and updates may run at any time.

```ts
service("nginx", {
  source: image("nginx:latest", {
    autoUpdates: {
      type: "patch",
      schedule: [{ day: 6, startHour: 2, endHour: 6 }],
    },
  }),
});
```

Each window is `{ day, startHour, endHour }` in UTC: `day` is `0` (Sunday)
to `6` (Saturday), `startHour` is `0`-`23` and inclusive, `endHour` is
`1`-`24` and exclusive, and `endHour` must be greater than `startHour`. A
window cannot cross midnight, so a Saturday-night window is two entries:
`{ day: 6, startHour: 22, endHour: 24 }` and `{ day: 0, startHour: 0, endHour: 2 }`.
The dashboard's presets are plain windows too, e.g. Weekends is
`[{ day: 6, startHour: 0, endHour: 24 }, { day: 0, startHour: 0, endHour: 24 }]`.

Auto-updates only apply to Docker Hub and GHCR image sources; `image()` throws
for any other registry. `image()` also rejects a window outside those bounds
at authoring time, naming the offending entry, so the mistake does not wait for
`railway config apply`. Changing `schedule` on its own never redeploys the
service.

### `template(templateName, options?)`

```ts
template(templateName: string, options?: Record<string, unknown>)
```

Template source is available in the DSL but still product-specific and not the main v0 path.

### `empty()`

```ts
empty(): SourceConfig
```

A source-less service is valid when `.railway/railway.ts` should manage service settings but not declare a GitHub repository or Docker image.

```ts
service("web", {
  source: empty(),
});
```

Omitting `source` is equivalent for most local-upload v0 use cases.

## `service(name, config?)`

```ts
service(name: string, config?: ServiceConfigInput)
```

Returns a service node with an `.env` accessor for references:

```ts
const api = service("api", {
  env: {
    INTERNAL_TOKEN: preserve(),
  },
});

const web = service("web", {
  env: {
    API_TOKEN: api.env.INTERNAL_TOKEN,
  },
});
```

### `ServiceConfigInput`

```ts
interface ServiceConfigInput {
  source?: SourceConfig | Omit<SourceConfig, "type">;
  root?: string;
  rootDirectory?: string;

  build?: string | BuildConfig;

  start?: string;
  startCommand?: string;
  preDeploy?: string | string[];
  preDeployCommand?: string | string[];
  healthcheck?: string;
  healthcheckPath?: string;
  healthcheckTimeout?: number;

  run?: {
    command?: string;
    preDeploy?: string | string[];
    healthcheck?: string;
    healthcheckTimeout?: number;
  };

  deploy?: DeployConfig;
  replicas?: number | Record<string, RegionConfig>;
  regions?: Record<string, RegionConfig>; // compatibility alias

  networking?: ServiceNetworking;
  domains?: Array<string | { domain: string; port?: number }>;
  tcp?: Array<string | number>;
  tcpProxies?: string[];

  env?: Record<string, string | VariableConfig | VariableValue>;
  variables?: Record<string, string | VariableConfig | VariableValue>;

  volumeMounts?: Record<string, VolumeMount | null>;
  configFile?: string;
  parentServiceId?: string;
  groupId?: string;

  clusterRole?: ServiceConfig["clusterRole"];
  replicaConfig?: ServiceConfig["replicaConfig"];
  clusterDisplay?: ServiceConfig["clusterDisplay"];

  tracing?: ServiceConfig["tracing"];
  cdn?: ServiceConfig["cdn"];
}
```

### Common service shorthand

```ts
service("web", {
  build: "pnpm build",
  start: "pnpm start",
  healthcheck: "/health",
  healthcheckTimeout: 30,
});
```

Expands to Railway deploy/build config:

```ts
{
  build: { buildCommand: "pnpm build" },
  deploy: {
    startCommand: "pnpm start",
    healthcheckPath: "/health",
    healthcheckTimeout: 30,
  },
}
```

### Pre-deploy timeout

`preDeployTimeoutSeconds` (1–3600) has no shorthand; set it under `deploy`. Unset means no limit.

```ts
service("api", {
  preDeploy: "npx prisma migrate deploy",
  deploy: { preDeployTimeoutSeconds: 600 },
});
```

### Replicas

Prefer `replicas` for scaling intent.

```ts
service("web", {
  replicas: 3,
});
```

Advanced placement form:

```ts
type RegionConfig = number | {
  count?: number;
  replicas?: number; // compatibility alias
  stacker?: string | null;
};

service("web", {
  replicas: {
    "us-west2": 2,
    "europe-west4": { count: 1 },
  },
});
```

`regions` remains a compatibility alias for the same underlying Railway multi-region replica config. Imports should prefer `replicas`. Disabled/null regions from Railway are ignored during import/diff.

### Domains

Custom domains are import-only for now. Register the domain in the Railway
dashboard, then run `railway config pull`; the generated service uses:

```ts
service("web", {
  domains: ["app.example.com"],
});
```

A domain with an explicit target port pulls as:

```ts
service("web", {
  domains: [{ domain: "api.example.com", port: 3000 }],
});
```

Adding an unregistered domain to source produces a plan diagnostic instead of
silently attempting product registration. String domains render with port
`8080`, the current imported default.

### TCP proxies

```ts
service("tcp", {
  tcp: ["5432"],
});
```

or:

```ts
service("tcp", {
  tcpProxies: ["5432"],
});
```

### Tracing

Tracing is set per service and per environment.

```ts
service("web", {
  tracing: { enabled: true, autoInstrumentation: true },
});
```

`enabled` has the edge record a span per client-facing request and provides
the OpenTelemetry exporter variables on the next deploy. `autoInstrumentation`
instruments the service's processes with eBPF (OBI) for supported runtimes and
only takes effect while `enabled` is true. Railway serialises only the switches
that are on, so leaving the block out, `{ enabled: false }` and `null` all mean
the same thing: no tracing, and no drift in `railway config plan`.

Requires Railway CLI 5.63.0 or newer. Older CLIs drop the block when compiling
the config.

### CDN

CDN caching is set per service and per environment, for the service's public
domains. The settings live on the edge and apply without a deploy.

```ts
service("web", {
  cdn: { enabled: true },
});

service("docs", {
  cdn: {
    enabled: true,
    defaultTtlSeconds: 86400,
    htmlCaching: "force",
    staleWhileRevalidate: false,
    purgeOnDeploy: "all",
  },
});
```

`enabled` caches responses from the service's public domains at Railway's
edge. It needs a public domain and cannot be combined with Railway
Authentication. The other knobs tune the cache and each has a default:

- `defaultTtlSeconds`: how long the edge keeps a cacheable response without
  `Cache-Control` headers of its own, in seconds. Defaults to `7200`.
- `htmlCaching`: whether HTML documents are cached. `auto` follows the
  response headers, `force` caches them regardless, `never` leaves them
  uncached. Defaults to `auto`.
- `staleWhileRevalidate`: honour `stale-while-revalidate` `Cache-Control`
  directives, serving a stale copy while the edge refreshes it. Defaults to
  `true`.
- `purgeOnDeploy`: what a successful deploy purges from the cache. `html`
  keeps immutable assets warm, `all` clears everything, `off` purges nothing.
  Defaults to `html`.

Railway serialises the block only while caching is on, and only the knobs that
differ from the defaults. Leaving the block out, `{ enabled: false }` and
`null` all mean the same thing: no caching, and no drift in
`railway config plan`. `{ enabled: true }` is a service caching with the
defaults, so a knob set to its default does not plan as drift either.

Requires a Railway CLI that compiles `cdn`. Older CLIs drop the block when
compiling the config.

### Environment variables

Literal strings:

```ts
service("web", {
  env: {
    NODE_ENV: "production",
  },
});
```

References:

```ts
const db = postgres("postgres");

service("web", {
  env: {
    DATABASE_URL: db.env.DATABASE_URL,
  },
});
```

Preserve imported/remote values:

```ts
service("web", {
  env: {
    STRIPE_SECRET_KEY: preserve(),
  },
});
```

Raw variable config:

```ts
service("web", {
  env: {
    FOO: { value: "bar" },
  },
});
```

`env` and `variables` are aliases. If both are supplied, values are merged with `env` winning.

## `fn(name, config?)`

```ts
fn(name: string, config?: FunctionConfigInput)

interface FunctionConfigInput extends ServiceConfigInput {
  codeFile?: string | URL;
  runtime?: "bun"; // default
}
```

Creates a service node with `kind: "function"`. A Railway Function is a single-file service: Railway runs the function image and stores the code base64-encoded in the start command, so there is no repository to point at. `fn()` reads the file and does that encoding for you when the config is evaluated.

```ts
fn("hello", {
  codeFile: "./functions/hello.ts",
  domains: ["hello.example.com"],
});

fn("nightly-cleanup", {
  codeFile: "./functions/cleanup.ts",
  deploy: { cronSchedule: "0 2 * * *" },
  env: { DATABASE_URL: db.env.DATABASE_URL },
});
```

- `codeFile` is a path to the function's source. A relative path resolves against the directory of the file that calls `fn()`, normally `.railway/`, whatever directory `railway config plan` runs from. Absolute paths and `file:` URLs (`new URL("./x.ts", import.meta.url)`) are used as is. A file that cannot be read throws with the resolved path.
- The file compiles to `source: image("ghcr.io/railwayapp/function-bun:1.4.0")` plus `deploy.startCommand: "./run.sh <base64>"` — the same shape the dashboard editor and `railway functions push` write, so the dashboard shows and edits the source as usual.
- `runtime` picks the runtime image; `bun` is the only runtime today and the default. An explicit `source: image(...)` wins, which is how you pin another tag.
- The file must be at most 98,295 bytes of UTF-8 (`FUNCTION_SOURCE_MAX_BYTES`, just under 96 KB): the whole payload is one argv entry of the container's start command, the kernel caps a single argument at 128 KiB, and the base64 has to fit after the `./run.sh ` prefix. Larger code throws at authoring time, before any plan; the API enforces the same limit.
- `codeFile` owns the start command, so passing `start`, `startCommand`, `run.command` or `deploy.startCommand` alongside it throws.

Without `codeFile` or `runtime`, `fn()` follows normal service semantics and accepts everything `service()` does.

## Databases

Database helpers return database nodes with typed `.env` references.

```ts
const db = postgres("postgres");
const cache = redis("redis");
const sql = mysql("mysql");
const documents = mongo("mongo");
```

### `postgres(name)`

Default product intent:

```ts
postgres(name: string)
```

- engine: `postgres`
- image: `ghcr.io/railwayapp-templates/postgres-ssl:18`
- primary output: `DATABASE_URL`
- default mount path: `/var/lib/postgresql/data`

### `redis(name)`

- engine: `redis`
- image: `railwayapp/redis:8.2`
- primary output: `REDIS_URL`
- default mount path: `/bitnami`

### `mysql(name)`

- engine: `mysql`
- image: `mysql:9`
- primary output: `MYSQL_URL`
- default mount path: `/var/lib/mysql`

### `mongo(name)`

- engine: `mongo`
- image: `mongo:8`
- primary output: `MONGO_URL`
- default mount path: `/data/db`

### `database(name, engine, options)`

```ts
database(name: string, engine: "postgres" | "mysql" | "redis" | "mongo" | "private", options: {
  image: string;
  output?: string;
  defaultMountPath?: string;
})
```

Use only when a built-in helper is insufficient.

## Buckets

```ts
bucket(name: string, config?: BucketConfig)
```

```ts
const media = bucket("media", {
  region: "iad",
});
```

Bucket regions are immutable after creation. Changing region for an existing bucket is rejected with a diagnostic.

## Volumes

```ts
volume(name: string, config?: VolumeConfig)
```

Volume lifecycle is not a safe v0 authoring path yet. Existing volume mounts are intentionally not diffed to avoid accidental unmounts.

## Groups

Groups are structural canvas organization.

```ts
const backend = group("Backend", [
  api,
  worker,
  db,
]);

return project("acme", {
  resources: [backend, web],
});
```

Metadata form:

```ts
const backend = group("Backend", [api, worker], {
  color: "blue",
  icon: "server",
  isCollapsed: false,
});
```

Compatibility form for group metadata only:

```ts
const backend = group("Backend", { color: "blue" });
```

When passed resources, `group()` returns the group plus those resources with group membership attached, so `resources: [group("Backend", [api, worker])]` is valid.

Volumes cannot be grouped independently because the canvas places a volume with
its attached service. `group()` rejects volume nodes at compile time and runtime;
group the attached service instead.

## Variables and references

### `preserve()`

```ts
preserve(): VariableValue
```

Means “keep the current Railway value”. It is mainly for imported encrypted/unknown secrets.

```ts
service("web", {
  env: {
    DATABASE_URL: preserve(),
  },
});
```

### `ref(resource, output)`

```ts
ref(resource: ResourceNode, output: string): VariableValue
```

Explicit reference helper. Usually prefer `.env` accessors.

```ts
const api = service("api");
const web = service("web", {
  env: {
    API_HOST: ref(api, "RAILWAY_PRIVATE_DOMAIN"),
  },
});
```

### `.env` accessors

Every service/database helper returns an `.env` accessor:

```ts
const api = service("api");
const db = postgres("postgres");

service("web", {
  env: {
    API_HOST: api.env.RAILWAY_PRIVATE_DOMAIN,
    DATABASE_URL: db.env.DATABASE_URL,
  },
});
```

## Railway-provided variables

All services expose these reference names:

```ts
RAILWAY_PUBLIC_DOMAIN
RAILWAY_PRIVATE_DOMAIN
RAILWAY_TCP_PROXY_DOMAIN
RAILWAY_TCP_PROXY_PORT
RAILWAY_DEPLOYMENT_ID
RAILWAY_DEPLOYMENT_DRAINING_SECONDS
RAILWAY_ENVIRONMENT
RAILWAY_ENVIRONMENT_ID
RAILWAY_PROJECT_ID
RAILWAY_PROJECT_NAME
RAILWAY_SERVICE_ID
RAILWAY_SERVICE_NAME
RAILWAY_REPLICA_ID
PORT
```

Database helpers expose additional typed names, for example:

```ts
postgres("db").env.DATABASE_URL
redis("redis").env.REDIS_URL
mysql("mysql").env.MYSQL_URL
mongo("mongo").env.MONGO_URL
```

## Notes on public vs internal shape

Public DSL names should prefer product concepts:

- `replicas`, not `multiRegionConfig`
- `domains`, not `networking.customDomains`
- `.env` references, not raw Railway variable reference syntax
- `preserve()`, not placeholder secret strings

The DSL should not expose:

- Railway UUIDs
- `EnvironmentConfigPatch`
- Backboard internals
- generated Railway service domains
- volume mount IDs as authoring requirements
