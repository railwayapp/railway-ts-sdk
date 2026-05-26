# RailwayChangeSet API reference

`RailwayChangeSet` is the intent-level protocol for Railway project-state changes.

```txt
IaC / Web / CLI / MCP / Diagnosis / Agents
  → RailwayChangeSet
  → Backboard validate / authorize / realize / stage / apply
```

It is **not** an `EnvironmentConfig` patch. Patches are the current execution substrate. ChangeSets are the producer-facing intent protocol.

## Status legend

| Status | Meaning |
| --- | --- |
| ✅ Implemented | Exists in the SDK and/or experimental Backboard receiver. |
| 🚧 Partial | Exists, but semantics are incomplete/prototype-level. |
| 🧭 Planned | Desired API direction; not implemented yet. |

## Capability summary

| Capability | Status | Notes |
| --- | --- | --- |
| `RailwayChangeSet` envelope | ✅ | `version`, `changes`, `diagnostics`. |
| Graph address identity | ✅ | Uses addresses like `service.frontend`, not Railway UUIDs. |
| `resource.create` | ✅ | Implemented for service/database-shaped resources and buckets. |
| `resource.update` | ✅ | Implemented for selected service fields. Still generic. |
| `resource.delete` | ✅ | Implemented for services/databases. Destructive. |
| `variable.set` | ✅ | Supports literals, raw variable config, graph references. |
| `variable.delete` | ✅ | Stages variable deletion. |
| Diagnostics | 🚧 | Type exists; validation is minimal. |
| Backboard mutation | ✅ | `environmentStageChangeSet(environmentId, input: JSON, merge)`. |
| Backboard server-side realization | 🚧 | Works for a small subset; database provisioning is still service-shaped. |
| Product-intent operation taxonomy | 🧭 | Future shape: `service.create`, `database.create`, etc. |
| Rename/adoption/bind operations | 🧭 | Needed for imports, renames, lock/provenance. |
| Field ownership / ignored drift | 🧭 | Needed for partial management and UI/IaC coexistence. |
| Canonical default normalization | 🚧 | Some SDK normalization exists; should become platform-owned. |
| Native database provisioning | 🧭 | ChangeSet should express `database.create`; Backboard should choose template/native workflow. |

## Current envelope ✅

```ts
type RailwayChangeSet = {
  version: 0;
  changes: RailwayChange[];
  diagnostics: ChangeDiagnostic[];
};
```

## Common change fields ✅

```ts
type ChangeBase = {
  kind: string;
  path: string;
  summary: string;
  severity: "safe" | "destructive";
  deployEffect: "none" | "deploy" | "unknown";
};
```

- `kind`: operation type.
- `path`: stable machine-readable path for UI, logs, validation, and agent repair.
- `summary`: human-readable preview text.
- `severity`: safety classification.
- `deployEffect`: expected deploy side effect.

## Resource identity ✅

Resources are addressed by deterministic graph address:

```txt
service.frontend
database.Redis
bucket.uploads
volume.data
```

Railway UUIDs are resolved by Backboard from current state and, later, binding/provenance metadata.

## Current v0 operations

### `resource.create` ✅

Generic create operation.

```ts
type CreateResourceChange = ChangeBase & {
  kind: "resource.create";
  address: ResourceAddress;
  resource: ResourceNode;
};
```

Implemented today for:

- service-shaped resources
- database-shaped resources as service-shaped resources 🚧
- buckets

Example:

```json
{
  "kind": "resource.create",
  "address": "service.frontend",
  "path": "resources.service.frontend",
  "summary": "Create service frontend",
  "severity": "safe",
  "deployEffect": "deploy",
  "resource": {
    "address": "service.frontend",
    "type": "service",
    "kind": "github",
    "name": "frontend",
    "source": { "type": "github", "repo": "acme/app", "branch": "main" }
  }
}
```

### `resource.update` ✅/🚧

Generic top-level resource field update.

```ts
type UpdateResourceChange = ChangeBase & {
  kind: "resource.update";
  address: ResourceAddress;
  field: string;
  before: unknown;
  after: unknown;
};
```

Backboard currently realizes selected service fields:

```txt
source, build, deploy, networking, volumeMounts, configFile
```

Example:

```json
{
  "kind": "resource.update",
  "address": "service.frontend",
  "field": "deploy",
  "path": "resources.service.frontend.deploy",
  "summary": "Update frontend deploy",
  "severity": "safe",
  "deployEffect": "deploy",
  "before": { "startCommand": "pnpm start" },
  "after": { "startCommand": "pnpm preview" }
}
```

### `resource.delete` ✅

Delete a resource.

```ts
type DeleteResourceChange = ChangeBase & {
  kind: "resource.delete";
  address: ResourceAddress;
  previous: ResourceNode;
};
```

Implemented for services/databases. Destructive by definition.

Example:

```json
{
  "kind": "resource.delete",
  "address": "service.frontend",
  "path": "resources.service.frontend",
  "summary": "Delete service frontend",
  "severity": "destructive",
  "deployEffect": "deploy",
  "previous": {
    "address": "service.frontend",
    "type": "service",
    "name": "frontend"
  }
}
```

### `variable.set` ✅

Set or update a service variable.

```ts
type SetVariableChange = ChangeBase & {
  kind: "variable.set";
  address: ResourceAddress;
  variable: string;
  before?: VariableValue;
  after: VariableValue;
};
```

Example:

```json
{
  "kind": "variable.set",
  "address": "service.frontend",
  "variable": "REDIS_URL",
  "path": "resources.service.frontend.variables.REDIS_URL",
  "summary": "Set variable frontend.REDIS_URL",
  "severity": "safe",
  "deployEffect": "deploy",
  "after": {
    "type": "reference",
    "resource": "database.Redis",
    "output": "REDIS_URL"
  }
}
```

### `variable.delete` ✅

Delete a service variable.

```ts
type DeleteVariableChange = ChangeBase & {
  kind: "variable.delete";
  address: ResourceAddress;
  variable: string;
  previous: VariableValue;
};
```

## Variable values ✅

```ts
type VariableValue =
  | { type: "literal"; value: string }
  | { type: "reference"; resource: ResourceAddress; output: string }
  | { type: "raw"; value: VariableConfig };
```

Backboard resolves graph references into Railway variable expressions.

## Diagnostics 🚧

Diagnostics are warnings/errors attached to the ChangeSet. They are not changes.

```ts
type ChangeDiagnostic = {
  severity: "warning" | "error";
  path: string;
  message: string;
};
```

Intended uses:

- validation failures
- unsupported operations
- unsafe/destructive warnings
- agent repair context
- UI field highlighting

Current validation is minimal.

## Current Backboard API ✅/🚧

Experimental mutation:

```graphql
mutation StageChangeSet($environmentId: String!, $input: JSON!, $merge: Boolean) {
  environmentStageChangeSet(
    environmentId: $environmentId
    input: $input
    merge: $merge
  ) {
    id
    patch
  }
}
```

Current receiver responsibilities:

- validate version
- authorize environment access through existing GraphQL auth scopes
- resolve service/bucket names to Railway IDs
- create missing service/bucket rows for supported create operations
- compile supported changes to `EnvironmentConfig`
- validate serialized environment
- stage through existing environment patch system

Current limitations:

- `input` is raw `JSON`; finalized API should use typed GraphQL input.
- database create/update is not native provisioning yet.
- no rename/bind/adoption operations.
- no field ownership/ignored drift.
- partial operation support only.

## Desired product-intent API 🧭

The long-term API should move from generic `resource.*` operations toward product-intent operations where realization matters.

| Desired operation | Status | Why |
| --- | --- | --- |
| `service.create` | 🧭 | Backboard can create project-level `Service` and env config correctly. |
| `service.update` | 🧭 | Avoid generic field blobs; validate service-specific changes. |
| `database.create` | 🧭 | Backboard chooses template/native provisioning workflow. |
| `database.update` | 🧭 | DB-specific model instead of generic service config. |
| `bucket.create` | 🧭 | Native bucket creation/provisioning. |
| `volume.create` | 🧭 | Native volume creation and attachment semantics. |
| `domain.create` | 🧭 | Domain validation, ownership, DNS/proxy behavior. |
| `variable.set` | ✅ | Already present; should remain product-level. |
| `resource.delete` | ✅/🚧 | Present; needs stronger confirmation/blast-radius metadata. |
| `resource.rename` | 🧭 | Preserve identity instead of delete/create. |
| `resource.bind` | 🧭 | Import/adoption: bind graph address to existing Railway ID. |
| `field.ignore` / ownership policy | 🧭 | Support partial management and drift policy. |

Example future database operation:

```json
{
  "kind": "database.create",
  "address": "database.Redis",
  "engine": "redis",
  "name": "Redis",
  "version": "8",
  "outputs": ["REDIS_URL"],
  "path": "resources.database.Redis",
  "summary": "Create Redis database Redis",
  "severity": "safe",
  "deployEffect": "deploy"
}
```

This lets producers express database intent while Backboard decides whether the realization is template deploy, native database provisioning, or a future dedicated model.

## Design rule

Authoring layers should emit **intent**. Backboard should own **realization**.

```txt
Good: database.create({ engine: "redis" })
Bad:  service-shaped Redis EnvironmentConfig patch with image/mount/default serialization
```

This keeps SDK/Web/MCP/agents stable while Railway's internal project model evolves.
