import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Gate, __resetFilesPool } from "../src/core/files-pool.js";
import { Sandbox } from "../src/index.js";
import { clearRailwayEnv, createFetchMock, sandboxInfo } from "./test-helpers.js";
import { createFilesWsMock } from "./files-ws-mock.js";

const auth = { token: "token_123", environmentId: "environment_123" };
const shellToken = (token: string) => ({ data: { generateShellToken: token } });
const fileEntry = (size: number) => ({
  name: "file",
  size,
  mode: 420,
  isDir: false,
  modTime: "2026-06-11T00:00:00Z",
});

/** Drains the microtask queue a few times so queued resolvers settle. */
const flush = async () => {
  for (let i = 0; i < 5; i++) await Promise.resolve();
};

const tick = () => new Promise(resolve => setTimeout(resolve, 0));
async function until(predicate: () => boolean, label: string): Promise<void> {
  for (let i = 0; i < 200; i++) {
    if (predicate()) return;
    await tick();
  }
  throw new Error(`condition not reached: ${label}`);
}

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

beforeEach(clearRailwayEnv);
afterEach(() => {
  __resetFilesPool();
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("Gate (concurrency semaphore)", () => {
  /** A pool of workers that record admission order and observed concurrency. */
  function makeTracker(gate: Gate) {
    const order: string[] = [];
    const releasers = new Map<string, () => void>();
    let active = 0;
    let maxActive = 0;
    const start = (name: string): void => {
      void (async () => {
        await gate.acquire();
        order.push(name);
        active++;
        maxActive = Math.max(maxActive, active);
        await new Promise<void>(resolve => releasers.set(name, resolve));
        active--;
        gate.release();
      })();
    };
    return {
      order,
      start,
      finish: (name: string) => releasers.get(name)?.(),
      get maxActive() {
        return maxActive;
      },
    };
  }

  it("admits up to the limit and queues the rest in FIFO order", async () => {
    const gate = new Gate(2);
    const t = makeTracker(gate);
    t.start("a");
    t.start("b");
    t.start("c");
    t.start("d");

    await flush();
    expect(t.order).toEqual(["a", "b"]); // only 2 admitted

    t.finish("a");
    await flush();
    expect(t.order).toEqual(["a", "b", "c"]); // a's slot → c (FIFO, not d)

    t.finish("b");
    await flush();
    expect(t.order).toEqual(["a", "b", "c", "d"]);
    expect(t.maxActive).toBe(2); // never exceeded the cap
  });

  it("never exceeds the cap when a fresh acquire races a release (no barge)", async () => {
    // Regression for the decrement-then-reincrement over-admission: release must
    // hand its slot to the queued waiter, not leave a gap a fresh acquire grabs.
    const gate = new Gate(1);
    const log: string[] = [];
    await gate.acquire(); // A holds the only slot
    void gate.acquire().then(() => log.push("B")); // B queues
    gate.release(); // hands the slot to B
    void gate.acquire().then(() => log.push("C")); // must NOT barge ahead of B

    await flush();
    expect(log).toEqual(["B"]); // only B admitted; C still waits
  });

  it("lower() narrows the ceiling, draining an over-subscribed gate first", async () => {
    const gate = new Gate(3);
    await gate.acquire();
    await gate.acquire();
    await gate.acquire(); // active = 3 = limit
    let admitted = false;
    void gate.acquire().then(() => {
      admitted = true;
    }); // queues

    gate.lower(1); // limit 1, but 3 already in flight

    gate.release();
    await flush();
    expect(admitted).toBe(false); // active 2, still over the new cap

    gate.release();
    await flush();
    expect(admitted).toBe(false); // active 1 == cap; the holder still has it

    gate.release();
    await flush();
    expect(admitted).toBe(true); // slot finally handed off at the new ceiling
  });

  it("lower() ignores a raise or a non-positive value", async () => {
    const gate = new Gate(2);
    gate.lower(5);
    gate.lower(0);
    gate.lower(-1);
    gate.lower(Number.NaN);
    const t = makeTracker(gate);
    t.start("a");
    t.start("b");
    t.start("c");

    await flush();
    expect(t.order).toEqual(["a", "b"]); // still the original cap of 2
  });
});

describe("files pool idle eviction", () => {
  it("closes an idle connection after the TTL, then reconnects", async () => {
    const { sandbox, ws } = await filesSandbox(2); // initial + post-evict reconnect
    const op1 = sandbox.files.stat("/a");
    const sock1 = await ws.nextSocket();
    const r1 = await sock1.nextRequest();

    vi.useFakeTimers(); // arm fake timers before the lease releases and sets the idle timer
    sock1.serverReply("stat_result", r1.id!, fileEntry(1));
    await op1;
    expect(sock1.readyState).toBe(1); // still open inside the window

    await vi.advanceTimersByTimeAsync(30_000);
    expect(sock1.readyState).toBe(3); // idle TTL closed it
    vi.useRealTimers();

    const op2 = sandbox.files.stat("/b");
    const sock2 = await ws.nextSocket();
    expect(sock2).not.toBe(sock1);
    const r2 = await sock2.nextRequest();
    sock2.serverReply("stat_result", r2.id!, fileEntry(2));
    await op2;
    expect(ws.sockets.length).toBe(2);
  });

  it("reuses the connection when re-acquired within the idle window", async () => {
    const { sandbox, ws, mock } = await filesSandbox(1); // one token: a reconnect would starve
    const op1 = sandbox.files.stat("/a");
    const sock1 = await ws.nextSocket();
    const r1 = await sock1.nextRequest();

    vi.useFakeTimers();
    sock1.serverReply("stat_result", r1.id!, fileEntry(1));
    await op1;
    await vi.advanceTimersByTimeAsync(20_000); // still inside the 30s window
    vi.useRealTimers();

    const op2 = sandbox.files.stat("/b"); // re-acquire cancels the idle timer
    const r2 = await sock1.nextRequest(); // same socket
    sock1.serverReply("stat_result", r2.id!, fileEntry(2));
    await op2;

    expect(ws.sockets.length).toBe(1);
    const mints = mock.calls.filter(c =>
      c.body.query.includes("generateShellToken"),
    ).length;
    expect(mints).toBe(1); // no reconnect → no second token
  });
});

describe("files pool key isolation", () => {
  it("uses separate connections for read vs read-write scopes", async () => {
    const { sandbox, ws } = await filesSandbox(2); // one socket per scope
    const statOp = sandbox.files.stat("/a"); // files:read
    const rmOp = sandbox.files.remove("/b"); // files:read files:write

    await until(() => ws.sockets.length === 2, "both scoped sockets opened");
    expect(ws.sockets[0]).not.toBe(ws.sockets[1]);

    for (const s of ws.sockets) {
      const r = await s.nextRequest();
      if (r.type === "stat") s.serverReply("stat_result", r.id!, fileEntry(1));
      else s.serverReply("ok", r.id!);
    }
    await Promise.all([statOp, rmOp]);
  });

  it("never shares a socket across different credentials", async () => {
    // Same endpoint/sandbox/env/scope, different token → the key must still
    // separate them, or the global pool would hand one tenant another's socket.
    const ws = createFilesWsMock();
    const mock = createFetchMock([
      { data: { sandboxCreate: sandboxInfo() } },
      { data: { sandboxCreate: sandboxInfo() } },
      shellToken("jwt_a"),
      shellToken("jwt_b"),
    ]);
    const common = {
      environmentId: "environment_123",
      fetch: mock.fetch,
      webSocketImpl: ws.webSocketImpl,
    };
    const a = await Sandbox.create({ ...common, token: "token_a" });
    const b = await Sandbox.create({ ...common, token: "token_b" });

    const opA = a.files.stat("/x");
    const opB = b.files.stat("/x");

    await until(() => ws.sockets.length === 2, "a socket per credential opened");
    expect(ws.sockets[0]).not.toBe(ws.sockets[1]);

    for (const s of ws.sockets) {
      const r = await s.nextRequest();
      s.serverReply("stat_result", r.id!, fileEntry(1));
    }
    await Promise.all([opA, opB]);
  });
});
