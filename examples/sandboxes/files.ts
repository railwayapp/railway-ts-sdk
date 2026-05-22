import {
  Sandbox,
  type SandboxFileInfo,
  type SandboxFileListEntry,
  type SandboxInstance,
} from "../../src/index.ts";
import {
  exampleSandboxName,
  sandboxConfigFromEnv,
  runExample,
} from "./helpers.js";
import {
  action,
  code,
  demoTitle,
  detail,
  field,
  muted,
  path as colorPath,
  section,
} from "./output.js";

await runExample(async () => {
  const client = new Sandbox(sandboxConfigFromEnv());
  let sandbox: SandboxInstance | undefined;

  try {
    sandbox = await client.create({ name: exampleSandboxName("files") });

    const root = `/tmp/railway-sdk-files-${Date.now()}`;
    const textPath = `${root}/hello.txt`;
    const nestedDir = `${root}/nested`;
    const nestedPath = `${nestedDir}/hello.txt`;
    const binaryPath = `${root}/bytes.bin`;

    demoTitle("Railway Sandbox Files");
    field("sandbox", sandbox.id);
    field("root", colorPath(root));

    section("Missing file");
    field(`info(${relativePath(textPath, root)})`, await sandbox.files.info(textPath));
    field(`exists(${relativePath(textPath, root)})`, await sandbox.files.exists(textPath));

    section("Text write/read");
    await sandbox.files.makeDir(nestedDir);
    const textInfo = await sandbox.files.write(
      textPath,
      "hello from Railway sandbox files",
    );
    action(`write ${relativePath(textPath, root)}`, formatInfo(textInfo));
    action("readText", code(JSON.stringify(await sandbox.files.readText(textPath))));

    section("Binary + range");
    const binary = new Uint8Array([
      0, 1, 2, 3, 4, 250, 251, 252, 253, 254, 255,
    ]);
    const binaryInfo = await sandbox.files.write(binaryPath, binary);
    assertBytesEqual(await sandbox.files.read(binaryPath), binary);

    const range = await sandbox.files.read(binaryPath, {
      offset: 3,
      length: 4,
    });
    assertBytesEqual(range, binary.slice(3, 7));
    action(`write ${relativePath(binaryPath, root)}`, formatInfo(binaryInfo));
    action("read full", `${binary.byteLength} bytes match`);
    action("read 3..6", `[${Array.from(range).join(", ")}]`);

    section("List + move");
    field("list", colorPath(relativePath(root, root)));
    for (const entry of await sandbox.files.list(root)) {
      detail("", formatEntry(entry, root));
    }

    await sandbox.files.move(textPath, nestedPath);
    action(
      "move",
      `${colorPath(relativePath(textPath, root))} → ${colorPath(relativePath(nestedPath, root))}`,
    );
    action(
      "read moved",
      code(JSON.stringify(await sandbox.files.readText(nestedPath))),
    );

    section("Tree");
    const tree = await sandbox.tree({ path: root, depth: 2 });
    console.log(colorPath(tree.toString()));

    section("Cleanup");
    await sandbox.files.remove(nestedPath);
    await sandbox.files.remove(binaryPath);
    action("remove", colorPath(relativePath(nestedPath, root)));
    action("remove", colorPath(relativePath(binaryPath, root)));
    field(
      `exists(${relativePath(nestedPath, root)})`,
      await sandbox.files.exists(nestedPath),
    );
  } finally {
    if (sandbox) {
      await sandbox.delete();
      field("sandbox", `${sandbox.id} ${muted("deleted")}`);
    }
  }
});

function formatInfo(info: SandboxFileInfo): string {
  return `${info.type.toLowerCase()} ${formatBytes(info.size)} mode ${info.mode}`;
}

function formatEntry(entry: SandboxFileListEntry, root: string): string {
  return `${entry.type.padEnd(9)} ${formatBytes(entry.size).padStart(7)}  ${colorPath(relativePath(entry.path, root))}`;
}

function formatBytes(size: number): string {
  return `${size.toLocaleString("en-US")} B`;
}

function relativePath(path: string, root: string): string {
  if (path === root) return ".";
  return path.startsWith(`${root}/`) ? path.slice(root.length + 1) : path;
}

function assertBytesEqual(actual: Uint8Array, expected: Uint8Array): void {
  if (actual.byteLength !== expected.byteLength) {
    throw new Error(
      `byte length mismatch: got ${actual.byteLength}, expected ${expected.byteLength}`,
    );
  }

  for (const [index, byte] of actual.entries()) {
    if (byte !== expected[index]) {
      throw new Error(
        `byte mismatch at ${index}: got ${byte}, expected ${expected[index]}`,
      );
    }
  }
}
