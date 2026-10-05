# railway

TypeScript SDK for Railway. Create sandboxes and run commands in them, and define your
project's infrastructure as code.

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
result.truncated; // true if captured output exceeded maxOutputBytes
result.timedOut; // true if timeoutSec triggered termination and the server reported an exit
```

`cwd` and `env` apply per command and are sent as native exec parameters:

```ts
const result = await sandbox.exec("pnpm test", {
  cwd: "/app",
  env: { CI: "true" },
});
```

Both options apply to fresh execs only — reattaching by `sessionName` rejects them.

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

### Stdin and streaming

Pass `stdin: true` to write to a command. Await each write for backpressure and
call `end()` to send EOF. Without this option, stdin is closed immediately.

```ts
const handle = sandbox.exec("cat", {
  stdin: true,
  captureOutput: false,
  onStdout: chunk => process.stdout.write(chunk),
});

await handle.stdin.write("hello\n");
await handle.stdin.write(new Uint8Array([65, 66, 10]));
await handle.stdin.end();
await handle;
```

Writes are serialized, use payload chunks of at most 16 KiB, and wait for the WebSocket
send buffer to drain. A buffer stalled for 30 seconds rejects the write. A resolved
write means the bytes were queued to the transport, not that the command consumed
them. Await writes rather than queueing an unbounded number of them.

Results capture the full output by default. For long-lived agents, dev servers, or
log followers, set `captureOutput: false`: callbacks still receive every chunk, but
nothing is retained, so memory stays flat however long the command runs. To keep a
bounded prefix instead, set `maxOutputBytes`; `truncated` reports when it was cut.
Callbacks always receive the full stream. A callback that throws rejects the exec.

### Older servers

Stdin, ephemeral execs, and confirmed cancellation need server support that Railway
rolled out in October 2026. Against an older server, a plain `exec` still works;
`stdin: true` and `ephemeral: true` reject with `ExecControlUnsupportedError` before
any command runs.

Writing to stdin is flow-controlled: a command that stops reading its input slows
`stdin.write()` down, and `kill()` and abort still reach it.

### Cancellation and timeouts

```ts
const controller = new AbortController();
const handle = sandbox.exec("npm run dev", {
  signal: controller.signal,
  captureOutput: false,
  onStdout: chunk => process.stdout.write(chunk),
});

controller.abort();
try {
  await handle;
} catch (error) {
  if (error !== controller.signal.reason) throw error;
}
```

Aborting cancels token minting or a pending connection. Once connected, abort and
`timeoutSec` send TERM to the remote process group, escalate to KILL after 5 seconds,
and wait for the remote exit. Timeout resolves with `timedOut: true` and `exitCode: -1`
once the kill is confirmed, or `exitCode: null` if no exit arrives within 10 seconds.
Abort rejects with the signal's reason, or with `RailwayConnectionError` if the exit is
not confirmed in time. A dropped connection rejects with `ExecInterruptedError`. The
`timeoutSec` clock starts once the command has been sent; pass `signal` to bound the
wait for a sandbox that is still starting.

### Ephemeral and durable sessions

For commands that do not need durable logs or reattachment, pass `ephemeral: true`:

```ts
const result = await sandbox.exec("git status --short", { ephemeral: true });
```

Ephemeral execs support stdin, streaming, and remote cancellation, but `sessionName`
and `detach()` reject. The option applies only to fresh execs. Disconnecting an
ephemeral exec terminates its process group; durable
execs survive disconnects and can be reattached.

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

`handle.detach()` closes the connection while leaving the durable command running.
It resolves with the session name and settles the handle with output captured so far.
The server must assign a durable session before detaching is possible. To resume
writing stdin after reattaching, pass `stdin: true`; stdin must not have been ended
by a previous connection.

If the connection drops before the command is sent (for example during a Railway
deploy), `exec` reconnects once, since nothing ran yet. If the sandbox refuses the
session, or the reconnect fails too, it rejects with `ExecNotStartedError` (a
`RailwayConnectionError`) and the close reason. No command ran in either case. In non-Node runtimes without a global `WebSocket`,
pass an implementation via the `webSocketImpl` config option.

### Running a command without a WebSocket

Where a WebSocket isn't practical, such as a short-lived serverless function or a harness
that only makes HTTP calls, `execHttp` sends the command in one HTTPS request
and returns `{ exitCode, stdout, stderr, truncated, timedOut }`. It has no streaming,
stdin, or cancellation. Each stream is cut at 16,000 bytes, and the server enforces
`timeoutSec` (2 minutes by default, 10 at most); a timed-out command reports
`exitCode: -1`. Use `exec` for anything larger or longer.

```ts
const { exitCode, stdout } = await sandbox.execHttp("node --version", { timeoutSec: 30 });
```

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

`Sandbox.create(source)` is the same operation in static form. Pass `idleTimeoutMinutes` or
`resources` to override the fork's own settings; neither is copied from the source. The
source must be `RUNNING`.

## CPU and memory

Pass `resources` to size a sandbox. Each omitted field uses your workspace's sandbox
default, and values above the workspace's VM maximum are rejected. It works the same for
`create`, templates, checkpoints, and `fork`.

```ts
const sandbox = await Sandbox.create({ resources: { cpu: 2, memoryGB: 4 } });
const small = await sandbox.fork({ resources: { cpu: 0.5, memoryGB: 1 } });
```

`cpu` is in vCPUs and accepts fractions; `memoryGB` is decimal gigabytes
(1 GB = 1,000,000,000 bytes).

## Regions

Pass `region` to run a sandbox in a specific Railway region. The returned sandbox exposes
the logical region selected by the platform.

```ts
const sandbox = await Sandbox.create({ region: "us-east4-eqdc4a" });
console.log(sandbox.region);
```

Forks, templates and saved checkpoints boot where their data lives: a fork runs in its
source sandbox's region, and a checkpoint or template in the region it was captured or
built in. Omitting `region` picks that region automatically; requesting a different one
is rejected.

```ts
const fork = await sandbox.fork(); // same region as `sandbox`
```

Region identifiers are strings validated by Railway, so the SDK does not keep a fixed
region enum.

## Network isolation

By default a sandbox is `ISOLATED`: it has public NAT egress but cannot reach the rest of
your environment's private network. Pass `networkIsolation: "PRIVATE"` to place it on the
environment private network, so it can talk to your other services.

```ts
const sandbox = await Sandbox.create({ networkIsolation: "PRIVATE" });
sandbox.networkIsolation; // "ISOLATED" | "PRIVATE"
```

`networkIsolation` is settable on `create`, `create(template)`, and `fork`, and is read
back on every sandbox. It defaults to `ISOLATED` when omitted. Public domains require
`PRIVATE`; see [Domains](#domains).

## Domains

Publish Railway-provided HTTP domains on a sandbox by passing `domains` at create time.
Each entry needs a target `port`; `prefix` is optional and is generated from the project
name when omitted. Public domains require `networkIsolation: "PRIVATE"`.

```ts
const sandbox = await Sandbox.create({
  networkIsolation: "PRIVATE",
  domains: [{ port: 8080 }, { prefix: "api", port: 3000 }],
});

sandbox.domains;
// [
//   { prefix: "my-project", port: 8080, domain: "my-project-xxx.up.railway.app" },
//   { prefix: "api", port: 3000, domain: "api-xxx.up.railway.app" },
// ]
```

`domains` is settable on `create`, `create(template)`, and `fork`. Forks do not inherit
the source's domains; pass them again if the fork should be reachable. Domains cannot be
changed after create. `connect` and `refresh` read back whatever is already published.

## Keeping a sandbox alive

Call `heartbeat()` before the sandbox's idle timeout expires to reset its idle countdown:

```ts
await sandbox.heartbeat(); // returns this sandbox and refreshes its metadata
```

Schedule heartbeats at an interval shorter than `idleTimeoutMinutes` while your
application needs the sandbox. This does not change its configured timeout or
revive a sandbox that has already been destroyed.

To keep a sandbox until you destroy it, create it with `idleTimeoutMinutes: 0`. Only some
plans allow this; on others, `create` fails with the allowed range.

```ts
const sandbox = await Sandbox.create({ idleTimeoutMinutes: 0 });
```

## Reconnecting and listing

A sandbox outlives the process that created it, so you can reattach to it by id.

```ts
const sandbox = await Sandbox.connect("sbx_abc123");
await sandbox.exec("cat /tmp/state.json");

const all = await Sandbox.list();
```

List the shells and exec sessions inside a sandbox, running or recently exited, and
reattach to one by name:

```ts
const sessions = await sandbox.sessions(); // null if the sandbox can't report sessions
const build = sessions?.find(s => s.kind === "EXEC" && s.running);
if (build) await sandbox.exec({ sessionName: build.name }, { onStdout: c => process.stdout.write(c) });
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

## Infrastructure as Code

> **Experimental.** The IaC API is in beta and will change.

Describe a Railway project — services, databases, buckets, variables, domains, replicas,
and canvas groups — in TypeScript, and let the Railway CLI plan and apply the difference
against your environment. Authoring lives in a separate entrypoint, `railway/iac`:

```ts
// .railway/railway.ts
import { defineRailway, github, postgres, project, service } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("db");

  const web = service("web", {
    source: github("acme/web"),
    build: "pnpm build",
    start: "pnpm start",
    healthcheck: "/health",
    env: {
      NODE_ENV: "production",
      DATABASE_URL: db.env.DATABASE_URL, // typed cross-service reference
    },
  });

  return project("my-app", { resources: [db, web] });
});
```

Then, from the directory linked to your Railway project:

```bash
railway config plan    # preview the diff against the linked environment
railway config apply   # apply it — prompts before destructive changes
```

IaC authoring with this package requires Railway CLI 5.42.1 or newer. Older
CLIs use the retired TypeScript engine and will stop with an upgrade error.

How it works:

- **Declarative and stateless.** Your `.railway/railway.ts` is diffed against the *live*
  environment — there is no state file to manage or drift from.
- **Plan, then apply.** `plan` previews; `apply` prompts interactively (`--yes` to skip).
  Removing resources or variables is destructive and additionally requires
  `--confirm-destructive` in non-interactive or agent sessions, so a stray `--yes` can't
  silently delete infrastructure.
- **Safe by construction.** An `apply` is rejected if the environment changed since the
  plan it was computed against, and variable values are redacted from plan output so
  secrets don't leak into terminals or CI logs.

The DSL in brief:

- Resources: `service`, `fn` (cron), `postgres` / `mysql` / `redis` / `mongo`, `bucket`,
  `group`.
- Sources: `github(repo)`, `image(ref)`, `template(name)`, `empty()`.
- Variables: literals, typed references to another resource (`db.env.DATABASE_URL`),
  shared variables (`ctx.shared.NAME`), and `preserve()` to keep a value Railway already
  holds.
- Per-environment logic via the context: `ctx.isEnvironment("production")`,
  `ctx.environment`.

Beta limitations to know:

- Services managed by `railway.json` / `railway.toml` must be migrated before IaC can
  manage them.
- Bucket regions are immutable after creation.

Full guide and reference: <https://docs.railway.com/infrastructure-as-code>.

## Configuration

`token`, `environmentId`, and `endpoint` each resolve in order: an explicit option,
then an environment variable, then a default. Pass explicit values to override.

| Option | Environment variable | Default |
| --- | --- | --- |
| `token` | `RAILWAY_TOKEN` (project token, recommended), then `RAILWAY_API_TOKEN` | _(required)_ |
| `environmentId` | `RAILWAY_ENVIRONMENT_ID` | _(required)_ |
| `endpoint` | `RAILWAY_GRAPHQL_ENDPOINT` | `https://backboard.railway.com/graphql/v2` |
| `fetch` | n/a | `globalThis.fetch` |
| `verbose` | `RAILWAY_VERBOSE` | `false` |

A token read from `RAILWAY_TOKEN` is treated as a [project token](https://docs.railway.com/integrations/api#project-token)
(`authType: "project-token"`), which scopes access to one project/environment and
lets feature flags infer their scope automatically. `RAILWAY_API_TOKEN` (bearer
account/workspace token) is the fallback. Explicit tokens default to bearer; pass
`authType: "project-token"` when supplying a project token explicitly.

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
- `StaleEnvironmentError`: an IaC `apply` was rejected because the environment changed
  since the plan was computed. Re-run `plan` and review before applying again.
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
