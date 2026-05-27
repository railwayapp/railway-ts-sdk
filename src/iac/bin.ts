#!/usr/bin/env -S node --import tsx
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

  process.stdout.write(`${JSON.stringify(response, null, pretty ? 2 : 0)}\n`);
  process.exit(response.ok ? 0 : 1);
}

async function readRequest(argv: string[]): Promise<RailwayIacRunnerRequest> {
  const args = parseArgs(argv);
  const stdin = await readStdinJson();
  return {
    ...stdin,
    ...(args.command ? { command: args.command } : {}),
    ...(args.cwd ? { cwd: args.cwd } : {}),
    ...(args.file ? { file: args.file } : {}),
    ...(args.includeTypes !== undefined ? { includeTypes: args.includeTypes } : {}),
    ...(args.pretty !== undefined ? { pretty: args.pretty } : {}),
  };
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
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (arg === "evaluate" || arg === "typegen") {
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
  }
  return parsed;
}
