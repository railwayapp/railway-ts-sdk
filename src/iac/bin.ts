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
    if (arg === "evaluate" || arg === "typegen" || arg === "current" || arg === "plan" || arg === "stage" || arg === "apply") {
      parsed.command = arg;
      continue;
    }
    if (arg === "--include-types") {
      parsed.includeTypes = true;
      continue;
    }
    if (arg === "--compact") {
      parsed.pretty = false;
      continue;
    }
    if (arg === "--pretty") {
      parsed.pretty = true;
      continue;
    }
    if (arg === "--decrypt-variables") {
      backboard.decryptVariables = true;
      continue;
    }
    if (arg === "--replace") {
      backboard.merge = false;
      continue;
    }
    if (arg === "--merge") {
      backboard.merge = true;
      continue;
    }
    if (arg === "--cwd") {
      const cwd = argv[++i];
      if (cwd) parsed.cwd = cwd;
      continue;
    }
    if (arg === "--file") {
      const file = argv[++i];
      if (file) parsed.file = file;
      continue;
    }
    if (arg === "--endpoint") {
      const endpoint = argv[++i];
      if (endpoint) backboard.endpoint = endpoint;
      continue;
    }
    if (arg === "--token") {
      const token = argv[++i];
      if (token) backboard.token = token;
      continue;
    }
    if (arg === "--auth-type") {
      const authType = argv[++i];
      if (authType === "bearer" || authType === "project-token") backboard.authType = authType;
      continue;
    }
    if (arg === "--project-id") {
      const projectId = argv[++i];
      if (projectId) backboard.projectId = projectId;
      continue;
    }
    if (arg === "--environment-id") {
      const environmentId = argv[++i];
      if (environmentId) backboard.environmentId = environmentId;
      continue;
    }
  }

  if (Object.keys(backboard).length > 0) parsed.backboard = backboard;
  return parsed;
}

function mergeRequest(stdin: RailwayIacRunnerRequest, args: RailwayIacRunnerRequest): RailwayIacRunnerRequest {
  const merged: RailwayIacRunnerRequest = { ...stdin, ...args };
  if (stdin.backboard || args.backboard) merged.backboard = { ...stdin.backboard, ...args.backboard };
  return merged;
}
