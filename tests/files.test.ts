import { describe, expect, it } from "vitest";

import {
  MAX_SANDBOX_FILE_BYTES,
  Sandbox,
  SandboxFileNotFoundError,
  SandboxFileTooLargeError,
} from "../src/index.js";
import { createFetchMock, header, sandboxSnapshot } from "./test-helpers.js";

const modifiedAt = "2026-05-13T00:00:00.000Z";

function fileHeaders(args: {
  size?: number;
  mode?: string;
  modifiedAt?: string;
  type?: string;
} = {}): HeadersInit {
  return {
    "Content-Length": String(args.size ?? 5),
    "Last-Modified": new Date(args.modifiedAt ?? modifiedAt).toUTCString(),
    "X-Sandbox-File-Mode": args.mode ?? "0644",
    "X-Sandbox-File-Type": args.type ?? "FILE",
  };
}

async function createSandbox(responses: unknown[]): Promise<{
  sandbox: Awaited<ReturnType<Sandbox["create"]>>;
  mock: ReturnType<typeof createFetchMock>;
}> {
  const mock = createFetchMock([
    { data: { sandboxCreate: sandboxSnapshot() } },
    ...responses,
  ]);
  const client = new Sandbox({
    token: "token_123",
    projectId: "project_123",
    environmentId: "environment_123",
    endpoint: "https://backboard.railway-develop.com/graphql/v2",
    fetch: mock.fetch,
  });

  return { sandbox: await client.create(), mock };
}

describe("SandboxFiles", () => {
  it("writes bytes to the HTTP file endpoint with content length", async () => {
    const { sandbox, mock } = await createSandbox([
      new Response(
        JSON.stringify({
          path: "/tmp/hello.txt",
          size: 5,
          mode: "0644",
          modifiedAt,
          type: "FILE",
        }),
        { status: 201, headers: { "Content-Type": "application/json" } },
      ),
    ]);

    const info = await sandbox.files.write("/tmp/hello.txt", "hello");

    expect(info).toMatchObject({ path: "/tmp/hello.txt", size: 5, type: "FILE" });
    expect(mock.calls[1]?.input).toBe(
      "https://backboard.railway-develop.com/api/v1/sandboxes/sandbox_123/files?path=%2Ftmp%2Fhello.txt",
    );
    expect(mock.calls[1]?.init?.method).toBe("PUT");
    expect(header(mock.calls[1]?.init, "Authorization")).toBe("Bearer token_123");
    expect(header(mock.calls[1]?.init, "Content-Type")).toBe(
      "application/octet-stream",
    );
    expect(header(mock.calls[1]?.init, "Content-Length")).toBe("5");
    expect(Array.from(new Uint8Array(mock.calls[1]?.rawBody as ArrayBuffer))).toEqual([
      104, 101, 108, 108, 111,
    ]);
  });

  it("rejects oversized writes before fetch", async () => {
    const { sandbox, mock } = await createSandbox([]);

    const error = await sandbox.files
      .write("/tmp/big.bin", new Uint8Array(MAX_SANDBOX_FILE_BYTES + 1))
      .catch(error => error);

    expect(error).toBeInstanceOf(SandboxFileTooLargeError);
    expect(mock.calls).toHaveLength(1);
  });

  it("reads byte ranges", async () => {
    const { sandbox, mock } = await createSandbox([
      new Response(new Uint8Array([2, 3, 4]), {
        status: 206,
        headers: fileHeaders({ size: 3 }),
      }),
    ]);

    const bytes = await sandbox.files.read("/tmp/blob.bin", {
      offset: 2,
      length: 3,
    });

    expect(Array.from(bytes)).toEqual([2, 3, 4]);
    expect(mock.calls[1]?.init?.method).toBe("GET");
    expect(header(mock.calls[1]?.init, "Range")).toBe("bytes=2-4");
  });

  it("decodes text reads", async () => {
    const { sandbox } = await createSandbox([
      new Response(new TextEncoder().encode("hello"), {
        status: 200,
        headers: fileHeaders(),
      }),
    ]);

    await expect(sandbox.files.readText("/tmp/hello.txt")).resolves.toBe("hello");
  });

  it("parses info headers and returns null for missing files", async () => {
    const { sandbox, mock } = await createSandbox([
      new Response(null, { status: 200, headers: fileHeaders({ size: 12 }) }),
      new Response(null, { status: 404 }),
    ]);

    await expect(sandbox.files.info("/tmp/hello.txt")).resolves.toEqual({
      path: "/tmp/hello.txt",
      size: 12,
      mode: "0644",
      modifiedAt,
      type: "FILE",
    });
    await expect(sandbox.files.info("/tmp/missing.txt")).resolves.toBeNull();
    expect(mock.calls[1]?.init?.method).toBe("HEAD");
  });

  it("checks existence through info", async () => {
    const { sandbox } = await createSandbox([
      new Response(null, { status: 200, headers: fileHeaders() }),
      new Response(null, { status: 404 }),
    ]);

    await expect(sandbox.files.exists("/tmp/hello.txt")).resolves.toBe(true);
    await expect(sandbox.files.exists("/tmp/missing.txt")).resolves.toBe(false);
  });

  it("throws for missing reads and removes", async () => {
    const { sandbox } = await createSandbox([
      new Response(JSON.stringify({ error: "File not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
      new Response(null, { status: 404 }),
    ]);

    await expect(sandbox.files.read("/tmp/missing.txt")).rejects.toBeInstanceOf(
      SandboxFileNotFoundError,
    );
    await expect(sandbox.files.remove("/tmp/missing.txt")).rejects.toBeInstanceOf(
      SandboxFileNotFoundError,
    );
  });

  it("removes files through HTTP DELETE", async () => {
    const { sandbox, mock } = await createSandbox([
      new Response(null, { status: 204 }),
    ]);

    await sandbox.files.remove("/tmp/hello.txt");

    expect(mock.calls[1]?.init?.method).toBe("DELETE");
  });

  it("lists one directory level through exec", async () => {
    const { sandbox, mock } = await createSandbox([
      new Response(null, {
        status: 200,
        headers: fileHeaders({ size: 4096, mode: "0755", type: "DIRECTORY" }),
      }),
      {
        data: {
          sandboxExec: {
            exitCode: -1,
            stdout: "a.txt|f|5|1778630400.0000000000\nsub|d|4096|1778630401.0000000000\n",
            stderr: "",
            truncated: false,
            timedOut: false,
          },
        },
      },
    ]);

    const entries = await sandbox.files.list("/tmp");

    expect(mock.calls[2]?.body.variables).toMatchObject({
      id: "sandbox_123",
      command: "find '/tmp' -mindepth 1 -maxdepth 1 -printf '%f|%y|%s|%T@\\n'",
      timeoutSec: 60,
    });
    expect(entries).toEqual([
      {
        name: "a.txt",
        path: "/tmp/a.txt",
        size: 5,
        modifiedAt: "2026-05-13T00:00:00.000Z",
        type: "FILE",
      },
      {
        name: "sub",
        path: "/tmp/sub",
        size: 4096,
        modifiedAt: "2026-05-13T00:00:01.000Z",
        type: "DIRECTORY",
      },
    ]);
  });

  it("verifies move after exec because exit code can be -1", async () => {
    const { sandbox, mock } = await createSandbox([
      new Response(null, { status: 200, headers: fileHeaders() }),
      new Response(null, { status: 404 }),
      {
        data: {
          sandboxExec: {
            exitCode: -1,
            stdout: "",
            stderr: "",
            truncated: false,
            timedOut: false,
          },
        },
      },
      new Response(null, { status: 200, headers: fileHeaders() }),
      new Response(null, { status: 404 }),
    ]);

    await expect(sandbox.files.move("/tmp/a.txt", "/tmp/b.txt")).resolves
      .toMatchObject({ path: "/tmp/b.txt" });
    expect(mock.calls[3]?.body.variables).toMatchObject({
      command: "mv '/tmp/a.txt' '/tmp/b.txt'",
    });
  });

  it("verifies makeDir after exec because exit code can be -1", async () => {
    const { sandbox, mock } = await createSandbox([
      {
        data: {
          sandboxExec: {
            exitCode: -1,
            stdout: "",
            stderr: "",
            truncated: false,
            timedOut: false,
          },
        },
      },
      new Response(null, {
        status: 200,
        headers: fileHeaders({ size: 4096, mode: "0755", type: "DIRECTORY" }),
      }),
    ]);

    await expect(sandbox.files.makeDir("/tmp/nested")).resolves.toMatchObject({
      path: "/tmp/nested",
      type: "DIRECTORY",
    });
    expect(mock.calls[1]?.body.variables).toMatchObject({
      command: "mkdir -p '/tmp/nested'",
    });
  });
});

describe("Sandbox tree", () => {
  it("builds a loggable tree through exec", async () => {
    const { sandbox, mock } = await createSandbox([
      new Response(null, {
        status: 200,
        headers: fileHeaders({ size: 4096, mode: "0755", type: "DIRECTORY" }),
      }),
      {
        data: {
          sandboxExec: {
            exitCode: -1,
            stdout: "dir|d|4096|1778630400.0000000000\ndir/file.txt|f|3|1778630401.0000000000\n",
            stderr: "",
            truncated: false,
            timedOut: false,
          },
        },
      },
    ]);

    const tree = await sandbox.tree({ path: "/tmp", depth: 2 });

    expect(mock.calls[2]?.body.variables).toMatchObject({
      command: "find '/tmp' -mindepth 1 -maxdepth 2 -printf '%P|%y|%s|%T@\\n'",
    });
    expect(tree.root.children[0]?.children[0]).toMatchObject({
      name: "file.txt",
      path: "/tmp/dir/file.txt",
      type: "FILE",
    });
    expect(tree.toString()).toBe("tmp/\n└── dir/\n    └── file.txt");
  });
});
