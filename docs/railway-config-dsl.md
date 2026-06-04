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
    environments: ["production"],
    services: [web],
  });
});
```

Zero-argument programs are also valid:

```ts
export default defineRailway(() => {
  return project("my-project", {
    environments: ["production"],
    services: [service("web")],
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
    regions: prod
      ? { "us-west2": 2, "europe-west4": 1 }
      : { "us-west2": 1 },
  });

  return project("my-app", {
    environments: ["production", "staging"],
    services: [web],
  });
});
```

## `project(name, definition)`

```ts
project(name: string, definition: {
  environments: string[];
  services: ResourceNode[];
})
```

Today `services` is the collection for all top-level resources, including services, databases, buckets, volumes, and groups.

```ts
return project("acme", {
  environments: ["production", "staging"],
  services: [web, worker, db, cache, media],
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
  autoUpdates?: boolean;
})
```

```ts
service("nginx", {
  source: image("nginx:latest"),
});
```

### `template(templateName, options?)`

```ts
template(templateName: string, options?: Record<string, unknown>)
```

Template source is available in the DSL but still product-specific and not the main v0 path.

### `empty()`

```ts
empty(): SourceConfig
```

A source-less service is valid. `railway up` can deploy the current directory to it.

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
  regions?: Record<string, RegionConfig>;

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

### Regions

```ts
type RegionConfig = number | {
  replicas?: number;
  stacker?: string | null;
};
```

```ts
service("web", {
  regions: {
    "us-west2": 2,
    "europe-west4": { replicas: 1 },
  },
});
```

This renders to Railway multi-region replica config. Disabled/null regions from Railway are ignored during import/diff.

### Domains

```ts
service("web", {
  domains: ["app.example.com"],
});
```

Port variant:

```ts
service("web", {
  domains: [{ domain: "api.example.com", port: 3000 }],
});
```

String domains currently default to port `8080`.

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
fn(name: string, config?: ServiceConfigInput)
```

Creates a service node with `kind: "function"`. v0 support is intentionally thin and follows normal service semantics.

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

```ts
group(name: string, options?: {
  color?: string;
  icon?: string;
  isCollapsed?: boolean;
})
```

```ts
const backend = group("Backend", { color: "blue" });
```

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

- `regions`, not `multiRegionConfig`
- `domains`, not `networking.customDomains`
- `.env` references, not raw Railway variable reference syntax
- `preserve()`, not placeholder secret strings

The DSL should not expose:

- Railway UUIDs
- `EnvironmentConfigPatch`
- Backboard internals
- generated Railway service domains
- volume mount IDs as authoring requirements
