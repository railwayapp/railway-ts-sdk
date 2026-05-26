# Railway Project State architecture

```mermaid
flowchart LR
  subgraph A[Authoring surfaces]
    TS["TypeScript IaC<br/>.railway/railway.ts"]
    Other["Web / CLI / Templates<br/>MCP / Diagnosis / Agents"]
  end

  subgraph B[Shared project-state model]
    Eval["Evaluate / normalize<br/>read-only"]
    Graph["RailwayGraph v1<br/>deterministic project intent"]
    Types["Generated types<br/>graph-types.d.ts"]
    Runtime["Runtime context<br/>project.service('api')"]
    ChangeSet["RailwayChangeSet v0<br/>intent-level changes"]
  end

  subgraph C[Current bridge]
    Adapter["Prototype adapter<br/>ChangeSet → EnvironmentConfig patch"]
    Patch["EnvironmentConfig patch<br/>existing substrate shape"]
  end

  subgraph D[Backboard today]
    Stage["environmentStageChanges"]
    Commit["environmentPatchCommitStaged"]
    Apply["Provision / deploy<br/>existing workflows"]
  end

  subgraph E[Future platform direction]
    Receiver["Backboard accepts RailwayChangeSet<br/>validate + authorize + realize"]
    Protocol["One project-state protocol<br/>for all producers"]
  end

  TS --> Eval --> Graph --> ChangeSet
  Other -. "may emit graph or changes" .-> ChangeSet

  Graph --> Types
  Graph --> Runtime

  ChangeSet --> Adapter --> Patch --> Stage --> Commit --> Apply

  ChangeSet -. "future direct path" .-> Receiver --> Apply
  Protocol -. "standardizes" .-> ChangeSet
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
