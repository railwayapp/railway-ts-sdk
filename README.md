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
  projectId: process.env.RAILWAY_PROJECT_ID!,
  environmentId: process.env.RAILWAY_ENVIRONMENT_ID!,
});

const sandbox = await client.create({ name: "agent-run" });
const result = await sandbox.exec("pwd", { timeoutSec: 30 });

console.log(result.stdout);

await sandbox.files.write("/tmp/hello.txt", "hello");
console.log(await sandbox.files.readText("/tmp/hello.txt"));

await sandbox.delete();
```

### Files

```ts
await sandbox.files.write("/tmp/hello.txt", "hello");
const text = await sandbox.files.readText("/tmp/hello.txt");

await sandbox.files.write("/tmp/blob.bin", new Uint8Array([0, 1, 2, 3]));
const bytes = await sandbox.files.read("/tmp/blob.bin", {
  offset: 1,
  length: 2,
});

const info = await sandbox.files.info("/tmp/hello.txt"); // null if missing
const exists = await sandbox.files.exists("/tmp/hello.txt");

await sandbox.files.makeDir("/tmp/nested");
console.log(await sandbox.files.list("/tmp"));

await sandbox.files.move("/tmp/hello.txt", "/tmp/nested/hello.txt");
await sandbox.files.remove("/tmp/nested/hello.txt");

const tree = await sandbox.tree({ path: "/tmp", depth: 2 });
console.log(tree.toString());
```

File paths must be absolute. Reads and writes are capped at 5 MiB. `write` accepts `string`, `Uint8Array` (including Node `Buffer`), `ArrayBuffer`, and `Blob`. Streaming uploads with unknown length are not supported because the Railway file route requires `Content-Length`.

Missing files throw `SandboxFileNotFoundError` except `info()`, which returns `null`, and `exists()`, which returns `false`.

`Sandbox` accepts:

- `token` — Railway API token.
- `projectId` — Railway project ID.
- `environmentId` — Railway environment ID.
- `endpoint` — optional GraphQL endpoint override. File routes are derived from the same host.
- `fetch` — optional custom fetch implementation.

By default, the SDK uses `https://backboard.railway.com/graphql/v2`.
