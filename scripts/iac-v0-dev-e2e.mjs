#!/usr/bin/env node
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const cli = process.env.RAILWAY_CLI ?? `${process.env.HOME}/Railway/mono/packages/cli/target/debug/railway`;
const iacBin = process.env.RAILWAY_IAC_TS_BIN ?? join(process.cwd(), "dist/iac/bin.js");
const railwayEnv = process.env.RAILWAY_ENV ?? "dev";
const workspace = process.env.RAILWAY_WORKSPACE;
const mutating = process.env.RUN_MUTATING === "1";
const keep = process.env.KEEP_IAC_E2E === "1";

const results = [];
const env = { ...process.env, RAILWAY_ENV: railwayEnv, RAILWAY_IAC_TS_BIN: iacBin, NO_COLOR: "1" };

function run(name, args, cwd, opts = {}) {
  const res = spawnSync(cli, args, { cwd, env, encoding: "utf8", input: opts.input ?? "", timeout: opts.timeout ?? 180_000 });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`;
  const ok = opts.allowFailure ? true : res.status === 0;
  results.push({ name, ok, status: res.status, out });
  if (!ok) throw new Error(`${name} failed\n${out}`);
  return out;
}

function check(name, condition, details = "") {
  results.push({ name, ok: Boolean(condition), status: condition ? 0 : 1, out: details });
  if (!condition) throw new Error(`${name} failed${details ? `\n${details}` : ""}`);
}

function projectDir(prefix) {
  const dir = mkdtempSync(join(tmpdir(), `${prefix}-`));
  mkdirSync(join(dir, ".railway"), { recursive: true });
  return dir;
}

function writeConfig(dir, body) {
  writeFileSync(join(dir, ".railway/railway.ts"), body);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ type: "module", scripts: { build: "echo build", start: "node server.js" }, dependencies: { "@railway/sdk": "file:" + process.cwd() } }, null, 2));
}

function initRailwayProject(dir, name) {
  const args = ["init", "--name", name];
  if (workspace) args.push("--workspace", workspace);
  run(`create dev project ${name}`, args, dir, { timeout: 180_000 });
}

function planApplyNoop(dir, label) {
  const plan = run(`${label}: plan`, ["config", "plan", "--verbose"], dir);
  check(`${label}: readable diff`, !/EnvironmentConfigPatch|Backboard|ServiceInstance/.test(plan), plan);
  if (mutating) run(`${label}: apply`, ["config", "apply", "--yes"], dir, { timeout: 300_000 });
  const noop = run(`${label}: noop plan`, ["config", "plan"], dir);
  if (mutating) check(`${label}: next plan no-op`, /No changes|already configured|Changes \(0\)/i.test(noop), noop);
}

function ts(resources) {
  return `import { bucket, defineRailway, github, image, mongo, mysql, postgres, preserve, project, redis, service } from "railway/iac";\n\nexport default defineRailway(() => {\n${resources}\n});\n`;
}

async function main() {
  check("railway env is dev", railwayEnv === "dev", `RAILWAY_ENV=${railwayEnv}`);
  run("cli reachable", ["--version"], process.cwd());

  if (!mutating) {
    console.log("RUN_MUTATING=1 not set; skipping project-create/apply matrix. Set RAILWAY_WORKSPACE if your dev account has multiple workspaces.");
  }

  const serviceCases = [
    ["github-source", `  const web = service("web", { source: github("railwayapp-templates/expressjs", { branch: "main" }) });\n  return project("iac-e2e-github", { services: [web] });`],
    ["image-source", `  const web = service("web", { source: image("nginx:latest") });\n  return project("iac-e2e-image", { services: [web] });`],
    ["empty-build-start-health", `  const web = service("web", { build: "pnpm build", start: "pnpm start", healthcheck: "/health", healthcheckTimeout: 30 });\n  return project("iac-e2e-empty", { services: [web] });`],
    ["regions-replicas", `  const web = service("web", { regions: { "us-west2": 1, "europe-west4": 1 } });\n  return project("iac-e2e-regions", { services: [web] });`],
    ["env-and-preserve", `  const web = service("web", { env: { LITERAL: "hello", COUNT: "1", ENABLED: "true", SECRET: preserve() } });\n  return project("iac-e2e-env", { services: [web] });`],
    ["db-refs", `  const db = postgres("postgres");\n  const cache = redis("redis");\n  const web = service("web", { env: { DATABASE_URL: db.env.DATABASE_URL, REDIS_URL: cache.env.REDIS_URL } });\n  return project("iac-e2e-refs", { services: [db, cache, web] });`],
  ];

  for (const [label, source] of serviceCases) {
    const dir = projectDir(`iac-${label}`);
    writeConfig(dir, ts(source));
    if (!mutating) {
      results.push({ name: `${label}: skipped mutating matrix`, ok: true, status: 0, out: dir });
      continue;
    }
    initRailwayProject(dir, `iac-e2e-${label}-${Date.now()}`);
    planApplyNoop(dir, label);
    if (!keep) results.push({ name: `${label}: temp dir`, ok: true, status: 0, out: dir });
  }

  for (const db of ["postgres", "redis", "mysql", "mongo"]) {
    const dir = projectDir(`iac-db-${db}`);
    writeConfig(dir, ts(`  const data = ${db}("${db}");\n  const web = service("web", { env: { URL: data.env.${db === "postgres" ? "DATABASE_URL" : db === "redis" ? "REDIS_URL" : db === "mysql" ? "MYSQL_URL" : "MONGO_URL"} } });\n  return project("iac-e2e-${db}", { services: [data, web] });`));
    if (!mutating) {
      results.push({ name: `database ${db}: skipped mutating matrix`, ok: true, status: 0, out: dir });
      continue;
    }
    initRailwayProject(dir, `iac-e2e-db-${db}-${Date.now()}`);
    planApplyNoop(dir, `database ${db}`);
  }

  const bucketDir = projectDir("iac-bucket");
  writeConfig(bucketDir, ts(`  const media = bucket("media", { region: "iad" });\n  return project("iac-e2e-bucket", { services: [media] });`));
  if (mutating) {
    initRailwayProject(bucketDir, `iac-e2e-bucket-${Date.now()}`);
    planApplyNoop(bucketDir, "bucket create");
    writeConfig(bucketDir, ts(`  const media = bucket("media", { region: "sjc" });\n  return project("iac-e2e-bucket", { services: [media] });`));
    planApplyNoop(bucketDir, "bucket update");
  } else {
    results.push({ name: "bucket matrix: skipped mutating matrix", ok: true, status: 0, out: bucketDir });
  }

  const errorDir = projectDir("iac-error");
  writeFileSync(join(errorDir, ".railway/railway.ts"), "export default nope(;");
  const syntax = run("invalid syntax errors cleanly", ["config", "plan"], errorDir, { allowFailure: true });
  check("invalid syntax no giant stack", !/at .*\n.*at .*\n.*at /.test(syntax), syntax);

  console.log("\nIaC dev e2e summary");
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
}

main().catch((error) => {
  console.error(error.message);
  console.log("\nPartial summary");
  for (const r of results) console.log(`${r.ok ? "✓" : "✗"} ${r.name}`);
  process.exit(1);
});
