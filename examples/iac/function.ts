import { defineRailway, fn, postgres, project } from "railway/iac";

export default defineRailway(() => {
  const db = postgres("db");

  return project("functions", {
    resources: [
      db,

      // A Railway Function is a single file. `codeFile` is read when the
      // config is evaluated and base64-encoded into the start command of a
      // service running the function image, so there is no repository to
      // point at. Relative paths are relative to this file. The dashboard
      // shows and edits the deployed source.
      fn("hello", {
        codeFile: "./functions/hello.ts",
        domains: ["hello.example.com"],
      }),

      // The source limit (just under 96 KB) applies to the file's bytes.
      fn("nightly-cleanup", {
        codeFile: "./functions/cleanup.ts",
        deploy: { cronSchedule: "0 2 * * *", restartPolicyType: "NEVER" },
        env: { DATABASE_URL: db.env.DATABASE_URL },
      }),
    ],
  });
});
