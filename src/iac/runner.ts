import { diffGraphs, renderChangeSet, type RailwayChangeSet } from "./change-set.js";
import { environmentConfigToGraph } from "./compiler.js";
import { IacClient, type ChangeSetApplyResult, type ChangeSetPreviewResult, type CurrentEnvironmentResult } from "./client.js";
import { validateGraph, type RailwayGraph } from "./graph.js";
import { evaluateRailwayProject, findRailwayFile } from "./project.js";
import { renderRailwayGraphTypes } from "./typegen.js";
import type { EnvironmentConfig } from "./schema.js";
import type { RailwayAuthType } from "../core/config.js";

export interface RailwayIacRunnerRequest {
  command?: "evaluate" | "typegen" | "current" | "plan" | "stage" | "apply";
  cwd?: string;
  file?: string;
  includeTypes?: boolean;
  pretty?: boolean;
  backboard?: RailwayIacBackboardContext;
}

export interface RailwayIacBackboardContext {
  endpoint?: string;
  token?: string;
  authType?: RailwayAuthType;
  projectId?: string;
  environmentId?: string;
  decryptVariables?: boolean;
  merge?: boolean;
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

export interface RailwayIacCurrentResponse {
  ok: boolean;
  command: "current";
  file: string;
  mode: "real";
  currentGraph?: RailwayGraph;
  currentConfig?: EnvironmentConfig;
  currentEnvironment?: Omit<CurrentEnvironmentResult, "config">;
  graphTypes?: string;
  diagnostics: RailwayIacRunnerDiagnostic[];
}

export interface RailwayIacPlanResponse {
  ok: boolean;
  command: "plan";
  file: string;
  mode: "real";
  currentGraph?: RailwayGraph;
  desiredGraph?: RailwayGraph;
  currentConfig?: EnvironmentConfig;
  currentEnvironment?: Omit<CurrentEnvironmentResult, "config">;
  changeSet?: RailwayChangeSet;
  preview?: ChangeSetPreviewResult;
  diff?: string;
  graphTypes?: string;
  diagnostics: RailwayIacRunnerDiagnostic[];
}

export interface RailwayIacStageResponse extends Omit<RailwayIacPlanResponse, "command"> {
  command: "stage";
}

export interface RailwayIacApplyResponse extends Omit<RailwayIacStageResponse, "command"> {
  command: "apply";
  applyResult?: ChangeSetApplyResult;
  deploymentId?: string;
  stagedPatchId?: string;
}

export type RailwayIacRunnerResponse = RailwayIacEvaluateResponse | RailwayIacTypegenResponse | RailwayIacCurrentResponse | RailwayIacPlanResponse | RailwayIacStageResponse | RailwayIacApplyResponse;

export async function runRailwayIac(request: RailwayIacRunnerRequest = {}): Promise<RailwayIacRunnerResponse> {
  const command = request.command ?? "evaluate";
  const cwd = request.cwd ?? process.cwd();
  const file = request.file ?? await findRailwayFile(cwd);

  try {
    const evaluated = await evaluateRailwayProject({ file });
    const diagnostics = graphDiagnostics(evaluated.graph);

    if (command === "typegen") {
      return {
        ok: diagnostics.every(diagnostic => diagnostic.severity !== "error"),
        command,
        file: evaluated.file,
        graphTypes: renderRailwayGraphTypes(evaluated.graph),
        diagnostics,
      };
    }

    if (command === "evaluate") {
      return {
        ok: diagnostics.every(diagnostic => diagnostic.severity !== "error"),
        command,
        file: evaluated.file,
        graph: evaluated.graph,
        ...(request.includeTypes ? { graphTypes: renderRailwayGraphTypes(evaluated.graph) } : {}),
        diagnostics,
      };
    }

    if (command === "current") return await currentRailwayIac({ file: evaluated.file, desiredGraph: evaluated.graph, request, diagnostics });

    const planned = await planRailwayIac({ file: evaluated.file, desiredGraph: evaluated.graph, request, diagnostics });
    if (command === "plan") return planned;

    if (!planned.ok || !planned.changeSet || planned.changeSet.changes.length === 0) return { ...planned, command: command === "apply" ? "apply" : "stage" };
    const context = requireBackboardContext(request.backboard, command === "apply" ? "apply" : "stage");
    const client = new IacClient(clientConfig(context));
    if (command === "stage") {
      return { ...planned, command: "stage" };
    }
    const applyResult = await client.applyChangeSet({
      environmentId: context.environmentId,
      changeSet: planned.changeSet,
      commitMessage: "Apply Railway configuration",
    });
    return {
      ...planned,
      command: "apply",
      applyResult,
      ...(applyResult.deploymentId ? { deploymentId: applyResult.deploymentId } : {}),
      ...(applyResult.stagedPatchId ? { stagedPatchId: applyResult.stagedPatchId } : {}),
    };
  } catch (error) {
    return {
      ok: false,
      command: command === "apply" ? "apply" : command === "stage" ? "stage" : command === "plan" ? "plan" : command === "current" ? "current" : command === "typegen" ? "typegen" : "evaluate",
      file,
      ...(command === "plan" || command === "stage" || command === "current" ? { mode: "real" as const } : {}),
      diagnostics: [{ severity: "error", path: "", message: error instanceof Error ? error.message : String(error) }],
    } as RailwayIacRunnerResponse;
  }
}

async function currentRailwayIac({ file, desiredGraph, request, diagnostics }: {
  file: string;
  desiredGraph: RailwayGraph;
  request: RailwayIacRunnerRequest;
  diagnostics: RailwayIacRunnerDiagnostic[];
}): Promise<RailwayIacCurrentResponse> {
  const context = requireBackboardContext(request.backboard, "plan");
  const client = new IacClient(clientConfig(context));
  const current = await client.getCurrentEnvironment(
    context.environmentId,
    context.decryptVariables === undefined ? {} : { decryptVariables: context.decryptVariables },
  );
  const currentGraph = environmentConfigToGraph(current.config, {
    projectName: current.projectName ?? desiredGraph.project.name,
    serviceNamesById: current.serviceNamesById,
    bucketNamesById: current.bucketNamesById,
    customDomainsByServiceId: current.customDomainsByServiceId,
  });
  const { config: _config, ...currentEnvironment } = current;

  return {
    ok: diagnostics.every(diagnostic => diagnostic.severity !== "error"),
    command: "current",
    file,
    mode: "real",
    currentGraph,
    currentConfig: current.config,
    currentEnvironment,
    ...(request.includeTypes ? { graphTypes: renderRailwayGraphTypes(currentGraph) } : {}),
    diagnostics,
  };
}

async function planRailwayIac({ file, desiredGraph, request, diagnostics }: {
  file: string;
  desiredGraph: RailwayGraph;
  request: RailwayIacRunnerRequest;
  diagnostics: RailwayIacRunnerDiagnostic[];
}): Promise<RailwayIacPlanResponse> {
  const context = requireBackboardContext(request.backboard, "plan");
  const client = new IacClient(clientConfig(context));
  const current = await client.getCurrentEnvironment(
    context.environmentId,
    context.decryptVariables === undefined ? {} : { decryptVariables: context.decryptVariables },
  );
  const currentGraph = environmentConfigToGraph(current.config, {
    projectName: current.projectName ?? desiredGraph.project.name,
    serviceNamesById: current.serviceNamesById,
    bucketNamesById: current.bucketNamesById,
    customDomainsByServiceId: current.customDomainsByServiceId,
  });
  const changeSet = diffGraphs({ current: currentGraph, desired: desiredGraph });
  const allDiagnostics = [...diagnostics, ...changeSet.diagnostics.map(diagnostic => ({
    severity: diagnostic.severity,
    path: diagnostic.path,
    message: diagnostic.message,
  } satisfies RailwayIacRunnerDiagnostic))];
  const { config: _config, ...currentEnvironment } = current;
  const hasErrors = allDiagnostics.some(diagnostic => diagnostic.severity === "error");
  const preview = !hasErrors && changeSet.changes.length > 0
    ? await client.previewChangeSet({ environmentId: context.environmentId, changeSet })
    : undefined;

  return {
    ok: !hasErrors,
    command: "plan",
    file,
    mode: "real",
    currentGraph,
    desiredGraph,
    currentConfig: current.config,
    currentEnvironment,
    changeSet,
    ...(preview ? { preview } : {}),
    diff: renderChangeSet(changeSet),
    ...(request.includeTypes ? { graphTypes: renderRailwayGraphTypes(desiredGraph) } : {}),
    diagnostics: allDiagnostics,
  };
}

function requireBackboardContext(context: RailwayIacBackboardContext | undefined, command: "plan" | "stage" | "apply"): Required<Pick<RailwayIacBackboardContext, "token" | "environmentId">> & RailwayIacBackboardContext {
  if (!context?.token) throw new Error(`Backboard token is required for ${command}.`);
  if (!context.environmentId) throw new Error(`Backboard environmentId is required for ${command}.`);
  return context as Required<Pick<RailwayIacBackboardContext, "token" | "environmentId">> & RailwayIacBackboardContext;
}

function clientConfig(context: RailwayIacBackboardContext & { token: string }) {
  return { token: context.token, ...(context.authType ? { authType: context.authType } : {}), ...(context.endpoint ? { graphqlEndpoint: context.endpoint } : {}) };
}

function graphDiagnostics(graph: RailwayGraph): RailwayIacRunnerDiagnostic[] {
  return validateGraph(graph).map(message => ({ severity: "error", path: "graph", message }));
}
