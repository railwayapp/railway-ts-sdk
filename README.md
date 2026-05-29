# railway

TypeScript SDK for Railway. Create sandboxes, run commands in them, and tear them down.

[![npm version](https://img.shields.io/npm/v/railway.svg)](https://www.npmjs.com/package/railway)
[![license](https://img.shields.io/npm/l/railway.svg)](./LICENSE)

## Installation

```bash
npm install railway
```

Requires Node.js 22+ (for `await using`). Works in any runtime with `fetch`; pass a
`fetch` implementation explicitly where there is no global.

## Quick start

```ts
import { Sandbox } from "railway";

// reads RAILWAY_API_TOKEN + RAILWAY_ENVIRONMENT_ID from the environment
const sandbox = await Sandbox.create();

const { stdout } = await sandbox.exec("echo hello");
console.log(stdout);

await sandbox.destroy();
```

`Sandbox` _is_ the sandbox — there is no separate client, and the constructor is
private. A sandbox always comes from somewhere:

- `Sandbox.create(options?)` — provision a new sandbox.
- `Sandbox.create(template, options?)` — provision from a reusable template (see [Templates](#templates)).
- `Sandbox.connect(id, options?)` — reattach to an existing sandbox by id.
- `Sandbox.list(options?)` — list sandboxes in the environment.

`create` resolves only once the sandbox is `RUNNING`, so the sandbox you receive is
ready to `exec` against — there is no readiness wait to manage yourself.

## Running commands

`exec` runs a command to completion and returns its result. It does not throw on a
non-zero exit code — inspect `exitCode` instead.

```ts
const result = await sandbox.exec("npm run build", { timeoutSec: 120 });

result.exitCode; // number
result.stdout; // string
result.stderr; // string
result.truncated; // true if output exceeded the capture limit
result.timedOut; // true if the command hit timeoutSec
```

## Reconnecting and listing

A sandbox outlives the process that created it, so you can reattach to it by id.

```ts
const sandbox = await Sandbox.connect("sbx_abc123");
await sandbox.exec("cat /tmp/state.json");

const all = await Sandbox.list();
```

`connect` throws `SandboxNotFoundError` if the sandbox does not exist in the
environment. `sandbox.refresh()` re-reads the sandbox to update `status` and the other
fields in place. `status` is one of `CREATING`, `RUNNING`, `DESTROYING`, `DESTROYED`,
`FAILED`.

## Automatic cleanup

A sandbox is a disposable resource. With `await using` it is destroyed when the scope
exits, even on throw.

```ts
await using sandbox = await Sandbox.create();
await sandbox.exec("pytest");
// destroyed automatically on scope exit
```

`sandbox.destroy()` is always available for explicit teardown.

## Templates

A template is a reusable base: an ordered list of build steps (system packages, env,
a working directory, raw commands) that Railway builds once, content-addresses, and
caches. Creating a sandbox from a template forks that cached build instead of starting
from scratch.

```ts
import { Sandbox } from "railway";

const base = Sandbox.template()
  .withPackages("ffmpeg")
  .workdir("/app");

// Same call whether the template is cold (builds, then forks) or warm (just forks).
const sandbox = await Sandbox.create(base);
await sandbox.exec("ffmpeg -version");
```

A `SandboxTemplate` is a **fluent, immutable recipe** — every step returns a new
template, so a base can branch into variants without mutation surprises. It is a pure
value and does no network until it is built.

- `.run(command)` — a raw build step.
- `.withPackages(...names)` — install Debian packages.
- `.withEnv({ KEY: "value" })` — set environment variables for later steps.
- `.workdir(dir)` — set the working directory for later steps.
- `.build(options?)` — build the template ahead of time (idempotent; cheap when warm),
  so later `create` calls just fork. `Sandbox.create(template)` builds for you, so this
  is only needed to pre-warm.

Obtain a template with `Sandbox.template()`; the constructor is private. Building throws
`SandboxTemplateBuildError` on a failed build and `SandboxTimeoutError` if readiness
exceeds the internal ceiling.

## Configuration

`token`, `environmentId`, and `endpoint` each resolve in order: an explicit option,
then an environment variable, then a default. Pass explicit values to override —
including reading from a non-standard variable yourself.

| Option | Environment variable | Default |
| --- | --- | --- |
| `token` | `RAILWAY_API_TOKEN` | _(required)_ |
| `environmentId` | `RAILWAY_ENVIRONMENT_ID` | _(required)_ |
| `endpoint` | `RAILWAY_GRAPHQL_ENDPOINT` | `https://backboard.railway.com/graphql/v2` |
| `fetch` | — | `globalThis.fetch` |

```ts
const sandbox = await Sandbox.create({
  token: process.env.MY_TOKEN,
  environmentId: process.env.MY_ENV_ID,
  endpoint: "https://backboard.railway.com/graphql/v2",
  idleTimeoutMinutes: 30,
});
```

Environment variables are read only where a runtime exposes them, so the SDK is safe to
import in the browser and edge runtimes — provide credentials explicitly there.

## Errors

All errors extend `RailwayError`:

- `RailwayAuthError` — a required credential (`token` / `environmentId`) could not be
  resolved. Names the missing variable on `.variable`.
- `RailwayGraphQLError` — the Railway API returned an error. Carries `.status`,
  `.errors`, and `.responseBody`.
- `SandboxNotFoundError` — `connect` or `refresh` could not find the sandbox. Carries
  `.id` and `.environmentId`.
- `SandboxFailedError` — a sandbox reached a terminal state (`FAILED`/`DESTROYED`)
  before becoming `RUNNING` during `create`. Carries `.id` and `.status`.
- `SandboxTemplateBuildError` — a template build finished `FAILED`. Carries
  `.templateId` and `.environmentId`.
- `SandboxTimeoutError` — a readiness wait (template → `READY` or sandbox → `RUNNING`)
  exceeded the time ceiling. Carries `.resource`, `.id`, `.lastStatus`, and `.timeoutMs`.

## License

MIT
