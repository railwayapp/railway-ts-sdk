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
  const exported = unwrapDefaultExport(mod) as RailwayProgram | ProjectDefinition;
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

function unwrapDefaultExport(value: unknown): unknown {
  let current = value;
  while (isModuleDefaultWrapper(current)) {
    current = current.default;
  }
  return current;
}

function isModuleDefaultWrapper(value: unknown): value is { default: unknown } {
  if (value == null || typeof value !== "object" || !("default" in value)) return false;
  const candidate = value as Record<string, unknown>;
  // Project definitions may technically contain arbitrary keys. Only unwrap
  // module-like objects that do not already look like a Railway project.
  return candidate.name == null && candidate.resources == null && candidate.services == null && candidate.environments == null;
}

async function resolveDefinition(exported: RailwayProgram | ProjectDefinition, context: RailwayContextInput = {}): Promise<ProjectDefinition> {
  if (typeof exported === "function") return exported(createRailwayContext(context), projectFactory);
  return exported;
}
