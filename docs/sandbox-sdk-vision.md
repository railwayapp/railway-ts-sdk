# Railway Sandbox SDK — UX/DX Vision

This document is the north star for the Railway sandbox SDK's developer experience.
It describes the API we are building toward, what ships today, and what is
deliberately reserved for later — designed now so it can land without breaking changes.

It was shaped by studying the best sandbox SDKs in the ecosystem (e2b, Vercel Sandbox,
Cloudflare Sandbox, Modal, Daytona, CodeSandbox) and keeping only what makes ours more
minimal, more elegant, and more obviously _Railway_.

---

## 1. The mental model

> **There is one noun: `Sandbox`. A sandbox always comes from somewhere —
> nothing (`Sandbox.create()`), an id (`Sandbox.connect(id)`), or a reusable base
> (`Sandbox.create(base)`).**

`Sandbox` _is_ the sandbox. There is no separate client to construct and no second
"instance" type to learn — the thing you create is the thing you call `exec` on. The
constructor is private, so `new Sandbox()` is a compile error and the model stays honest.

```ts
import { Sandbox } from "railway";

const sandbox = await Sandbox.create();
await sandbox.exec("echo hello");
await sandbox.destroy();
```

---

## 2. Quickstart

```bash
npm install railway
```

```ts
import { Sandbox } from "railway";

// reads RAILWAY_API_TOKEN + RAILWAY_ENVIRONMENT_ID
const sandbox = await Sandbox.create();
const { stdout } = await sandbox.exec("echo hello");
await sandbox.destroy();
```

Four lines, no config object. That is the whole happy path.

---

## 3. Configuration

`token`, `environmentId`, and `endpoint` each resolve in the same order:

1. an explicit option you pass,
2. then an environment variable,
3. then a default.

| Option | Environment variable | Default |
| --- | --- | --- |
| `token` | `RAILWAY_API_TOKEN` | _(required)_ |
| `environmentId` | `RAILWAY_ENVIRONMENT_ID` | _(required)_ |
| `endpoint` | `RAILWAY_GRAPHQL_ENDPOINT` | `https://backboard.railway.com/graphql/v2` |
| `fetch` | — | `globalThis.fetch` |

Reading from the environment keeps the quickstart config-free. Passing an explicit
value overrides it — which is also how you support a non-standard variable: read it
yourself and pass it in.

```ts
const sandbox = await Sandbox.create({
  token: process.env.MY_TOKEN,
  environmentId: process.env.MY_ENV_ID,
  endpoint: "https://backboard.railway.com/graphql/v2",
});
```

If `token` or `environmentId` cannot be resolved, `Sandbox.create` throws
`RailwayAuthError` naming the exact variable to set — never a silent failure.

---

## 4. Running commands

`exec` runs a command to completion and returns an honest result:

```ts
const { exitCode, stdout, stderr, truncated, timedOut } =
  await sandbox.exec("npm run build", { timeoutSec: 120 });
```

| Field | Meaning |
| --- | --- |
| `exitCode` | Process exit code. |
| `stdout` / `stderr` | Captured output. |
| `truncated` | `true` if output exceeded the capture limit and was cut off. |
| `timedOut` | `true` if the command hit `timeoutSec` before finishing. |

`exec` does not throw on a non-zero exit — a failed command is a result, not an
exception. Reserve exceptions for transport and auth failures.

---

## 5. Public URLs — Railway's superpower _(future)_

Public domains are Railway's core competency, so exposing a sandbox port as a real
HTTPS URL should be a single line — something no other sandbox SDK can make feel as
native.

```ts
// FUTURE
const { url } = await sandbox.expose(3000);
console.log(url); // a public HTTPS URL routed to the sandbox
```

`expose` is a flat, first-class verb (not nested under a `ports` namespace) because it
is a headline feature. Companion methods grow additively: `sandbox.unexpose(port)` and
`sandbox.exposedPorts()`.

> Readiness caveat: a returned URL may take a moment to become routable while DNS and
> certificates propagate. The final API will make readiness explicit rather than
> implying instant reachability.

---

## 6. Lifecycle & reconnect

A sandbox outlives the process that created it, so you can reattach to it by id — ideal
for serverless and multi-step agent workflows.

```ts
const sandbox = await Sandbox.connect("sbx_abc123");
await sandbox.exec("cat /tmp/state.json");

const all = await Sandbox.list(); // SandboxInfo[] for the environment
```

`Sandbox.connect(id, { environmentId? })` resolves `environmentId` the same way as
`create` (option → `RAILWAY_ENVIRONMENT_ID`); a sandbox that is not found in that
environment throws `SandboxNotFoundError`. `sandbox.refresh()` re-reads the sandbox to
update `status` and the other fields in place.

`status` is one of: `CREATING`, `RUNNING`, `DESTROYING`, `DESTROYED`, `FAILED`.

---

## 7. Auto-cleanup with `await using`

A sandbox is a disposable resource, so it implements `Symbol.asyncDispose`. With
`await using`, it is destroyed automatically when the scope exits — even on throw — and
the try/finally ceremony disappears.

```ts
await using sandbox = await Sandbox.create();
await sandbox.exec("pytest");
// destroyed automatically on scope exit
```

`sandbox.destroy()` is always available for explicit teardown.

---

## 8. Files _(future)_

File access lives under a `files` namespace so it never crowds the quickstart. Writes
accept a string or bytes (no `Buffer` ceremony) and support a batch form, because every
operation is scoped to one sandbox.

```ts
// FUTURE
await sandbox.files.write("/app/index.js", "console.log(1)");
const src = await sandbox.files.readText("/app/index.js");
const entries = await sandbox.files.list("/app");

await sandbox.files.write([
  { path: "/app/a.txt", data: "a" },
  { path: "/app/b.txt", data: "b" },
]);
```

Planned surface: `read` / `readText` / `write` / `list` / `info` / `exists` /
`remove` / `move` / `makeDir`, with `SandboxFileNotFoundError` and
`SandboxFileTooLargeError` for the obvious failure modes.

---

## 9. Templates: reusable bases

The centerpiece of the vision. You rarely want a blank box — you want _your_
environment (a runtime, system packages, your code) and you want to stamp sandboxes
from it instantly.

A `SandboxTemplate` is a **fluent, immutable recipe**. Every step returns a new
template, so a base can branch into variants without mutation surprises. It is a pure
value — no network happens until `build()` or `Sandbox.create(template)`.

```ts
const base = Sandbox.template()
  .withPackages("build-essential", "ffmpeg")
  .workdir("/app");

const withUv = base.run("pip install uv"); // branches; `base` is untouched

const sandbox = await Sandbox.create(base); // builds if cold, forks if warm
```

Live today: `.run("…")` (the raw escape hatch), `.withPackages(…)`, `.withEnv(…)`,
`.workdir(…)`, and `template.build()`. Builds run server-side on the default base
image, content-addressed and cached — a warm template just forks. Reserved for later:
custom base images (`Sandbox.template("node:20")`), more node-first sugar (`withNode`,
`withPython`, `copy`), and `.toDockerfile()` transparency.

> The types are named `SandboxTemplate` / `SandboxBase` — never a bare `Template` —
> because the broader `railway` SDK will also wrap Railway's project-template system,
> and the names must not collide.

---

## 10. `create(source?)` — one verb, many starting points _(future)_

One verb covers every way to start a sandbox. `create()` with no source is the blank
box; `create(source)` starts from a reusable base.

```ts
const fromTemplate = await Sandbox.create(base); // live today: a SandboxTemplate value

// FUTURE
const forked = await sandbox.fork(); // == Sandbox.create(sandbox)
const fromImage = await Sandbox.create({ image: "ubuntu:24.04" });
```

Today, `create` accepts a `SandboxTemplate`. Future sources are a running `Sandbox`
value or an explicit `{ image }` object. There is no bare-string source, so there is
never any guessing between "a base name" and "an image tag" — the source's type says
what it is. `sandbox.fork()` is sugar for `Sandbox.create(this)`, giving the
live-environment fork its own obvious home.

---

## 11. Streaming & background commands _(future)_

The plain `exec` call shape never changes. Streaming and background execution arrive as
options that return richer — but still awaitable — handles, so the simple case stays a
one-liner forever.

```ts
// FUTURE — streaming: { stream: true } returns an awaitable ExecHandle
const run = await sandbox.exec("npm run build", { stream: true });
for await (const { stream, data } of run.logs()) {
  process[stream].write(data);
}
const { exitCode } = await run; // the handle still awaits to an ExecResult

// FUTURE — background: { background: true } returns a Process handle
const server = await sandbox.exec("node server.js", { background: true });
await server.kill();
```

`stream` and `background` are modeled as a discriminated options union (they cannot be
combined) with explicit return types — a streamed one-shot (`ExecHandle`) and a
long-running process (`Process`) are genuinely different things, so they are different
types. We use async iterators over callbacks because they compose with `for await`.

---

## 12. Errors

All SDK errors extend `RailwayError`:

| Error | When |
| --- | --- |
| `RailwayAuthError` | A required credential (`token` / `environmentId`) could not be resolved. Carries `.variable`. |
| `RailwayGraphQLError` | The Railway API returned an error. Carries `.status`, `.errors`, `.responseBody`. |
| `SandboxNotFoundError` | `connect` / `refresh` could not find the sandbox in the environment. Carries `.id`, `.environmentId`. |
| `SandboxFailedError` | A sandbox reached a terminal state (`FAILED`, `DESTROYING`, or `DESTROYED`) before becoming `RUNNING` during `create`. Carries `.id`, `.status`. |
| `SandboxTemplateBuildError` | A template build finished `FAILED`. Carries `.templateId`, `.environmentId`. |
| `SandboxTimeoutError` | A readiness wait (template → `READY` or sandbox → `RUNNING`) exceeded the 5-minute ceiling. Carries `.resource`, `.id`, `.lastStatus`, `.timeoutMs`. |
| `SandboxFileNotFoundError` / `SandboxFileTooLargeError` _(future)_ | File operations. |

---

## 13. Backend phasing

Honesty about what is real. Every future surface is designed to its final signature so
that shipping it flips on a network call — never a breaking type change.

| Surface | Status |
| --- | --- |
| `Sandbox.create(options?)` | **Live** |
| `sandbox.exec(cmd, { timeoutSec })` → `{ exitCode, stdout, stderr, truncated, timedOut }` | **Live** |
| `sandbox.destroy()` / `await using` | **Live** |
| Env-resolved config + `RailwayAuthError` | **Live** |
| `Sandbox.connect(id)` / `Sandbox.list()` / `sandbox.refresh()` | **Live** |
| `sandbox.files.*` | Future |
| `Sandbox.template()` / `SandboxTemplate` / `create(template)` | **Live** |
| `sandbox.fork()` / `create(sandbox)` / `create({ image })` | Future |
| `sandbox.expose(port)` / `unexpose` / `exposedPorts` | Future |
| `exec` streaming (`{ stream }`) and background (`{ background }`) | Future |
| Named/registry bases, multi-tenant credential binding | Future |

---

## 14. API reference (today)

```ts
import {
  Sandbox,
  RailwayError,
  RailwayAuthError,
  RailwayGraphQLError,
  SandboxNotFoundError,
  SandboxFailedError,
  SandboxTemplateBuildError,
  SandboxTimeoutError,
  DEFAULT_RAILWAY_GRAPHQL_ENDPOINT,
  type CreateOptions,
  type ConnectOptions,
  type ListOptions,
  type ExecOptions,
  type ExecResult,
  type SandboxInfo,
  type SandboxStatus,
  type SandboxTemplate,
  type TemplateBuildOptions,
  type RailwayClientConfig,
  type RailwayGraphQLErrorItem,
} from "railway";
```

```ts
class Sandbox {
  static create(template: SandboxTemplate, options?: CreateOptions): Promise<Sandbox>;
  static create(options?: CreateOptions): Promise<Sandbox>;
  static connect(id: string, options?: ConnectOptions): Promise<Sandbox>;
  static list(options?: ListOptions): Promise<SandboxInfo[]>;
  static template(): SandboxTemplate;

  readonly id: string;
  readonly status: SandboxStatus;
  readonly environmentId: string;
  readonly region: string;
  readonly idleTimeoutMinutes: number | null;
  readonly createdAt: string;

  exec(command: string, options?: ExecOptions): Promise<ExecResult>;
  destroy(): Promise<void>;
  refresh(): Promise<this>;
  [Symbol.asyncDispose](): Promise<void>;
  toJSON(): SandboxInfo;
}

// Fluent, immutable recipe — every builder returns a new template. Obtain one
// via `Sandbox.template()`; it is a pure value and does no network until built.
interface SandboxTemplate {
  run(command: string): SandboxTemplate;
  withPackages(...packages: string[]): SandboxTemplate;
  withEnv(vars: Record<string, string>): SandboxTemplate;
  workdir(dir: string): SandboxTemplate;
  build(options?: TemplateBuildOptions): Promise<SandboxTemplate>;
}
```
