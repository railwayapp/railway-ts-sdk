import { RailwaySandboxes } from "../src/index.js";
import {
  exampleSandboxName,
  railwaySandboxesConfigFromEnv,
  runExample,
} from "./helpers.js";

await runExample(async () => {
  const sandboxes = new RailwaySandboxes(railwaySandboxesConfigFromEnv());

  const sandbox = await sandboxes.create({ name: exampleSandboxName() });

  console.log((await sandbox.exec("ls")).stdout);
  console.log(
    (await sandbox.exec("touch hello.txt | echo 'hello.txt' created")).stdout,
  );
  console.log((await sandbox.exec("ls")).stdout);

  await sandbox.delete();
});
