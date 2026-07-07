import { parse } from "graphql";

import { normalizeRailwayClientConfig } from "../../src/core/config.js";
import { requestGraphQL } from "../../src/core/graphql-client.js";
import { flags } from "../../dist/index.js";
import { runExample } from "./helpers.ts";

await runExample(async () => {
  const workspaceId = await resolveWorkspaceId();
  await flags.init({ scope: { workspaceId } });

  if (flags.getBoolean("checkout.v2", { plan: "pro" })) {
    console.log("checkout.v2 enabled for pro users");
  }

  console.log(`theme=${flags.getString("theme")}`);
  flags.close();
});

async function resolveWorkspaceId(): Promise<string> {
  const explicit = process.env.RAILWAY_FLAGS_WORKSPACE_ID;
  if (explicit != null && explicit !== "") {
    return explicit;
  }

  const config = normalizeRailwayClientConfig({});
  const document = parse(`
    query FlagsExampleApiToken {
      apiToken {
        workspaces {
          id
          name
        }
      }
    }
  `);
  const data = await requestGraphQL(config, document as never, {});
  const workspaces = (data as { apiToken?: { workspaces?: Array<{ id: string; name: string }> } })
    .apiToken?.workspaces;
  const railway = workspaces?.find((workspace) => workspace.name === "Railway");
  if (railway != null) {
    return railway.id;
  }
  if (workspaces?.length === 1) {
    return workspaces[0]!.id;
  }
  throw new Error("set RAILWAY_FLAGS_WORKSPACE_ID for tokens with multiple workspaces");
}
