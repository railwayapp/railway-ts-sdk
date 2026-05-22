# Agent Instructions

TypeScript SDK for Railway sandbox create/exec/delete.

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
- Local examples use `.env`; copy `.env.example` to `.env`, fill credentials, then run `mise run example:create-exec-delete`.
- `mise.toml` enables Node's system CA store for local Railway development certificates.
- Unit tests must stay offline and must not call Railway.
- Public API is domain-scoped: sandbox usage is `import { Sandbox } from "railway"` and `new Sandbox.Client(...)`.
- Keep public SDK scope minimal: sandbox create, exec from the sandbox instance, delete from the sandbox instance.
