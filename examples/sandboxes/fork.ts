import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  // A fork clones the source's filesystem into a new, independent sandbox.
  await using source = await Sandbox.create();
  await source.exec("echo 'from source' > /tmp/state.txt");

  await using fork = await source.fork();

  // The fork boots from a clone of the source's disk, so the file is there.
  console.log((await fork.exec("cat /tmp/state.txt")).stdout);
});
