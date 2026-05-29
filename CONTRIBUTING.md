# Contributing

## Setup

Use mise tasks instead of direct package scripts.

```bash
mise run install
mise run check
mise run package-check
```

## Common tasks

```bash
mise run build
mise run typecheck
mise run test
mise run codegen
```

Generated GraphQL lives in `src/generated/graphql.ts`. Do not edit it manually. Edit `src/graphql/operations/*.graphql`, then run:

```bash
mise run codegen
```

## Examples

Local examples live under `examples/<domain>/`, use `.env`, and may call Railway.

```bash
cp .env.example .env
# fill credentials
mise run example:quickstart
```

Unit tests must stay offline and must not call Railway.

## Package checks

`mise run package-check` builds the package, then validates the npm artifact with:

- `publint --strict --pack npm`
- `npm pack --dry-run`
- a smoke test that verifies ESM import, CommonJS `require`, and TypeScript consumer typecheck

## Public API

Sandbox APIs are scoped under the root `Sandbox` export:

```ts
import { Sandbox } from "railway";

const client = new Sandbox(config);
const sandbox = await client.create();
await sandbox.exec("pwd");
await sandbox.delete();
```

Keep the public SDK scope minimal until product scope expands.

## Releases

This repo uses release labels, not semantic commits or PR title conventions.

Every PR must have exactly one release label:

- `release/patch`
- `release/minor`
- `release/major`
- `release/skip`

Merged release-labeled PRs trigger an automatic version bump and tag. Tag releases create a draft GitHub release, run checks, publish to npm through Trusted Publisher, then publish the GitHub release.

The first public takeover release is `3.0.0` on `latest`.
