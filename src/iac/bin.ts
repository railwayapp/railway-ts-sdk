#!/usr/bin/env node
import process from "node:process";

const MINIMUM_CLI_VERSION = "5.42.1";
const message =
  `This version of railway/iac requires Railway CLI ${MINIMUM_CLI_VERSION} or newer. ` +
  "Upgrade the CLI and run the command again. The IaC engine now ships in the CLI, not the TypeScript SDK.";

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});

async function main(): Promise<void> {
  const request = await readRequest();
  const command = typeof request.command === "string" ? request.command : "plan";
  const file = typeof request.file === "string" ? request.file : ".railway/railway.ts";

  // Older CLIs invoke this binary as their IaC engine and expect a JSON runner
  // response. Returning an error diagnostic makes the version boundary explicit
  // instead of failing later with a missing binary or an incomplete plan.
  process.stdout.write(
    `${JSON.stringify({
      ok: false,
      command,
      file,
      currentEnvironment: null,
      changeSet: null,
      diff: null,
      diagnostics: [{ severity: "error", path: "", message }],
      currentGraph: null,
      desiredGraph: null,
      stagedPatch: null,
      applyResult: null,
      deploymentId: null,
      stagedPatchId: null,
    })}\n`,
  );
  process.exitCode = 1;
}

async function readRequest(): Promise<Record<string, unknown>> {
  if (process.stdin.isTTY) return {};

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const input = Buffer.concat(chunks).toString("utf8").trim();
  if (!input) return {};

  try {
    const parsed: unknown = JSON.parse(input);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
