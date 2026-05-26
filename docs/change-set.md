# RailwayChangeSet v0

`RailwayChangeSet` is the intent-level delta between current Railway state and desired graph state.

```txt
RailwayGraph(current) + RailwayGraph(desired)
  → RailwayChangeSet
  → validate/stage/apply
```

## Purpose

Backboard should receive typed intent, not SDK-specific source code and not arbitrary blob diffs.

Change sets are the convergence point for:

```txt
IaC, CLI, Web, Templates, MCP, Diagnosis, Chat, agents
```

Not every producer needs to build a full graph. Some producers can emit change sets directly.

## Shape

```ts
type RailwayChangeSet = {
  version: 0;
  changes: RailwayChange[];
  diagnostics: ChangeDiagnostic[];
};
```

Initial change kinds:

```txt
resource.create
resource.update
resource.delete
variable.set
variable.delete
```

Each change carries:

```txt
path, summary, severity, deployEffect
```

Where:

```txt
severity: safe | destructive
deployEffect: none | deploy | unknown
```

## Boundary

The SDK can draft change sets to prove the protocol. Backboard should eventually own final validation and translation to staged patch/application behavior.

Initial adapter path:

```txt
graph diff → RailwayChangeSet → existing EnvironmentConfig patch → environmentStageChanges
```

Long-term producers target the same protocol; apply semantics stay centralized.

## Non-goals for v0

- exhaustive operation taxonomy
- final GraphQL input shape
- replacement for staged patches
- full rename semantics
- field ownership / ignored drift
- canonical deploy-impact calculation

v0 exists to make the receiving shape concrete before Backboard integration.
