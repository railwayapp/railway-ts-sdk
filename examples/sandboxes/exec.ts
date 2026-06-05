import { Sandbox } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

// Durable exec: a command runs on the sandbox independently of any client.
// Start one, detach, then reattach from a fresh connection (even another
// process) by its sessionName and stream it through to completion.
await runExample(async () => {
  await using sandbox = await Sandbox.create();

  const handle = sandbox.exec("for i in $(seq 1 20); do echo line-$i; sleep 0.5; done");
  const sessionName = await handle.sessionName;
  await handle.detach(); // stop watching; the command keeps running (kill() ends it)
  console.log(`detached — ${sessionName} keeps running\n`);

  // Reattach by sessionName: replays the log so far, then follows live.
  // (pass resumeFromLastRead: true for only new output instead of a full replay.)
  const reattached = await Sandbox.connect(sandbox.id);
  const result = await reattached.exec(
    { sessionName },
    { onStdout: (chunk) => process.stdout.write(chunk) },
  );
  console.log(`\nexit ${result.exitCode}`);
});
