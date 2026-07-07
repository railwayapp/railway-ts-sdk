# Feature Flags v0 (Railway Signals)

> **Canonical RFC:** [Railway Signals](https://app.notion.com/p/3830e4c5456380498fd9ffb01452885b) (Notion, Ready For Review)

## Naming

| Audience | Name | Notes |
|---|---|---|
| **Users (v0)** | Feature Flags | Product they already understand |
| **Engineering (internal)** | Signals | Broader `Context → Value` primitive |
| **Users (future)** | Signals | When multi-version routing is real |

v0 ships **Feature Flags** externally. "Signals" is the internal architecture name until we can demo runtime routing across versions.

## Primitive

One rule: **`Context → Value`**.

- A **signal** (flag) has a typed **default** (production floor) and **rules**: `(expression → value)`.
- **Resolution** evaluates **all** matching rules at read time.
  - Unanimous agreement → that value.
  - No match or disagreement → **default** (fail open).
- Unlike Radar: no priority, no short-circuit, no terminal verdicts.
- **`explain`** is exact: resolution is a pure function with full trace export.

## v0 scope

| In | Out |
|---|---|
| Define, target, resolve at runtime | Lifecycle analytics ("safe to delete?") |
| Postgres registry + audit log | Compute / edge routing |
| In-process SDK eval + poll | OpenFeature provider (post-v0) |
| `railway flag` CLI | Text `--when` parser (JSON only for now) |
| Radar-shaped predicates + `bucket` rollouts | Sandbox compute sources |
| OpenFeature-shaped eval context | Dashboard UI |

## Build plan

### Step 1 — Backboard foundation

**Branch:** `victor/signals-v0` · **PR:** [#32078](https://github.com/railwayapp/mono/pull/32078)

- Prisma `Signal` + `SignalChange` (materialized rules + append-only audit)
- Pure resolver (`resolveSignal`, match-all semantics)
- Registry CRUD + auth scopes
- GraphQL: `signals`, `signal`, `signalEvaluate`, `signalCreate`, `signalRuleSet`, `signalRuleUnset`, `signalDefaultSet`, `signalReplace`
- OpenFeature-aligned eval context (`targetingKey`, flattened attributes)
- 38+ unit tests

**Exit:** merge + migration deploy.

### Step 2 — CLI (`railway flag`)

**Repo:** `/Users/victor/Railway/cli` · branch `victor/signals-v0`

| Decision | Choice |
|---|---|
| Type mismatch on upsert | Error; `--force --type` re-types (clears rules) |
| Bare vs `set` | `railway flag <key> <value>` = default upsert only; rules via `set … --when …` |
| Alias | `railway signal` → same as `flag` |

```bash
railway flag list
railway flag checkout.v2 true
railway flag set checkout.v2 true --when '{"attr":"plan","op":"eq","value":"enterprise"}'
railway flag unset checkout.v2 --rule-id enterprise-on
railway flag checkout.v2 "yes" --force --type string
```

**Exit:** build green, dogfood against staging backboard.

### Step 3 — SDK (`flags.init()` / `flags.get()`)

**Repo:** `railway-ts-sdk`

```typescript
import { flags } from "railway";

await flags.init({ owner: "workspace:…", pollIntervalMs: 30_000 });

const enabled = flags.get<boolean>("checkout.v2", {
  targetingKey: userId,
  attributes: { plan: "enterprise" },
});
```

- Poll registry on `(owner, version)` — refresh when any flag version changes
- **In-process eval** using the same pure resolver as backboard (no per-get GraphQL)
- Typed helpers: `getBoolean`, `getString`, `getNumber`, `getJson`
- Env: `RAILWAY_API_TOKEN`, `RAILWAY_SIGNALS_OWNER` (or explicit `owner`)

**Exit:** offline unit tests + example; works against staging once Step 1 deploys.

### Step 4 — Docs

**Repo:** `docs`

- User guide: **Feature Flags** (define, target, SDK, CLI)
- Reference: **Signals** (advanced semantics, expressions, bucket rollouts)

### Step 5 — OpenFeature provider (post-v0)

- `@openfeature/railway-provider` wrapping SDK eval
- Maps `SignalEvaluationReason` → OpenFeature reason codes

## Architecture

```text
┌─────────────┐     poll (owner, version)      ┌──────────────┐
│  SDK / app  │ ◄──────────────────────────────│   Backboard  │
│  flags.get  │                                │   Postgres   │
└──────┬──────┘                                └──────────────┘
       │ in-process
       ▼
┌─────────────┐
│ resolveSignal│  pure: all rules → agree? → value : default
└─────────────┘
```

## Expression shape (v0)

Radar clause:

```json
{ "attr": "plan", "op": "eq", "value": "enterprise" }
```

Percentage rollout:

```json
{ "bucket": { "attr": "targetingKey" }, "op": "lt", "value": 0.1 }
```

Boolean logic: `{ "and": [...] }`, `{ "or": [...] }`, `{ "not": … }`.

Rule values are **literals only** in v0 (`{ "type": "literal", "value": … }` in registry; CLI sends bare values).

## Status tracker

| Step | Status |
|---|---|
| 1 Backboard | ✅ PR open |
| 2 CLI `railway flag` | ✅ built locally, uncommitted |
| 3 SDK `flags` | ✅ built locally |
| 4 Docs | ⬜ |
| 5 OpenFeature provider | ⬜ post-v0 |

## Related paths

| Repo | Path |
|---|---|
| mono | `packages/backboard/src/controllers/signals/` |
| mono | `common/javascript/models/src/signals.ts` |
| cli | `src/commands/flag.rs` |
| sdk | `src/flags/` |
