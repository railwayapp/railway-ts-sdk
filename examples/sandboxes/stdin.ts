import { Sandbox } from "../../src/index.ts";
import { runExample, sleep } from "./helpers.ts";

// Interactive stdin: start a command with `stdin: true` to keep its stdin open,
// write to it while it runs via `handle.stdin.write()`, and deliver EOF with
// `handle.stdin.end()`. This is the duplex primitive interactive workloads
// (JSON-RPC-over-stdio agents, REPLs) need — without it, a command's stdin is
// EOF'd at start.
await runExample(async () => {
  const checkpoint = process.env.SANDBOX_CHECKPOINT ?? "agent-box";
  console.log(`booting sandbox from checkpoint "${checkpoint}"…`);
  const startedAt = Date.now();
  await using sandbox = await Sandbox.create(checkpoint);
  console.log(`sandbox ${sandbox.id} running (${Date.now() - startedAt}ms)\n`);

  // 1) Round-trip through `cat`: bytes written to stdin come straight back on
  //    stdout, and cat exits only once stdin is EOF'd — proving both the write
  //    path and EOF delivery.
  console.log("-- cat round-trip --");
  const cat = sandbox.exec("cat", {
    stdin: true,
    timeoutSec: 60,
    onStdout: chunk => process.stdout.write(`  cat> ${chunk}`),
  });
  await cat.stdin.write("hello over the exec websocket\n");
  await cat.stdin.write("stdin frames are working\n");
  await sleep(750);
  await cat.stdin.end(); // EOF → cat exits 0
  const catResult = await cat;
  console.log(`  cat exited ${catResult.exitCode}\n`);

  // 2) A long-lived interactive session: the process answers each request it
  //    reads from stdin — the shape of an agent stdio dialogue, where the next
  //    write depends on output already received.
  console.log("-- interactive request/response session --");
  const session = sandbox.exec(
    'while IFS= read -r line; do echo "ack: $line"; done; echo "eof: session closed"',
    {
      stdin: true,
      timeoutSec: 60,
      onStdout: chunk => process.stdout.write(`  agent> ${chunk}`),
    },
  );
  for (const request of ["initialize", "session/new", "session/prompt fix the bug"]) {
    await session.stdin.write(`${request}\n`);
    await sleep(500); // read the reply before sending the next request
  }
  await session.stdin.end();
  const sessionResult = await session;
  console.log(`  session exited ${sessionResult.exitCode}`);
});
