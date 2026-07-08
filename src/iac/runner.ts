import { diffGraphs, renderChangeSet, type RailwayChangeSet } from "./change-set.js";
import { environmentConfigToGraph } from "./compiler.js";
import { IacClient, type ChangeSetApplyResult, type ChangeSetPreviewResult, type CurrentEnvironmentResult } from "./client.js";
import { validateGraph, type RailwayGraph } from "./graph.js";
import { evaluateRailwayProject, findRailwayFile } from "./project.js";
import { renderRailwayGraphTypes } from "./typegen.js";
import type { EnvironmentConfig } from "./schema.js";
import type { RailwayAuthType } from "../core/config.js";
import { SDK_VERSION } from "../core/version.js";
import type { RailwayContextInput } from "./sdk.js";

export interface RailwayIacRunnerRequest {
  command?: "evaluate" | "typegen" | "current" | "plan" | "stage" | "apply";
  cwd?: string;
  file?: string;
  includeTypes?: boolean;
  pretty?: boolean;
  /** Print literal variable values in the plan diff instead of redacting them (--show-values). */
  revealValues?: boolean;
  context?: RailwayContextInput;
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

export type RailwayIacRunnerResponse = (RailwayIacEvaluateResponse | RailwayIacTypegenResponse | RailwayIacCurrentResponse | RailwayIacPlanResponse | RailwayIacStageResponse | RailwayIacApplyResponse) & {
  /** SDK version that produced this response; consumers use it to detect outdated runners. */
  sdkVersion?: string;
};

type RunnerCommand = NonNullable<RailwayIacRunnerRequest["command"]>;

interface EvaluatedCommandInput {
  request: RailwayIacRunnerRequest;
  file: string;
  graph: RailwayGraph;
  diagnostics: RailwayIacRunnerDiagnostic[];
}

export async function runRailwayIac(request: RailwayIacRunnerRequest = {}): Promise<RailwayIacRunnerResponse> {
  const command = request.command ?? "evaluate";
  const cwd = request.cwd ?? process.cwd();
  const file = request.file ?? await findRailwayFile(cwd);

  try {
    const evaluated = await evaluateRailwayProject({ file, context: runnerContext(request, command) });
    const input = {
      request,
      file: evaluated.file,
      graph: evaluated.graph,
      diagnostics: graphDiagnostics(evaluated.graph),
    };
    return { sdkVersion: SDK_VERSION, ...(await runEvaluatedCommand(command, input)) };
  } catch (error) {
    return { sdkVersion: SDK_VERSION, ...errorResponse(command, file, error) };
  }
}

async function runEvaluatedCommand(command: RunnerCommand, input: EvaluatedCommandInput): Promise<RailwayIacRunnerResponse> {
  switch (command) {
    case "typegen":
      return typegenRailwayIac(input);
    case "evaluate":
      return evaluateRailwayIac(input);
    case "current":
      return currentRailwayIac(input);
    case "plan":
      return planRailwayIac(input);
    case "stage":
      return stageRailwayIac(input);
    case "apply":
      return applyRailwayIac(input);
  }
}

function typegenRailwayIac({ file, graph, diagnostics }: EvaluatedCommandInput): RailwayIacTypegenResponse {
  return {
    ok: hasNoErrors(diagnostics),
    command: "typegen",
    file,
    graphTypes: renderRailwayGraphTypes(graph),
    diagnostics,
  };
}

function evaluateRailwayIac({ request, file, graph, diagnostics }: EvaluatedCommandInput): RailwayIacEvaluateResponse {
  return {
    ok: hasNoErrors(diagnostics),
    command: "evaluate",
    file,
    graph,
    ...(request.includeTypes ? { graphTypes: renderRailwayGraphTypes(graph) } : {}),
    diagnostics,
  };
}

async function currentRailwayIac({ file, graph: desiredGraph, request, diagnostics }: EvaluatedCommandInput): Promise<RailwayIacCurrentResponse> {
  const context = requireBackboardContext(request.backboard, "plan");
  const client = new IacClient(clientConfig(context));
  const current = await readCurrentEnvironment(client, context);
  const currentGraph = graphFromCurrentEnvironment(current, desiredGraph);
  const { config: _config, ...currentEnvironment } = current;

  return {
    ok: hasNoErrors(diagnostics),
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

async function planRailwayIac({ file, graph: desiredGraph, request, diagnostics }: EvaluatedCommandInput): Promise<RailwayIacPlanResponse> {
  const context = requireBackboardContext(request.backboard, "plan");
  const client = new IacClient(clientConfig(context));
  const current = await readCurrentEnvironment(client, context);
  const currentGraph = graphFromCurrentEnvironment(current, desiredGraph);
  const changeSet = diffGraphs({ current: currentGraph, desired: desiredGraph, revealValues: request.revealValues ?? false });
  const allDiagnostics = [...diagnostics, ...changeSetDiagnostics(changeSet)];
  const { config: _config, ...currentEnvironment } = current;
  const hasErrors = !hasNoErrors(allDiagnostics);
  const preview = !hasErrors && changeSet.changes.length > 0
    ? await client.previewChangeSet({ environmentId: context.environmentId, changeSet })
    : undefined;

  const previewedChangeSet = preview?.changeSet ?? changeSet;

  return {
    ok: !hasErrors,
    command: "plan",
    file,
    mode: "real",
    currentGraph,
    desiredGraph,
    currentConfig: current.config,
    currentEnvironment,
    changeSet: previewedChangeSet,
    ...(preview ? { preview } : {}),
    diff: renderChangeSet(previewedChangeSet),
    ...(request.includeTypes ? { graphTypes: renderRailwayGraphTypes(desiredGraph) } : {}),
    diagnostics: allDiagnostics,
  };
}

async function stageRailwayIac(input: EvaluatedCommandInput): Promise<RailwayIacStageResponse> {
  const planned = await planRailwayIac(input);
  if (!planned.ok || !planned.changeSet || planned.changeSet.changes.length === 0) {
    return { ...planned, command: "stage" };
  }
  requireBackboardContext(input.request.backboard, "stage");
  return { ...planned, command: "stage" };
}

async function applyRailwayIac(input: EvaluatedCommandInput): Promise<RailwayIacApplyResponse> {
  const planned = await planRailwayIac(input);
  if (!planned.ok || !planned.changeSet || planned.changeSet.changes.length === 0) {
    return { ...planned, command: "apply" };
  }

  const context = requireBackboardContext(input.request.backboard, "apply");
  const client = new IacClient(clientConfig(context));
  const applyResult = await client.applyChangeSet({
    environmentId: context.environmentId,
    changeSet: planned.changeSet,
    commitMessage: "Apply Railway configuration",
    // Base snapshot the plan was diffed against; backboard rejects a stale apply.
    ...(planned.currentEnvironment?.configEtag ? { baseEtag: planned.currentEnvironment.configEtag } : {}),
  });

  return {
    ...planned,
    command: "apply",
    applyResult,
    ...(applyResult.deploymentId ? { deploymentId: applyResult.deploymentId } : {}),
    ...(applyResult.stagedPatchId ? { stagedPatchId: applyResult.stagedPatchId } : {}),
  };
}

async function readCurrentEnvironment(
  client: IacClient,
  context: Required<Pick<RailwayIacBackboardContext, "token" | "environmentId">> & RailwayIacBackboardContext,
): Promise<CurrentEnvironmentResult> {
  return client.getCurrentEnvironment(
    context.environmentId,
    context.decryptVariables === undefined ? {} : { decryptVariables: context.decryptVariables },
  );
}

function graphFromCurrentEnvironment(current: CurrentEnvironmentResult, desiredGraph: RailwayGraph): RailwayGraph {
  return environmentConfigToGraph(current.config, {
    projectName: current.projectName ?? desiredGraph.project.name,
    serviceNamesById: current.serviceNamesById,
    volumeNamesById: current.volumeNamesById,
    bucketNamesById: current.bucketNamesById,
    customDomainsByServiceId: current.customDomainsByServiceId,
  });
}

function changeSetDiagnostics(changeSet: RailwayChangeSet): RailwayIacRunnerDiagnostic[] {
  return changeSet.diagnostics.map(diagnostic => ({
    severity: diagnostic.severity,
    path: diagnostic.path,
    message: diagnostic.message,
  } satisfies RailwayIacRunnerDiagnostic));
}

function runnerContext(request: RailwayIacRunnerRequest, command: string): RailwayContextInput {
  const environment = request.context?.environment ?? request.context?.environmentName;
  const projectId = request.context?.projectId ?? request.backboard?.projectId;
  const environmentId = request.context?.environmentId ?? request.backboard?.environmentId;
  return {
    ...request.context,
    command,
    ...(projectId ? { projectId } : {}),
    ...(environmentId ? { environmentId } : {}),
    ...(environment ? { environment, environmentName: environment } : {}),
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

function hasNoErrors(diagnostics: RailwayIacRunnerDiagnostic[]): boolean {
  return diagnostics.every(diagnostic => diagnostic.severity !== "error");
}

function errorResponse(command: RunnerCommand, file: string, error: unknown): RailwayIacRunnerResponse {
  return {
    ok: false,
    command,
    file,
    ...(command === "plan" || command === "stage" || command === "apply" || command === "current" ? { mode: "real" as const } : {}),
    diagnostics: [{ severity: "error", path: "", message: error instanceof Error ? error.message : String(error) }],
  } as RailwayIacRunnerResponse;
}
