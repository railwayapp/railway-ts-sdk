import { defineRailway, github, project, redis, service } from "railway/iac";

export default defineRailway(() => {
  const queue = redis("queue");

  return project("background-workers", {
    environments: ["production"],
    services: [
      queue,

      service("worker", {
        source: github("acme/background-workers"),
        build: "pnpm build",
        start: "pnpm worker:start",
        regions: {
          "us-west1": 4,
        },
        env: {
          QUEUE_URL: queue.url(),
          WORKER_CONCURRENCY: "8",
        },
      }),

      service("scheduler", {
        source: github("acme/background-workers"),
        build: "pnpm build",
        start: "pnpm jobs:nightly",
        deploy: {
          cronSchedule: "0 2 * * *",
          restartPolicyType: "NEVER",
        },
        env: {
          QUEUE_URL: queue.url(),
        },
      }),
    ],
  });
});
