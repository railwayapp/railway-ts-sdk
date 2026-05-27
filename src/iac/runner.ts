import { evaluateRailwayProject, findRailwayFile } from "./project.js";
import { validateGraph } from "./graph.js";
import { renderRailwayGraphTypes } from "./typegen.js";
import type { RailwayGraph } from "./graph.js";

export interface RailwayIacRunnerRequest {
  command?: "evaluate" | "typegen";
  cwd?: string;
  file?: string;
  includeTypes?: boolean;
  pretty?: boolean;
}

export interface RailwayIacRunnerDiagnostic {
  severity: "warning" | "error";
  path: string;
  message: string;
}

export interface RailwayIacEvaluateResponse {
  ok: boolean;
  command: "evaluate";
  file: string;
  graph?: RailwayGraph;
  graphTypes?: string;
  diagnostics: RailwayIacRunnerDiagnostic[];
}

export interface RailwayIacTypegenResponse {
  ok: boolean;
  command: "typegen";
  file: string;
  graphTypes?: string;
  diagnostics: RailwayIacRunnerDiagnostic[];
}

export type RailwayIacRunnerResponse = RailwayIacEvaluateResponse | RailwayIacTypegenResponse;

export async function runRailwayIac(request: RailwayIacRunnerRequest = {}): Promise<RailwayIacRunnerResponse> {
  const command = request.command ?? "evaluate";
  const cwd = request.cwd ?? process.cwd();
  const file = request.file ?? await findRailwayFile(cwd);

  try {
    const evaluated = await evaluateRailwayProject({ file });
    const diagnostics = graphDiagnostics(evaluated.graph);
    const ok = diagnostics.every(diagnostic => diagnostic.severity !== "error");

    if (command === "typegen") {
      return {
        ok,
        command,
        file: evaluated.file,
        graphTypes: renderRailwayGraphTypes(evaluated.graph),
        diagnostics,
      };
    }

    return {
      ok,
      command: "evaluate",
      file: evaluated.file,
      graph: evaluated.graph,
      ...(request.includeTypes ? { graphTypes: renderRailwayGraphTypes(evaluated.graph) } : {}),
      diagnostics,
    };
  } catch (error) {
    return {
      ok: false,
      command,
      file,
      diagnostics: [{ severity: "error", path: "", message: error instanceof Error ? error.message : String(error) }],
    };
  }
}

function graphDiagnostics(graph: RailwayGraph): RailwayIacRunnerDiagnostic[] {
  return validateGraph(graph).map(message => ({ severity: "error", path: "graph", message }));
}
