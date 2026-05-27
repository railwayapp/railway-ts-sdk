# Railway IaC runner protocol

The official Railway CLI owns auth, project linking, environment selection, prompts, and output UX.

Language runners own source evaluation and authoring-layer ChangeSet composition.

For TypeScript IaC, the package binary is:

```bash
railway-iac-ts
```

## Commands

| Command | Auth required | Output |
| --- | --- | --- |
| `evaluate` | No | desired `RailwayGraph` from `.railway/railway.ts` |
| `typegen` | No | generated TypeScript graph types |
| `plan` | Yes | current graph, desired graph, proposed `RailwayChangeSet` |
| `stage` | Yes | `plan` plus staged Backboard patch id/payload |

## Request shape

The CLI may pass request JSON over stdin, argv, or both. Argv wins over stdin.

```ts
type RailwayIacRunnerRequest = {
  command?: "evaluate" | "typegen" | "plan" | "stage";
  cwd?: string;
  file?: string;
  includeTypes?: boolean;
  pretty?: boolean;
  backboard?: {
    endpoint?: string;
    token?: string;
    projectId?: string;
    environmentId?: string;
    decryptVariables?: boolean;
    merge?: boolean;
  };
};
```

## CLI → TS runner examples

Static evaluation:

```bash
railway-iac-ts evaluate --file .railway/railway.ts
```

Plan with CLI auth/context:

```bash
railway-iac-ts plan \
  --file .railway/railway.ts \
  --endpoint https://backboard.railway.com/graphql/v2 \
  --token "$RAILWAY_TOKEN" \
  --project-id "$RAILWAY_PROJECT_ID" \
  --environment-id "$RAILWAY_ENVIRONMENT_ID"
```

Stdin form:

```bash
printf '%s' '{
  "command": "plan",
  "file": ".railway/railway.ts",
  "backboard": {
    "endpoint": "https://backboard.railway.com/graphql/v2",
    "token": "rw_...",
    "projectId": "...",
    "environmentId": "..."
  }
}' | railway-iac-ts
```

## Response shape

All responses are JSON and include:

```ts
type BaseResponse = {
  ok: boolean;
  command: string;
  file: string;
  diagnostics: Array<{
    severity: "warning" | "error";
    path: string;
    message: string;
  }>;
};
```

`plan` returns:

```ts
type PlanResponse = BaseResponse & {
  command: "plan";
  mode: "real";
  currentGraph: RailwayGraph;
  desiredGraph: RailwayGraph;
  currentConfig: EnvironmentConfig; // temporary bridge artifact
  currentEnvironment: {
    projectId?: string;
    projectName?: string;
    environmentId: string;
    environmentName?: string;
    serviceNamesById: Record<string, string>;
    bucketNamesById: Record<string, string>;
  };
  changeSet: RailwayChangeSet;
  diff: string;
};
```

`stage` returns the same plan plus:

```ts
stagedPatch: {
  id: string;
  patch: EnvironmentConfig;
};
```

## Ownership boundaries

The TS runner:

- reads/evaluates `.railway/railway.ts`
- builds desired `RailwayGraph`
- queries Backboard current state using CLI-provided auth/context
- imports current state into current `RailwayGraph`
- diffs current vs desired
- emits proposed `RailwayChangeSet`

The official Rust CLI:

- provides auth/context
- invokes the runner
- displays preview
- asks confirmations
- submits/stages/applies as product UX requires

Backboard:

- owns current project truth
- validates/canonicalizes ChangeSets
- resolves IDs/references
- realizes resources through platform workflows
- stages/applies changes

`currentConfig` and staged patch output are temporary alpha bridge artifacts. They should not become authoring-layer API.
