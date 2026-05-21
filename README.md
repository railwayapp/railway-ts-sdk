# railway-sandbox-ts

TypeScript client for Railway sandboxes.

```ts
import { RailwaySandboxes } from "railway-sandbox-ts";

const sandboxes = new RailwaySandboxes({
  token: process.env.RAILWAY_API_TOKEN!,
  projectId: process.env.RAILWAY_PROJECT_ID!,
  environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
});

const sandbox = await sandboxes.create({ name: "agent-run" });
const result = await sandbox.exec("pwd", { timeoutSec: 30 });
await sandbox.delete();
```

## Development

Use mise tasks:

```bash
mise run install
mise run build
mise run test
mise run typecheck
mise run check
```

Regenerate GraphQL types:

```bash
mise run codegen
```

Run the manual local example:

```bash
cp .env.example .env
# fill in credentials
mise run example:create-exec-delete
```

`mise.toml` enables Node's system CA store so local Railway development certificates work.
