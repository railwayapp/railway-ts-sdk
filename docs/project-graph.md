# RailwayGraph v1

`RailwayGraph` is the deterministic project-state intermediate representation. It is the boundary between authoring surfaces and Railway changes.

```txt
railway.ts / Web / CLI / Template / Agent
  → RailwayGraph
  → RailwayChangeSet
  → validate/stage/apply
```

## Design constraints

- **Stable enough to reference.** Runtime SDK code, typegen, drift, and agents should consume graph nodes, not source code shape.
- **Typed enough to evolve.** Model Railway concepts directly even if persistence remains generic.
- **Deterministic.** Same inputs produce same graph, addresses, refs, and edges.
- **Importable.** Existing Railway state must be representable as graph.
- **Not storage.** Graph is an IR, not Backboard schema and not a DB migration plan.

## Shape

```ts
type RailwayGraph = {
  version: 1;
  project: ProjectNode;
  environments: EnvironmentNode[];
  resources: ResourceNode[];
  edges: Edge[];
};
```

## Identity model

Every resource has:

```ts
{
  address: "service.api"; // deterministic graph address
  name: "api";            // display/authored name
  type: "service";
}
```

- `address` is the graph handle and reference target.
- `name` is the human-facing Railway name.
- remote Railway IDs live in bindings/lock state, not authored source.

Future binding file:

```json
{
  "resources": {
    "service.api": { "remoteId": "...", "lastSeenName": "api" }
  }
}
```

## Environment boundary

Graph v1 intentionally does not model Backboard `ServiceInstance` as a first-class resource.

Backboard currently materializes service/environment state as `Service + Environment → ServiceInstance`. That is an apply/storage detail, not necessarily durable project intent. Many environments are ephemeral, especially PR environments; sandbox and ephemeral compute workflows may increase that churn further.

The graph should capture durable project intent and policy. Sync/runtime context selects concrete environments at apply time. Do not encode every live environment or service-instance mapping as graph truth unless product friction proves we need that abstraction.

## Resource kinds

Graph v1 models:

```txt
service, database, volume, bucket, group
```

Service-like resources carry typed buckets:

```txt
source, build, deploy, networking, variables, volumeMounts
```

Database is currently a service-like resource with database metadata:

```txt
engine, image, output, defaultMountPath
```

That mirrors Railway today while leaving room for database-specific modeling later.

## Edges

Edges make implicit dependencies explicit:

```txt
variable reference: service.api → database.postgres
mount: service.api → volume.data
group: service.api → group.backend
```

Edges power ordering, validation, graph visualization, drift explanations, and generated context.

## Graph invariants

- `version` is required.
- resource `address` values are unique.
- resource names are unique within a resource type for name-based lookup.
- edges reference existing resource addresses.
- evaluation must not perform Railway mutations.
- generated graph is reproducible from authoring + explicit inputs.

## Next step

`RailwayChangeSet` should diff current graph and desired graph into intent-level operations. The graph says what should exist; the change set says what must change.
