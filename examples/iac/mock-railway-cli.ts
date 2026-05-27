#!/usr/bin/env node
import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import pc from "picocolors";

type RunnerResponse = {
  ok: boolean;
  command: string;
  file: string;
  mode?: string;
  currentEnvironment?: { projectId?: string; environmentId: string; environmentName?: string };
  changeSet?: { changes: Array<{ summary?: string; severity?: string; kind?: string }> };
  diff?: string;
  diagnostics: Array<{ severity: "warning" | "error"; path: string; message: string }>;
  stagedPatch?: { id: string };
};

const args = parseArgs(process.argv.slice(2));

try {
  const command = args.stage ? "stage" : "plan";
  const response = await runRunner(command);
  if (args.json) {
    console.log(JSON.stringify(response, null, 2));
    process.exit(response.ok ? 0 : 1);
  }

  printPreview(response);
  process.exit(response.ok ? 0 : 1);
} catch (error) {
  console.error(pc.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
}

async function runRunner(command: "plan" | "stage"): Promise<RunnerResponse> {
  const token = args.token ?? process.env.RAILWAY_TOKEN;
  const environmentId = args.environmentId ?? process.env.RAILWAY_ENVIRONMENT_ID;
  const projectId = args.projectId ?? process.env.RAILWAY_PROJECT_ID;
  const endpoint = args.endpoint ?? process.env.RAILWAY_GRAPHQL_ENDPOINT ?? "https://backboard.railway.com/graphql/v2";
  const file = args.file ?? "examples/iac/.railway/railway.ts";

  if (!token) throw new Error("RAILWAY_TOKEN or --token is required.");
  if (!environmentId) throw new Error("RAILWAY_ENVIRONMENT_ID or --environment-id is required.");

  if (command === "stage") {
    const plan = await runRunner("plan");
    if (hasDestructiveChanges(plan) && !args.yes) {
      throw new Error("Plan contains destructive changes. Re-run with --yes to stage.");
    }
  }

  const binary = path.resolve("dist/iac/bin.js");
  const argv = [
    "--import", "tsx",
    binary,
    command,
    "--file", file,
    "--endpoint", endpoint,
    "--token", token,
    "--environment-id", environmentId,
    "--compact",
    ...(projectId ? ["--project-id", projectId] : []),
    ...(args.includeTypes ? ["--include-types"] : []),
    ...(args.replace ? ["--replace"] : []),
    ...(args.decryptVariables ? ["--decrypt-variables"] : []),
  ];

  const { stdout, stderr, code } = await spawnNode(argv);
  let response: RunnerResponse;
  try {
    response = JSON.parse(stdout) as RunnerResponse;
  } catch {
    throw new Error(`Runner returned non-JSON output.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
  }
  if (code !== 0 && response.diagnostics.length === 0) {
    response.diagnostics.push({ severity: "error", path: "runner", message: stderr || `runner exited with ${code}` });
  }
  return response;
}

function printPreview(response: RunnerResponse) {
  console.log(pc.bold("Railway IaC mock CLI"));
  console.log(`runner: ${response.command}`);
  console.log(`file: ${response.file}`);
  if (response.currentEnvironment) {
    console.log(`project: ${response.currentEnvironment.projectId ?? "(unknown)"}`);
    console.log(`environment: ${response.currentEnvironment.environmentName ?? response.currentEnvironment.environmentId}`);
  }
  console.log("");

  for (const diagnostic of response.diagnostics) {
    const color = diagnostic.severity === "error" ? pc.red : pc.yellow;
    console.log(color(`${diagnostic.severity}: ${diagnostic.path ? `${diagnostic.path}: ` : ""}${diagnostic.message}`));
  }

  if (!response.ok) return;

  const changes = response.changeSet?.changes ?? [];
  if (changes.length === 0) {
    console.log(pc.green("No changes."));
  } else {
    console.log(pc.bold("ChangeSet"));
    console.log(response.diff || changes.map(change => change.summary ?? change.kind ?? "change").join("\n"));
    const destructive = changes.filter(change => change.severity === "destructive").length;
    if (destructive > 0) console.log(pc.red(`${destructive} destructive change(s).`));
  }

  if (response.stagedPatch) {
    console.log("");
    console.log(pc.green(`Staged Backboard patch: ${response.stagedPatch.id}`));
  } else {
    console.log("");
    console.log(`Run with ${pc.cyan("--stage")} to stage the proposed ChangeSet.`);
  }
}

function hasDestructiveChanges(response: RunnerResponse): boolean {
  return response.changeSet?.changes.some(change => change.severity === "destructive") ?? false;
}

function spawnNode(argv: string[]): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, argv, { stdio: ["ignore", "pipe", "pipe"] });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    child.stdout.on("data", chunk => stdout.push(Buffer.from(chunk)));
    child.stderr.on("data", chunk => stderr.push(Buffer.from(chunk)));
    child.on("error", reject);
    child.on("close", code => resolve({ stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8"), code }));
  });
}

function parseArgs(argv: string[]) {
  const parsed: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) continue;
    const key = toCamel(arg.slice(2));
    if (["stage", "json", "yes", "includeTypes", "replace", "decryptVariables"].includes(key)) {
      parsed[key] = true;
    } else {
      parsed[key] = argv[++i] ?? "";
    }
  }
  return parsed as {
    file?: string;
    endpoint?: string;
    token?: string;
    projectId?: string;
    environmentId?: string;
    stage?: boolean;
    json?: boolean;
    yes?: boolean;
    includeTypes?: boolean;
    replace?: boolean;
    decryptVariables?: boolean;
  };
}

function toCamel(value: string): string {
  return value.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase());
}
