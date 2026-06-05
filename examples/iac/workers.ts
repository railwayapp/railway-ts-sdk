import { defineRailway, github, project, redis, service } from "railway/iac";

export default defineRailway(() => {
  const queue = redis("queue");

  return project("background-workers", {
    resources: [
      queue,

      service("worker", {
        source: github("acme/background-workers"),
        build: "pnpm build",
        start: "pnpm worker:start",
        replicas: {
          "us-west1": 4,
        },
        env: {
          QUEUE_URL: queue.env.REDIS_URL,
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
          QUEUE_URL: queue.env.REDIS_URL,
        },
      }),
    ],
  });
});
