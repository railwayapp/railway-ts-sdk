import path from "node:path";
import { pathToFileURL } from "node:url";
import { graphToEnvironmentConfig, projectDefinitionToGraph } from "./compiler.js";
import type { CompileResult, GraphCompileOptions, ProjectDefinition } from "./graph.js";
import { createRailwayContext, project as projectFactory, type RailwayContextInput, type RailwayProgram } from "./sdk.js";

export async function evaluateRailwayFile(filePath: string, options: GraphCompileOptions & { context?: RailwayContextInput } = {}): Promise<CompileResult> {
  const absolutePath = path.resolve(filePath);
  const mod = await importRailwayFile(absolutePath) as {
    default?: RailwayProgram | ProjectDefinition;
  };
  const exported = (mod.default ?? mod) as RailwayProgram | ProjectDefinition;
  const definition = await resolveDefinition(exported, options.context);
  const graph = projectDefinitionToGraph(definition);
  const desiredConfig = graphToEnvironmentConfig(graph, options);
  return { graph, desiredConfig };
}

async function importRailwayFile(absolutePath: string): Promise<unknown> {
  const url = `${pathToFileURL(absolutePath).toString()}?t=${Date.now()}`;
  if (/\.[cm]?tsx?$/.test(absolutePath)) {
    const { tsImport } = await import("tsx/esm/api");
    return tsImport(url, import.meta.url);
  }
  return import(url);
}

async function resolveDefinition(exported: RailwayProgram | ProjectDefinition, context: RailwayContextInput = {}): Promise<ProjectDefinition> {
  if (typeof exported === "function") return exported(createRailwayContext(context), projectFactory);
  return exported;
}
