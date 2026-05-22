# Railway TypeScript SDK

TypeScript SDK for Railway.

```bash
npm install railway
```

## Sandboxes

```ts
import { Sandbox } from "railway";

const client = new Sandbox.Client({
  token: process.env.RAILWAY_API_TOKEN!,
  projectId: process.env.RAILWAY_PROJECT_ID!,
  environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
});

const sandbox = await client.create({ name: "agent-run" });
const result = await sandbox.exec("pwd", { timeoutSec: 30 });

console.log(result.stdout);

await sandbox.delete();
```

`Sandbox.Client` accepts:

- `token` — Railway API token.
- `projectId` — Railway project ID.
- `environmentId` — Railway environment ID.
- `endpoint` — optional GraphQL endpoint override.
- `fetch` — optional custom fetch implementation.

By default, the SDK uses `https://backboard.railway.com/graphql/v2`.
