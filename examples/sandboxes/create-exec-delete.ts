import { Sandbox, type SandboxInstance } from "../../src/index.ts";
import { sandboxConfigFromEnv, runExample } from "./helpers.js";

await runExample(async () => {
  const client = new Sandbox(sandboxConfigFromEnv());
  let sandbox: SandboxInstance | undefined;

  try {
    sandbox = await client.create();

    console.log((await sandbox.exec("ls")).stdout);
    console.log(
      (await sandbox.exec("touch hello.txt | echo 'hello.txt' created")).stdout,
    );
    console.log((await sandbox.exec("ls")).stdout);
  } finally {
    await sandbox?.delete();
  }
});
