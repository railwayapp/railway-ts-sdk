import { afterEach, describe, expect, it } from "vitest";

import {
  RailwayGraphQLError,
  Sandbox,
  SandboxNotFoundError,
} from "../src/index.js";
import {
  createSandboxTracker,
  live,
  sleep,
} from "./sandbox-e2e-helpers.js";

describe.runIf(live)("fork + checkpoint e2e (live)", () => {
  const { track, cleanup } = createSandboxTracker();

  afterEach(cleanup);

  it("forks with both factory forms and keeps each filesystem isolated", async () => {
    const source = track(await Sandbox.create());
    await source.exec("echo base > /tmp/state.txt");

    const fork = track(await source.fork());
    expect((await fork.exec("cat /tmp/state.txt")).stdout).toBe("base\n");
    await fork.exec("echo forked > /tmp/state.txt");
    expect((await source.exec("cat /tmp/state.txt")).stdout).toBe("base\n");
    expect((await fork.exec("cat /tmp/state.txt")).stdout).toBe("forked\n");

    const staticFork = track(await Sandbox.create(source));
    expect((await staticFork.exec("cat /tmp/state.txt")).stdout).toBe("base\n");
  }, 180_000);

  it("sizes create and fork independently with resources", async () => {
    const memMiB = async (sandbox: Sandbox) =>
      Number((await sandbox.exec("awk '/MemTotal/ {print $2}' /proc/meminfo")).stdout) / 1024;
    const small = track(await Sandbox.create({ resources: { cpu: 1, memoryGB: 1 } }));
    const large = track(await small.fork({ resources: { cpu: 2, memoryGB: 2 } }));
    // The guest reports a little more than the request; compare, don't pin.
    const [smallMem, largeMem] = await Promise.all([memMiB(small), memMiB(large)]);
    expect(largeMem).toBeGreaterThan(smallMem + 500);
    expect((await large.exec("nproc")).stdout.trim()).toBe("2");
  }, 240_000);

  it("rejects resources above the workspace maximum", async () => {
    await expect(Sandbox.create({ resources: { cpu: 512 } })).rejects.toThrow(/cpu/i);
  }, 60_000);

  it("captures one immutable checkpoint and manages its lifecycle", async () => {
    const name = `sdk-e2e-snap-${Date.now()}`;
    const renamed = `${name}-renamed`;
    let checkpointId: string | undefined;
    try {
      const source = track(await Sandbox.create());
      await source.exec("echo original > /tmp/state.txt");

      const checkpoint = await source.checkpoint(name);
      checkpointId = checkpoint.id;
      expect(checkpoint.key).toBe(name);
      expect((await Sandbox.checkpoints()).some(item => item.key === name)).toBe(
        true,
      );

      await source.exec("echo mutated > /tmp/state.txt");
      const first = track(await Sandbox.create(name));
      // Check disk bytes directly; exec output can arrive with CRLF line endings.
      expect(await first.files.read("/tmp/state.txt")).toBe("original\n");

      await first.exec("echo clobbered > /tmp/state.txt");
      const second = track(await Sandbox.create(name));
      expect(await second.files.read("/tmp/state.txt")).toBe("original\n");

      const updated = await Sandbox.renameCheckpoint(checkpoint.id, renamed);
      checkpointId = updated.id;
      const keys = (await Sandbox.checkpoints()).map(item => item.key);
      expect(keys).toContain(renamed);
      expect(keys).not.toContain(name);

      await Sandbox.deleteCheckpoint(updated.id);
      checkpointId = undefined;
      expect(
        (await Sandbox.checkpoints()).some(item => item.key === renamed),
      ).toBe(false);
    } finally {
      if (checkpointId) {
        await Sandbox.deleteCheckpoint(checkpointId).catch(() => {});
      }
    }
  }, 300_000);

  it("create(name) fails fast for an unknown checkpoint name", async () => {
    const error = await Sandbox.create(`sdk-e2e-missing-${Date.now()}`).catch(
      caught => caught,
    );
    expect(error).toBeInstanceOf(RailwayGraphQLError);
    expect(String(error)).toContain("not found");
  }, 60_000);

  it("checkpoint() rejects when the sandbox is not running", async () => {
    const sandbox = track(await Sandbox.create());
    await sandbox.destroy();

    const start = Date.now();
    for (;;) {
      let status: string | undefined;
      try {
        status = (await sandbox.refresh()).status;
      } catch (error) {
        if (error instanceof SandboxNotFoundError) break;
      }
      if (status !== undefined && status !== "RUNNING") break;
      if (Date.now() - start > 60_000) {
        throw new Error("sandbox stayed RUNNING after destroy()");
      }
      await sleep(1_000);
    }

    const error = await sandbox
      .checkpoint(`sdk-e2e-dead-${Date.now()}`)
      .catch(caught => caught);
    expect(error).toBeInstanceOf(RailwayGraphQLError);
  }, 180_000);
});
