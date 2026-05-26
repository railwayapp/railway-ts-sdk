# Railway Project State Strategy

## Status

Draft strategy, not RFC. Goal: align 1-3 year direction before locking implementation details.

## Thesis

Railway needs an owned, typed project-state layer.

IaC is the forcing function, not the whole product. The same model should eventually power CLI, Web, Templates, MCP, Diagnosis, Chat, agents, and runtime SDK context.

Do not start by rewriting Backboard. Start by putting a durable boundary around project state, then migrate producers/consumers toward it.

```txt
authoring/action/suggestion
  → RailwayGraph
  → RailwayChangeSet
  → validate/stage/apply
  → existing Railway systems
```

## Problem

Railway project state is spread across feature-specific paths and generic service blobs. This made shipping fast, but now slows safe evolution.

Pain:

- service data modeling is too generic for product-specific evolution
- Web, CLI, Templates, Diagnosis, MCP, Chat, and IaC all shape changes differently
- authored values, platform defaults, generated values, runtime state, and deprecated fields blur together
- existing projects are hard to import, diff, explain, or reconcile
- agents/tools can suggest edits, but lack a common typed change protocol
- no clear owner/model for long-term project-state evolution

IaC exposes this because declarative state forces names, identity, defaults, drift, validation, diffs, and safe apply semantics to be explicit.

## Target model

Four layers:

1. **Authoring surfaces**: TypeScript IaC, Web forms, CLI commands, Templates, MCP tools, Diagnosis fixes, Chat/agent actions.
2. **Graph**: deterministic typed model of desired project state.
3. **Change protocol**: typed intent-level delta from current state to desired state.
4. **Apply substrate**: validation, staging, review, commit, deploy orchestration, audit.

Backboard remains the first apply substrate. The staged patch engine is useful. The change is that producers target one graph/change boundary instead of hand-building incompatible patches.

## Principles

- **Graph is truth.** Source code, Web forms, and agent output are authoring. Runtime code consumes evaluated graph, not source shape.
- **Evaluation is read-only.** `.railway/railway.ts` evaluation emits graph/config/change data. Mutation only happens through explicit stage/apply.
- **One change protocol.** IaC, Diagnosis, MCP, Chat, CLI, Web, and Templates converge on `RailwayChangeSet`.
- **No monolith rewrite first.** Build a typed boundary that translates into existing staging/apply behavior.
- **Authored intent beats serialization.** Users should not copy platform defaults, generated fields, runtime state, or deprecated artifacts into source.
- **Existing projects are first-class.** Import, drift, reconciliation, and adoption matter as much as greenfield creation.
- **Identity is not display name.** Names are UX handles; bindings connect authored resources, graph nodes, and Railway IDs.
- **Declarative and runtime meet at context.** IaC answers “what should exist?” Runtime SDK answers “what should happen now?” They meet through evaluated project graph.
- **Migration is product work.** Once infra is source-controlled, schema versioning, migrations, generated artifacts, and backwards compatibility are our responsibility.

## Architecture

```txt
.railway/railway.ts
  TS authoring API; modules compose graph fragments; no mutation
      ↓ evaluate
RailwayGraph
  typed resources; stable handles; refs/edges; generated type info
      ↓ compare current state
RailwayChangeSet
  create/update/delete/rename intent; safety/deploy metadata; validation paths
      ↓ adapter
Backboard staged patch
  existing validation/stage/commit/deploy systems
```

## Core artifacts

### RailwayGraph

Deterministic typed project model. It should model Railway concepts directly even if persistence remains generic:

```txt
project, environments, services, databases, volumes, buckets,
variables, domains, networking, regions, build/deploy policy,
references, dependencies
```

This lets us create the future service model at the boundary before changing storage.

### RailwayChangeSet

Typed intent-level delta, not raw blob diff.

Examples:

```txt
create service
update build/start command
set/preserve/generate variable
create/attach volume
create domain
update region replicas
delete resource
```

Each change should carry:

```txt
summary, paths, warnings/errors, dependencies,
destructive/safe classification, deploy side-effect metadata
```

This is the protocol Web/CLI/CI/agents can preview, review, and apply.

### Resource bindings

Durable mapping from authored resource to Railway resource:

```json
{
  "resources": {
    "service.api": {
      "remoteId": "...",
      "lastSeenName": "api"
    }
  }
}
```

Likely lives in `.railway/railway.lock.json`. Source remains intent; lock/provenance records identity and reconciliation state.

### Generated artifacts

Useful for DX and agents, never hidden source of truth:

```txt
.railway/generated/graph.json
.railway/generated/desired-config.json
.railway/generated/graph-types.d.ts
.railway/drifts/<id>/...
```

`graph-types.d.ts` gives autocomplete for evaluated graph lookups:

```ts
const project = await railway.iac.evaluate();
project.service("api");
project.database("Postgres");
```

## Implementation path

### 1. SDK prototype as architecture slice

Prove the model in TS SDK without Backboard refactor:

- experimental `railway/iac`
- deterministic graph evaluation
- graph → environment config compiler
- current state → graph import path
- generated graph typings
- runtime graph context helpers
- examples with authored source + generated output

### 2. Change protocol draft

Define `RailwayChangeSet` in TypeScript first.

Build adapters:

```txt
graph diff → change set
change set → staged patch input
current Railway state → graph
```

Use this to clarify SDK/compiler responsibilities vs Backboard responsibilities.

### 3. Identity, drift, adoption

Make existing projects safe to adopt:

- import current state
- generate adoption/drift artifacts
- explain drift by resource/property
- resolve toward code or Railway
- preserve secrets safely

CLI must not silently rewrite `.railway/railway.ts`; users/agents edit source explicitly with generated context.

### 4. CLI integration

After model stabilization, Rust CLI owns UX and auth/project/env resolution:

```bash
railway iac sync
railway iac sync --stage
railway iac sync --yes
railway iac pull
railway iac typegen
```

### 5. Platform convergence

Gradually route more producers through `RailwayChangeSet`:

```txt
Diagnosis fixes, MCP tools, Chat/agent edits, Templates, selected Web forms
```

This creates a path, not a grand rewrite gate.

## GA checklist

- named owner + strategy
- versioned `RailwayGraph`
- versioned `RailwayChangeSet`
- ChangeSet → staged patch adapter
- resource binding/provenance model
- import/adoption for existing projects
- drift detection/reconciliation UX
- canonical default normalization
- safe secrets/generation model
- actionable validation paths/messages
- destructive-change safeguards
- CLI auth/project/environment resolution
- generated graph typings
- tests for graph, compile, diff, change, apply, import, drift, secrets
- production docs/examples

## Non-goals

- immediate Backboard rewrite
- Terraform compatibility
- declarative sandbox instances
- exhaustive settings before graph/change model stability
- generated artifacts replacing authored source
- LLM output as ownership substitute

## Open questions

- Where do `RailwayGraph` and `RailwayChangeSet` live long-term?
- Is `graph-types.d.ts` committed or editor-only generated state?
- What is the canonical lock/provenance shape?
- How do we represent field ownership / ignored drift?
- How do project-level vs environment-level resources compose?
- Where do we compute “requires deploy”?
- How does Web communicate IaC-managed state?
- What is the migration path from generic service blobs to domain-specific models?

## Success criteria

This is working when:

- new project-state features target graph/change, not ad hoc service blob edits
- IaC, CLI, MCP, Diagnosis, Templates, Web, and agents share a change protocol
- existing projects adopt without scary diffs or secret leakage
- users can preview exact impact before mutation
- runtime SDK code can reference evaluated project context
- platform engineers extend service/database/bucket behavior with less spelunking

Outcome: not just IaC. A better-owned model for Railway project state.
