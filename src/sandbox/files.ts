import {
  RailwaySandboxFileError,
  SandboxFileNotFoundError,
  SandboxFileTooLargeError,
  type SandboxFileOperation,
} from "./errors.js";
import type {
  SandboxExecResult,
  SandboxFileData,
  SandboxFileInfo,
  SandboxFileListEntry,
  SandboxFileReadOptions,
  SandboxFileReadTextOptions,
  SandboxFileType,
  SandboxInstanceOperations,
} from "./types.js";

export const MAX_SANDBOX_FILE_BYTES = 5 * 1024 * 1024;

const PATH_BLOCKLIST = ["/proc", "/sys", "/dev"];
const DEFAULT_FILE_OP_TIMEOUT_SEC = 60;

type FileBody = {
  body: BodyInit;
  byteLength: number;
};

export class SandboxFiles {
  readonly #sandboxId: string;
  readonly #operations: SandboxInstanceOperations;

  constructor(args: {
    sandboxId: string;
    operations: SandboxInstanceOperations;
  }) {
    this.#sandboxId = args.sandboxId;
    this.#operations = args.operations;
  }

  async read(
    path: string,
    options: SandboxFileReadOptions = {},
  ): Promise<Uint8Array> {
    validateSandboxFilePath(path, "read");
    validateReadOptions(path, options);

    const headers = new Headers({ Accept: "application/octet-stream" });
    const range = rangeHeader(options);
    if (range) headers.set("Range", range);

    const response = await this.#operations.fileRequest(this.#sandboxId, path, {
      method: "GET",
      headers,
    });

    if (response.status === 404) {
      throw new SandboxFileNotFoundError({ operation: "read", path, status: 404 });
    }
    if (!response.ok) {
      throw await fileResponseError({ operation: "read", path, response });
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  async readText(
    path: string,
    options: SandboxFileReadTextOptions = {},
  ): Promise<string> {
    const { encoding = "utf-8", ...readOptions } = options;
    const bytes = await this.read(path, readOptions);
    return new TextDecoder(encoding).decode(bytes);
  }

  async write(path: string, data: SandboxFileData): Promise<SandboxFileInfo> {
    validateSandboxFilePath(path, "write");
    const fileBody = normalizeFileBody(data);

    if (fileBody.byteLength > MAX_SANDBOX_FILE_BYTES) {
      throw new SandboxFileTooLargeError({
        operation: "write",
        path,
        maxBytes: MAX_SANDBOX_FILE_BYTES,
        actualBytes: fileBody.byteLength,
      });
    }

    const response = await this.#operations.fileRequest(this.#sandboxId, path, {
      method: "PUT",
      headers: {
        Accept: "application/json",
        "Content-Length": String(fileBody.byteLength),
        "Content-Type": "application/octet-stream",
      },
      body: fileBody.body,
    });

    if (!response.ok) {
      throw await fileResponseError({ operation: "write", path, response });
    }

    return parseWriteInfo(path, response);
  }

  async info(path: string): Promise<SandboxFileInfo | null> {
    validateSandboxFilePath(path, "info");

    const response = await this.#operations.fileRequest(this.#sandboxId, path, {
      method: "HEAD",
      headers: { Accept: "application/octet-stream" },
    });

    if (response.status === 404) return null;
    if (!response.ok) {
      throw await fileResponseError({ operation: "info", path, response });
    }

    return parseInfoHeaders(path, response.headers, "info");
  }

  async exists(path: string): Promise<boolean> {
    return (await this.info(path)) !== null;
  }

  async remove(path: string): Promise<void> {
    validateSandboxFilePath(path, "remove");

    const response = await this.#operations.fileRequest(this.#sandboxId, path, {
      method: "DELETE",
    });

    if (response.status === 404) {
      throw new SandboxFileNotFoundError({
        operation: "remove",
        path,
        status: 404,
      });
    }
    if (!response.ok) {
      throw await fileResponseError({ operation: "remove", path, response });
    }
  }

  async list(path: string): Promise<SandboxFileListEntry[]> {
    validateSandboxFilePath(path, "list");
    const directory = await this.#requireDirectory(path, "list");
    const command = `find ${shellQuote(directory.path)} -mindepth 1 -maxdepth 1 -printf '%f|%y|%s|%T@\\n'`;
    const result = await this.#execFileCommand("list", path, command);

    return parseListOutput(directory.path, result.stdout);
  }

  async move(from: string, to: string): Promise<SandboxFileInfo> {
    validateSandboxFilePath(from, "move");
    validateSandboxFilePath(to, "move");

    const source = await this.info(from);
    if (!source) {
      throw new SandboxFileNotFoundError({ operation: "move", path: from });
    }

    const destination = await this.info(to);
    const expectedPath =
      destination?.type === "DIRECTORY"
        ? joinSandboxPath(to, baseNameSandboxPath(from))
        : to;

    const result = await this.#execFileCommand(
      "move",
      from,
      `mv ${shellQuote(from)} ${shellQuote(to)}`,
    );
    const moved = await this.info(expectedPath);

    if (!moved) {
      throw new RailwaySandboxFileError({
        message: fileCommandFailureMessage("move", expectedPath, result),
        operation: "move",
        path: expectedPath,
      });
    }

    if (from !== expectedPath && (await this.info(from))) {
      throw new RailwaySandboxFileError({
        message: `Sandbox file move failed for ${from}: source still exists after mv`,
        operation: "move",
        path: from,
      });
    }

    return moved;
  }

  async makeDir(path: string): Promise<SandboxFileInfo> {
    validateSandboxFilePath(path, "makeDir");

    const result = await this.#execFileCommand(
      "makeDir",
      path,
      `mkdir -p ${shellQuote(path)}`,
    );
    const info = await this.info(path);

    if (!info || info.type !== "DIRECTORY") {
      throw new RailwaySandboxFileError({
        message: fileCommandFailureMessage("makeDir", path, result),
        operation: "makeDir",
        path,
      });
    }

    return info;
  }

  async #requireDirectory(
    path: string,
    operation: SandboxFileOperation,
  ): Promise<SandboxFileInfo> {
    const info = await this.info(path);
    if (!info) throw new SandboxFileNotFoundError({ operation, path });
    if (info.type !== "DIRECTORY") {
      throw new RailwaySandboxFileError({
        message: `Sandbox file ${operation} failed for ${path}: path is not a directory`,
        operation,
        path,
      });
    }
    return info;
  }

  async #execFileCommand(
    operation: SandboxFileOperation,
    path: string,
    command: string,
  ): Promise<SandboxExecResult> {
    const result = await this.#operations.exec(this.#sandboxId, command, {
      timeoutSec: DEFAULT_FILE_OP_TIMEOUT_SEC,
    });

    if (result.timedOut) {
      throw new RailwaySandboxFileError({
        message: `Sandbox file ${operation} timed out for ${path}.`,
        operation,
        path,
      });
    }
    if (result.truncated) {
      throw new RailwaySandboxFileError({
        message: `Sandbox file ${operation} output was truncated for ${path}.`,
        operation,
        path,
      });
    }
    if (
      result.exitCode !== 0 &&
      result.exitCode !== -1 &&
      result.stdout.trim().length === 0
    ) {
      throw new RailwaySandboxFileError({
        message: fileCommandFailureMessage(operation, path, result),
        operation,
        path,
      });
    }

    return result;
  }
}

export function validateSandboxFilePath(
  path: string,
  operation: SandboxFileOperation = "info",
): void {
  if (!path.startsWith("/")) {
    throw new RailwaySandboxFileError({
      message: "Sandbox file path must be absolute.",
      operation,
      path,
    });
  }
  if (path.includes("\0")) {
    throw new RailwaySandboxFileError({
      message: "Sandbox file path cannot contain NUL bytes.",
      operation,
      path,
    });
  }
  if (path.length > 4096) {
    throw new RailwaySandboxFileError({
      message: "Sandbox file path is too long.",
      operation,
      path,
    });
  }
  for (const blocked of PATH_BLOCKLIST) {
    if (path === blocked || path.startsWith(`${blocked}/`)) {
      throw new RailwaySandboxFileError({
        message: `Sandbox file path under ${blocked} is not allowed.`,
        operation,
        path,
      });
    }
  }
}

export function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`;
}

export function joinSandboxPath(base: string, child: string): string {
  const cleanChild = child.replace(/^\/+/, "");
  if (base === "/") return `/${cleanChild}`;
  return `${base.replace(/\/+$/, "")}/${cleanChild}`;
}

export function baseNameSandboxPath(path: string): string {
  const cleanPath = path.replace(/\/+$/, "");
  if (cleanPath === "") return "/";
  return cleanPath.slice(cleanPath.lastIndexOf("/") + 1);
}

function validateReadOptions(
  path: string,
  options: SandboxFileReadOptions,
): void {
  if (options.offset !== undefined && !isNonNegativeInteger(options.offset)) {
    throw new RailwaySandboxFileError({
      message: "Sandbox file read offset must be a non-negative integer.",
      operation: "read",
      path,
    });
  }
  if (options.length !== undefined && !isPositiveInteger(options.length)) {
    throw new RailwaySandboxFileError({
      message: "Sandbox file read length must be a positive integer.",
      operation: "read",
      path,
    });
  }
}

function rangeHeader(options: SandboxFileReadOptions): string | null {
  if (options.offset === undefined && options.length === undefined) return null;

  const start = options.offset ?? 0;
  if (options.length === undefined) return `bytes=${start}-`;

  return `bytes=${start}-${start + options.length - 1}`;
}

function normalizeFileBody(data: SandboxFileData): FileBody {
  if (typeof data === "string") {
    const bytes = new TextEncoder().encode(data);
    return { body: copyToArrayBuffer(bytes), byteLength: bytes.byteLength };
  }
  if (data instanceof Uint8Array) {
    return { body: copyToArrayBuffer(data), byteLength: data.byteLength };
  }
  if (data instanceof ArrayBuffer) {
    return { body: data, byteLength: data.byteLength };
  }
  if (isBlob(data)) {
    return { body: data, byteLength: data.size };
  }

  throw new TypeError(
    "Sandbox file data must be a string, Uint8Array, ArrayBuffer, or Blob.",
  );
}

async function parseWriteInfo(
  path: string,
  response: Response,
): Promise<SandboxFileInfo> {
  try {
    return normalizeInfoPayload(path, await response.json());
  } catch {
    return parseInfoHeaders(path, response.headers, "write");
  }
}

function parseInfoHeaders(
  path: string,
  headers: Headers,
  operation: SandboxFileOperation,
): SandboxFileInfo {
  const size = Number.parseInt(headers.get("Content-Length") ?? "", 10);
  const lastModified = headers.get("Last-Modified");
  const mode = headers.get("X-Sandbox-File-Mode");
  const type = parseFileType(headers.get("X-Sandbox-File-Type"));
  const modifiedAt = lastModified ? new Date(lastModified) : null;

  if (
    !Number.isFinite(size) ||
    !lastModified ||
    !modifiedAt ||
    Number.isNaN(modifiedAt.getTime()) ||
    !mode ||
    !type
  ) {
    throw new RailwaySandboxFileError({
      message: `Sandbox file ${operation} failed for ${path}: missing file metadata headers`,
      operation,
      path,
    });
  }

  return {
    path,
    size,
    mode,
    modifiedAt: modifiedAt.toISOString(),
    type,
  };
}

function normalizeInfoPayload(path: string, payload: unknown): SandboxFileInfo {
  if (typeof payload !== "object" || payload === null) {
    throw new Error("invalid file info payload");
  }

  const body = payload as Partial<SandboxFileInfo>;
  const type = parseFileType(body.type);

  if (
    typeof body.size !== "number" ||
    !Number.isFinite(body.size) ||
    typeof body.mode !== "string" ||
    typeof body.modifiedAt !== "string" ||
    !type
  ) {
    throw new Error("invalid file info payload");
  }

  return {
    path: typeof body.path === "string" ? body.path : path,
    size: body.size,
    mode: body.mode,
    modifiedAt: new Date(body.modifiedAt).toISOString(),
    type,
  };
}

function parseListOutput(
  basePath: string,
  stdout: string,
): SandboxFileListEntry[] {
  return stdout
    .replace(/\r/g, "")
    .split("\n")
    .filter(line => line.length > 0)
    .map(line => parseFindEntryLine(basePath, line));
}

function parseFindEntryLine(
  basePath: string,
  line: string,
): SandboxFileListEntry {
  const entry = parseSandboxFindLine({
    line,
    operation: "list",
    path: basePath,
  });

  return {
    name: entry.name,
    path: joinSandboxPath(basePath, entry.name),
    size: entry.size,
    modifiedAt: entry.modifiedAt,
    type: entry.type,
  };
}

export function parseSandboxFindLine(args: {
  line: string;
  operation: SandboxFileOperation;
  path: string;
}): Omit<SandboxFileListEntry, "path"> {
  const parts = args.line.split("|");
  if (parts.length < 4) throw invalidFindOutput(args.operation, args.path);

  const modifiedAtSeconds = Number.parseFloat(parts.pop() ?? "");
  const size = Number.parseInt(parts.pop() ?? "", 10);
  const type = fileTypeFromFindKind(parts.pop() ?? "");
  const name = parts.join("|");

  if (
    name.length === 0 ||
    !Number.isFinite(size) ||
    !Number.isFinite(modifiedAtSeconds)
  ) {
    throw invalidFindOutput(args.operation, args.path);
  }

  return {
    name,
    size,
    modifiedAt: new Date(modifiedAtSeconds * 1000).toISOString(),
    type,
  };
}

function invalidFindOutput(
  operation: SandboxFileOperation,
  path: string,
): RailwaySandboxFileError {
  return new RailwaySandboxFileError({
    message: `Sandbox file ${operation} failed for ${path}: invalid find output`,
    operation,
    path,
  });
}

async function fileResponseError(args: {
  operation: SandboxFileOperation;
  path: string;
  response: Response;
}): Promise<RailwaySandboxFileError> {
  const responseBody = await readErrorBody(args.response);

  if (args.response.status === 404) {
    return new SandboxFileNotFoundError({
      operation: args.operation,
      path: args.path,
      status: args.response.status,
      responseBody,
    });
  }
  if (args.response.status === 413) {
    return new SandboxFileTooLargeError({
      operation: args.operation,
      path: args.path,
      maxBytes: MAX_SANDBOX_FILE_BYTES,
      status: args.response.status,
      responseBody,
    });
  }

  const detail = responseErrorMessage(responseBody) ?? args.response.statusText;
  return new RailwaySandboxFileError({
    message: `Sandbox file ${args.operation} failed for ${args.path}: ${detail || `HTTP ${args.response.status}`}`,
    operation: args.operation,
    path: args.path,
    status: args.response.status,
    responseBody,
  });
}

async function readErrorBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get("Content-Type") ?? "";

  try {
    if (contentType.includes("application/json")) return await response.json();
    return await response.text();
  } catch {
    return undefined;
  }
}

function responseErrorMessage(responseBody: unknown): string | null {
  if (typeof responseBody === "string" && responseBody.length > 0) {
    return responseBody;
  }
  if (typeof responseBody !== "object" || responseBody === null) return null;

  const error = (responseBody as { error?: unknown }).error;
  return typeof error === "string" ? error : null;
}

function fileCommandFailureMessage(
  operation: SandboxFileOperation,
  path: string,
  result: SandboxExecResult,
): string {
  const detail = result.stderr.trim() || result.stdout.trim() || "unknown error";
  return `Sandbox file ${operation} failed for ${path}: ${detail}`;
}

function parseFileType(value: unknown): SandboxFileType | null {
  return value === "FILE" ||
    value === "DIRECTORY" ||
    value === "SYMLINK" ||
    value === "OTHER"
    ? value
    : null;
}

function fileTypeFromFindKind(kind: string): SandboxFileType {
  if (kind === "f") return "FILE";
  if (kind === "d") return "DIRECTORY";
  if (kind === "l") return "SYMLINK";
  return "OTHER";
}

function isBlob(data: SandboxFileData): data is Blob {
  return typeof Blob !== "undefined" && data instanceof Blob;
}

function copyToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function isNonNegativeInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function isPositiveInteger(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}
