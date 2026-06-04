import { bucket, defineRailway, github, postgres, preserve, project, redis, service } from "railway/iac";

export default defineRailway(() => {
  const Redis = redis("Redis");
  const Postgres = postgres("Postgres");
  const api = service("api", {
    source: github("futurepastori/dummy-iac-example", { branch: "victor/init-dummy-api" }),
    build: "pnpm build",
    start: "pnpm start",
    healthcheck: "/health",
    regions: { "europe-west4": 1, "us-west1": 2 },
    env: {
      DATABASE_URL: preserve(),
      NODE_ENV: preserve(),
      REDIS_URL: preserve(),
    },
  });
  const memesMedia = bucket("memes-media", { region: "sjc" });
  const collectedPierogi = bucket("collected-pierogi", { region: "sjc" });

  return project("imported-project", {
    environments: ["production"],
    services: [Redis, Postgres, api, memesMedia, collectedPierogi],
  });
});
