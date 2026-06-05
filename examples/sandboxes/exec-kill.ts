import { Sandbox } from "../../src/index.ts";
import { countLines, runExample, waitFor } from "./helpers.ts";

// The counterpart to exec-reattach.ts: `detach()` stops streaming but leaves the
// command running (reattachable); `kill()` actually terminates it. Here we start
// a long command, watch a few lines, then kill it — the command stops and the
// handle settles with a signalled exit (-1), well short of completion.
await runExample(async () => {
  const totalLines = 120; // would take ~60s if it ran to completion

  await using sandbox = await Sandbox.create();
  console.log(`sandbox ${sandbox.id} ready; starting command`);

  const live: string[] = [];
  const handle = sandbox.exec(
    `for i in $(seq 1 ${totalLines}); do echo line-$i; sleep 0.5; done`,
    { onStdout: (chunk) => live.push(chunk) },
  );

  await waitFor(() => countLines(live.join("")) >= 5, 60_000, "5 live lines");
  console.log(`saw ${countLines(live.join(""))} lines; killing...`);

  await handle.kill(); // SIGTERM to the process group (pass "KILL" to force)
  const result = await handle;

  const stopped = countLines(result.stdout);
  if (result.exitCode === 0 || stopped >= totalLines) {
    throw new Error(
      `expected kill() to stop the command early (exit ${result.exitCode}, ${stopped} lines)`,
    );
  }
  console.log(
    `\n✓ exit ${result.exitCode} (signalled) after ${stopped} of ${totalLines} ` +
      `lines — kill() terminated the command instead of detaching it`,
  );
});
