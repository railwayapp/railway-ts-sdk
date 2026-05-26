# RailwayChangeSet API reference

`RailwayChangeSet` is the intent-level protocol for project-state changes.

It sits between authoring surfaces and Backboard apply machinery:

```txt
IaC / Web / CLI / MCP / Diagnosis / Agents
  → RailwayChangeSet
  → Backboard validate / authorize / realize / stage / apply
```

It is not an `EnvironmentConfig` patch. Patches are the current execution substrate; ChangeSets are the producer-facing intent protocol.

## Top-level shape

```ts
type RailwayChangeSet = {
  version: 0;
  changes: RailwayChange[];
  diagnostics: ChangeDiagnostic[];
};
```

## Common fields

Every change carries:

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
- `severity`: whether the change is destructive.
- `deployEffect`: whether applying this change is expected to trigger deployment behavior.

## Resource identity

Resources are addressed by graph address, not Railway remote ID:

```txt
service.frontend
database.Redis
bucket.uploads
volume.data
```

Remote IDs are resolved by Backboard using current project/environment state and future binding/provenance metadata.

## Current v0 change kinds

### `resource.create`

Create a project resource.

```ts
type CreateResourceChange = ChangeBase & {
  kind: "resource.create";
  address: ResourceAddress;
  resource: ResourceNode;
};
```

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

### `resource.update`

Update a top-level resource field.

```ts
type UpdateResourceChange = ChangeBase & {
  kind: "resource.update";
  address: ResourceAddress;
  field: string;
  before: unknown;
  after: unknown;
};
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

### `resource.delete`

Delete a resource.

```ts
type DeleteResourceChange = ChangeBase & {
  kind: "resource.delete";
  address: ResourceAddress;
  previous: ResourceNode;
};
```

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

### `variable.set`

Set or update an environment variable on a service-like resource.

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

### `variable.delete`

Delete an environment variable from a service-like resource.

```ts
type DeleteVariableChange = ChangeBase & {
  kind: "variable.delete";
  address: ResourceAddress;
  variable: string;
  previous: VariableValue;
};
```

## Variable values

```ts
type VariableValue =
  | { type: "literal"; value: string }
  | { type: "reference"; resource: ResourceAddress; output: string }
  | { type: "raw"; value: VariableConfig };
```

References are resolved by Backboard when realizing the change:

```json
{
  "type": "reference",
  "resource": "database.Redis",
  "output": "REDIS_URL"
}
```

becomes the appropriate Railway variable expression for the current project.

## Diagnostics

Diagnostics are warnings/errors attached to a ChangeSet. They are not changes.

```ts
type ChangeDiagnostic = {
  severity: "warning" | "error";
  path: string;
  message: string;
};
```

Use diagnostics for validation, unsafe operations, unsupported fields, and agent repair loops.

## Current Backboard mutation

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

Current support:

- `resource.create` for service/database-shaped resources
- `resource.create` for buckets
- `resource.update` for service fields
- `resource.delete` for services/databases
- `variable.set`
- `variable.delete`

Current limitations:

- v0 is JSON input, not a finalized GraphQL input object.
- database realization is still service-shaped/prototype-level.
- rename/adoption/bind operations are not modeled yet.
- field ownership and ignored drift are not modeled yet.
- default normalization is still incomplete and should become platform-owned.

## Intended future operation taxonomy

v0 uses generic operations. The target API should become more product-intentful where realization matters:

```txt
service.create
service.update
database.create
bucket.create
volume.create
domain.create
variable.set
resource.delete
resource.rename
resource.bind
```

The goal is for producers to describe intent while Backboard owns validation, authorization, provisioning workflows, ID resolution, staging, and apply behavior.
