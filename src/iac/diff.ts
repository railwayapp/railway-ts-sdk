import type { EnvironmentConfig } from "./schema.js";

export function renderPatchDiff({
  currentConfig,
  patch,
  title = "Railway patch",
}: {
  currentConfig: EnvironmentConfig;
  patch: EnvironmentConfig;
  title?: string;
}): string {
  const lines: string[] = [];
  const changes = flattenChanges(currentConfig, patch);
  lines.push(title);
  lines.push("".padEnd(title.length, "─"));
  lines.push("");
  if (changes.length === 0) {
    lines.push("No changes.");
    return lines.join("\n");
  }
  for (const change of changes) lines.push(formatChange(change));
  lines.push("");
  lines.push(`${changes.length} raw change${changes.length === 1 ? "" : "s"}.`);
  return lines.join("\n").trimEnd();
}

export function numChangesInEnvironmentConfig(config: EnvironmentConfig): number {
  return Object.keys(flatten(config)).length;
}

type FlatChange = { type: "added" | "removed" | "changed"; path: string; previous?: unknown; next?: unknown };

function flattenChanges(currentConfig: EnvironmentConfig, patch: EnvironmentConfig): FlatChange[] {
  const current = flatten(currentConfig);
  const next = flatten(patch);
  return Object.entries(next).map(([path, value]) => {
    if (value === null || path.endsWith(".isDeleted")) return { type: "removed", path, previous: current[path] };
    if (current[path] == null) return { type: "added", path, next: value };
    return { type: "changed", path, previous: current[path], next: value };
  });
}

function flatten(value: unknown, prefix = ""): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return prefix ? { [prefix]: value } : {};
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return prefix ? { [prefix]: {} } : {};
  return Object.fromEntries(entries.flatMap(([key, child]) => Object.entries(flatten(child, prefix ? `${prefix}.${key}` : key))));
}

function formatChange(change: FlatChange): string {
  const prefix = change.type === "added" ? green("+") : change.type === "removed" ? red("-") : amber("~");
  if (change.type === "added") return `  ${prefix} ${change.path}: ${format(change.next)}`;
  if (change.type === "removed") return `  ${prefix} ${change.path}: ${format(change.previous)}`;
  return `  ${prefix} ${change.path}: ${format(change.previous)} -> ${format(change.next)}`;
}

function format(value: unknown) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function green(text: string) { return color(text, "32"); }
function red(text: string) { return color(text, "31"); }
function amber(text: string) { return color(text, "33"); }
function color(text: string, code: string) {
  if (process.env.NO_COLOR) return text;
  return `\u001b[${code}m${text}\u001b[0m`;
}
