import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  const base = Sandbox.template().run("mise use cowsay");

  await using sandbox = await Sandbox.create(base);

  console.log((await sandbox.exec("cowsay hello")).stdout);
});
