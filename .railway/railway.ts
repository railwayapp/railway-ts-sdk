import { defineRailway, fn, github, preserve, project } from "railway/iac";

/**
 * Dogfood: the IaC SDK's own live e2e runner, provisioned with the IaC SDK.
 *
 * Deploy this into a DEDICATED runner project — NOT the throwaway the e2e
 * targets, so the runner can't fight its own test environment. Set these as
 * Railway variables on the service; they're preserve()d here so this file
 * never carries secrets:
 *   RAILWAY_API_TOKEN       project token scoped to the e2e throwaway project
 *   RAILWAY_ENVIRONMENT_ID  the e2e throwaway environment id
 *
 * The committed live suite is read-only (`current`), so this is safe to run
 * unattended. Wire failure notification (e.g. a Slack webhook) before relying
 * on it as a canary — a silent red cron is worse than none.
 */
export default defineRailway(() =>
  project("railway-ts-sdk-e2e", {
    resources: [
      fn("iac-e2e", {
        source: github("railwayapp/railway-ts-sdk"),
        start: "pnpm exec vitest run tests/*.e2e.test.ts",
        deploy: { cronSchedule: "0 7 * * *" }, // nightly, 07:00 UTC
        env: {
          RAILWAY_API_TOKEN: preserve(),
          RAILWAY_ENVIRONMENT_ID: preserve(),
          RAILWAY_AUTH_TYPE: "project-token",
          RAILWAY_GRAPHQL_ENDPOINT: "https://backboard.railway.app/graphql/v2",
        },
      }),
    ],
  }),
);
