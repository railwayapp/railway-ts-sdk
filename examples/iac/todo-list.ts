import { defineRailway, github, project, redis, service } from "railway/iac";

export default defineRailway(() => {
  const cache = redis("api-cache");
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
