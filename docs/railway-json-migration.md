# Migrating from railway.json to Railway configuration

Railway has two configuration-as-code surfaces:

- existing service-level config files: `railway.json` / `railway.toml`
- project-level Railway configuration: `.railway/railway.ts`

For v0, a service cannot be managed by both at the same time.

## Why both cannot manage one service

`railway.json` is loaded from a service's source repository during deploy. Fields from that file intentionally override dashboard-edited service config to prevent drift.

`.railway/railway.ts` plans and applies service config through Railway's project configuration flow.

If both systems manage the same service, Railway would have two sources of truth for fields like:

- build command
- start command
- healthchecks
- deploy settings
- variables declared in config files
- regions / replicas
- networking-related deploy configuration

That is unsafe, so Railway blocks `.railway/railway.ts` plans for services that are already managed by `railway.json` / `railway.toml`.

## What users will see

If a targeted service is already managed by repo config, `railway config plan` reports an error before applying anything:

```txt
Railway configuration

Error resources.service.web.configFile: web is already managed by railway.json. Remove or migrate the repo config before managing this service from .railway/railway.ts.
```

## Recommended migration path

1. Pull current Railway state:

   ```bash
   railway config pull --force
   ```

2. Open `.railway/railway.ts` and find the service currently using `railway.json`.

3. Move the service intent from `railway.json` into `.railway/railway.ts`.

   Example `railway.json`:

   ```json
   {
     "build": { "buildCommand": "pnpm build" },
     "deploy": {
       "startCommand": "pnpm start",
       "healthcheckPath": "/health"
     }
   }
   ```

   Equivalent `.railway/railway.ts`:

   ```ts
   const web = service("web", {
     build: "pnpm build",
     start: "pnpm start",
     healthcheck: "/health",
   });
   ```

4. Remove `railway.json` / `railway.toml` from that service source, or stop pointing the service at that config file.

5. Run:

   ```bash
   railway config plan
   ```

6. If the plan is correct, apply:

   ```bash
   railway config apply
   ```

## Rollback

To keep using `railway.json`, remove that service from `.railway/railway.ts` or leave its config fields out of Railway configuration.

The rule is simple: one service config field should have one owner.

## Future improvements

Future CLI releases should make this smoother with an explicit migration command, for example:

```bash
railway config migrate railway-json
```

That command could read local `railway.json`, generate idiomatic `.railway/railway.ts`, and guide users through removing the old config file.
