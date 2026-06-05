import { Sandbox } from "../../src/index.ts";
import { runExample, sleep } from "./helpers.ts";

// Durable exec: a command runs independently of the client. Start one, detach,
// then reattach by sessionName from a fresh connection and stream to completion.
await runExample(async () => {
  await using sandbox = await Sandbox.create();

  const handle = sandbox.exec(
    "for i in $(seq 1 20); do echo line-$i; sleep 0.5; done",
  );
  const sessionName = await handle.sessionName;
  await handle.detach(); // stop streaming without ending the command
  console.log(`detached, ${sessionName} still running\n`);

  // The command keeps running while disconnected; reconnect after a delay.
  await sleep(1_000);

  // Reattach by sessionName: replays the log so far, then follows live.
  // Pass resumeFromLastRead: true to receive only new output.
  const reattached = await Sandbox.connect(sandbox.id);
  const result = await reattached.exec(
    { sessionName },
    { onStdout: (chunk) => process.stdout.write(chunk) },
  );
  console.log(`\nexit ${result.exitCode}`);
});
