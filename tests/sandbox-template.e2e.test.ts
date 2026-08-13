import { afterEach, describe, expect, it } from "vitest";

import { Sandbox } from "../src/index.js";
import {
  createSandboxTracker,
  live,
} from "./sandbox-e2e-helpers.js";

describe.runIf(live)("template e2e (live)", () => {
  const { track, cleanup } = createSandboxTracker();

  afterEach(cleanup);

  it("installs apt packages during the build", async () => {
    const sandbox = track(
      await Sandbox.create(Sandbox.template().withPackages("cowsay")),
    );
    const result = await sandbox.exec("test -x /usr/games/cowsay && echo ok");
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain("ok");
  }, 300_000);

  it("persists run steps into the sandbox filesystem", async () => {
    const sandbox = track(
      await Sandbox.create(Sandbox.template().run("echo baked > /etc/marker")),
    );
    expect((await sandbox.exec("cat /etc/marker")).stdout).toBe("baked\n");
  }, 300_000);

  it("applies workdir to later build steps", async () => {
    const sandbox = track(
      await Sandbox.create(
        Sandbox.template().workdir("/data").run("pwd > where.txt"),
      ),
    );
    expect((await sandbox.exec("cat /data/where.txt")).stdout).toBe("/data\n");
  }, 300_000);
});
