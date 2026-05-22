import fs from "node:fs";
import path from "node:path";
import { graphToEnvironmentConfig } from "./compiler.js";
import { evaluateRailwayFile } from "./evaluator.js";
import type {
  BucketNode,
  DatabaseNode,
  GraphCompileOptions,
  RailwayGraph,
  ResourceNode,
  ServiceNode,
  VolumeNode,
} from "./graph.js";
import type { EnvironmentConfig } from "./schema.js";

export interface RailwayIacServiceMap {}
export interface RailwayIacDatabaseMap {}
export interface RailwayIacBucketMap {}
export interface RailwayIacVolumeMap {}
export interface RailwayIacResourceMap {}

type KnownName<T> = [keyof T] extends [never] ? string : Extract<keyof T, string>;

export type RailwayServiceName = KnownName<RailwayIacServiceMap>;
export type RailwayDatabaseName = KnownName<RailwayIacDatabaseMap>;
export type RailwayBucketName = KnownName<RailwayIacBucketMap>;
export type RailwayVolumeName = KnownName<RailwayIacVolumeMap>;
export type RailwayResourceName = KnownName<RailwayIacResourceMap>;

export interface EvaluatedRailwayProjectOptions extends GraphCompileOptions {
  file?: string;
  cwd?: string;
}

export interface EvaluatedRailwayProjectSnapshot {
  file: string;
  graph: RailwayGraph;
  desiredConfig: EnvironmentConfig;
}

export async function evaluateRailwayProject(
  options: EvaluatedRailwayProjectOptions = {},
): Promise<EvaluatedRailwayProject> {
  const file = options.file ? path.resolve(options.file) : findRailwayFile(options.cwd);
  const { graph, desiredConfig } = await evaluateRailwayFile(file, options);
  return new EvaluatedRailwayProject({ file, graph, desiredConfig });
}

export function findRailwayFile(cwd = process.cwd()): string {
  let current = path.resolve(cwd);
  while (true) {
    const candidate = path.join(current, ".railway", "railway.ts");
    if (fs.existsSync(candidate)) return candidate;

    const parent = path.dirname(current);
    if (parent === current) {
      throw new Error(
        `Could not find .railway/railway.ts from ${path.resolve(cwd)}. Pass { file } explicitly.`,
      );
    }
    current = parent;
  }
}

export class EvaluatedRailwayProject {
  readonly file: string;
  readonly graph: RailwayGraph;
  readonly desiredConfig: EnvironmentConfig;

  constructor(snapshot: EvaluatedRailwayProjectSnapshot) {
    this.file = snapshot.file;
    this.graph = snapshot.graph;
    this.desiredConfig = snapshot.desiredConfig;
  }

  get name(): string {
    return this.graph.project.name;
  }

  get resources(): ResourceNode[] {
    return this.graph.resources;
  }

  get services(): Array<ServiceNode | DatabaseNode> {
    return this.graph.resources.filter(
      (resource): resource is ServiceNode | DatabaseNode =>
        resource.type === "service" || resource.type === "database",
    );
  }

  resource(name: RailwayResourceName): ResourceNode {
    const resource = this.graph.resources.find(candidate => candidate.name === name);
    if (!resource) throw new Error(`Railway resource not found: ${name}`);
    return resource;
  }

  service(name: RailwayServiceName): ServiceNode | DatabaseNode {
    const resource = this.graph.resources.find(
      (candidate): candidate is ServiceNode | DatabaseNode =>
        candidate.name === name &&
        (candidate.type === "service" || candidate.type === "database"),
    );
    if (!resource) throw new Error(`Railway service not found: ${name}`);
    return resource;
  }

  database(name: RailwayDatabaseName): DatabaseNode {
    const resource = this.graph.resources.find(
      (candidate): candidate is DatabaseNode =>
        candidate.name === name && candidate.type === "database",
    );
    if (!resource) throw new Error(`Railway database not found: ${name}`);
    return resource;
  }

  bucket(name: RailwayBucketName): BucketNode {
    const resource = this.graph.resources.find(
      (candidate): candidate is BucketNode =>
        candidate.name === name && candidate.type === "bucket",
    );
    if (!resource) throw new Error(`Railway bucket not found: ${name}`);
    return resource;
  }

  volume(name: RailwayVolumeName): VolumeNode {
    const resource = this.graph.resources.find(
      (candidate): candidate is VolumeNode =>
        candidate.name === name && candidate.type === "volume",
    );
    if (!resource) throw new Error(`Railway volume not found: ${name}`);
    return resource;
  }

  config(options: GraphCompileOptions = {}): EnvironmentConfig {
    return graphToEnvironmentConfig(this.graph, options);
  }

  toJSON(): EvaluatedRailwayProjectSnapshot {
    return {
      file: this.file,
      graph: this.graph,
      desiredConfig: this.desiredConfig,
    };
  }
}
