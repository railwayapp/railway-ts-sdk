# Project State / IaC implementation plan

This is the working sequence from prototype to GA. It is intentionally practical: each step should leave behind a usable artifact, test, demo, or integration point.

## 0. Current prototype baseline

Already in this branch:

- experimental `railway/iac` TS authoring API
- `evaluateRailwayProject()` with nearest `.railway/railway.ts` resolution
- `RailwayGraph v1` with deterministic resource `address`
- generated graph typings via `renderRailwayGraphTypes()`
- runtime SDK context helpers through evaluated graph lookup
- `RailwayChangeSet v0`
- graph diff → changeset
- changeset → graph
- changeset → `EnvironmentConfig` patch adapter
- mocked architecture demo: `pnpm demo:iac`
- docs:
  - `docs/iac-strategy.md`
  - `docs/project-graph.md`
  - `docs/change-set.md`
  - `docs/iac-architecture.md`
  - `docs/iac-architecture.mmd`

## 1. Tighten graph contract

- Keep graph as deterministic intermediate representation.
- Keep `address` as graph identity.
- Keep Railway remote IDs out of graph; put them in bindings/provenance later.
- Keep Backboard `ServiceInstance` out of graph as a first-class resource for now.
- Treat concrete environment IDs as apply/runtime context, not durable graph truth.
- Add graph validation tests:
  - duplicate addresses
  - missing edge targets
  - unsupported version
  - invalid references
- Decide where shared graph schema should live long-term.

## 2. Tighten ChangeSet contract

- Keep ChangeSets intent-level, not `EnvironmentConfigPatch`-shaped.
- Keep operation taxonomy open for alpha:
  - generic `resource.*` operations with typed resource payloads may be enough
  - product-specific operations may be useful where realization has distinct platform semantics
  - likely long-term answer is hybrid
- Keep `RailwayChangeSet` producer-independent.
- Add required metadata:
  - `path`
  - `summary`
  - `severity`
  - `deployEffect`
  - diagnostics
- Add tests for:
  - create/update/delete
  - variable set/delete
  - destructive classification
  - deploy-effect classification
  - stable rendering
- Keep `EnvironmentConfig` patch adapter as bridge, not final architecture.

## 3. Binding / provenance model

Design `.railway/railway.lock.json` or equivalent.

Needs to map:

```txt
graph address → Railway remote ID / last seen state / provenance
```

Questions:

- how are renames represented?
- how are imports represented?
- what is committed vs generated?
- how does CI behave without local state?
- how do agents safely update bindings?

## 4. Import, adoption, drift

Existing Railway projects must be first-class.

Build flows:

- current Railway state → graph
- current Railway state → adoption artifact
- current graph vs desired graph → drift report
- resolve drift toward code or Railway
- preserve secrets without revealing values
- never silently rewrite `.railway/railway.ts`

Generated artifacts can live under:

```txt
.railway/drifts/<id>/...
.railway/generated/...
```

## 5. Secrets and generated values

Define safe source-level primitives:

```ts
secret("NAME")
generatedSecret("NAME")
preserveExisting("NAME")
```

Rules:

- never inline secrets by default
- imports should not reveal secret values
- generated secrets need stable provenance
- CI needs noninteractive behavior
- CLI can prompt locally when appropriate

## 6. Canonical normalization

Prevent platform serialization artifacts from leaking into authored source or noisy drift.

Normalize:

- default builders/runtimes
- null-ish variable fields
- generated volume metadata
- private networking defaults
- deprecated fields
- computed runtime state

This should eventually be platform-owned, not heuristic SDK behavior.

## 7. Backboard receiving end

Start after ChangeSet shape is useful enough.

First monorepo milestone:

```txt
RailwayChangeSet → validate/authorize → existing staged patch/provisioning workflows
```

Backboard should own:

- final validation
- authorization
- resource realization
- service/database provisioning workflows
- staged patch conversion
- apply/deploy side effects
- diagnostics with stable paths

Do not force every producer to know `EnvironmentConfig` patch internals.

## 8. Rust CLI integration

Once SDK protocol stabilizes:

```bash
railway iac sync
railway iac sync --stage
railway iac sync --yes
railway iac pull
railway iac typegen
```

CLI should own:

- auth
- project linking
- environment selection
- prompts/confirmation
- CI-safe output
- concise previews
- destructive-change confirmation

## 9. Tests

Minimum suite before serious release:

- DSL authoring → graph
- graph validation
- graph → environment config
- current config → graph
- graph diff → changeset
- changeset validation
- changeset → patch bridge
- import/adoption
- drift
- secrets
- generated typings
- runtime graph context

## 10. Docs and examples

Keep docs high-signal.

Required docs:

- project-state strategy
- graph contract
- changeset contract
- source-of-truth rules
- generated artifact rules
- import/adoption flow
- drift flow
- CLI usage
- runtime SDK graph context
- Backboard integration notes

Examples:

- minimal service
- API + database
- bucket/files
- worker + scheduler
- monorepo frontend/backend
- generated graph + generated types
- mocked architecture demo
- eventually real sync demo

## 11. Visual/demo assets

Current:

```bash
pnpm demo:iac
```

Mermaid:

```txt
docs/iac-architecture.md
docs/iac-architecture.mmd
```

Render example:

```bash
pnpm dlx @mermaid-js/mermaid-cli \
  -i docs/iac-architecture.mmd \
  -o docs/iac-architecture.png
```

Future demos:

1. mocked architecture walkthrough
2. real graph/typegen editor demo
3. real staging demo against dev Backboard
4. real apply demo for safe primitive subset
5. Backboard-native ChangeSet receiver demo

## Alpha/canary plan

See [`alpha-canary-plan.md`](./alpha-canary-plan.md) for the near-term ship plan covering:

- end-to-end alpha scope
- official Railway CLI integration
- environment-agnostic ChangeSet staging
- current vs future operation taxonomy
- protobuf exploration
- weekly prototype milestones

## 12. GA bar

GA requires:

- owner + strategy
- versioned graph
- versioned changeset
- Backboard receiver/adapter
- CLI integration
- import/adoption
- drift reconciliation
- binding/provenance
- secrets model
- canonical default normalization
- destructive-change safeguards
- production docs/examples
- complete tests for supported primitives/settings

The goal is not only IaC. The goal is a better-owned Railway project-state model.
