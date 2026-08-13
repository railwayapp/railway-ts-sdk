import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  // Build steps run once; the result is cached as a checkpoint keyed by the
  // recipe, so later creates with the same recipe boot instantly.
  const base = Sandbox.template().run("mise use cowsay");

  await using sandbox = await Sandbox.create(base);

  console.log((await sandbox.exec("cowsay hello")).stdout);
});
