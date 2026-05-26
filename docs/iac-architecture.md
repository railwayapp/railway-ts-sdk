# Railway Project State architecture

```mermaid
flowchart TD
  subgraph Producers[Authoring / intent producers]
    TS["TypeScript IaC<br/>.railway/railway.ts"]
    Web["Web UI<br/>forms/actions"]
    CLI["Railway CLI<br/>commands"]
    Templates["Templates"]
    MCP["MCP tools"]
    Diagnosis["Diagnosis<br/>suggested fixes"]
    Chat["Chat / agents"]
  end

  subgraph SDK["railway-ts-sdk prototype"]
    Eval["evaluateRailwayProject()<br/>read-only evaluation"]
    Graph["RailwayGraph v1<br/>deterministic project-state intermediate representation"]
    Typegen["graph-types.d.ts<br/>autocomplete for graph lookups"]
    RuntimeCtx["Evaluated project context<br/>project.service('api')"]
    Diff["diffGraphs()"]
    ChangeSet["RailwayChangeSet v0<br/>intent-level operations"]
    Render["render / validate<br/>preview + diagnostics"]
    PatchAdapter["changeSetToEnvironmentPatch()<br/>prototype adapter"]
    EnvPatch["EnvironmentConfig patch<br/>existing patch substrate shape"]
  end

  subgraph Runtime["Runtime SDK"]
    Sandbox["Sandboxes / ephemeral compute<br/>what should happen now?"]
  end

  subgraph Backboard["Backboard today / near future"]
    Stage["environmentStageChanges"]
    Commit["environmentPatchCommitStaged"]
    Provision["Provisioning / template workflows<br/>services, databases, buckets, volumes"]
    Deploy["Deploy orchestration"]
  end

  subgraph Future["Desired platform convergence"]
    BackboardChangeSet["Backboard accepts RailwayChangeSet<br/>validate + authorize + realize"]
    SharedProtocol["One project-state protocol<br/>IaC, Web, CLI, MCP, Diagnosis, Templates"]
  end

  TS --> Eval --> Graph
  Graph --> Typegen
  Graph --> RuntimeCtx
  RuntimeCtx --> Sandbox
  Graph --> Diff --> ChangeSet

  Web -. may emit .-> ChangeSet
  CLI -. may emit .-> ChangeSet
  Templates -. graph fragment or changes .-> ChangeSet
  MCP -. direct intent changes .-> ChangeSet
  Diagnosis -. suggested fixes .-> ChangeSet
  Chat -. agent edits/actions .-> ChangeSet

  ChangeSet --> Render
  ChangeSet --> PatchAdapter --> EnvPatch --> Stage --> Commit --> Deploy
  Commit --> Provision

  ChangeSet -. future direct receiver .-> BackboardChangeSet
  BackboardChangeSet --> Provision
  BackboardChangeSet --> Stage
  SharedProtocol -. embodied by .-> ChangeSet
```

## Reading the graph

Today, the SDK proves this path:

```txt
.railway/railway.ts → RailwayGraph → RailwayChangeSet → EnvironmentConfig patch
```

Backboard does **not** receive `RailwayChangeSet` yet. The current bridge compiles changesets back into the existing environment patch shape.

The intended platform direction is:

```txt
all project-state producers → RailwayChangeSet → Backboard validation/provisioning/stage/apply
```
