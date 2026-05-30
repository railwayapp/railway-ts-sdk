import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  const base = Sandbox.template().withPackages("cowsay").workdir("/app");

  await using sandbox = await Sandbox.create(base);

  console.log((await sandbox.exec("/usr/games/cowsay hello")).stdout);
});
