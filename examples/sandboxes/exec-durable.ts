import { Sandbox } from "../../src/index.ts";
import { countLines, runExample, waitFor } from "./helpers.ts";

// The durability story end-to-end: a command outlives the process that started
// it, and a *different* process reattaches to it with nothing but the sandbox
// id and the session name. Unlike exec-reattach.ts (which detaches and
// reattaches on the same Sandbox object), every reconnect here goes through a
// fresh `Sandbox.connect(id)` — exactly what a separate process would do.
//
// One running command, reattached twice, contrasting the two resume modes:
//   [B] default            -> replays the full retained log from line-1
//   [C] resumeFromLastRead -> picks up only the unread tail
await runExample(async () => {
  const totalLines = 120; // 0.5s/line => ~60s
  const nonEmpty = (text: string): string[] => text.split("\n").filter(Boolean);

  // Phase A — the creating "process". Start a long command, watch a little of
  // it live, then detach. Past this point we keep only `id` + `sessionName`
  // (the two strings another process would persist) and never touch the
  // original sandbox or handle again.
  const creator = await Sandbox.create();
  const id = creator.id;
  console.log(`sandbox ${id} ready; starting command`);

  const liveChunks: string[] = [];
  const startHandle = creator.exec(
    `for i in $(seq 1 ${totalLines}); do echo line-$i; sleep 0.5; done`,
    { onStdout: (chunk) => liveChunks.push(chunk) },
  );
  const sessionName = await startHandle.sessionName;

  await waitFor(() => countLines(liveChunks.join("")) >= 10, 60_000, "10 live lines");
  const readByCreator = countLines(liveChunks.join(""));
  await startHandle.detach();
  console.log(`creator read ${readByCreator} lines, detached — sessionName: ${sessionName}`);

  try {
    // Phase B — a fresh process reconnects by id alone and replays from the
    // start (the default). Proves the whole retained log is available to a
    // brand-new client. Stop after seeing the beginning; leave it running.
    console.log("\n[B] Sandbox.connect(id) -> reattach, full replay (default)");
    const replayBox = await Sandbox.connect(id);
    const replayChunks: string[] = [];
    const replayHandle = replayBox.exec(
      { sessionName },
      { onStdout: (chunk) => replayChunks.push(chunk) },
    );
    await waitFor(() => countLines(replayChunks.join("")) >= 20, 60_000, "20 replayed lines");
    await replayHandle.detach();

    const replayFirst = nonEmpty(replayChunks.join(""))[0];
    if (replayFirst !== "line-1") {
      throw new Error(`[B] full replay should start at line-1, got "${replayFirst}"`);
    }
    console.log(`[B] ✓ replayed from "${replayFirst}" — full history, including lines the creator already saw`);

    // Phase C — another fresh process reconnects and resumes from the server's
    // last-read cursor instead of replaying. Proves you can pick up only what's
    // new. Run it to completion.
    console.log("\n[C] Sandbox.connect(id) -> reattach, resumeFromLastRead\n");
    const resumeBox = await Sandbox.connect(id);
    const result = await resumeBox.exec(
      { sessionName },
      {
        resumeFromLastRead: true,
        onStdout: (chunk) => process.stdout.write(chunk),
      },
    );

    const resumed = nonEmpty(result.stdout);
    const resumeFirst = resumed[0];
    const resumeLast = resumed.at(-1);
    if (resumeFirst === "line-1") {
      throw new Error("[C] resumeFromLastRead should skip already-read lines, but started at line-1");
    }
    if (resumeLast !== `line-${totalLines}`) {
      throw new Error(`[C] expected to follow through line-${totalLines}, ended at "${resumeLast}"`);
    }
    if (result.exitCode !== 0) {
      throw new Error(`[C] expected a clean exit, got ${result.exitCode}`);
    }
    console.log(
      `\n[C] ✓ resumed at "${resumeFirst}" through "${resumeLast}" (exit ${result.exitCode}) — ` +
        "only the unread tail, no replay",
    );

    console.log(
      "\n✓ one durable session, reattached from a fresh Sandbox.connect twice: " +
        "full replay vs resumeFromLastRead",
    );
  } finally {
    await Sandbox.connect(id)
      .then((s) => s.destroy())
      .catch(() => {});
  }
});
