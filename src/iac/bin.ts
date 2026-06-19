#!/usr/bin/env node
import process from "node:process";
import { runRailwayIac, type RailwayIacRunnerRequest } from "./runner.js";

main().catch(error => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
});

async function main() {
  const request = await readRequest(process.argv.slice(2));
  const response = await runRailwayIac(request);
  const pretty = request.pretty ?? true;

  await writeStdout(`${JSON.stringify(response, null, pretty ? 2 : 0)}\n`);
  process.exitCode = response.ok ? 0 : 1;
}

async function writeStdout(payload: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    process.stdout.write(payload, error => {
      if (error) reject(error);
      else resolve();
    });
  });
}

async function readRequest(argv: string[]): Promise<RailwayIacRunnerRequest> {
  const args = parseArgs(argv);
  const stdin = await readStdinJson();
  return mergeRequest(stdin, args);
}

async function readStdinJson(): Promise<RailwayIacRunnerRequest> {
  if (process.stdin.isTTY) return {};
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw) as RailwayIacRunnerRequest;
}

function parseArgs(argv: string[]): RailwayIacRunnerRequest {
  const parsed: RailwayIacRunnerRequest = {};
  const backboard: NonNullable<RailwayIacRunnerRequest["backboard"]> = {};

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    const consumed = applyFlag(arg, argv[i + 1], parsed, backboard);
    if (consumed) i += consumed - 1;
  }

  if (Object.keys(backboard).length > 0) parsed.backboard = backboard;
  return parsed;
}

function applyFlag(
  arg: string,
  value: string | undefined,
  parsed: RailwayIacRunnerRequest,
  backboard: NonNullable<RailwayIacRunnerRequest["backboard"]>,
): number {
  if (isRunnerCommand(arg)) {
    parsed.command = arg;
    return 1;
  }

  if (setBooleanFlag(arg, parsed, backboard)) return 1;
  return setValueFlag(arg, value, parsed, backboard);
}

function isRunnerCommand(arg: string): arg is NonNullable<RailwayIacRunnerRequest["command"]> {
  return arg === "evaluate" || arg === "typegen" || arg === "current" || arg === "plan" || arg === "stage" || arg === "apply";
}

function setBooleanFlag(
  arg: string,
  parsed: RailwayIacRunnerRequest,
  backboard: NonNullable<RailwayIacRunnerRequest["backboard"]>,
): boolean {
  switch (arg) {
    case "--include-types":
      parsed.includeTypes = true;
      return true;
    case "--compact":
      parsed.pretty = false;
      return true;
    case "--pretty":
      parsed.pretty = true;
      return true;
    case "--decrypt-variables":
      backboard.decryptVariables = true;
      return true;
    case "--show-values":
      parsed.revealValues = true;
      return true;
    case "--replace":
      backboard.merge = false;
      return true;
    case "--merge":
      backboard.merge = true;
      return true;
    default:
      return false;
  }
}

function setValueFlag(
  arg: string,
  value: string | undefined,
  parsed: RailwayIacRunnerRequest,
  backboard: NonNullable<RailwayIacRunnerRequest["backboard"]>,
): number {
  if (!value) return 1;

  switch (arg) {
    case "--cwd":
      parsed.cwd = value;
      return 2;
    case "--file":
      parsed.file = value;
      return 2;
    case "--endpoint":
      backboard.endpoint = value;
      return 2;
    case "--token":
      backboard.token = value;
      return 2;
    case "--auth-type":
      if (value === "bearer" || value === "project-token") backboard.authType = value;
      return 2;
    case "--project-id":
      backboard.projectId = value;
      return 2;
    case "--environment-id":
      backboard.environmentId = value;
      return 2;
    default:
      return 1;
  }
}

function mergeRequest(stdin: RailwayIacRunnerRequest, args: RailwayIacRunnerRequest): RailwayIacRunnerRequest {
  const merged: RailwayIacRunnerRequest = { ...stdin, ...args };
  if (stdin.backboard || args.backboard) merged.backboard = { ...stdin.backboard, ...args.backboard };
  return merged;
}
