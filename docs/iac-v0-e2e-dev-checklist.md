# Railway Configuration v0 dev E2E checklist

Run these against Railway dev only:

```bash
cd ~/Railway/railway-ts-sdk
mise run build # or pnpm run build
cd ~/Railway/mono/packages/cli && cargo build
cd ~/Railway/railway-ts-sdk

RAILWAY_ENV=dev \
RAILWAY_IAC_TS_BIN="$HOME/Railway/railway-ts-sdk/dist/iac/bin.js" \
RAILWAY_CLI="$HOME/Railway/mono/packages/cli/target/debug/railway" \
node scripts/iac-v0-dev-e2e.mjs
```

Mutating apply/project-create checks are opt-in:

```bash
RUN_MUTATING=1 RAILWAY_ENV=dev RAILWAY_WORKSPACE=<workspace-id-or-name> node scripts/iac-v0-dev-e2e.mjs
```

## 0. Remaining v0 themes

- [ ] ChangeSet persistence: persisted `EnvironmentChangeSet`, staging/history/apply-later.
- [ ] Overall aesthetic elevation: output, prompts, diffs, docs, generated files.
- [ ] Environment-agnostic config: `railway.ts` renders from context params like environment/workspace/project.

## 1. Pull large project → no-op / bounded diff

Manual fixture for now, because this depends on a real large linked Railway dev project:

```bash
mkdir -p /tmp/iac-pull-large
cd /tmp/iac-pull-large
RAILWAY_ENV=dev railway link
RAILWAY_ENV=dev railway config pull --force
RAILWAY_ENV=dev railway config plan --verbose
```

Checks:

- [ ] Pull succeeds.
- [ ] No `EOF while parsing string`.
- [ ] No destructive delete storm.
- [ ] Plan is no-op or has a small, explainable diff.
- [ ] Output is readable, not terrifying.
- [ ] Generated `.railway/railway.ts` opens without syntax errors.
- [ ] Names with spaces compile.
- [ ] Emoji service names compile or are safely sanitized.
- [ ] Duplicate/case-sensitive names do not collide.
- [ ] `regions` renders nicely.
- [ ] `domains` renders nicely.
- [ ] `preserve()` renders for secrets.
- [ ] Defaults are omitted.
- [ ] Unknown fields are either omitted or rendered intentionally.

## 2. Service config matrix

Automated by `scripts/iac-v0-dev-e2e.mjs`:

- [ ] `source: github("owner/repo", { branch: "main" })`
- [ ] `source: image("nginx:latest")`
- [ ] empty service / no source
- [ ] `build: "pnpm build"`
- [ ] `start: "pnpm start"`
- [ ] `healthcheck: "/health"`
- [ ] `healthcheckTimeout: 30`
- [ ] `regions: { "us-west2": 1 }`
- [ ] multiple regions
- [ ] env literal string
- [ ] env number/bool as strings for v0
- [ ] env `preserve()` on imported/existing secrets
- [ ] `db.env.DATABASE_URL`
- [ ] `redis.env.REDIS_URL`

Still needs explicit fixtures if/when SDK exposes stable DSL for:

- [ ] `restartPolicyType`
- [ ] `drainingSeconds`
- [ ] `overlapSeconds`
- [ ] `limitOverride`
- [ ] env native number/bool if supported

For each case:

- [ ] Plan is clear.
- [ ] Apply succeeds with `--yes` in mutating mode.
- [ ] Next plan is no-op.

## 3. Database matrix

Automated by `scripts/iac-v0-dev-e2e.mjs`:

- [ ] `postgres("postgres")`
- [ ] `redis("redis")`
- [ ] `mysql("mysql")`
- [ ] `mongo("mongo")`

For each:

- [ ] Plan says database create.
- [ ] Apply uses product/template path.
- [ ] DB service appears in Railway.
- [ ] Variables are generated/available.
- [ ] Referencing DB env in service works.
- [ ] No fake patch/volume weirdness in CLI.
- [ ] Next plan is no-op.
- [ ] Postgres has no PGDATA mount-path runtime issue.

## 4. Bucket matrix

Automated by `scripts/iac-v0-dev-e2e.mjs`:

```ts
bucket("media", { region: "iad" })
```

then:

```ts
bucket("media", { region: "sjc" })
```

Checks:

- [ ] Create plan is clear.
- [ ] Apply creates bucket.
- [ ] Next plan is no-op after create.
- [ ] Region change does not apply, because bucket regions are immutable.
- [ ] Region change prints clear feedback: create a new bucket and migrate data.
- [ ] No fake "applied" result for an impossible bucket region update.

## 5. Domain matrix

Manual until disposable domains are available in dev:

```ts
service("web", {
  domains: ["test.example.com"],
});
```

Checks:

- [ ] Plan shows domain create.
- [ ] Apply creates domain through product path.
- [ ] Operation output includes useful DNS/verification data if available.
- [ ] Next plan is no-op.
- [ ] Pull renders it back as `domains: [...]`.

Port variant:

```ts
domains: [{ domain: "test.example.com", port: 3000 }]
```

- [ ] Port round-trips.

## 6. Destructive guard

Manual/mutating test project only:

```bash
railway config plan
railway config apply
railway config apply --yes
```

Checks:

- [ ] Plan has obvious destructive warning.
- [ ] Apply without `--yes` prompts or refuses appropriately.
- [ ] Apply with `--yes` is intentional and clear.

## 7. `railway up --yes` magic path

Manual/mutating local app test:

```bash
railway up --yes
```

Checks:

- [ ] Detects `.railway/railway.ts`.
- [ ] Applies Railway configuration first.
- [ ] Infers single service target.
- [ ] Uploads local code.
- [ ] Deploy starts.
- [ ] No manual `--project-id`, `--environment-id`, or service link needed.

Opt-out:

```bash
railway up --no-sync
```

- [ ] Skips configuration apply.
- [ ] Behaves like normal deploy.

## 8. Error/vibe checks

Partially automated by `scripts/iac-v0-dev-e2e.mjs`:

- [ ] Invalid `.railway/railway.ts` syntax.

Still to automate:

- [ ] Missing runner binary.
- [ ] Not linked project.
- [ ] Not logged in.
- [ ] Unsupported ChangeSet field.
- [ ] Backboard error.

Expected:

- [ ] Error tells user what to do.
- [ ] No raw giant stack trace unless `--json`.
- [ ] No internal terms in common path.
- [ ] JSON mode remains machine-readable.
