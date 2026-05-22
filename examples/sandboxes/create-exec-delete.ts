import { Sandbox } from "../../src/index.js";
import {
  exampleSandboxName,
  sandboxConfigFromEnv,
  runExample,
} from "./helpers.js";

await runExample(async () => {
  const client = new Sandbox.Client(sandboxConfigFromEnv());

  const sandbox = await client.create({ name: exampleSandboxName() });

  console.log((await sandbox.exec("ls")).stdout);
  console.log(
    (await sandbox.exec("touch hello.txt | echo 'hello.txt' created")).stdout,
  );
  console.log((await sandbox.exec("ls")).stdout);

  await sandbox.delete();
});
