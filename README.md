# railway

TypeScript SDK for Railway. Create sandboxes, run commands in them, and tear them down.

**The SDK is in beta and there will be breaking changes**. The version of this SDK started on v3.0.0.

[![npm version](https://img.shields.io/npm/v/railway.svg)](https://www.npmjs.com/package/railway)
[![license](https://img.shields.io/npm/l/railway.svg)](./LICENSE)
[![CI](https://github.com/railwayapp/railway-ts-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/railwayapp/railway-ts-sdk/actions/workflows/ci.yml)

## Quick start

Scaffold a new project with the SDK preconfigured:

```bash
bun create railway@latest
```

This generates a TypeScript project with starter code, a `.env.example` for your
credentials, and reference docs for AI coding assistants.

## Installation

To add the SDK to an existing project:

```bash
bun add railway
```

```ts
import { Sandbox } from "railway";

// reads RAILWAY_API_TOKEN + RAILWAY_ENVIRONMENT_ID from the environment
const sandbox = await Sandbox.create();

const { stdout } = await sandbox.exec("echo hello");
console.log(stdout);

await sandbox.destroy();
```

Sandboxes come from static factory methods:

- `Sandbox.create(options?)`: provision a new sandbox.
- `Sandbox.create(template, options?)`: provision from a template (see [Templates](#templates)).
- `Sandbox.create(source, options?)`: fork a running sandbox (see [Forking](#forking)).
- `Sandbox.connect(id, options?)`: reattach to an existing sandbox by id.
- `Sandbox.list(options?)`: list sandboxes in the environment.

`create` resolves once the sandbox is `RUNNING`, so it is ready to `exec` against.

## Running commands

`exec` runs a command to completion and returns its result. It does not throw on a
non-zero exit code; inspect `exitCode` instead.

```ts
const result = await sandbox.exec("npm run build", { timeoutSec: 120 });

result.exitCode; // number | null; null if the session ended without one
result.stdout; // string
result.stderr; // string
result.truncated; // true if the server cut the output
result.timedOut; // true if the command hit timeoutSec (enforced client-side)
```

`cwd` and `env` apply per command (the SDK composes them into the command, so
they work on every sandbox):

```ts
const result = await sandbox.exec("pnpm test", {
  cwd: "/app",
  env: { CI: "true" },
});
```

Per-exec env values are embedded in the command string and visible to `ps`
inside the sandbox; bake secrets in at create time via `Sandbox.create({ env })`
instead. Both options apply to fresh execs only — reattaching by `sessionName`
rejects them.

Every exec runs over a WebSocket bridge to the sandbox, with separated
stdout/stderr and a real exit code. Short commands resolve when they exit;
passing `onStdout`/`onStderr` streams output live from the first byte. The
handle also exposes the `sessionName` and a `kill()`:

```ts
const handle = sandbox.exec("npm run test:slow", {
  onStdout: chunk => process.stdout.write(chunk),
});

const sessionName = await handle.sessionName; // save to reattach later
await handle.kill(); // terminate it — SIGTERM by default (pass "KILL" to force)
const result = await handle; // same ExecResult shape as above
```

When durable sessions are enabled for the sandbox, reattach to a running exec
from anywhere — even another process — with the saved name. By default it
replays the retained log, then continues live (pass `resumeFromLastRead: true`
to resume from the last-read cursor instead):

```ts
const result = await sandbox.exec({ sessionName }, {
  onStdout: chunk => process.stdout.write(chunk),
});
```

See `examples/sandboxes/exec.ts` for detaching and reattaching by `sessionName`
from a fresh `Sandbox.connect(id)`.

If the WebSocket cannot be established, `exec` rejects with
`RailwayConnectionError`. In non-Node runtimes without a global `WebSocket`,
pass an implementation via the `webSocketImpl` config option.

## Files

`sandbox.files` reads and writes files in the sandbox filesystem. Content streams in
both directions, so files larger than memory can be transferred.

```ts
await sandbox.files.write("/app/config.json", JSON.stringify(config));
const text = await sandbox.files.read("/app/config.json"); // string

const bytes = await sandbox.files.read("/data/model.bin", { format: "bytes" }); // Uint8Array
await sandbox.files.write("/app/run.sh", "#!/bin/sh\n...", { mode: 0o755 });
```

`write` accepts a `string`, `Uint8Array`, `ArrayBuffer`, `Blob`, `ReadableStream`, any
`AsyncIterable<Uint8Array>`, or a function returning a stream or iterable. It creates
missing parent directories automatically. Strings, bytes, blobs, and function sources are
retried automatically if the connection drops mid-transfer. A bare stream is one-shot: a
drop mid-stream surfaces `RailwayConnectionError` and may leave a partial file. Streams upload
without buffering, so a large file can be pushed from disk; prefer the function form so
a retry can read a fresh stream:

```ts
import { createReadStream } from "node:fs";

await sandbox.files.write("/data/dataset.bin", () => createReadStream("./dataset.bin"));
```

Pull large files as a stream (cancelling the stream aborts the transfer), or read a
range: `offset`/`length` from the start, or `fromEnd` with `length` for tails:

```ts
const stream = await sandbox.files.read("/data/out.bin", { format: "stream" });
for await (const chunk of stream) process.stdout.write(chunk);

const tail = await sandbox.files.read("/var/log/app.log", { length: 4096, fromEnd: true });
```

Inspect and manage entries with `list`, `stat`, `exists`, `mkdir` (recursive, like
`mkdir -p`), `rename`, and `remove`. `remove` deletes files and empty directories; use
`sandbox.exec("rm -rf ...")` for recursive deletes:

```ts
for (const entry of await sandbox.files.list("/app")) {
  console.log(entry.name, entry.size, entry.isDir, entry.modTime);
}
```

Paths are absolute within the sandbox. Files are created `0644`; pass `mode` on `write`
to set permissions. Reads of missing paths throw
`SandboxFileNotFoundError`; other remote failures throw `SandboxFilesError` with the VM's
error text. Each operation authorizes itself with a short-lived files-scoped token, so
`files` works on any `RUNNING` sandbox you can `connect` to. See
`examples/sandboxes/files.ts` for a complete example.

## Forking

Fork a running sandbox to get an independent copy of its filesystem — handy for branching
an environment after expensive setup. A fork is a fresh boot from a clone of the source's
disk (not its live processes), created in the same environment.

```ts
const base = await Sandbox.create();
await base.exec("npm install");

const fork = await base.fork();
await fork.exec("npm test"); // sees the installed deps, isolated from base
```

`Sandbox.create(source)` is the same operation in static form. Pass `idleTimeoutMinutes` to
override the fork's idle timeout. The source must be `RUNNING`.

## Network isolation

By default a sandbox is `ISOLATED`: it has public NAT egress but cannot reach the rest of
your environment's private network. Pass `networkIsolation: "PRIVATE"` to place it on the
environment private network, so it can talk to your other services.

```ts
const sandbox = await Sandbox.create({ networkIsolation: "PRIVATE" });
sandbox.networkIsolation; // "ISOLATED" | "PRIVATE"
```

`networkIsolation` is settable on `create`, `create(template)`, and `fork`, and is read
back on every sandbox. It defaults to `ISOLATED` when omitted.

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

const sandbox = await Sandbox.create(base);
await sandbox.exec("ffmpeg -version");
```

A `SandboxTemplate` is immutable: every method returns a new template. It is sent to
Railway only when you build it or create a sandbox from it.

- `.run(command)`: a raw build step.
- `.withPackages(...names)`: install Debian packages.
- `.withEnv({ KEY: "value" })`: set environment variables for later steps.
- `.workdir(dir)`: set the working directory for later steps.
- `.build(options?)`: build the template ahead of time, so later `create` calls can
  fork from the cached build. `Sandbox.create(template)` builds for you, so this is
  only needed to pre-warm.

Create a template with `Sandbox.template()`. Building throws `SandboxTemplateBuildError`
on failure and `SandboxTimeoutError` if it exceeds the 5-minute timeout.

## Configuration

`token`, `environmentId`, and `endpoint` each resolve in order: an explicit option,
then an environment variable, then a default. Pass explicit values to override.

| Option | Environment variable | Default |
| --- | --- | --- |
| `token` | `RAILWAY_API_TOKEN` | _(required)_ |
| `environmentId` | `RAILWAY_ENVIRONMENT_ID` | _(required)_ |
| `endpoint` | `RAILWAY_GRAPHQL_ENDPOINT` | `https://backboard.railway.com/graphql/v2` |
| `fetch` | n/a | `globalThis.fetch` |
| `verbose` | `RAILWAY_VERBOSE` | `false` |

```ts
const sandbox = await Sandbox.create({
  token: process.env.MY_TOKEN,
  environmentId: process.env.MY_ENV_ID,
  endpoint: "https://backboard.railway.com/graphql/v2",
  idleTimeoutMinutes: 30,
});
```

Environment variables are read only where a runtime exposes them, so the SDK is safe to
import in the browser and edge runtimes; provide credentials explicitly there.

### Verbose logging

Set `verbose: true` (or `RAILWAY_VERBOSE=1`) to print human-readable progress to **stderr** —
GraphQL requests, readiness polling, and lifecycle events. Useful when a `create`, `fork`, or
template build seems stuck. Tokens and `env` values are never logged.

## Errors

All errors extend `RailwayError`:

- `RailwayAuthError`: a required credential (`token` / `environmentId`) could not be
  resolved. Names the missing variable on `.variable`.
- `RailwayGraphQLError`: the Railway API returned an error. Carries `.status`,
  `.errors`, and `.responseBody`.
- `SandboxNotFoundError`: `connect` or `refresh` could not find the sandbox. Carries
  `.id` and `.environmentId`.
- `SandboxFailedError`: a sandbox reached a terminal state (`FAILED`, `DESTROYING`,
  or `DESTROYED`) before becoming `RUNNING` during `create`. Carries `.id` and
  `.status`.
- `SandboxTemplateBuildError`: a template build finished `FAILED`. Carries
  `.templateId` and `.environmentId`.
- `SandboxTimeoutError`: a readiness wait (template → `READY` or sandbox → `RUNNING`)
  exceeded the 5-minute timeout. Carries `.resource`, `.id`, `.lastStatus`, and
  `.timeoutMs`.
- `SandboxFilesError`: a file operation was rejected by the sandbox (permission denied,
  not a directory, disk full, ...). Carries `.operation` and `.path`.
- `SandboxFileNotFoundError`: the path does not exist; subclass of `SandboxFilesError`.

## Requirements

Node.js 22+ (for `await using`). Works in any runtime with a global `fetch`; pass a
`fetch` implementation explicitly where there is none.

## License

MIT
