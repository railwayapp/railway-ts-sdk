import { createHash, randomBytes } from "node:crypto";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { Sandbox, SandboxFileNotFoundError } from "../src/index.js";
import { live } from "./sandbox-e2e-helpers.js";

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
    const chunkBytes = 1024 * 1024;
    const chunkCount = 24;
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
    expect(entries.map(entry => entry.name)).toContain("a.txt");

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
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(SandboxFileNotFoundError);
  }, 120_000);
});
