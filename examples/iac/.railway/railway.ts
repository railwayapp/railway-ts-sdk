import { defineRailway, github, project, redis, service, type DatabaseNode } from "../../../src/iac/index.ts";

export default defineRailway(() => {
  // Existing Railway Redis imported from the live project.
  // Keeping this authored handle aligned prevents the demo ChangeSet from
  // treating the already-provisioned database as drift to delete/recreate.
  const cache = redis("Redis") as DatabaseNode & { url: () => { type: "reference"; resource: "database.Redis"; output: "REDIS_URL" } };
  cache.image = "redis:8.2.1";

  const repo = "futurepastori/todo-iac-example";

  return project("todo-list", {
    environments: ["production"],
    services: [
      cache,

      service("backend", {
        source: github(repo, { rootDirectory: "apps/backend" }),
        build: "pnpm install --frozen-lockfile && pnpm --filter backend build",
        start: "pnpm --filter backend start",
        healthcheck: "/health",
        env: {
          PORT: "3000",
          REDIS_URL: cache.url(),
          CORS_ORIGIN: "${{frontend.RAILWAY_PUBLIC_DOMAIN}}",
        },
      }),

      service("frontend", {
        source: github(repo, { rootDirectory: "apps/frontend" }),
        build: "pnpm install --frozen-lockfile && pnpm --filter frontend build",
        start: "pnpm --filter frontend preview -- --port ${PORT:-4173}",
        preDeploy: "pnpm --filter frontend generate-sitemap",
        regions: {
          "us-west1": 3,
          "europe-west4": 2,
        },
        env: {
          VITE_API_URL: "https://${{backend.RAILWAY_PUBLIC_DOMAIN}}",
        },
      }),
    ],
  });
});
