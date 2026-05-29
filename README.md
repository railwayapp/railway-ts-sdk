# Railway TypeScript SDK

TypeScript SDK for Railway.

```bash
npm install railway
```

## Sandboxes

```ts
import { Sandbox } from "railway";

// reads RAILWAY_API_TOKEN + RAILWAY_ENVIRONMENT_ID from the environment
const sandbox = await Sandbox.create({ idleTimeoutMinutes: 10 });

const result = await sandbox.exec("pwd", { timeoutSec: 30 });
console.log(result.stdout);

await sandbox.destroy();
```

`Sandbox` _is_ the sandbox — there is no separate client, and the constructor is
private. A sandbox always comes from somewhere:

- `Sandbox.create(options?)` — provision a new sandbox.
- `Sandbox.connect(id, options?)` — reattach to an existing sandbox by id.
- `Sandbox.list(options?)` — list sandboxes in the environment.

### Auto-cleanup with `await using`

```ts
await using sandbox = await Sandbox.create();
await sandbox.exec("pytest");
// destroyed automatically on scope exit
```

### Configuration

`token`, `environmentId`, and `endpoint` each resolve in order: an explicit
option, then an environment variable, then a default. Pass explicit values to
override — including reading from a non-standard variable yourself.

| Option | Env var | Default |
| --- | --- | --- |
| `token` | `RAILWAY_API_TOKEN` | _(required)_ |
| `environmentId` | `RAILWAY_ENVIRONMENT_ID` | _(required)_ |
| `endpoint` | `RAILWAY_GRAPHQL_ENDPOINT` | `https://backboard.railway.com/graphql/v2` |
| `fetch` | — | `globalThis.fetch` |

Missing `token` or `environmentId` throws `RailwayAuthError` naming the variable.

```ts
const sandbox = await Sandbox.create({
  token: process.env.MY_TOKEN,
  environmentId: process.env.MY_ENV_ID,
  endpoint: "https://backboard.railway.com/graphql/v2",
});
```

See [`docs/sandbox-sdk-vision.md`](./docs/sandbox-sdk-vision.md) for the full API
vision, including the planned file, template, and public-URL surfaces.
