# Project State / IaC alpha-canary plan

Goal: ship a usable alpha quickly without pretending the final architecture is done.

The alpha should prove the durable boundary:

```txt
authoring → RailwayGraph → RailwayChangeSet → Backboard validation/stage/apply
```

It should not expose `EnvironmentConfigPatch`, `ServiceInstance`, or serialized Backboard internals to SDK, CLI, Web, MCP, or agents.

## What we know

Jake's feedback captures the core reason this project exists:

> The internal IDs of the environment config patch have always been a hurdle for IaC. To do it well we need another static representation. That looked overkill when the UI was the only authoring layer, but not anymore with multiple authoring layers.

That means the alpha is not just TypeScript IaC. It is the first usable slice of a typed Railway project-state protocol.

## Alpha shape

The alpha should support:

1. author `.railway/railway.ts`
2. evaluate to deterministic `RailwayGraph`
3. read current Railway project state
4. normalize current/desired state
5. compute `RailwayChangeSet`
6. show a reviewable preview
7. stage through Backboard
8. apply through existing patch/apply machinery
9. run from Railway CLI auth/project context

## Status legend

| Status | Meaning |
| --- | --- |
| ✅ Exists enough to build on | Already prototyped. |
| 🚧 Must harden for alpha | Works partially or needs product-quality guardrails. |
| 🧭 Post-alpha / design track | Important, but not required to canary. |

## Alpha milestone table

| Area | Status | Alpha bar |
| --- | --- | --- |
| TS authoring API | ✅/🚧 | Stable enough for services, databases, buckets, variables, volumes. |
| `RailwayGraph v1` | ✅/🚧 | Deterministic, validated, no Railway UUIDs. |
| Current state import | 🚧 | Correctly imports supported resources without noisy drift. |
| Normalization | 🚧 | Suppress platform defaults and serialization artifacts. |
| `RailwayChangeSet v0` | ✅/🚧 | Reviewable, stable, not patch-shaped. |
| Backboard receiver | 🚧 | Validate, authorize, resolve IDs, stage supported changes. |
| Apply path | 🚧 | Use existing staged patch apply for safe supported subset. |
| CLI integration | 🧭/🚧 | Invoke sync from official Railway CLI using existing auth/linking. |
| Environment handling | 🚧 | ChangeSet is environment-agnostic; CLI supplies target env context. |
| Import/adoption | 🚧 | Minimal adoption for existing projects; no silent source rewrites. |
| Secrets | 🚧 | Preserve unknown values; never reveal secrets. |
| Bindings/provenance | 🧭 | Minimal lock/adoption story for alpha; fuller model later. |
| Protobuf schema | 🧭 | Evaluate in parallel; do not block TS/GraphQL alpha. |

## 1. Fully featured end-to-end alpha

### Supported resource subset

Keep the first supported subset boring and real:

| Resource / feature | Alpha support |
| --- | --- |
| GitHub service | create/update/delete |
| Docker image service | create/update/delete |
| Redis database | create/adopt/update basic config |
| Postgres database | create/adopt/update basic config |
| Bucket | create/adopt |
| Volume | create/adopt/attach if current patch path is reliable |
| Service variables | set/delete/reference |
| Regions / replicas | update |
| Build/start/predeploy commands | update |
| Domains | preview only or explicit canary flag |
| TCP proxies | preview only unless Backboard support is solid |
| Secrets | preserve/set references; never read back plaintext |

### Required command behavior

```bash
railway iac sync          # preview only
railway iac sync --stage  # create staged patch
railway iac sync --apply  # stage + apply, gated by confirmation
railway iac pull          # import/adoption draft
railway iac typegen       # generated graph typings
```

Preview should show:

- current graph
- desired graph
- diff summary
- full ChangeSet JSON option
- destructive warnings
- target project/environment

### Alpha hardening tasks

1. **Graph validation**
   - duplicate addresses
   - invalid references
   - missing edge targets
   - unsupported resource fields

2. **Current-state import**
   - service source/build/deploy
   - service variables without leaking secrets
   - databases as intent, not serialized service artifacts
   - buckets/volumes where supported

3. **Normalization**
   - builder/runtime defaults
   - `checkSuites: false`
   - empty/unreadable variables
   - database image patch versions like `redis:8.2.1` vs `redis:8`
   - computed/generated runtime fields

4. **ChangeSet validation**
   - unsupported operations become diagnostics
   - destructive changes require explicit confirmation
   - invalid references fail before staging

5. **Backboard realization**
   - no client-side remote ID requirements
   - Backboard resolves project resources by name/binding
   - Backboard creates/stages through existing workflows
   - Backboard returns path-stable diagnostics

6. **Apply safety**
   - preview first by default
   - `--stage` does not apply
   - `--apply` requires `--yes` in CI
   - destructive operations require explicit confirmation

## 2. Railway CLI integration

The official CLI should be the primary alpha entrypoint. The SDK can provide evaluator/diff/client utilities, but CLI should own operator context.

CLI owns:

- auth token
- current linked project
- environment selection
- prompts
- CI behavior
- output formatting
- destructive confirmation

SDK owns:

- evaluating `.railway/railway.ts`
- producing `RailwayGraph`
- validating graph shape
- diffing graph → `RailwayChangeSet`
- rendering machine-readable ChangeSet output
- calling Backboard ChangeSet API when provided auth/context

Backboard owns:

- authorization
- canonical current state
- ID resolution
- provisioning workflows
- validation
- staging/apply
- diagnostics

### CLI prototype path

Short-term, add a thin CLI command that shells into or imports the SDK:

```txt
railway iac sync
  1. read CLI auth/project/environment context
  2. find .railway/railway.ts
  3. evaluate desired graph
  4. query Backboard current state
  5. ask Backboard or SDK to normalize/import current graph
  6. compute ChangeSet
  7. print preview
  8. optionally call environmentStageChangeSet
```

If changing the Rust CLI is slower, prototype with a Node-side command that accepts the same context shape:

```bash
railway iac-preview sync \
  --project <project-id> \
  --environment <environment-id> \
  --token-from-railway-cli
```

Then port the command into the official CLI once behavior is right.

### Auth principle

Users should not paste Backboard tokens into IaC tooling.

The CLI should reuse the same auth already bound to Railway CLI sessions. Browser demos may use a local server, but production alpha should be CLI-auth-first.

## 3. Environment-agnostic vs environment-aware

The right split:

```txt
RailwayGraph: mostly environment-agnostic desired project shape
RailwayChangeSet: environment-agnostic intent, plus optional target constraints
Backboard staging/apply: environment-aware realization context
```

The ChangeSet should not be bound to one concrete environment ID. The stage/apply request supplies environment context.

### Recommended alpha model

Keep `RailwayChangeSet` portable:

```ts
type RailwayChangeSet = {
  version: 0;
  changes: RailwayChange[];
  diagnostics: ChangeDiagnostic[];
};
```

Keep target context outside the ChangeSet:

```ts
type StageChangeSetRequest = {
  projectId: string;
  environmentId: string;
  changeSet: RailwayChangeSet;
  merge?: boolean;
};
```

This lets the same ChangeSet be reviewed independently of where it is staged.

### Future environment selectors

Later, add selectors without hard-binding to UUIDs:

```ts
type EnvironmentSelector =
  | { type: "current" }
  | { type: "name"; name: string }
  | { type: "class"; class: "production" | "preview" | "development" }
  | { type: "id"; id: string };
```

Backboard can resolve selectors at stage/apply time.

## 4. Generic vs product-intent operations

Do not prematurely decide that the long-term API must abandon generic `resource.*` operations.

The actual requirement is:

```txt
ChangeSets must be intent-level, not EnvironmentConfigPatch-shaped.
```

Two valid designs remain open:

1. generic operations with typed resource payloads

```json
{
  "kind": "resource.create",
  "resource": { "type": "database", "engine": "redis", "name": "Redis" }
}
```

2. product-specific operations where realization semantics demand it

```json
{
  "kind": "database.create",
  "engine": "redis",
  "name": "Redis"
}
```

Likely endpoint: hybrid.

- Keep generic operations for common graph lifecycle: create/update/delete/rename/bind.
- Add product-specific operations only when the platform action is not just resource lifecycle.
- Keep typed payloads either way.

## 5. Protobuf option

Protobuf is worth exploring, especially if ChangeSets become a cross-language protocol.

Benefits:

- language-neutral SDK/tooling
- explicit versioning
- stable wire format
- easier Rust CLI integration
- potential audit/event-log compatibility

Risks:

- slower iteration during alpha
- awkward open-ended JSON fields if schema churn is high
- duplicate schema maintenance if GraphQL/TS/proto diverge

Recommendation:

- do **not** block alpha on protobuf
- define a small experimental `.proto` alongside the TS types
- generate TS/Rust types in a spike
- compare ergonomics before making it canonical

Prototype path:

```txt
proto/railway/project_state/v0/changeset.proto
```

Start with:

- `ChangeSet`
- `Change`
- `ResourceAddress`
- `VariableValue`
- `Diagnostic`
- `Struct`/`Any` escape hatch for resource payloads during churn

If it feels good, Backboard/CLI can converge on protobuf-generated types while GraphQL still accepts JSON during the canary.

## 6. Concrete next steps

### Week 1: make the demo honest

- eliminate noisy diffs for unchanged projects
- make Backboard stage every emitted supported ChangeSet operation
- return diagnostics for unsupported changes instead of silently ignoring
- add tests around current demo project state
- keep the visual demo as proof/debug tool, not the production interface

### Week 2: CLI-shaped prototype

- implement a Node CLI command in SDK repo mirroring future official CLI UX
- read Railway CLI auth/project context if feasible, otherwise accept explicit flags
- support `sync`, `sync --stage`, `sync --json`
- no apply yet unless safety is clear

### Week 3: import/adoption MVP

- `pull` generates an adoption artifact from existing project state
- preserve secrets as `preserveExisting()` or unknown variable markers
- no automatic source rewrite
- optional generated `.railway/generated/graph.json`

### Week 4: official CLI integration spike

- port working Node command behavior into Railway CLI
- reuse official auth/session/project linking
- keep SDK as evaluator/protocol package
- Backboard remains the only staging/apply authority

### Week 5+: canary

- limited allowlist
- explicit supported-resource matrix
- preview/stage only first
- collect unsupported diagnostics
- add apply behind explicit flag

## 7. Iteration cleanup / Raptor rule

The alpha should be allowed to move fast, but it must not accumulate dead scaffolding from every prototype generation.

Use the Raptor rule: every serious iteration should remove parts, collapse shapes, and make the final system more obvious.

For every milestone, do a cleanup pass:

| Cleanup target | Rule |
| --- | --- |
| Dead prototype code | Delete once superseded by the current path. |
| Duplicate docs | Merge into the canonical doc or remove. |
| Demo-only hacks | Either formalize as supported behavior or delete. |
| Temporary adapters | Keep only if they are named as bridges and have an exit plan. |
| Noisy examples | Keep the smallest set that proves supported alpha flows. |
| Generated artifacts | Keep reproducible artifacts only; delete stale checked-in output. |
| Internal serialization leaks | Remove any authoring/API surface that exposes Backboard patch shape. |

Canonical docs for alpha should be:

```txt
docs/implementation-plan.md
docs/alpha-canary-plan.md
docs/project-graph.md
docs/changeset-api-reference.md
docs/iac-architecture.md
```

Everything else should justify its existence or be folded into one of those.

Before canary, run a deletion audit:

1. list all docs/examples/demo files added during exploration
2. mark each as canonical, useful example, visual demo, or discard
3. delete discarded files
4. simplify names and commands
5. ensure README points only to the blessed path
6. run typecheck/build/package checks after deletion

Alpha quality is not only what works; it is also how little obsolete machinery remains.

## Alpha non-goals

- full Terraform parity
- every Railway setting
- perfect import of all existing projects
- browser-only staging without local server/auth proxy
- exposing `EnvironmentConfigPatch`
- requiring users to manage Railway UUIDs
- committing secrets or remote IDs into source by default

## Alpha success criteria

A user with an existing small Railway project can:

1. run `railway iac pull` or write `.railway/railway.ts`
2. run `railway iac sync`
3. see no diff when nothing meaningful changed
4. make a real service/database/variable change
5. preview a stable ChangeSet
6. stage it through Backboard
7. apply it through existing Railway mechanisms
8. never see or write an `EnvironmentConfigPatch`
