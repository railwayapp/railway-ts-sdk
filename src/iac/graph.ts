import type {
  BucketConfig,
  BuildConfig,
  DeployConfig,
  EnvironmentConfig,
  ServiceConfig,
  ServiceNetworking,
  ServiceSource,
  VariableConfig,
  VolumeConfig,
  VolumeMount,
} from "./schema.js";

export const RAILWAY_GRAPH_VERSION = 1 as const;

export type GraphVersion = typeof RAILWAY_GRAPH_VERSION;
export type ResourceType = "service" | "database" | "volume" | "bucket" | "group";
export type ResourceAddress = `${ResourceType}.${string}`;

export interface RailwayGraph {
  version: GraphVersion;
  project: ProjectNode;
  environments: EnvironmentNode[];
  resources: ResourceNode[];
  edges: Edge[];
}

export interface ProjectNode {
  name: string;
}

export interface EnvironmentNode {
  name: string;
}

export interface GraphResourceBase {
  /** Deterministic graph handle. Remote Railway IDs live in bindings/lock state. */
  address: ResourceAddress;
  /** Legacy alias while the prototype migrates to address-first naming. */
  id: ResourceAddress;
  type: ResourceType;
  name: string;
}

export type ResourceNode = ServiceNode | DatabaseNode | VolumeNode | BucketNode | GroupNode;

export type ServiceKind = "empty" | "github" | "docker-image" | "database" | "function" | "template";

export interface SourceConfig extends ServiceSource {
  type: "github" | "image" | "empty" | "template";
  repo?: string | null;
  image?: string | null;
  template?: string | null;
}

export interface ServiceNode extends GraphResourceBase {
  address: `service.${string}`;
  id: `service.${string}`;
  type: "service";
  kind: ServiceKind;
  source?: SourceConfig;
  build?: BuildConfig;
  deploy?: DeployConfig;
  networking?: ServiceNetworking;
  variables?: Record<string, VariableValue>;
  volumeMounts?: Record<string, VolumeMount | null>;
  configFile?: string;
  parentServiceId?: string;
  groupId?: string;
  clusterRole?: ServiceConfig["clusterRole"];
  replicaConfig?: ServiceConfig["replicaConfig"];
  clusterDisplay?: ServiceConfig["clusterDisplay"];
}

export interface DatabaseNode extends Omit<ServiceNode, "address" | "id" | "type" | "kind"> {
  address: `database.${string}`;
  id: `database.${string}`;
  type: "database";
  kind: "database";
  engine: "postgres" | "mysql" | "redis" | "mongo" | "private";
  image: string;
  output: string;
  defaultMountPath?: string;
}

export interface VolumeNode extends GraphResourceBase {
  address: `volume.${string}`;
  id: `volume.${string}`;
  type: "volume";
  config?: VolumeConfig;
}

export interface BucketNode extends GraphResourceBase {
  address: `bucket.${string}`;
  id: `bucket.${string}`;
  type: "bucket";
  config?: BucketConfig;
}

export interface GroupNode extends GraphResourceBase {
  address: `group.${string}`;
  id: `group.${string}`;
  type: "group";
  color?: string;
  icon?: string;
  isCollapsed?: boolean;
}

export type VariableValue =
  | ({ type: "literal" } & VariableConfig)
  | { type: "reference"; resource: ResourceAddress; output: string }
  | { type: "raw"; value: VariableConfig };

export interface Edge {
  from: ResourceAddress;
  to: ResourceAddress;
  type: "variable" | "mount" | "group";
  key?: string;
}

export interface ProjectDefinition {
  name: string;
  environments: string[];
  services: ResourceNode[];
}

export interface GraphCompileOptions {
  serviceIdsByName?: Record<string, string>;
  existingServiceIds?: string[];
  volumeIdsByServiceName?: Record<string, string>;
  bucketIdsByName?: Record<string, string>;
}

export interface CompileResult {
  graph: RailwayGraph;
  desiredConfig: EnvironmentConfig;
}

export interface GraphIndex {
  byAddress: Map<ResourceAddress, ResourceNode>;
  byTypeAndName: Map<`${ResourceType}:${string}`, ResourceNode>;
}

export function resourceAddress(type: ResourceType, name: string): ResourceAddress {
  return `${type}.${name}` as ResourceAddress;
}

export function indexGraph(graph: RailwayGraph): GraphIndex {
  const byAddress = new Map<ResourceAddress, ResourceNode>();
  const byTypeAndName = new Map<`${ResourceType}:${string}`, ResourceNode>();

  for (const resource of graph.resources) {
    byAddress.set(resource.address, resource);
    byTypeAndName.set(`${resource.type}:${resource.name}`, resource);
  }

  return { byAddress, byTypeAndName };
}

export function validateGraph(graph: RailwayGraph): string[] {
  const errors: string[] = [];
  if (graph.version !== RAILWAY_GRAPH_VERSION) errors.push(`Unsupported graph version: ${graph.version}`);

  const addresses = new Set<ResourceAddress>();
  for (const resource of graph.resources) {
    if (addresses.has(resource.address)) errors.push(`Duplicate resource address: ${resource.address}`);
    addresses.add(resource.address);
    if (resource.id !== resource.address) errors.push(`Resource id must match address for ${resource.address}`);
  }

  for (const edge of graph.edges) {
    if (!addresses.has(edge.from)) errors.push(`Edge references missing source: ${edge.from}`);
    if (!addresses.has(edge.to)) errors.push(`Edge references missing target: ${edge.to}`);
  }

  return errors;
}
