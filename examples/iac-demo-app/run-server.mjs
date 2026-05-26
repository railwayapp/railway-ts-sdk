#!/usr/bin/env node
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
  stdio: "inherit",
  cwd: import.meta.dirname,
});

child.on("exit", code => {
  process.exit(code ?? 0);
});
