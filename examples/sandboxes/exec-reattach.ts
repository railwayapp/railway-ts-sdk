import { Sandbox } from "../../src/index.ts";
import {
  assertSequentialLines,
  countLines,
  runExample,
  sleep,
  waitFor,
} from "./helpers.ts";

// Starts a ~60s command, watches the live stream briefly, then reconnects to
// the still-running exec via `exec({ execId })` — like a client that crashed
// and came back. The reattached stream must replay the full history from the
// start and keep streaming live until exit, capturing every log line.
await runExample(async () => {
  const totalLines = 120; // 0.5s/line => ~60s

  await using sandbox = await Sandbox.create();
  console.log(`sandbox ${sandbox.id} ready; starting command`);

  const liveChunks: string[] = [];
  const handle = sandbox.exec(
    `for i in $(seq 1 ${totalLines}); do echo line-$i; sleep 0.5; done`,
    { onStdout: (chunk) => liveChunks.push(chunk) },
  );
  const execId = await handle.execId;
  console.log(`execId: ${execId}`);

  await waitFor(
    () => countLines(liveChunks.join("")) >= 10,
    60_000,
    "10 live lines",
  );
  console.log(
    `saw ${countLines(liveChunks.join(""))} lines live; going away for 10s...`,
  );
  await sleep(10_000);

  // Reconnect mid-run. In a real crash the execId would come from storage;
  // here the first attachment simply keeps running in the background.
  console.log("reattaching from the saved execId\n");
  const reattached = sandbox.exec(
    { execId },
    { onStdout: (chunk) => process.stdout.write(chunk) },
  );
  const result = await reattached;
  await handle;

  assertSequentialLines(result.stdout, totalLines);
  console.log(
    `\n✓ exit ${result.exitCode}; reattached stream captured all ${totalLines} ` +
      `lines — history emitted before reattaching plus everything after`,
  );
});
