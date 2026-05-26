# Railway Project State architecture

```mermaid
%%{init: {"flowchart": {"curve": "basis", "nodeSpacing": 60, "rankSpacing": 90}}}%%
flowchart TB
  subgraph Today[Today: SDK prototype proves the data flow]
    direction TB

    subgraph A[Authoring]
      direction LR
      TS["TypeScript IaC<br/>.railway/railway.ts"]
      Other["Web / CLI / Templates<br/>MCP / Diagnosis / Agents"]
    end

    subgraph B[Shared project-state model]
      direction LR
      Eval["Evaluate / normalize<br/>read-only"]
      Graph["RailwayGraph v1<br/>deterministic project intent"]
      ChangeSet["RailwayChangeSet v0<br/>intent-level changes"]
    end

    subgraph Side[Graph consumers]
      direction LR
      Types["Generated types<br/>graph-types.d.ts"]
      Runtime["Runtime context<br/>project.service('api')"]
    end

    subgraph C[Current bridge]
      direction LR
      Adapter["Prototype adapter<br/>ChangeSet → EnvironmentConfig patch"]
      Patch["EnvironmentConfig patch<br/>existing substrate shape"]
    end

    subgraph D[Backboard today]
      direction LR
      Stage["environmentStageChanges"]
      Commit["environmentPatchCommitStaged"]
      Apply["Provision / deploy<br/>existing workflows"]
    end
  end

  subgraph Future[Future direction]
    direction LR
    Protocol["One project-state protocol<br/>for all producers"]
    Receiver["Backboard accepts RailwayChangeSet<br/>validate + authorize + realize"]
  end

  TS --> Eval --> Graph --> ChangeSet --> Adapter --> Patch --> Stage --> Commit --> Apply
  Other -. "may emit graph or changes" .-> ChangeSet
  Graph --> Types
  Graph --> Runtime

  Protocol -. "standardizes" .-> ChangeSet
  ChangeSet -. "future direct receiver" .-> Receiver
  Receiver -. "realizes through platform workflows" .-> Apply
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
