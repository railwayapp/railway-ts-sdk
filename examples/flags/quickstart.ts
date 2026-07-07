/**
 * Minimal flags quickstart. Requires RAILWAY_API_TOKEN in `.env`.
 *
 * On Railway, `RAILWAY_PROJECT_ID` is set automatically for project-scoped flags.
 * For workspace-scoped registries:
 *   await flags.init({ scope: { workspaceId: "<workspace-id>" } });
 */
import { flags } from "../../src/index.ts";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  await flags.init();

  if (flags.getBoolean("checkout-v2", { key: "user-123", plan: "pro" })) {
    console.log("checkout-v2 enabled");
  }

  flags.close();
});
