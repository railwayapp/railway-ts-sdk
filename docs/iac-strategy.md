# Railway Project State Strategy

## Status

Draft. This document is a strategy artifact, not an RFC. It describes the direction we want to move toward over the next 1-3 years so RFCs, implementation work, and product decisions can align behind a coherent model.

## Thesis

Railway needs a durable, typed project-state layer.

IaC is the first user-facing reason to build it, but the real opportunity is broader: create a shared graph and change protocol that can power IaC, the CLI, Web, Templates, MCP, Diagnosis, Chat, agents, and future platform features without each surface inventing its own partial patch system.

The goal is not to rewrite Backboard first. The goal is to establish a clean boundary around project state, then migrate producers and consumers toward that boundary over time.

```txt
authored intent / product action / agent suggestion
        ↓
Railway graph
        ↓
Railway change set
        ↓
validation + staging + apply
        ↓
existing Railway systems
```

## Problem

Railway project state has grown through many product iterations and many feature-specific paths. That has helped us ship quickly, but the accumulated model is hard to reason about and hard to extend safely.

Current pain:

- Service configuration is a broad generic model that many unrelated features must share.
- Product-specific concepts often require digging through generic service blobs.
- Multiple systems produce changes in different shapes: Web, CLI, Diagnosis, Templates, MCP, Chat, and future IaC.
- Defaults, generated values, runtime state, user-authored values, and deprecated fields are not cleanly separated.
- Existing project state is difficult to import, diff, explain, or reconcile at an intent level.
- Agents and tools can propose changes, but there is no common typed protocol for those changes.
- Confidence is low because there is no single conceptual model that owns project state evolution.

This is not only an IaC problem. IaC exposes the problem because declarative state requires names, identity, diffs, defaults, drift, validation, and safe apply semantics to be explicit.

## Vision

Railway project state should have a small number of durable layers:

1. **Authoring surfaces**: TypeScript IaC, Web forms, CLI commands, Templates, MCP tools, Diagnosis fixes, Chat/agent actions.
2. **Graph**: a deterministic typed model of what should exist.
3. **Change protocol**: a typed list of intent-level changes from current state to desired state.
4. **Apply substrate**: validation, staging, review, commit, deploy orchestration, and audit.

Backboard can remain the initial apply substrate. The staged patch engine is useful and should not be discarded. But producers should increasingly target the same graph/change boundary instead of each one hand-building ad hoc patches.

## Principles

### Graph is truth

TypeScript is authoring. Web forms are authoring. Chat suggestions are authoring. The graph is the deterministic representation that other systems should consume.

Runtime APIs should reference the evaluated graph, not the user's source code shape.

### Code evaluation must not mutate Railway

Evaluating `.railway/railway.ts` should produce graph/config/change information only. Mutation happens through explicit stage/apply flows.

### One change protocol

IaC, Diagnosis, MCP, Chat, CLI, Web, and Templates should converge on a shared `RailwayChangeSet` rather than separate patch languages.

### Backboard remains the apply substrate initially

We should not start with a monolith rewrite. The first milestone is a typed boundary that can translate into existing staging/apply behavior.

### Authored intent over serialized defaults

Users should not have to copy Railway serialization artifacts into source. Defaults, generated values, runtime state, and deprecated fields must be normalized away or represented explicitly as platform-owned state.

### Existing projects must be adoptable

Greenfield IaC is not enough. Users need import, drift, reconciliation, and safe adoption flows for projects that already exist.

### Identity is separate from display names

Names are good authored handles and UX labels, but Railway needs durable bindings between authored resources, graph nodes, and remote resource IDs.

### Runtime and declarative APIs meet at context

Declarative APIs answer: what should exist?

Runtime APIs answer: what should happen now?

They can live in the same SDK, but should meet through evaluated graph/project context, not by turning runtime objects into fake declarative resources.

### Migration is our responsibility

Once users place infrastructure in source control, backwards compatibility, schema versioning, migrations, and generated artifacts become product responsibilities.

## Proposed architecture

```txt
.railway/railway.ts
  TypeScript authoring API
  modules compose graph fragments
  no direct mutations
        ↓
evaluate
        ↓
RailwayGraph
  typed project resources
  deterministic IDs
  references and edges
  generated type information
        ↓
compare with current Railway state
        ↓
RailwayChangeSet
  create/update/delete/rename intent
  destructive-change metadata
  deploy side-effect metadata
  validation paths
        ↓
Backboard adapter
  translates changes to staged environment patch
  uses existing validation/staging/commit/deploy systems
        ↓
Railway
```

## Core concepts

### RailwayGraph

A deterministic typed model of project state.

It should model Railway concepts directly, even if the current persistence model is generic:

- project
- environments
- services
- databases
- volumes
- buckets
- variables
- domains
- networking
- regions
- deployment policy
- build policy
- references and dependencies

The graph is where future-facing service modeling can begin without requiring an immediate database rewrite.

### RailwayChangeSet

A typed protocol for moving from current state to desired state.

It should express intent-level operations, not raw blob diffs:

- create service
- update build command
- update start command
- set variable
- create volume
- attach volume
- create domain
- update region replicas
- delete resource
- preserve existing secret
- generate secret

A change set should carry enough metadata for UI, CLI, CI, agents, and review flows:

- human-readable summary
- machine-readable paths
- destructive or safe classification
- whether deploys are required
- validation errors
- warnings
- dependencies between changes

### Resource bindings

We need a durable binding layer between authored resources and Railway resources.

Possible shape:

```txt
.railway/railway.lock.json
```

containing mappings like:

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

The source file remains intent. The lock/provenance file records binding and reconciliation state.

### Generated artifacts

Generated artifacts can improve DX and agent workflows, but must not become hidden source of truth.

Possible generated files:

```txt
.railway/generated/graph.json
.railway/generated/desired-config.json
.railway/generated/graph-types.d.ts
.railway/drifts/<id>/...
```

Generated type declarations are useful for autocomplete:

```ts
const project = await railway.iac.evaluate();
project.service("api");
project.database("Postgres");
```

Full generated graph/config artifacts should be treated as reproducible state unless a specific workflow requires committing them.

## Initial implementation strategy

### Phase 1: SDK prototype as architecture slice

Use the TypeScript SDK to prove the model without forcing a Backboard refactor.

Deliverables:

- experimental `railway/iac` package surface
- deterministic graph evaluation
- graph-to-environment-config compiler
- current-state import path
- generated graph typings
- runtime SDK graph context helpers
- examples showing authored intent and generated output

This is the current branch's purpose.

### Phase 2: Change protocol draft

Define `RailwayChangeSet` in TypeScript first.

Build adapters:

- graph diff → change set
- change set → existing staged patch input
- current Railway state → graph

Use this to clarify what Backboard should eventually own versus what the SDK/compiler owns.

### Phase 3: Identity, drift, and adoption

Add first-class flows for existing projects:

- import current project state
- generate adoption artifacts
- detect drift
- explain drift at resource/property level
- resolve in favor of code or Railway
- preserve secrets safely

The CLI should never silently rewrite `.railway/railway.ts`. Agents and users can edit source explicitly with generated context.

### Phase 4: CLI integration

Integrate with the existing Rust CLI once the model is stable enough:

```bash
railway iac sync
railway iac sync --stage
railway iac sync --yes
railway iac pull
railway iac typegen
```

The CLI should reuse existing Railway auth, project linking, environment resolution, and output conventions.

### Phase 5: Platform convergence

Start moving other producers toward the same change protocol:

- Diagnosis suggested fixes
- MCP tools
- Chat/agent changes
- Templates
- Web configuration forms where practical

This should happen gradually. The point is to create a path, not to block feature work on a grand rewrite.

## GA readiness checklist

GA requires more than SDK helpers.

Minimum readiness:

- documented project-state strategy and owner
- stable graph schema with versioning
- stable change protocol with versioning
- adapter from change protocol to existing staged patch engine
- resource binding/provenance model
- import/adoption flow for existing projects
- drift detection and reconciliation UX
- canonical default normalization
- safe secrets/generation model
- validation with actionable paths and messages
- destructive-change safeguards
- project/environment/auth resolution through the Railway CLI
- generated typings for evaluated graph references
- tests for graph, compile, diff, change, apply, import, drift, and secrets
- docs/examples for common production patterns

## Non-goals

- Immediate Backboard rewrite.
- Terraform compatibility.
- Modeling runtime sandbox instances as declarative resources.
- Making every Railway setting exhaustive before the graph/change model is stable.
- Letting generated artifacts silently replace authored source.
- Treating LLM output as ownership. Humans own the strategy, review, and long-term model.

## Open questions

- Where should `RailwayGraph` and `RailwayChangeSet` ultimately live: TS SDK, shared JS package, Backboard package, or generated schema?
- Should `graph-types.d.ts` be committed by default or generated as editor-only state?
- What is the canonical lock/provenance file shape?
- How do we represent field-level ownership or ignored drift?
- How do we model project-level and environment-level resources cleanly?
- What changes should require deploys, and where is that computed?
- How do Web-owned edits communicate that a resource is IaC-managed?
- What is the migration path from generic service blobs to more domain-specific models?

## Success criteria

This effort is working if:

- New project-state features can target a typed graph/change layer instead of hand-editing generic service blobs.
- IaC, CLI, MCP, Diagnosis, Templates, and Web can describe changes in the same protocol.
- Existing projects can be adopted without scary diffs or secret leakage.
- Users and agents can understand what will change before anything mutates.
- Runtime SDK code can safely reference evaluated project context.
- Platform engineers can extend service/database/bucket behavior with less spelunking and more confidence.

The intended outcome is not only a good IaC product. It is a better-owned model for Railway project state.
