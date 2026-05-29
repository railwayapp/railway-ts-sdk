import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  // Reads RAILWAY_API_TOKEN + RAILWAY_ENVIRONMENT_ID from .env.
  // `await using` destroys the sandbox automatically on scope exit.
  await using sandbox = await Sandbox.create();

  console.log((await sandbox.exec("ls")).stdout);
  console.log((await sandbox.exec("echo 'hello' > hello.txt && ls")).stdout);
});
