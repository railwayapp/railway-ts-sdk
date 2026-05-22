import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, rmSync, renameSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const tempDir = mkdtempSync(join(tmpdir(), "railway-package-"));
let tarballPath: string | undefined;

try {
  const packOutput = run("npm", ["pack", "--json"], { cwd: root });
  const [packedPackage] = JSON.parse(packOutput) as Array<{ filename: string }>;
  if (!packedPackage) throw new Error("npm pack did not return a package.");
  tarballPath = join(root, packedPackage.filename);

  const nodeModules = join(tempDir, "node_modules");
  mkdirSync(nodeModules, { recursive: true });
  run("tar", ["-xzf", tarballPath, "-C", tempDir]);
  renameSync(join(tempDir, "package"), join(nodeModules, "railway"));

  linkNodeModule("graphql");
  linkNodeModule("@graphql-typed-document-node/core");

  writeFileSync(
    join(tempDir, "esm.mjs"),
    `import { Sandbox } from "railway";\nif (typeof Sandbox !== "function") throw new Error("Sandbox missing");\n`,
  );
  run(process.execPath, [join(tempDir, "esm.mjs")]);

  writeFileSync(
    join(tempDir, "cjs.cjs"),
    `const { Sandbox } = require("railway");\nif (typeof Sandbox !== "function") throw new Error("Sandbox missing");\n`,
  );
  run(process.execPath, [join(tempDir, "cjs.cjs")]);

  writeFileSync(
    join(tempDir, "consumer.ts"),
    `import { Sandbox, type SandboxConfig, type SandboxInstance } from "railway";\n\nconst config: SandboxConfig = {\n  token: "token_123",\n  projectId: "project_123",\n  environmentId: "environment_123",\n  fetch: async () => new Response(JSON.stringify({ data: { sandboxCreate: {} } })),\n};\n\nconst client = new Sandbox(config);\nconst created: Promise<SandboxInstance> = client.create();\nvoid created;\n`,
  );
  writeFileSync(
    join(tempDir, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2023",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          skipLibCheck: true,
          lib: ["ES2023", "DOM", "DOM.Iterable"],
          noEmit: true,
        },
        include: ["consumer.ts"],
      },
      null,
      2,
    ),
  );
  run(process.execPath, [
    join(root, "node_modules", "typescript", "bin", "tsc"),
    "-p",
    join(tempDir, "tsconfig.json"),
  ]);
} finally {
  if (tarballPath) rmSync(tarballPath, { force: true });
  rmSync(tempDir, { force: true, recursive: true });
}

function linkNodeModule(name: string): void {
  const source = join(root, "node_modules", ...name.split("/"));
  const target = join(tempDir, "node_modules", ...name.split("/"));
  mkdirSync(dirname(target), { recursive: true });
  symlinkSync(source, target, "dir");
}

function run(
  command: string,
  args: string[],
  options: { cwd?: string } = {},
): string {
  return execFileSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}
