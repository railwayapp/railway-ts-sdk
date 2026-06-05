import { Sandbox } from "../../src/index.ts";
import {
  assertSequentialLines,
  countLines,
  runExample,
  sleep,
  waitFor,
} from "./helpers.ts";

// Starts a ~60s command, watches the live stream briefly, then `detach()`es —
// stops streaming and closes the socket while the command keeps running — and
// reconnects to it via `exec({ sessionName })`. The reconnect replays the full
// log (the default) and follows live to the end, capturing every line.
await runExample(async () => {
  const totalLines = 120; // 0.5s/line => ~60s

  await using sandbox = await Sandbox.create();
  console.log(`sandbox ${sandbox.id} ready; starting command`);

  const liveChunks: string[] = [];
  const handle = sandbox.exec(
    `for i in $(seq 1 ${totalLines}); do echo line-$i; sleep 0.5; done`,
    { onStdout: (chunk) => liveChunks.push(chunk) },
  );

  await waitFor(
    () => countLines(liveChunks.join("")) >= 10,
    60_000,
    "10 live lines",
  );
  console.log(`saw ${countLines(liveChunks.join(""))} lines live; detaching...`);

  // Detach: stop streaming, leave the command running server-side. Returns the
  // durable session name to reconnect with.
  const sessionName = await handle.detach();
  console.log(`detached; sessionName: ${sessionName}`);
  await sleep(3_000); // the command keeps running while we're gone

  // Reconnect from the saved name and replay the full log.
  console.log("reattaching from the saved sessionName\n");
  const result = await sandbox.exec(
    { sessionName },
    { onStdout: (chunk) => process.stdout.write(chunk) },
  );

  assertSequentialLines(result.stdout, totalLines);
  console.log(
    `\n✓ exit ${result.exitCode}; the reconnect replayed all ${totalLines} ` +
      `lines — everything produced before and after the detach`,
  );
});
