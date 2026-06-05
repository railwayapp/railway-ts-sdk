import { afterEach, describe, expect, it } from "vitest";

import { Sandbox } from "../src/index.js";

/**
 * Live end-to-end fork + template tests. They run whenever RAILWAY_API_TOKEN +
 * RAILWAY_ENVIRONMENT_ID are set (e.g. loaded from .env by `mise run test` /
 * `mise run e2e`); without credentials they skip so the unit suite stays offline.
 */
const live =
  Boolean(process.env.RAILWAY_API_TOKEN) &&
  Boolean(process.env.RAILWAY_ENVIRONMENT_ID);

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
});
