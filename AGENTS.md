# Agent Instructions

TypeScript SDK for Railway sandbox create/exec/destroy.

- Use mise tasks, not direct package scripts: `mise run build`, `mise run test`, `mise run typecheck`, `mise run codegen`.
- Install with `mise run install`.
- Build/check with `mise run check` before handing off.
- Run `mise run package-check` after touching package metadata, exports, build output, or public types.
- Run `mise run fallow` after broad refactors, dependency changes, deleting/renaming files, touching public exports, or large generated-code-adjacent changes.
- Agents should run `mise run fallow -- --format json` when they need structured Fallow output for parsing.
- Keep Fallow local/manual only: do not add PR workflows, CI gates, git hooks, Claude hooks, or separate Fallow tasks unless explicitly requested.
- Generated GraphQL lives in `src/generated/graphql.ts`; do not edit it manually.
- Edit `src/graphql/operations/*.graphql`, then run `mise run codegen`.
- Runtime default endpoint is prod: `https://backboard.railway.com/graphql/v2`.
- Local examples use `.env`; copy `.env.example` to `.env`, fill credentials, then run `mise run example:quickstart`.
- `mise.toml` enables Node's system CA store for local Railway development certificates.
- Unit tests must stay offline and must not call Railway.
- Public API: `Sandbox` IS the sandbox via static factories — `import { Sandbox } from "railway"`, then `Sandbox.create()` / `Sandbox.connect(id)` / `Sandbox.list()`. The constructor is private; never `new Sandbox(...)`.
- `token`/`environmentId`/`endpoint` resolve explicit → env (`RAILWAY_API_TOKEN`/`RAILWAY_ENVIRONMENT_ID`/`RAILWAY_GRAPHQL_ENDPOINT`) → default; missing credentials throw `RailwayAuthError`.
- Keep public SDK scope minimal: `Sandbox.create`, `exec`/`destroy`/`refresh` on the instance, `connect`/`list` statics, `await using` auto-destroy. Files, ports, and richer streaming are future (see `docs/sandbox-sdk-vision.md`).
- `exec` is durable: the mutation fast-returns; long-running commands stream output over graphql-ws (`sandboxExecOutput` subscription, `resumeToken`/`after`-resumable across the server's ~15m subscription cap; gaps are server-internal, so streaming truncation isn't observable). `exec()` returns an `ExecHandle` (await it for `ExecResult`; `.execId`/`.kill()`); `exec({ execId })` reattaches. The mutation's `waitMs` arg sets the inline-drain window: the SDK sends `waitMs: 0` when `onStdout`/`onStderr` or `timeoutSec` is set (stream from the start), else lets the server default (~25s, short commands inline with no WS); callers can override via `ExecOptions.waitMs`. `timeoutSec` is client-side only (kill + `timedOut: true`; the server arg is gone). Live e2e: `SANDBOX_E2E=1 pnpm vitest run tests/exec.e2e.test.ts` with `.env` creds.
- Release: pushing a `v*.*.*` tag triggers `release.yml`, which publishes the `package.json` version **at the tagged commit** to npm. Invariant: `package.json` must already equal the tag's version in the commit the tag points to, or `npm publish` fails with "cannot publish over previously published versions".
  - Easiest: run the `Create Release` workflow (Actions → workflow_dispatch, `bump: patch`) — bumps `package.json`, commits to `main`, tags, pushes.
  - Manual: on `main`, `npm version <x.y.z> --no-git-tag-version`, commit the bump, push `main`, then `git tag v<x.y.z>` on that commit and push the tag.
  - Do NOT push a tag off a commit whose `package.json` version is stale (the original release-process mistake).
