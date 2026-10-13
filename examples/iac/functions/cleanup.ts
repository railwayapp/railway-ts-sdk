// Source of the `nightly-cleanup` function in ../function.ts. Railway runs it
// with Bun on the cron schedule declared there; `process.env.DATABASE_URL`
// comes from the `env` block on the service.
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

console.log(`cleaning up stale rows in ${new URL(databaseUrl).hostname}`);
