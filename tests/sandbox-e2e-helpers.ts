import { expect } from "vitest";

import { Sandbox, type ExecHandle, type CreateOptions } from "../src/index.js";

/** Live suites stay offline unless a token (project or account) and an environment are present. */
export const live =
  Boolean(process.env.RAILWAY_TOKEN || process.env.RAILWAY_API_TOKEN) &&
  Boolean(process.env.RAILWAY_ENVIRONMENT_ID);

/** Select a boot path for repeated process-control conformance runs. */
export async function createExecTestSandbox(): Promise<Sandbox> {
  const scenario = process.env.RAILWAY_E2E_SANDBOX_SOURCE ?? "fresh";
  const options: CreateOptions = {
    idleTimeoutMinutes: 10,
    networkIsolation: process.env.RAILWAY_E2E_PRIVATE === "1" ? "PRIVATE" : "ISOLATED",
  };
  let sandbox: Sandbox;
  switch (scenario) {
    case "fresh":
      sandbox = await Sandbox.create(options);
      break;
    case "template":
      sandbox = await Sandbox.create(
        Sandbox.template().run("echo template > /etc/sdk-exec-boot-source"),
        options,
      );
      break;
    case "fork":
    case "checkpoint": {
      await using source = await Sandbox.create(options);
      await source.files.write("/etc/sdk-exec-boot-source", scenario);
      if (scenario === "fork") {
        sandbox = await source.fork(options);
      } else {
        const checkpoint = await source.checkpoint(`sdk-exec-${crypto.randomUUID()}`);
        try {
          sandbox = await Sandbox.create(checkpoint.key, options);
        } finally {
          await Sandbox.deleteCheckpoint(checkpoint.id);
        }
      }
      break;
    }
    default:
      throw new Error(`Unknown RAILWAY_E2E_SANDBOX_SOURCE: ${scenario}`);
  }
  console.info(`[live] source=${scenario} sandbox=${sandbox.id} region=${sandbox.region} network=${sandbox.networkIsolation}`);
  return sandbox;
}

export function createSandboxTracker(): {
  track: (sandbox: Sandbox) => Sandbox;
  cleanup: () => Promise<void>;
} {
  const created: Sandbox[] = [];
  return {
    track: sandbox => {
      created.push(sandbox);
      return sandbox;
    },
    cleanup: async () => {
      await Promise.all(
        created.splice(0).map(sandbox => sandbox.destroy().catch(() => {})),
      );
    },
  };
}

export function sleep(ms: number): Promise<void> {
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
    await sleep(100);
  }
}

export function lineNumbers(stdout: string): number[] {
  return stdout
    .split("\n")
    .filter(Boolean)
    .map(line => Number(line.replace("line-", "")));
}

/** Lines must be exactly 1..n, proving there are no gaps or duplicates. */
export function expectSequential(stdout: string): void {
  const numbers = lineNumbers(stdout);
  expect(numbers.length).toBeGreaterThan(0);
  numbers.forEach((value, index) => expect(value).toBe(index + 1));
}

const lineSet = (chunks: string[]): Set<number> =>
  new Set(lineNumbers(chunks.join("")));

export async function waitForLines(
  chunks: string[],
  untilLines: number,
): Promise<void> {
  await waitFor(
    () => lineSet(chunks).size >= untilLines,
    30_000,
    `${untilLines} live lines`,
  );
}

/** Starts a short line sequence and waits until enough output has streamed to detach. */
export async function streamSeq(
  sandbox: Sandbox,
  total: number,
  untilLines: number,
): Promise<{ live: string[]; handle: ExecHandle }> {
  const chunks: string[] = [];
  const handle = sandbox.exec(
    `for i in $(seq 1 ${total}); do echo line-$i; sleep 0.2; done`,
    { onStdout: chunk => chunks.push(chunk) },
  );
  await waitForLines(chunks, untilLines);
  return { live: chunks, handle };
}

/** Reattaches and checks that output from both sides of the seam covers 1..total. */
export async function reattachAndExpectAll(
  sandbox: Sandbox,
  sessionName: string,
  before: string[],
  total: number,
): Promise<void> {
  const after: string[] = [];
  const result = await sandbox.exec(
    { sessionName },
    { onStdout: chunk => after.push(chunk) },
  );
  expect(result.exitCode).toBe(0);
  const union = new Set([...lineSet(before), ...lineSet(after)]);
  expect(union.size).toBe(total);
  for (let i = 1; i <= total; i++) expect(union.has(i)).toBe(true);
}
