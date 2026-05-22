import {
  RailwaySandboxFileError,
  SandboxFileNotFoundError,
} from "./errors.js";
import {
  baseNameSandboxPath,
  joinSandboxPath,
  parseSandboxFindLine,
  shellQuote,
  validateSandboxFilePath,
} from "./files.js";
import type { SandboxFiles } from "./files.js";
import type {
  SandboxFileListEntry,
  SandboxInstanceOperations,
  SandboxTreeNode,
  SandboxTreeOptions,
} from "./types.js";

const DEFAULT_TREE_PATH = "/";
const DEFAULT_TREE_DEPTH = 2;
const MAX_TREE_DEPTH = 8;
const TREE_TIMEOUT_SEC = 60;

export class SandboxTree {
  readonly root: SandboxTreeNode;

  constructor(root: SandboxTreeNode) {
    this.root = root;
  }

  toJSON(): { root: SandboxTreeNode } {
    return { root: this.root };
  }

  toString(): string {
    const lines = [formatTreeName(this.root)];
    appendTreeLines(this.root, "", lines);
    return lines.join("\n");
  }
}

export async function readSandboxTree(args: {
  sandboxId: string;
  files: SandboxFiles;
  operations: SandboxInstanceOperations;
  options?: SandboxTreeOptions;
}): Promise<SandboxTree> {
  const path = args.options?.path ?? DEFAULT_TREE_PATH;
  const depth = normalizeDepth(path, args.options?.depth ?? DEFAULT_TREE_DEPTH);

  validateSandboxFilePath(path, "tree");

  const rootInfo = await args.files.info(path);
  if (!rootInfo) throw new SandboxFileNotFoundError({ operation: "tree", path });

  const root: SandboxTreeNode = {
    name: path === "/" ? "/" : baseNameSandboxPath(path),
    path: rootInfo.path,
    size: rootInfo.size,
    modifiedAt: rootInfo.modifiedAt,
    type: rootInfo.type,
    children: [],
  };

  if (rootInfo.type !== "DIRECTORY" || depth === 0) return new SandboxTree(root);

  const command = `find ${shellQuote(path)} -mindepth 1 -maxdepth ${depth} -printf '%P|%y|%s|%T@\\n'`;
  const result = await args.operations.exec(args.sandboxId, command, {
    timeoutSec: TREE_TIMEOUT_SEC,
  });

  if (result.timedOut) {
    throw new RailwaySandboxFileError({
      message: `Sandbox tree timed out for ${path}.`,
      operation: "tree",
      path,
    });
  }
  if (result.truncated) {
    throw new RailwaySandboxFileError({
      message: `Sandbox tree output was truncated for ${path}; lower depth or choose a narrower path.`,
      operation: "tree",
      path,
    });
  }
  if (
    result.exitCode !== 0 &&
    result.exitCode !== -1 &&
    result.stdout.trim().length === 0
  ) {
    throw new RailwaySandboxFileError({
      message: `Sandbox tree failed for ${path}: ${result.stderr.trim() || "unknown error"}`,
      operation: "tree",
      path,
    });
  }

  attachTreeEntries(root, parseTreeOutput(root.path, result.stdout));
  sortTree(root);

  return new SandboxTree(root);
}

function normalizeDepth(path: string, depth: number): number {
  if (!Number.isSafeInteger(depth) || depth < 0) {
    throw new RailwaySandboxFileError({
      message: "Sandbox tree depth must be a non-negative integer.",
      operation: "tree",
      path,
    });
  }
  if (depth > MAX_TREE_DEPTH) {
    throw new RailwaySandboxFileError({
      message: `Sandbox tree depth must be <= ${MAX_TREE_DEPTH}.`,
      operation: "tree",
      path,
    });
  }
  return depth;
}

function parseTreeOutput(
  rootPath: string,
  stdout: string,
): SandboxFileListEntry[] {
  return stdout
    .replace(/\r/g, "")
    .split("\n")
    .filter(line => line.length > 0)
    .map(line => parseTreeEntryLine(rootPath, line));
}

function parseTreeEntryLine(
  rootPath: string,
  line: string,
): SandboxFileListEntry {
  const entry = parseSandboxFindLine({ line, operation: "tree", path: rootPath });

  return {
    name: baseNameSandboxPath(entry.name),
    path: joinSandboxPath(rootPath, entry.name),
    size: entry.size,
    modifiedAt: entry.modifiedAt,
    type: entry.type,
  };
}

function attachTreeEntries(
  root: SandboxTreeNode,
  entries: SandboxFileListEntry[],
): void {
  const nodes = new Map<string, SandboxTreeNode>([
    [normalizeSandboxPath(root.path), root],
  ]);

  const sortedEntries = [...entries].sort((a, b) => {
    const depthDiff = pathDepth(a.path) - pathDepth(b.path);
    if (depthDiff !== 0) return depthDiff;
    return a.path.localeCompare(b.path);
  });

  for (const entry of sortedEntries) {
    const node: SandboxTreeNode = { ...entry, children: [] };
    nodes.set(normalizeSandboxPath(entry.path), node);

    const parentPath = normalizeSandboxPath(parentSandboxPath(entry.path));
    const parent = nodes.get(parentPath) ?? root;
    parent.children.push(node);
  }
}

function sortTree(node: SandboxTreeNode): void {
  node.children.sort((a, b) => a.name.localeCompare(b.name));
  for (const child of node.children) sortTree(child);
}

function appendTreeLines(
  node: SandboxTreeNode,
  prefix: string,
  lines: string[],
): void {
  node.children.forEach((child, index) => {
    const isLast = index === node.children.length - 1;
    lines.push(`${prefix}${isLast ? "└── " : "├── "}${formatTreeName(child)}`);
    appendTreeLines(child, `${prefix}${isLast ? "    " : "│   "}`, lines);
  });
}

function formatTreeName(node: SandboxTreeNode): string {
  if (node.path === "/") return "/";
  return node.type === "DIRECTORY" ? `${node.name}/` : node.name;
}

function parentSandboxPath(path: string): string {
  const cleanPath = normalizeSandboxPath(path);
  if (cleanPath === "/") return "/";

  const index = cleanPath.lastIndexOf("/");
  if (index <= 0) return "/";
  return cleanPath.slice(0, index);
}

function normalizeSandboxPath(path: string): string {
  if (path === "/") return path;
  return path.replace(/\/+$/, "");
}

function pathDepth(path: string): number {
  return normalizeSandboxPath(path).split("/").filter(Boolean).length;
}

