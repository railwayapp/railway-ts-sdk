import { execFileSync } from "node:child_process";
import process from "node:process";
import { MINIMUM_IAC_CLI_MESSAGE } from "./compatibility.js";

export function assertMinimumIacCliVersion(): void {
  if (!isNativeCliEvaluation()) return;

  const executable = process.env._ || "railway";
  let output = "";
  try {
    output = execFileSync(executable, ["--version"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(MINIMUM_IAC_CLI_MESSAGE);
  }

  const version = output.match(/\b(\d+)\.(\d+)\.(\d+)\b/);
  if (!version || compareVersions(version.slice(1).map(Number), [5, 42, 1]) < 0) {
    throw new Error(MINIMUM_IAC_CLI_MESSAGE);
  }
}

function isNativeCliEvaluation(): boolean {
  const evalFlag = process.execArgv.indexOf("-e");
  const source = evalFlag >= 0 ? process.execArgv[evalFlag + 1] : undefined;
  return (
    process.execArgv.includes("--experimental-strip-types") &&
    process.execArgv.includes("--input-type=module") &&
    source?.includes("const partial = mod.partial") === true &&
    source.includes("process.stdout.write(JSON.stringify({ partial, project: graph }))")
  );
}

function compareVersions(left: number[], right: number[]): number {
  for (let index = 0; index < 3; index += 1) {
    const difference = (left[index] ?? 0) - (right[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return 0;
}
