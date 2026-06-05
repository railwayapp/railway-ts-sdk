# Railway Sandbox SDK — agent usage guide

How to drive ephemeral Railway sandboxes (create → run commands → destroy) with
the `railway` package. The public API is small: `Sandbox` IS the sandbox — use
the static factories, the constructor is private.

## Setup

```ts
import { Sandbox } from "railway";
```

Credentials resolve explicit option → environment variable:

- `RAILWAY_API_TOKEN` — an account/personal token (it must resolve to a user; a
  project token may be rejected when minting exec sessions).
- `RAILWAY_ENVIRONMENT_ID` — the environment to create sandboxes in.

Missing credentials throw `RailwayAuthError`. In a non-Node runtime without a
global `WebSocket`, pass `webSocketImpl` (e.g. the `ws` package) in the options.

## Create, run, destroy

```ts
await using sandbox = await Sandbox.create(); // resolves once RUNNING
const result = await sandbox.exec("echo hello");
result.exitCode; // 0
// destroyed automatically when the scope exits (await using)
```

- `Sandbox.create(options?)` — new sandbox; resolves when it is `RUNNING`.
- `Sandbox.create(template, options?)` — from a template (see below).
- `Sandbox.connect(id, options?)` — reattach to an existing sandbox by id.
- `Sandbox.list(options?)` — list sandboxes in the environment.
- `sandbox.destroy()` — tear down; `await using` does this on scope exit.
- `sandbox.refresh()` — re-read `status` and fields in place.

## Running commands

`exec` returns an `ExecHandle`; await it for the `ExecResult`. It does NOT throw
on a non-zero exit — inspect `exitCode`.

```ts
const r = await sandbox.exec("npm run build", { timeoutSec: 120 });
r.exitCode; // number | null (null if the session ended without one)
r.stdout; // string
r.stderr; // string, kept separate from stdout
r.truncated; // true if the server cut the output
r.timedOut; // true if timeoutSec fired (kills the command client-side)
```

Stream long-running output live with callbacks (a throw from one rejects exec):

```ts
const result = await sandbox.exec("npm run test:slow", {
  onStdout: chunk => process.stdout.write(chunk),
  onStderr: chunk => process.stderr.write(chunk),
});
```

## Durable sessions (reconnect)

When durable sessions are enabled for the sandbox, a command survives a
disconnect and you can reconnect to it later — even from another process.

```ts
const handle = sandbox.exec("long-running-task");
const sessionName = await handle.sessionName; // save this to reconnect
```

- `handle.sessionName` → the durable session name (a Promise). It **rejects** if
  the server assigned none (durable unavailable); the command still runs.
- `handle.detach()` — stop streaming and close the socket WITHOUT ending the
  command; resolves the `sessionName` to reconnect with.
- `handle.kill(signal?)` — terminate the command (a real signal to its process
  group; default `"TERM"`, e.g. `kill("KILL")` to force).
- Reconnect with `sandbox.exec({ sessionName }, options?)`. By default it replays
  all retained logs (lossless; may repeat output an earlier reader saw) — so a
  plain reattach harvests the full output, even of a command you never read. Pass
  `resumeFromLastRead: true` to resume from the last-read cursor instead (exact,
  but can drop output if a previous reader didn't keep up before detaching).

```ts
// fire-and-forget, then harvest the whole output later:
const result = await sandbox.exec({ sessionName });
```

## Templates

A reusable base image, built once and cached:

```ts
const base = Sandbox.template().withPackages("ffmpeg").workdir("/app");
const sandbox = await Sandbox.create(base);
```

## Errors

- `RailwayAuthError` — missing/invalid credentials.
- `RailwayConnectionError` — WebSocket/network failure (e.g. the exec stream
  could not be opened).
- `RailwayGraphQLError` — an API error.
- `SandboxNotFoundError` — `connect`/`refresh` to an id not in the environment.
- `SandboxFailedError` — the sandbox hit a terminal state before becoming ready.
- `SandboxTimeoutError` — a readiness wait timed out.
- `SandboxTemplateBuildError` — a template build failed.
