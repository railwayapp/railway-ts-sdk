import { createHash, randomBytes } from "node:crypto";

import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

import {
  RailwayGraphQLError,
  Sandbox,
  SandboxFileNotFoundError,
  SandboxNotFoundError,
  type ExecHandle,
} from "../src/index.js";

/**
 * Live end-to-end sandbox tests: exec, durable reattach, fork, and templates.
 * They run whenever RAILWAY_API_TOKEN + RAILWAY_ENVIRONMENT_ID are set (e.g.
 * loaded from .env by `mise run test` / `mise run e2e`); without credentials
 * they skip so the unit suite stays offline.
 */
const live =
  Boolean(process.env.RAILWAY_API_TOKEN) &&
  Boolean(process.env.RAILWAY_ENVIRONMENT_ID);

function lineNumbers(stdout: string): number[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map(line => Number(line.replace("line-", "")));
}

/** Lines must be exactly 1..n — proves no gaps and no duplicates. */
function expectSequential(stdout: string): void {
  const numbers = lineNumbers(stdout);
  expect(numbers.length).toBeGreaterThan(0);
  numbers.forEach((value, index) => expect(value).toBe(index + 1));
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitFor(
  predicate: () => boolean,
  timeoutMs: number,
  label: string,
): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error(`timed out: ${label}`);
    await sleep(200);
  }
}

const lineSet = (chunks: string[]): Set<number> =>
  new Set(lineNumbers(chunks.join("")));

/** Starts a `line-1..line-total` (0.5s/line) command, waiting until `untilLines` stream live. */
async function streamSeq(
  sandbox: Sandbox,
  total: number,
  untilLines: number,
): Promise<{ live: string[]; handle: ExecHandle }> {
  const chunks: string[] = [];
  const handle = sandbox.exec(
    `for i in $(seq 1 ${total}); do echo line-$i; sleep 0.5; done`,
    { onStdout: c => chunks.push(c) },
  );
  await waitFor(
    () => lineSet(chunks).size >= untilLines,
    60_000,
    `${untilLines} live lines`,
  );
  return { live: chunks, handle };
}

/** Reattaches by sessionName and asserts the pre/post-detach lines together cover 1..total. */
async function reattachAndExpectAll(
  sandbox: Sandbox,
  sessionName: string,
  before: string[],
  total: number,
): Promise<void> {
  const after: string[] = [];
  const result = await sandbox.exec(
    { sessionName },
    { onStdout: c => after.push(c) },
  );
  expect(result.exitCode).toBe(0);
  const union = new Set([...lineSet(before), ...lineSet(after)]);
  expect(union.size).toBe(total);
  for (let i = 1; i <= total; i++) expect(union.has(i)).toBe(true);
}

describe.runIf(live)("exec e2e (live)", () => {
  let sandbox: Sandbox;

  beforeAll(async () => {
    sandbox = await Sandbox.create({ idleTimeoutMinutes: 10 });
  }, 240_000);

  afterAll(async () => {
    await sandbox?.destroy().catch(() => {});
  });

  it("completes short commands with split streams (A) and nonzero exits (B)", async () => {
    const result = await sandbox.exec("echo hello; echo oops 1>&2; exit 0");
    expect(result).toMatchObject({
      exitCode: 0,
      stdout: "hello\n",
      stderr: "oops\n",
      timedOut: false,
    });

    const nonzero = await sandbox.exec("exit 7");
    expect(nonzero.exitCode).toBe(7);
  }, 90_000);

  it("streams long commands live, gapless and dupe-free (C)", async () => {
    const liveChunks: string[] = [];
    const result = await sandbox.exec(
      "for i in $(seq 1 20); do echo line-$i; sleep 0.2; done",
      { onStdout: chunk => liveChunks.push(chunk) },
    );
    expect(result.exitCode).toBe(0);
    // Output arrived incrementally and ends up sequential with no gaps/dupes.
    expect(liveChunks.length).toBeGreaterThan(1);
    expectSequential(result.stdout);
  }, 90_000);

  it("applies cwd and env to the command", async () => {
    const result = await sandbox.exec("pwd; printf '%s\\n' \"$GREETING\"", {
      cwd: "/tmp",
      env: { GREETING: "hello world" },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toBe("/tmp\nhello world\n");

    // Missing cwd fails the exec rather than running somewhere else.
    const missing = await sandbox.exec("pwd", { cwd: "/no/such/dir" });
    expect(missing.exitCode).not.toBe(0);
    expect(missing.stdout).toBe("");
  }, 90_000);

  it("keeps the image PATH (mise shims) when cwd/env are set", async () => {
    // Per-exec env layers over the sandbox's baked env, so tools resolved
    // through PATH — including mise and its shims — keep working.
    const result = await sandbox.exec("which node && which mise && node -v", {
      cwd: "/tmp",
      env: { PROBE: "1" },
    });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("/mise/shims/node");
    expect(result.stdout).toContain("/mise");
  }, 90_000);

  it("enforces timeoutSec client-side", async () => {
    const result = await sandbox.exec("echo start; sleep 300", {
      timeoutSec: 8,
    });
    expect(result.timedOut).toBe(true);
    expect(result.stdout).toContain("start");
  }, 60_000);

  // Durable reattach over `/ws/exec`. Requires durable sessions enabled
  // server-side (capability negotiation / v2 tunnel); on a non-durable bridge a
  // fresh exec's `sessionName` rejects and these fail loudly rather than silently.

  it("fire-and-forget: start a command without reading it, then reconnect and harvest the full output", async () => {
    // Start, capture the durable id, and detach *before* any output is
    // produced — never consuming the stream. The command then runs and
    // finishes while we are gone.
    const handle = sandbox.exec(
      "sleep 3; for i in $(seq 1 20); do echo line-$i; done; exit 0",
    );
    const sessionName = await handle.sessionName; // wait for the durable id first
    expect(sessionName).toBeTruthy();
    await handle.detach(); // detach without reading; the command keeps running

    await sleep(6_000); // command finishes while detached

    // Reconnect within the finished-session linger window and harvest the whole
    // log. Full replay is the default, so a plain reattach returns everything.
    const result = await sandbox.exec({ sessionName });
    expect(result.exitCode).toBe(0);
    expect(lineNumbers(result.stdout).length).toBe(20);
    expectSequential(result.stdout);
  }, 90_000);

  it("reattaches a running exec and replays without losing output", async () => {
    const total = 60; // ~30s at 0.5s/line
    const { live: before, handle } = await streamSeq(sandbox, total, 8);
    const sessionName = await handle.detach(); // detach mid-run, keep it running
    expect(sessionName).toBeTruthy();
    await sleep(3_000); // more lines produced while detached

    // Default reattach is full replay — loses nothing across the seam. (Opt-in
    // `resumeFromLastRead: true` is exact but can drop in-flight output at an
    // abrupt detach: the server advances its cursor on write, not on receipt.)
    await reattachAndExpectAll(sandbox, sessionName, before, total);
  }, 120_000);

  it("delivers the real exit code after a mid-run detach", async () => {
    const before: string[] = [];
    const handle = sandbox.exec(
      "for i in $(seq 1 40); do echo line-$i; sleep 0.5; done; exit 7",
      { onStdout: c => before.push(c) },
    );
    await waitFor(() => lineSet(before).size >= 5, 60_000, "5 live lines");
    const sessionName = await handle.detach(); // detach mid-run, keep it running

    const result = await sandbox.exec({ sessionName });
    expect(result.exitCode).toBe(7);
  }, 120_000);

  it("keeps stdout and stderr each gapless across a detach/reattach seam", async () => {
    const total = 40;
    const errNumbers = (chunks: string[]): number[] =>
      chunks
        .join("")
        .split("\n")
        .filter(Boolean)
        .map(l => Number(l.replace("err-", "")));

    const out1: string[] = [];
    const err1: string[] = [];
    const handle = sandbox.exec(
      `for i in $(seq 1 ${total}); do echo line-$i; echo err-$i 1>&2; sleep 0.5; done`,
      { onStdout: c => out1.push(c), onStderr: c => err1.push(c) },
    );
    await waitFor(() => lineSet(out1).size >= 6, 60_000, "6 stdout lines");
    const sessionName = await handle.detach();

    const out2: string[] = [];
    const err2: string[] = [];
    const result = await sandbox.exec(
      { sessionName },
      {
        onStdout: c => out2.push(c),
        onStderr: c => err2.push(c),
      },
    );
    expect(result.exitCode).toBe(0);

    const stdoutUnion = new Set([...lineSet(out1), ...lineSet(out2)]);
    const stderrUnion = new Set([...errNumbers(err1), ...errNumbers(err2)]);
    for (let i = 1; i <= total; i++) {
      expect(stdoutUnion.has(i)).toBe(true);
      expect(stderrUnion.has(i)).toBe(true);
    }
  }, 120_000);

  it("detach() stops streaming and a reconnect resumes the running command", async () => {
    const total = 60;
    const { live: before, handle } = await streamSeq(sandbox, total, 8);

    const sessionName = await handle.detach();
    expect(sessionName).toBeTruthy();
    const seenAtDetach = lineSet(before).size;
    await sleep(3_000); // command keeps running while detached

    // Nothing more streams to the detached handle.
    expect(lineSet(before).size).toBe(seenAtDetach);

    await reattachAndExpectAll(sandbox, sessionName, before, total);
  }, 120_000);

  it("kill() stops the command", async () => {
    const total = 30; // 0.5s/line => ~15s
    const { handle } = await streamSeq(sandbox, total, 4);

    await handle.kill();
    const result = await handle;

    // A real kill signals the process group: signalled exit (-1), stopped well
    // short of `total`.
    expect(result.exitCode).toBe(-1);
    expect(lineNumbers(result.stdout).length).toBeLessThan(total);
  }, 120_000);
});

describe.runIf(live)("files e2e (live)", () => {
  let sandbox: Sandbox;

  beforeAll(async () => {
    sandbox = await Sandbox.create({ idleTimeoutMinutes: 10 });
  }, 240_000);

  afterAll(async () => {
    await sandbox?.destroy().catch(() => {});
  });

  it("round-trips text and shows up for exec", async () => {
    await sandbox.files.write("/tmp/notes.txt", "hello files\n");
    expect(await sandbox.files.read("/tmp/notes.txt")).toBe("hello files\n");

    // The same file is visible to the exec primitive.
    expect((await sandbox.exec("cat /tmp/notes.txt")).stdout).toBe(
      "hello files\n",
    );

    const entry = await sandbox.files.stat("/tmp/notes.txt");
    expect(entry).toMatchObject({ name: "notes.txt", isDir: false, size: 12 });
  }, 120_000);

  it("round-trips binary content exactly, with range and tail reads", async () => {
    const payload = randomBytes(200 * 1024);
    await sandbox.files.write("/tmp/blob.bin", new Uint8Array(payload));

    const back = await sandbox.files.read("/tmp/blob.bin", { format: "bytes" });
    expect(Buffer.from(back).equals(payload)).toBe(true);

    const slice = await sandbox.files.read("/tmp/blob.bin", {
      format: "bytes",
      offset: 1000,
      length: 64,
    });
    expect(Buffer.from(slice).equals(payload.subarray(1000, 1064))).toBe(true);

    const tail = await sandbox.files.read("/tmp/blob.bin", {
      format: "bytes",
      length: 64,
      fromEnd: true,
    });
    expect(Buffer.from(tail).equals(payload.subarray(payload.length - 64))).toBe(
      true,
    );
  }, 120_000);

  it("streams a large unknown-size push and pull with intact content", async () => {
    // ~24MB pushed as an async iterable (no declared size) and pulled as a
    // stream; both directions exercise chunking and backpressure.
    const chunkBytes = 1024 * 1024;
    const chunkCount = 24;

    // A factory source is replayable, so the SDK itself retries the push if
    // the server drops the session mid-transfer (a known failure mode of
    // long uploads). Content is pre-generated so the hash is attempt-stable.
    const chunks = Array.from({ length: chunkCount }, () =>
      randomBytes(chunkBytes),
    );
    const pushHash = createHash("sha256");
    for (const chunk of chunks) pushHash.update(chunk);

    await sandbox.files.write("/tmp/large.bin", () =>
      (async function* () {
        for (const chunk of chunks) yield new Uint8Array(chunk);
      })(),
    );

    const entry = await sandbox.files.stat("/tmp/large.bin");
    expect(entry.size).toBe(chunkBytes * chunkCount);

    const stream = await sandbox.files.read("/tmp/large.bin", {
      format: "stream",
    });
    const pullHash = createHash("sha256");
    let pulled = 0;
    const reader = stream.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      pullHash.update(value);
      pulled += value.length;
    }
    expect(pulled).toBe(chunkBytes * chunkCount);
    expect(pullHash.digest("hex")).toBe(pushHash.digest("hex"));
  }, 300_000);

  it("manages directories and entries: mkdir, list, rename, remove", async () => {
    await sandbox.files.mkdir("/tmp/files-e2e/nested");
    await sandbox.files.write("/tmp/files-e2e/nested/a.txt", "a");

    const entries = await sandbox.files.list("/tmp/files-e2e/nested");
    expect(entries.map(e => e.name)).toContain("a.txt");

    await sandbox.files.rename(
      "/tmp/files-e2e/nested/a.txt",
      "/tmp/files-e2e/nested/b.txt",
    );
    expect(await sandbox.files.exists("/tmp/files-e2e/nested/a.txt")).toBe(false);
    expect(await sandbox.files.exists("/tmp/files-e2e/nested/b.txt")).toBe(true);

    await sandbox.files.remove("/tmp/files-e2e/nested/b.txt");
    expect(await sandbox.files.exists("/tmp/files-e2e/nested/b.txt")).toBe(false);
  }, 120_000);

  it("creates missing parent directories on write", async () => {
    // Unique path so the write_start-fails → mkdir → retry fallback runs on
    // the live bridge (it assumes the connection survives the failed start).
    const path = `/tmp/files-e2e-parents-${Date.now()}/deep/nested/file.txt`;
    await sandbox.files.write(path, "made it\n");
    expect(await sandbox.files.read(path)).toBe("made it\n");

    const parent = await sandbox.files.stat(path.slice(0, path.lastIndexOf("/")));
    expect(parent.isDir).toBe(true);
  }, 120_000);

  it("applies the mode option", async () => {
    await sandbox.files.write("/tmp/run.sh", "#!/bin/sh\necho ok\n", {
      mode: 0o755,
    });
    const entry = await sandbox.files.stat("/tmp/run.sh");
    expect(entry.mode & 0o777).toBe(0o755);
    expect((await sandbox.exec("/tmp/run.sh")).stdout).toBe("ok\n");
  }, 120_000);

  it("raises typed errors for missing paths", async () => {
    const error = await sandbox.files
      .read(`/tmp/missing-${Date.now()}`)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SandboxFileNotFoundError);
  }, 120_000);

  it("multiplexes many concurrent transfers over one pooled connection", async () => {
    // All of these funnel through one pooled /ws/files connection, so this only
    // passes against a proxy that demultiplexes concurrent transfers.
    const files = Array.from({ length: 12 }, (_, i) => ({
      path: `/tmp/mux-${i}.bin`,
      bytes: randomBytes(64 * 1024 + i * 997), // varied sizes, distinct content
    }));

    await Promise.all(
      files.map(f => sandbox.files.write(f.path, new Uint8Array(f.bytes))),
    );
    const checked = await Promise.all(
      files.map(async f => {
        const got = await sandbox.files.read(f.path, { format: "bytes" });
        return Buffer.from(got).equals(f.bytes); // no cross-talk
      }),
    );

    expect(checked.every(Boolean)).toBe(true);
  }, 180_000);

  it("interleaves mixed concurrent op types on one connection", async () => {
    await sandbox.files.mkdir("/tmp/mux-mixed");
    const seed = randomBytes(128 * 1024);
    await sandbox.files.write("/tmp/mux-mixed/seed.bin", new Uint8Array(seed));

    const [readBack, stat, list] = await Promise.all([
      sandbox.files.read("/tmp/mux-mixed/seed.bin", { format: "bytes" }),
      sandbox.files.stat("/tmp/mux-mixed/seed.bin"),
      sandbox.files.list("/tmp/mux-mixed"),
      sandbox.files.write("/tmp/mux-mixed/other.txt", "concurrent\n"),
    ]);

    expect(Buffer.from(readBack).equals(seed)).toBe(true);
    expect(stat.size).toBe(seed.length);
    expect(list.some(e => e.name === "seed.bin")).toBe(true);
    expect(await sandbox.files.read("/tmp/mux-mixed/other.txt")).toBe(
      "concurrent\n",
    );
  }, 180_000);
});

describe.runIf(live)("fork + template e2e (live)", () => {
  const created: Sandbox[] = [];

  // Each created sandbox (sources and forks alike) is torn down after its test.
  const track = (sandbox: Sandbox): Sandbox => {
    created.push(sandbox);
    return sandbox;
  };

  afterEach(async () => {
    await Promise.all(created.splice(0).map(s => s.destroy().catch(() => {})));
  });

  it("fork() clones the source filesystem and stays isolated", async () => {
    const source = track(await Sandbox.create());
    await source.exec("echo base > /tmp/state.txt");

    const fork = track(await source.fork());
    expect((await fork.exec("cat /tmp/state.txt")).stdout).toBe("base\n");

    // The fork is an independent copy: writing in one does not affect the other.
    await fork.exec("echo forked > /tmp/state.txt");
    expect((await source.exec("cat /tmp/state.txt")).stdout).toBe("base\n");
    expect((await fork.exec("cat /tmp/state.txt")).stdout).toBe("forked\n");
  }, 180_000);

  it("forks via the static Sandbox.create(source) form", async () => {
    const source = track(await Sandbox.create());
    await source.exec("echo static > /tmp/state.txt");

    const fork = track(await Sandbox.create(source));
    expect((await fork.exec("cat /tmp/state.txt")).stdout).toBe("static\n");
  }, 180_000);

  it("template installs apt packages during the build", async () => {
    const sandbox = track(
      await Sandbox.create(Sandbox.template().withPackages("cowsay")),
    );
    const result = await sandbox.exec("test -x /usr/games/cowsay && echo ok");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ok");
  }, 300_000);

  it("template run steps persist into the sandbox filesystem", async () => {
    const sandbox = track(
      await Sandbox.create(Sandbox.template().run("echo baked > /etc/marker")),
    );
    expect((await sandbox.exec("cat /etc/marker")).stdout).toBe("baked\n");
  }, 300_000);

  it("template workdir applies to later build steps", async () => {
    const sandbox = track(
      await Sandbox.create(
        Sandbox.template().workdir("/data").run("pwd > where.txt"),
      ),
    );
    expect((await sandbox.exec("cat /data/where.txt")).stdout).toBe("/data\n");
  }, 300_000);

  it("checkpoint() captures, create(name) boots, rename and delete manage it", async () => {
    const name = `sdk-e2e-snap-${Date.now()}`;
    const renamed = `${name}-renamed`;
    let checkpointId: string | undefined;
    try {
      const source = track(await Sandbox.create());
      await source.exec("echo snapped > /etc/snap-marker");

      const checkpoint = await source.checkpoint(name);
      checkpointId = checkpoint.id;
      expect(checkpoint.key).toBe(name);

      const listed = await Sandbox.checkpoints();
      expect(listed.some(c => c.key === name)).toBe(true);

      const clone = track(await Sandbox.create(name));
      expect((await clone.exec("cat /etc/snap-marker")).stdout).toBe("snapped\n");

      const updated = await Sandbox.renameCheckpoint(checkpoint.id, renamed);
      checkpointId = updated.id;
      const keys = (await Sandbox.checkpoints()).map(c => c.key);
      expect(keys).toContain(renamed);
      expect(keys).not.toContain(name);

      await Sandbox.deleteCheckpoint(updated.id);
      checkpointId = undefined;
      const afterDelete = await Sandbox.checkpoints();
      expect(afterDelete.some(c => c.key === renamed)).toBe(false);
    } finally {
      if (checkpointId) await Sandbox.deleteCheckpoint(checkpointId).catch(() => {});
    }
  }, 300_000);

  it("a checkpoint is immutable: clones are independent of the source and each other", async () => {
    const name = `sdk-e2e-immutable-${Date.now()}`;
    let checkpointId: string | undefined;
    try {
      const source = track(await Sandbox.create());
      await source.exec("echo original > /tmp/state.txt");
      const checkpoint = await source.checkpoint(name);
      checkpointId = checkpoint.id;

      // Mutating the source after capture must not affect the checkpoint.
      await source.exec("echo mutated > /tmp/state.txt");

      const first = track(await Sandbox.create(name));
      expect((await first.exec("cat /tmp/state.txt")).stdout).toBe("original\n");

      // Each clone boots from the captured disk, not from other clones.
      await first.exec("echo clobbered > /tmp/state.txt");
      const second = track(await Sandbox.create(name));
      expect((await second.exec("cat /tmp/state.txt")).stdout).toBe("original\n");
    } finally {
      if (checkpointId) await Sandbox.deleteCheckpoint(checkpointId).catch(() => {});
    }
  }, 300_000);

  it("create(name) fails fast for an unknown checkpoint name", async () => {
    const error = await Sandbox.create(`sdk-e2e-missing-${Date.now()}`).catch(
      error => error,
    );
    expect(error).toBeInstanceOf(RailwayGraphQLError);
    expect(String(error)).toContain("not found");
  }, 60_000);

  it("checkpoint() rejects when the sandbox is not running", async () => {
    const sandbox = track(await Sandbox.create());
    await sandbox.destroy();

    // destroy() returns before the sandbox has fully stopped; wait until it
    // leaves RUNNING (or disappears) so the checkpoint attempt can't race a
    // still-running VM and succeed. Only a not-found means gone; transient
    // refresh failures must keep polling, not masquerade as destroyed.
    const start = Date.now();
    for (;;) {
      let status: string | undefined;
      try {
        status = (await sandbox.refresh()).status;
      } catch (error) {
        if (error instanceof SandboxNotFoundError) break;
      }
      if (status !== undefined && status !== "RUNNING") break;
      if (Date.now() - start > 60_000) throw new Error("sandbox stayed RUNNING after destroy()");
      await sleep(1_000);
    }

    const error = await sandbox
      .checkpoint(`sdk-e2e-dead-${Date.now()}`)
      .catch(error => error);
    expect(error).toBeInstanceOf(RailwayGraphQLError);
  }, 180_000);
});
