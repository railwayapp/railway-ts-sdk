# Railway TypeScript SDK

TypeScript SDK for Railway.

```bash
npm install railway
```

## Sandboxes

```ts
import { Sandbox } from "railway";

const client = new Sandbox({
  token: process.env.RAILWAY_API_TOKEN!,
  environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
});

const sandbox = await client.create({ idleTimeoutMinutes: 10 });
const result = await sandbox.exec("pwd", { timeoutSec: 30 });

console.log(result.stdout);

await sandbox.delete();
```

`Sandbox` accepts:

- `token` — Railway API token.
- `environmentId` — Railway environment ID.
- `endpoint` — optional GraphQL endpoint override.
- `fetch` — optional custom fetch implementation.

By default, the SDK uses `https://backboard.railway.com/graphql/v2`.
