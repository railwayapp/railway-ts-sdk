import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deriveFilesWsEndpoint } from "../src/core/config.js";
import { RailwayConnectionError } from "../src/core/errors.js";
import {
  Sandbox,
  SandboxFileNotFoundError,
  SandboxFiles,
  SandboxFilesError,
} from "../src/index.js";
import { clearRailwayEnv, createFetchMock, sandboxInfo } from "./test-helpers.js";
import {
  createFilesWsMock,
  FRAME_READ_CHUNK,
  FRAME_READ_END,
  FRAME_WRITE_CHUNK,
  FRAME_WRITE_END,
  type MockFilesSocket,
} from "./files-ws-mock.js";

const auth = { token: "token_123", environmentId: "environment_123" };

beforeEach(clearRailwayEnv);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
const enc = (text: string) => new TextEncoder().encode(text);

/** The initial download segment size (READ_SEGMENT_INITIAL_BYTES). */
const SEGMENT = 2 * 1024 * 1024;

const shellToken = (token: string) => ({ data: { generateShellToken: token } });

/** Creates a files-ws-backed sandbox with `tokens` shell-token responses queued. */
async function filesSandbox(tokens = 1) {
  const ws = createFilesWsMock();
  const mock = createFetchMock([
    { data: { sandboxCreate: sandboxInfo() } },
    ...Array.from({ length: tokens }, (_, i) => shellToken(`jwt_${i}`)),
  ]);
  const sandbox = await Sandbox.create({
    ...auth,
    fetch: mock.fetch,
    webSocketImpl: ws.webSocketImpl,
  });
  return { sandbox, ws, mock };
}

/** Polls until `predicate` holds; fails the test after ~200 ticks. */
async function until(predicate: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await tick();
  }
  throw new Error(`condition not reached: ${label}`);
}

/** Runs the server side of a successful upload and returns the binary frames. */
async function acceptWrite(socket: MockFilesSocket, expectedFrames: number) {
  const request = await socket.nextRequest();
  socket.serverReply("write_ready", request.id!);
  await until(
    () => socket.sentBinary.length === expectedFrames,
    `client sent ${expectedFrames} content frames`,
  );
  socket.serverReply("ok", request.id!);
  return request;
}

const fileEntry = (size: number) => ({
  name: "file",
  size,
  mode: 420,
  isDir: false,
  modTime: "2026-06-11T00:00:00Z",
});

/** Answers the stat request issued for a tail (`fromEnd`) read. */
async function acceptStat(socket: MockFilesSocket, size: number) {
  const request = await socket.nextRequest();
  expect(request.type).toBe("stat");
  socket.serverReply("stat_result", request.id!, fileEntry(size));
}

describe("deriveFilesWsEndpoint", () => {
  it("swaps the exec bridge path for the files one", () => {
    expect(deriveFilesWsEndpoint("wss://ssh.railway.com:2226/ws/exec")).toBe(
      "wss://ssh.railway.com:2226/ws/files",
    );
  });

  it("forces the files path on non-standard endpoints", () => {
    expect(deriveFilesWsEndpoint("wss://proxy.example.com:9999/custom")).toBe(
      "wss://proxy.example.com:9999/ws/files",
    );
  });
});

describe("files.read", () => {
  it("mints a read-scoped token, opens /ws/files, and resolves text", async () => {
    const { sandbox, ws, mock } = await filesSandbox();
    const promise = sandbox.files.read("/tmp/hello.txt");
    const socket = await ws.nextSocket();

    // No stat round trip: the first segment is requested directly and a
    // short result signals EOF.
    expect(await socket.nextRequest()).toEqual({
      type: "read",
      id: "1",
      data: { path: "/tmp/hello.txt", offset: 0, length: SEGMENT },
    });
    socket.serverBinary(1, FRAME_READ_CHUNK, 0, enc("hello "));
    socket.serverBinary(1, FRAME_READ_END, 1, enc("world"));

    await expect(promise).resolves.toBe("hello world");
    expect(mock.calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        instanceId: "sandbox_123",
        kind: "sandbox",
        scope: "files:read",
      },
    });
    expect(socket.url).toBe("wss://ssh.railway.com:2226/ws/files");
    expect(socket.protocols).toEqual(["railway-shell", "jwt_0"]);
    // The per-op connection is closed once the read settles.
    expect(socket.readyState).toBe(3);
  });

  it("returns bytes for format=bytes, including the end-frame payload", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.read("/data.bin", { format: "bytes" });
    const socket = await ws.nextSocket();
    await socket.nextRequest();

    socket.serverBinary(1, FRAME_READ_CHUNK, 0, new Uint8Array([1, 2]));
    socket.serverBinary(1, FRAME_READ_END, 1, new Uint8Array([3]));
    await expect(promise).resolves.toEqual(new Uint8Array([1, 2, 3]));
  });

  it("resolves an empty file from an empty first segment", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.read("/empty");
    const socket = await ws.nextSocket();
    await socket.nextRequest();
    socket.serverBinary(1, FRAME_READ_END, 0, new Uint8Array(0));
    await expect(promise).resolves.toBe("");
  });

  it("requests follow-up segments until one comes back short", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.read("/big.bin", { format: "bytes" });
    const socket = await ws.nextSocket();
    const mb = 1024 * 1024;

    // First segment fills completely, so the read continues.
    expect(await socket.nextRequest()).toEqual({
      type: "read",
      id: "1",
      data: { path: "/big.bin", offset: 0, length: 2 * mb },
    });
    socket.serverBinary(1, FRAME_READ_END, 0, new Uint8Array(2 * mb).fill(1));

    // Next segment grows (clamped to 4x per step) and comes back short: EOF.
    const second = await socket.nextRequest();
    expect(second.type).toBe("read");
    expect(second.data).toMatchObject({ offset: 2 * mb, length: 8 * mb });
    socket.serverBinary(2, FRAME_READ_END, 0, new Uint8Array(mb).fill(2));

    const bytes = (await promise) as Uint8Array;
    expect(bytes.length).toBe(3 * mb);
    expect(bytes[0]).toBe(1);
    expect(bytes[3 * mb - 1]).toBe(2);
  });

  it("passes an explicit range through and stops at its end", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.read("/blob.bin", {
      format: "bytes",
      offset: 1000,
      length: 64,
    });
    const socket = await ws.nextSocket();
    expect(await socket.nextRequest()).toEqual({
      type: "read",
      id: "1",
      data: { path: "/blob.bin", offset: 1000, length: 64 },
    });
    socket.serverBinary(1, FRAME_READ_END, 0, new Uint8Array(64).fill(3));
    await expect(promise).resolves.toEqual(new Uint8Array(64).fill(3));
  });

  it("stats only for tail reads and rejects offset+fromEnd", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.read("/log.txt", { length: 100, fromEnd: true });
    const socket = await ws.nextSocket();
    await acceptStat(socket, 1000);
    expect(await socket.nextRequest()).toEqual({
      type: "read",
      id: "2",
      data: { path: "/log.txt", offset: 900, length: 100 },
    });
    socket.serverBinary(2, FRAME_READ_END, 0, enc("tail"));
    await expect(promise).resolves.toBe("tail");

    await expect(
      sandbox.files.read("/log.txt", { offset: 1, fromEnd: true }),
    ).rejects.toThrow(TypeError);
  });

  it("clamps a tail read larger than the file to offset 0", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.read("/small.txt", {
      length: 4096,
      fromEnd: true,
    });
    const socket = await ws.nextSocket();
    await acceptStat(socket, 10);
    expect(await socket.nextRequest()).toEqual({
      type: "read",
      id: "2",
      data: { path: "/small.txt", offset: 0, length: 10 },
    });
    socket.serverBinary(2, FRAME_READ_END, 0, enc("whole file"));
    await expect(promise).resolves.toBe("whole file");
  });

  it("streams chunks for format=stream and closes on completion", async () => {
    const { sandbox, ws } = await filesSandbox();
    const stream = await sandbox.files.read("/big.bin", { format: "stream" });
    const socket = await ws.nextSocket();
    await socket.nextRequest();

    socket.serverBinary(1, FRAME_READ_CHUNK, 0, new Uint8Array([7]));
    socket.serverBinary(1, FRAME_READ_END, 1, new Uint8Array([8]));

    const reader = stream.getReader();
    expect((await reader.read()).value).toEqual(new Uint8Array([7]));
    expect((await reader.read()).value).toEqual(new Uint8Array([8]));
    expect((await reader.read()).done).toBe(true);
    expect(socket.readyState).toBe(3);
  });

  it("aborts the transfer when the stream is cancelled", async () => {
    const { sandbox, ws } = await filesSandbox();
    const stream = await sandbox.files.read("/big.bin", { format: "stream" });
    const socket = await ws.nextSocket();
    await socket.nextRequest();
    socket.serverBinary(1, FRAME_READ_CHUNK, 0, new Uint8Array([7]));

    await stream.cancel();
    expect(socket.readyState).toBe(3);
  });

  it("surfaces stream errors through the stream", async () => {
    const { sandbox, ws } = await filesSandbox();
    const stream = await sandbox.files.read("/missing", { format: "stream" });
    const socket = await ws.nextSocket();
    await socket.nextRequest();
    socket.serverError("1", "file does not exist");

    const reader = stream.getReader();
    await expect(reader.read()).rejects.toBeInstanceOf(SandboxFileNotFoundError);
  });

  it("maps server errors to typed file errors", async () => {
    const { sandbox, ws } = await filesSandbox(2);

    // A missing file fails on the first segment request.
    const missing = sandbox.files.read("/missing");
    const socket1 = await ws.nextSocket();
    await socket1.nextRequest();
    socket1.serverError("1", "file does not exist");
    await expect(missing).rejects.toBeInstanceOf(SandboxFileNotFoundError);

    const denied = sandbox.files.read("/etc/shadow");
    const socket2 = await ws.nextSocket();
    await socket2.nextRequest();
    socket2.serverError("1", "permission denied");
    const error = await denied.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SandboxFilesError);
    expect(error).not.toBeInstanceOf(SandboxFileNotFoundError);
    expect((error as SandboxFilesError).operation).toBe("read");
    expect((error as SandboxFilesError).path).toBe("/etc/shadow");
    expect((error as Error).message).toContain("permission denied");
  });

  it("applies consumer backpressure: no next segment until the stream drains", async () => {
    const mb = 1024 * 1024;
    const { sandbox, ws } = await filesSandbox();
    const stream = await sandbox.files.read("/big.bin", { format: "stream" });
    const socket = await ws.nextSocket();

    expect(await socket.nextRequest()).toMatchObject({
      data: { offset: 0, length: 2 * mb },
    });
    socket.serverBinary(1, FRAME_READ_END, 0, new Uint8Array(2 * mb).fill(1));

    // Nothing consumes the stream, so the next segment must not be requested.
    for (let i = 0; i < 20; i++) await tick();
    expect(socket.sentText.length).toBe(1); // the first read only

    // Consuming the queued chunk frees capacity and triggers the next segment.
    const reader = stream.getReader();
    expect((await reader.read()).value?.length).toBe(2 * mb);
    const next = await socket.nextRequest();
    expect(next.data).toMatchObject({ offset: 2 * mb });

    socket.serverBinary(
      2,
      FRAME_READ_END,
      0,
      new Uint8Array(3 * mb).fill(2),
    );
    expect((await reader.read()).value?.length).toBe(3 * mb);
    expect((await reader.read()).done).toBe(true);
  });

  it("clamps a binary frame to its declared payload length", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.read("/weird", { format: "bytes" });
    const socket = await ws.nextSocket();
    await socket.nextRequest();

    // Header declares 3 payload bytes but the frame carries 6: only 3 count.
    const frame = new Uint8Array(12 + 6);
    const view = new DataView(frame.buffer);
    view.setUint16(0, 1); // request id
    view.setUint16(2, FRAME_READ_END);
    view.setUint32(8, 3); // declared payload length
    frame.set([10, 11, 12, 99, 99, 99], 12);
    socket.serverRaw(frame.buffer);

    await expect(promise).resolves.toEqual(new Uint8Array([10, 11, 12]));
  });

  it("rejects with a connection error when the server never replies", async () => {
    vi.useFakeTimers();
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.stat("/silent");
    promise.catch(() => {}); // assertion attaches after the timer fires
    const socket = await ws.nextSocket();
    await socket.nextRequest();

    await vi.advanceTimersByTimeAsync(31_000);
    await expect(promise).rejects.toBeInstanceOf(RailwayConnectionError);
    expect(socket.readyState).toBe(3);
  });

  it("survives more drops than the retry budget when each attempt progresses", async () => {
    const kb = 1024;
    const drops = 5; // more than TRANSFER_MAX_RETRIES; progress resets the budget
    const { sandbox, ws } = await filesSandbox(drops + 1);
    const promise = sandbox.files.read("/flaky.bin", { format: "bytes" });

    let socket = await ws.nextSocket();
    for (let i = 1; i <= drops; i++) {
      await socket.nextRequest();
      socket.serverBinary(1, FRAME_READ_CHUNK, 0, new Uint8Array(kb).fill(i));
      await tick(); // deliver progress before the drop
      socket.serverClose(1006, "flaky");
      socket = await ws.nextSocket();
    }

    const final = await socket.nextRequest();
    expect((final.data as { offset: number }).offset).toBe(drops * kb);
    socket.serverBinary(
      1,
      FRAME_READ_END,
      0,
      new Uint8Array(100 * kb - drops * kb).fill(9),
    );

    const bytes = (await promise) as Uint8Array;
    expect(bytes.length).toBe(100 * kb);
    expect(bytes[0]).toBe(1);
    expect(bytes[drops * kb - 1]).toBe(drops);
    expect(bytes[drops * kb]).toBe(9);
  }, 15_000);

  it("resumes a read when the server reports connection lost mid-segment", async () => {
    const mb = 1024 * 1024;
    const { sandbox, ws } = await filesSandbox(2);
    const promise = sandbox.files.read("/big.bin", { format: "bytes" });

    const first = await ws.nextSocket();
    const read = await first.nextRequest();
    first.serverBinary(1, FRAME_READ_CHUNK, 0, new Uint8Array(1024).fill(9));
    await tick();
    first.serverError(read.id!, "connection lost");

    const second = await ws.nextSocket();
    const resume = await second.nextRequest();
    expect(resume.data).toMatchObject({ offset: 1024 });
    second.serverBinary(1, FRAME_READ_END, 0, new Uint8Array(mb).fill(8));

    const bytes = (await promise) as Uint8Array;
    expect(bytes.length).toBe(1024 + mb);
  }, 15_000);

  it("resumes a segmented read from the dropped byte position", async () => {
    const mb = 1024 * 1024;
    const { sandbox, ws } = await filesSandbox(2);
    const promise = sandbox.files.read("/big.bin", { format: "bytes" });

    const first = await ws.nextSocket();
    await first.nextRequest(); // read offset=0 length=2MB
    first.serverBinary(1, FRAME_READ_CHUNK, 0, new Uint8Array(1024).fill(9));
    await tick(); // let the chunk deliver before the connection drops
    first.serverClose(1006, "tunnel lost");

    // A fresh connection resumes mid-segment from the exact byte position.
    const second = await ws.nextSocket();
    const resume = await second.nextRequest();
    expect(resume.type).toBe("read");
    expect(resume.data).toEqual({ path: "/big.bin", offset: 1024, length: SEGMENT });
    // A short segment ends the read.
    second.serverBinary(1, FRAME_READ_END, 0, new Uint8Array(mb).fill(8));

    const bytes = (await promise) as Uint8Array;
    expect(bytes.length).toBe(1024 + mb);
    expect(bytes[0]).toBe(9);
    expect(bytes[1024]).toBe(8);
    expect(bytes[1024 + mb - 1]).toBe(8);
  }, 15_000);

  it("gives up after repeated connection drops", async () => {
    const { sandbox, ws } = await filesSandbox(4);
    const promise = sandbox.files.read("/file");
    // Original attempt + 3 retries, all dropped before any progress.
    for (let i = 0; i < 4; i++) {
      const socket = await ws.nextSocket();
      await socket.nextRequest();
      socket.serverClose(1006, "gone");
    }
    await expect(promise).rejects.toBeInstanceOf(RailwayConnectionError);
  }, 15_000);
});

describe("files.write", () => {
  it("declares size for strings and sends one end-tagged frame", async () => {
    const { sandbox, ws, mock } = await filesSandbox();
    const promise = sandbox.files.write("/tmp/out.txt", "hi");
    const socket = await ws.nextSocket();

    const request = await acceptWrite(socket, 1);
    expect(request).toEqual({
      type: "write_start",
      id: "1",
      data: { path: "/tmp/out.txt", mode: 0, size: 2 },
    });
    expect(socket.sentBinary[0]).toEqual({
      reqId: 1,
      frameType: FRAME_WRITE_END,
      seq: 0,
      payload: enc("hi"),
    });

    await expect(promise).resolves.toBeUndefined();
    expect(mock.calls[1]?.body.variables).toEqual({
      input: {
        environmentId: "environment_123",
        instanceId: "sandbox_123",
        kind: "sandbox",
        scope: "files:read files:write",
      },
    });
    expect(socket.readyState).toBe(3);
  });

  it("re-chunks large payloads to 64KB frames with the last one end-tagged", async () => {
    const { sandbox, ws } = await filesSandbox();
    const data = new Uint8Array(130 * 1024).fill(7);
    const promise = sandbox.files.write("/big.bin", data);
    const socket = await ws.nextSocket();

    const request = await acceptWrite(socket, 3);
    expect(request.data).toEqual({ path: "/big.bin", mode: 0, size: data.length });
    expect(
      socket.sentBinary.map(f => ({
        frameType: f.frameType,
        seq: f.seq,
        bytes: f.payload.length,
      })),
    ).toEqual([
      { frameType: FRAME_WRITE_CHUNK, seq: 0, bytes: 64 * 1024 },
      { frameType: FRAME_WRITE_CHUNK, seq: 1, bytes: 64 * 1024 },
      { frameType: FRAME_WRITE_END, seq: 2, bytes: 2 * 1024 },
    ]);
    await expect(promise).resolves.toBeUndefined();
  });

  it("uploads streams without a declared size", async () => {
    const { sandbox, ws } = await filesSandbox();
    async function* chunks() {
      yield enc("part one|");
      yield enc("part two");
    }
    const promise = sandbox.files.write("/streamed", chunks());
    const socket = await ws.nextSocket();

    const request = await acceptWrite(socket, 2);
    expect(request.data).toEqual({ path: "/streamed", mode: 0, size: 0 });
    expect(socket.sentBinary.map(f => f.frameType)).toEqual([
      FRAME_WRITE_CHUNK,
      FRAME_WRITE_END,
    ]);
    expect(socket.sentBinary[1]?.payload).toEqual(enc("part two"));
    await expect(promise).resolves.toBeUndefined();
  });

  it("writes an empty file as a bare end frame", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.write("/empty", "");
    const socket = await ws.nextSocket();

    await acceptWrite(socket, 1);
    expect(socket.sentBinary[0]).toEqual({
      reqId: 1,
      frameType: FRAME_WRITE_END,
      seq: 0,
      payload: new Uint8Array(0),
    });
    await expect(promise).resolves.toBeUndefined();
  });

  it("creates missing parent directories and retries the write once", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.write("/data/deep/out.bin", "payload");
    const socket = await ws.nextSocket();

    expect(await socket.nextRequest()).toEqual({
      type: "write_start",
      id: "1",
      data: { path: "/data/deep/out.bin", mode: 0, size: 7 },
    });
    socket.serverError("1", "open parent dir: no such file or directory");

    expect(await socket.nextRequest()).toEqual({
      type: "mkdir",
      id: "2",
      data: { path: "/data/deep" },
    });
    socket.serverReply("ok", "2");

    expect(await socket.nextRequest()).toEqual({
      type: "write_start",
      id: "3",
      data: { path: "/data/deep/out.bin", mode: 0, size: 7 },
    });
    socket.serverReply("write_ready", "3");
    await until(() => socket.sentBinary.length === 1, "content frame sent");
    expect(socket.sentBinary[0]).toMatchObject({
      reqId: 3,
      frameType: FRAME_WRITE_END,
      payload: enc("payload"),
    });
    socket.serverReply("ok", "3");

    await expect(promise).resolves.toBeUndefined();
  });

  it("applies the mode option with a chmod over exec after the upload", async () => {
    const { sandbox, ws, mock } = await filesSandbox(2);
    const promise = sandbox.files.write("/app/run.sh", "#!/bin/sh\n", {
      mode: 0o755,
    });

    const upload = await ws.nextSocket();
    const start = await acceptWrite(upload, 1);
    // The protocol mode is still declared so native support picks it up.
    expect((start.data as { mode: number }).mode).toBe(0o755);

    // After the upload, a shell-scoped exec applies the permissions.
    const exec = await ws.nextSocket();
    expect(exec.url).toContain("/ws/exec");
    expect(
      (mock.calls[2]?.body.variables as { input: { scope: string } }).input
        .scope,
    ).toBe("shell");
    const init = await exec.nextRequest();
    expect(init).toMatchObject({
      type: "init_exec",
      data: { command: "chmod 755 -- '/app/run.sh'" },
    });
    exec.serverReply("exit", "0", { exit_code: 0 });

    await expect(promise).resolves.toBeUndefined();
  });

  it("shell-quotes paths with single quotes in the chmod command", async () => {
    const { sandbox, ws } = await filesSandbox(2);
    const promise = sandbox.files.write("/tmp/it's.sh", "#!/bin/sh\n", {
      mode: 0o700,
    });

    const upload = await ws.nextSocket();
    await acceptWrite(upload, 1);

    const exec = await ws.nextSocket();
    const init = await exec.nextRequest();
    expect(init).toMatchObject({
      type: "init_exec",
      data: { command: "chmod 700 -- '/tmp/it'\\''s.sh'" },
    });
    exec.serverReply("exit", "0", { exit_code: 0 });
    await expect(promise).resolves.toBeUndefined();
  });

  it("declares byteLength as the size for ArrayBuffer sources", async () => {
    const { sandbox, ws } = await filesSandbox();
    const buffer = new ArrayBuffer(5);
    new Uint8Array(buffer).set([1, 2, 3, 4, 5]);
    const promise = sandbox.files.write("/buf.bin", buffer);
    const socket = await ws.nextSocket();

    const request = await acceptWrite(socket, 1);
    expect(request.data).toMatchObject({ size: 5 });
    expect(socket.sentBinary[0]?.payload).toEqual(new Uint8Array([1, 2, 3, 4, 5]));
    await expect(promise).resolves.toBeUndefined();
  });

  it("rejects an invalid mode without uploading", async () => {
    const { sandbox } = await filesSandbox(0);
    await expect(
      sandbox.files.write("/f", "x", { mode: 0o100000 }),
    ).rejects.toThrow(TypeError);
  });

  it("pauses sending while the socket buffer is above the high-water mark", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.write("/big.bin", new Uint8Array(130 * 1024));
    const socket = await ws.nextSocket();
    const start = await socket.nextRequest();

    // Simulate a congested socket before the client starts streaming.
    socket.bufferedAmount = 256 * 1024;
    socket.serverReply("write_ready", start.id!);
    for (let i = 0; i < 20; i++) await tick();
    expect(socket.sentBinary.length).toBe(0);

    // Draining the buffer lets the transfer proceed.
    socket.bufferedAmount = 0;
    await until(() => socket.sentBinary.length === 3, "frames after drain");
    socket.serverReply("ok", start.id!);
    await expect(promise).resolves.toBeUndefined();
  });

  it("replays a Blob from a fresh stream when retrying after a drop", async () => {
    const { sandbox, ws } = await filesSandbox(2);
    const promise = sandbox.files.write("/blob.bin", new Blob(["blob data"]));

    const first = await ws.nextSocket();
    const start = await first.nextRequest();
    expect((start.data as { size: number }).size).toBe(9);
    first.serverReply("write_ready", start.id!);
    first.serverClose(1006, "gone");

    // The retry must re-read the Blob, not a consumed stream.
    const second = await ws.nextSocket();
    await acceptWrite(second, 1);
    expect(second.sentBinary[0]?.payload).toEqual(enc("blob data"));
    await expect(promise).resolves.toBeUndefined();
  }, 15_000);

  it("gives up retrying a replayable write once the budget is spent", async () => {
    const { sandbox, ws } = await filesSandbox(4);
    const promise = sandbox.files.write("/f.txt", "payload");
    promise.catch(() => {}); // assertion attaches after the final drop
    // Original attempt + 3 retries, all dropped.
    for (let i = 0; i < 4; i++) {
      const socket = await ws.nextSocket();
      await socket.nextRequest();
      socket.serverClose(1006, "gone");
    }
    await expect(promise).rejects.toBeInstanceOf(RailwayConnectionError);
  }, 15_000);

  it("retries a replayable write when the server reports connection lost", async () => {
    const { sandbox, ws } = await filesSandbox(2);
    const promise = sandbox.files.write("/f.txt", "hello");

    const first = await ws.nextSocket();
    const start = await first.nextRequest();
    first.serverReply("write_ready", start.id!);
    // The server's stream to the sandbox died; the WS session stays open.
    first.serverError(start.id!, "connection lost");

    const second = await ws.nextSocket();
    await acceptWrite(second, 1);
    expect(second.sentBinary[0]?.payload).toEqual(enc("hello"));
    await expect(promise).resolves.toBeUndefined();
  }, 15_000);

  it("retries a replayable write on a fresh connection after a drop", async () => {
    const { sandbox, ws } = await filesSandbox(2);
    const promise = sandbox.files.write("/f.txt", "hello");

    const first = await ws.nextSocket();
    const start = await first.nextRequest();
    first.serverReply("write_ready", start.id!);
    first.serverClose(1006, "gone");

    const second = await ws.nextSocket();
    const retried = await acceptWrite(second, 1);
    expect(retried.data).toEqual({ path: "/f.txt", mode: 0, size: 5 });
    expect(second.sentBinary[0]?.payload).toEqual(enc("hello"));
    await expect(promise).resolves.toBeUndefined();
  }, 15_000);

  it("retries a factory stream source with fresh content after a drop", async () => {
    const { sandbox, ws } = await filesSandbox(2);
    let calls = 0;
    const promise = sandbox.files.write("/f.bin", () => {
      calls++;
      const attempt = calls;
      return (async function* () {
        yield enc(`attempt-${attempt}`);
      })();
    });

    const first = await ws.nextSocket();
    const start = await first.nextRequest();
    first.serverReply("write_ready", start.id!);
    first.serverClose(1006, "gone");

    const second = await ws.nextSocket();
    await acceptWrite(second, 1);
    expect(calls).toBe(2);
    expect(second.sentBinary[0]?.payload).toEqual(enc("attempt-2"));
    await expect(promise).resolves.toBeUndefined();
  }, 15_000);

  it("does not retry one-shot stream sources after a drop", async () => {
    const { sandbox, ws } = await filesSandbox();
    async function* chunks() {
      yield enc("data");
    }
    const promise = sandbox.files.write("/f.bin", chunks());
    const socket = await ws.nextSocket();
    const start = await socket.nextRequest();
    socket.serverReply("write_ready", start.id!);
    socket.serverClose(1006, "gone");
    await expect(promise).rejects.toBeInstanceOf(RailwayConnectionError);
  });

  it("rejects when write_start fails", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.write("/denied", "data");
    const socket = await ws.nextSocket();
    const request = await socket.nextRequest();
    socket.serverError(request.id!, "permission denied");

    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SandboxFilesError);
    expect((error as SandboxFilesError).operation).toBe("write");
  });

  it("rejects when the server fails the write after streaming started", async () => {
    const { sandbox, ws } = await filesSandbox();
    async function* slow(): AsyncGenerator<Uint8Array> {
      yield enc("first");
      // Stall until the test injects the failure, then keep offering data.
      await new Promise(resolve => setTimeout(resolve, 20));
      yield enc("second");
      yield enc("third");
    }
    const promise = sandbox.files.write("/full", slow());
    const socket = await ws.nextSocket();
    const request = await socket.nextRequest();
    socket.serverReply("write_ready", request.id!);
    await tick();
    socket.serverError(request.id!, "no space left on device");

    const error = await promise.catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SandboxFilesError);
    expect((error as Error).message).toContain("no space left on device");
  });

  it("rejects unsupported data types", async () => {
    const { sandbox } = await filesSandbox(0);
    await expect(
      sandbox.files.write("/bad", 42 as unknown as string),
    ).rejects.toThrow(TypeError);
  });
});

describe("files metadata ops", () => {
  it("lists a directory", async () => {
    const { sandbox, ws } = await filesSandbox();
    const promise = sandbox.files.list("/app");
    const socket = await ws.nextSocket();
    expect(await socket.nextRequest()).toEqual({
      type: "ls",
      id: "1",
      data: { path: "/app" },
    });
    const entries = [
      { name: "index.ts", size: 120, mode: 420, isDir: false, modTime: "2026-06-11T00:00:00Z" },
      { name: "src", size: 0, mode: 0o40755, isDir: true, modTime: "2026-06-11T00:00:00Z" },
    ];
    socket.serverReply("ls_result", "1", { entries });
    await expect(promise).resolves.toEqual(entries);
  });

  it("stats a path and reports missing ones via exists()", async () => {
    const { sandbox, ws } = await filesSandbox(2);

    const statPromise = sandbox.files.stat("/app/index.ts");
    const socket1 = await ws.nextSocket();
    expect(await socket1.nextRequest()).toEqual({
      type: "stat",
      id: "1",
      data: { path: "/app/index.ts" },
    });
    const entry = {
      name: "index.ts",
      size: 120,
      mode: 420,
      isDir: false,
      modTime: "2026-06-11T00:00:00Z",
    };
    socket1.serverReply("stat_result", "1", entry);
    await expect(statPromise).resolves.toEqual(entry);

    const existsPromise = sandbox.files.exists("/nope");
    const socket2 = await ws.nextSocket();
    await socket2.nextRequest();
    socket2.serverError("1", "file does not exist");
    await expect(existsPromise).resolves.toBe(false);
  });

  it("creates directories, removes, and renames", async () => {
    const { sandbox, ws } = await filesSandbox(3);

    const mkdirPromise = sandbox.files.mkdir("/a/b/c");
    const socket1 = await ws.nextSocket();
    expect(await socket1.nextRequest()).toEqual({
      type: "mkdir",
      id: "1",
      data: { path: "/a/b/c" },
    });
    socket1.serverReply("ok", "1");
    await expect(mkdirPromise).resolves.toBeUndefined();

    const removePromise = sandbox.files.remove("/a/b/c");
    const socket2 = await ws.nextSocket();
    expect(await socket2.nextRequest()).toEqual({
      type: "rm",
      id: "1",
      data: { path: "/a/b/c" },
    });
    socket2.serverReply("ok", "1");
    await expect(removePromise).resolves.toBeUndefined();

    const renamePromise = sandbox.files.rename("/old.txt", "/new.txt");
    const socket3 = await ws.nextSocket();
    expect(await socket3.nextRequest()).toEqual({
      type: "rename",
      id: "1",
      data: { old: "/old.txt", new: "/new.txt" },
    });
    socket3.serverReply("ok", "1");
    await expect(renamePromise).resolves.toBeUndefined();
  });

  it("mints the rw scope for mutations", async () => {
    const { sandbox, ws, mock } = await filesSandbox();
    const promise = sandbox.files.mkdir("/dir");
    const socket = await ws.nextSocket();
    await socket.nextRequest();
    socket.serverReply("ok", "1");
    await promise;
    expect(
      (mock.calls[1]?.body.variables as { input: { scope: string } }).input.scope,
    ).toBe("files:read files:write");
  });

  it("rejects empty paths without connecting", async () => {
    const { sandbox } = await filesSandbox(0);
    await expect(sandbox.files.read("")).rejects.toThrow(TypeError);
    await expect(sandbox.files.mkdir("  ")).rejects.toThrow(TypeError);
  });

  it("rejects invalid read ranges without connecting", async () => {
    const { sandbox } = await filesSandbox(0);
    await expect(
      sandbox.files.read("/f", { fromEnd: true }),
    ).rejects.toThrow(TypeError);
    await expect(
      sandbox.files.read("/f", { offset: -1 }),
    ).rejects.toThrow(TypeError);
    await expect(
      sandbox.files.read("/f", { length: 0 }),
    ).rejects.toThrow(TypeError);
  });
});

describe("sandbox.files accessor", () => {
  it("returns a cached SandboxFiles instance", async () => {
    const { sandbox } = await filesSandbox(0);
    expect(sandbox.files).toBeInstanceOf(SandboxFiles);
    expect(sandbox.files).toBe(sandbox.files);
  });
});
