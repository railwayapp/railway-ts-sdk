import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  const name = `example-checkpoint-${Date.now()}`;

  // Capture a running sandbox's disk into a named checkpoint. Synchronous:
  // the checkpoint is bootable as soon as this resolves.
  await using source = await Sandbox.create();
  await source.exec("echo 'from checkpoint' > /etc/marker");
  const checkpoint = await source.checkpoint(name);
  console.log(`captured checkpoint ${checkpoint.id}`);

  try {
    // Boot a fresh sandbox from the saved checkpoint by name.
    await using clone = await Sandbox.create(name);
    console.log((await clone.exec("cat /etc/marker")).stdout);

    console.log(
      "checkpoints:",
      (await Sandbox.checkpoints()).map(c => c.key),
    );
  } finally {
    await Sandbox.deleteCheckpoint(checkpoint.id);
  }
});
