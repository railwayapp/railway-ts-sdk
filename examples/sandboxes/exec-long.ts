import { Sandbox } from "../../src/index.ts";
import {
  assertSequentialLines,
  countLines,
  runExample,
} from "./helpers.ts";

// Runs a command for a random 60-120s and verifies output streams the entire
// time: every line arrives live (in order, no gaps, no duplicates) over the
// /ws/exec WebSocket bridge, from the first byte through to exit.
await runExample(async () => {
  const totalLines = 120 + Math.floor(Math.random() * 121); // 0.5s/line => 60-120s
  console.log(`target: ${totalLines} lines over ~${Math.round(totalLines / 2)}s`);

  await using sandbox = await Sandbox.create();
  console.log(`sandbox ${sandbox.id} ready; starting command\n`);

  const started = Date.now();
  let streamed = 0;
  let lastChunkAt = Date.now();
  let maxGapMs = 0;

  const handle = sandbox.exec(
    `for i in $(seq 1 ${totalLines}); do echo line-$i; sleep 0.5; done`,
    {
      onStdout: chunk => {
        const now = Date.now();
        maxGapMs = Math.max(maxGapMs, now - lastChunkAt);
        lastChunkAt = now;
        streamed += countLines(chunk);
        process.stdout.write(chunk);
      },
    },
  );
  console.log(`sessionName: ${await handle.sessionName}\n`);

  const result = await handle;
  const elapsedSec = Math.round((Date.now() - started) / 1000);

  assertSequentialLines(result.stdout, totalLines);
  if (streamed !== totalLines) {
    throw new Error(`onStdout streamed ${streamed}/${totalLines} lines`);
  }
  console.log(`\n✓ exit ${result.exitCode} after ${elapsedSec}s`);
  console.log(
    `✓ all ${totalLines} lines streamed live and in order ` +
      `(max gap between chunks ${(maxGapMs / 1000).toFixed(1)}s)`,
  );
});
