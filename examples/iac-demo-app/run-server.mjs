#!/usr/bin/env node
import { spawn } from "node:child_process";

const child = spawn(process.execPath, ["--import", "tsx", "server.ts"], {
  stdio: "inherit",
  cwd: import.meta.dirname,
  env: {
    ...process.env,
    // Develop/local Backboard endpoints often use Railway-internal cert chains.
    // This runner is demo-only and keeps browser tokens out of frontend requests.
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED ?? "0",
  },
});

child.on("exit", code => {
  process.exit(code ?? 0);
});
