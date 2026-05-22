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

export type GraphVersion = 1;

export interface RailwayGraph {
  version: GraphVersion;
  project: { name: string };
  environments: Array<{ name: string }>;
  resources: ResourceNode[];
  edges: Edge[];
}

export type ResourceNode = ServiceNode | DatabaseNode | VolumeNode | BucketNode | GroupNode;

export type ServiceKind = "empty" | "github" | "docker-image" | "database" | "function" | "template";

export interface SourceConfig extends ServiceSource {
  type: "github" | "image" | "empty" | "template";
  repo?: string | null;
  image?: string | null;
  template?: string | null;
}

export interface ServiceNode {
  id: string;
  type: "service";
  kind: ServiceKind;
  name: string;
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

export interface DatabaseNode extends Omit<ServiceNode, "type" | "kind"> {
  type: "database";
  kind: "database";
  engine: "postgres" | "mysql" | "redis" | "mongo" | "private";
  image: string;
  output: string;
  defaultMountPath?: string;
}

export interface VolumeNode {
  id: string;
  type: "volume";
  name: string;
  config?: VolumeConfig;
}

export interface BucketNode {
  id: string;
  type: "bucket";
  name: string;
  config?: BucketConfig;
}

export interface GroupNode {
  id: string;
  type: "group";
  name: string;
  color?: string;
  icon?: string;
  isCollapsed?: boolean;
}

export type VariableValue =
  | ({ type: "literal" } & VariableConfig)
  | { type: "reference"; resource: string; output: string }
  | { type: "raw"; value: VariableConfig };

export interface Edge {
  from: string;
  to: string;
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
