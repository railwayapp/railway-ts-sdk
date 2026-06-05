import {
  bucket,
  defineRailway,
  github,
  postgres,
  project,
  service,
} from "railway/iac";

export default defineRailway(() => {
  const db = postgres("Postgres");
  const uploads = bucket("uploads");

  return project("api-with-data", {
    resources: [
      db,
      uploads,

      service("api", {
        source: github("acme/api", { rootDirectory: "apps/api" }),
        build: "pnpm --filter api build",
        start: "pnpm --filter api start",
        healthcheck: "/health",
        regions: {
          "us-west1": { replicas: 2 },
        },
        domains: [{ domain: "api.example.com", port: 3000 }],
        env: {
          NODE_ENV: "production",
          DATABASE_URL: db.env.DATABASE_URL,
          S3_BUCKET: "uploads",
          SESSION_SECRET: { generator: "secret(32)", isSealed: true },
        },
      }),
    ],
  });
});
