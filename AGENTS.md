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
- Keep public SDK scope minimal: `Sandbox.create`, `exec`/`destroy`/`refresh` on the instance, `connect`/`list` statics, `await using` auto-destroy. Files, templates, ports, and streaming are future (see `docs/sandbox-sdk-vision.md`).
