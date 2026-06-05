import { defineRailway, github, project, service } from "railway/iac";

export default defineRailway(() =>
  project("minimal-web", {
    resources: [
      service("web", {
        source: github("acme/minimal-web"),
        build: "pnpm build",
        start: "pnpm start",
        healthcheck: "/health",
        env: {
          NODE_ENV: "production",
        },
      }),
    ],
  }),
);
