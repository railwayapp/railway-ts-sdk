import { createHash } from "node:crypto";
import { resourceAddress } from "./graph.js";
import type {
  BucketNode,
  DatabaseNode,
  GroupNode,
  ProjectDefinition,
  ResourceNode,
  ServiceNode,
  SourceConfig,
  VariableValue,
  VolumeNode,
} from "./graph.js";
import type {
  BucketConfig,
  BuildConfig,
  DeployConfig,
  ServiceConfig,
  ServiceNetworking,
  VariableConfig,
  VolumeConfig,
  VolumeMount,
} from "./schema.js";

export interface RailwayContext {
  randomString: (label?: string, bytes?: number) => string;
}

export type RailwayProgram = (
  project: (name: string, definition: Omit<ProjectDefinition, "name">) => ProjectDefinition,
  ctx: RailwayContext,
) => ProjectDefinition | Promise<ProjectDefinition>;

export function defineRailway(program: RailwayProgram): RailwayProgram {
  return program;
}

export const define = defineRailway;

export function project(name: string, definition: Omit<ProjectDefinition, "name">): ProjectDefinition {
  return { name, ...definition };
}

export function createRailwayContext(): RailwayContext {
  return {
    randomString: (label = "random", bytes = 12) =>
      createHash("sha256").update(`railway-iac:${label}`).digest("hex").slice(0, bytes * 2),
  };
}

export type RegionConfig = number | { replicas?: number; stacker?: string | null };

export interface IntentServiceConfig {
  source?: SourceConfig | Omit<SourceConfig, "type">;
  root?: string;
  rootDirectory?: string;
  build?: string | BuildConfig;
  deploy?: DeployConfig;
  run?: { command?: string; preDeploy?: string | string[]; healthcheck?: string; healthcheckTimeout?: number };
  start?: string;
  startCommand?: string;
  preDeploy?: string | string[];
  preDeployCommand?: string | string[];
  healthcheck?: string;
  healthcheckPath?: string;
  healthcheckTimeout?: number;
  regions?: Record<string, RegionConfig>;
  networking?: ServiceNetworking;
  domains?: Array<string | { domain: string; port?: number }>;
  tcp?: Array<string | number>;
  tcpProxies?: string[];
  env?: Record<string, string | VariableConfig | VariableValue>;
  variables?: Record<string, string | VariableConfig | VariableValue>;
  volumeMounts?: Record<string, VolumeMount | null>;
  configFile?: string;
  parentServiceId?: string;
  groupId?: string;
  clusterRole?: ServiceConfig["clusterRole"];
  replicaConfig?: ServiceConfig["replicaConfig"];
  clusterDisplay?: ServiceConfig["clusterDisplay"];
}

export type ServiceConfigInput = IntentServiceConfig;

export function github(repo: string, options: Omit<SourceConfig, "type" | "repo" | "image"> = {}): SourceConfig {
  return { type: "github", repo, branch: options.branch ?? "main", ...options };
}

export function image(imageName: string, options: Pick<SourceConfig, "rootDirectory" | "autoUpdates"> = {}): SourceConfig {
  return { type: "image", image: imageName, ...options };
}

export function template(templateName: string, options: Omit<SourceConfig, "type" | "template"> = {}): SourceConfig {
  return { type: "template", template: templateName, ...options };
}

export function empty(): SourceConfig {
  return { type: "empty" };
}

export function service(name: string, config: ServiceConfigInput = {}): ServiceNode {
  const source = normalizeSource(config.source, config.root ?? config.rootDirectory);
  return pruneEmpty({
    address: resourceAddress("service", name) as `service.${string}`,
    type: "service",
    kind: source?.type === "github" ? "github" : source?.type === "image" ? "docker-image" : source?.type === "template" ? "template" : "empty",
    name,
    ...(source ? { source } : {}),
    build: normalizeBuild(config),
    deploy: normalizeDeploy(config),
    networking: normalizeNetworking(config),
    ...(config.env || config.variables ? { variables: normalizeVariables({ ...(config.variables ?? {}), ...(config.env ?? {}) }) } : {}),
    ...(config.volumeMounts ? { volumeMounts: config.volumeMounts } : {}),
    ...(config.configFile ? { configFile: config.configFile } : {}),
    ...(config.parentServiceId ? { parentServiceId: config.parentServiceId } : {}),
    ...(config.groupId ? { groupId: config.groupId } : {}),
    ...(config.clusterRole ? { clusterRole: config.clusterRole } : {}),
    ...(config.replicaConfig ? { replicaConfig: config.replicaConfig } : {}),
    ...(config.clusterDisplay ? { clusterDisplay: config.clusterDisplay } : {}),
  }) as ServiceNode;
}

export function fn(name: string, config: ServiceConfigInput = {}): ServiceNode {
  return { ...service(name, config), kind: "function" };
}

export function postgres(name: string): DatabaseNode & { url: () => VariableValue } {
  return database(name, "postgres", {
    image: "ghcr.io/railwayapp-templates/postgres-ssl:18",
    output: "DATABASE_URL",
    defaultMountPath: "/var/lib/postgresql/data",
  });
}

export function mysql(name: string): DatabaseNode & { url: () => VariableValue } {
  return database(name, "mysql", { image: "mysql:9", output: "MYSQL_URL", defaultMountPath: "/var/lib/mysql" });
}

export function redis(name: string): DatabaseNode & { url: () => VariableValue } {
  return database(name, "redis", { image: "redis:8", output: "REDIS_URL", defaultMountPath: "/data" });
}

export function mongo(name: string): DatabaseNode & { url: () => VariableValue } {
  return database(name, "mongo", { image: "mongo:8", output: "MONGO_URL", defaultMountPath: "/data/db" });
}

export function database(
  name: string,
  engine: DatabaseNode["engine"],
  options: { image: string; output?: string; defaultMountPath?: string },
): DatabaseNode & { url: () => VariableValue } {
  const output = options.output ?? "DATABASE_URL";
  return {
    address: resourceAddress("database", name) as `database.${string}`,
    type: "database",
    kind: "database",
    engine,
    name,
    image: options.image,
    output,
    defaultMountPath: options.defaultMountPath,
    source: image(options.image),
    url: () => ({ type: "reference", resource: resourceAddress("database", name), output }),
  } as DatabaseNode & { url: () => VariableValue };
}

export function volume(name: string, config: VolumeConfig = {}): VolumeNode {
  return { address: resourceAddress("volume", name) as `volume.${string}`, type: "volume", name, config };
}

export function bucket(name: string, config: BucketConfig = {}): BucketNode {
  return { address: resourceAddress("bucket", name) as `bucket.${string}`, type: "bucket", name, config };
}

export function group(name: string, options: Omit<GroupNode, "address" | "type" | "name"> = {}): GroupNode {
  return { address: resourceAddress("group", name) as `group.${string}`, type: "group", name, ...options };
}

export function ref(resource: ResourceNode, output: string): VariableValue {
  return { type: "reference", resource: resource.address, output };
}

function normalizeSource(source: ServiceConfigInput["source"], rootDirectory?: string): SourceConfig | undefined {
  if (source == null) return rootDirectory ? { type: "empty", rootDirectory } : undefined;
  if ("type" in source && source.type) return pruneEmpty({ ...source, rootDirectory: source.rootDirectory ?? rootDirectory }) as SourceConfig;
  if ("repo" in source && source.repo) return pruneEmpty({ type: "github", repo: source.repo, branch: source.branch ?? "main", rootDirectory }) as SourceConfig;
  if ("image" in source && source.image) return pruneEmpty({ type: "image", image: source.image, rootDirectory }) as SourceConfig;
  return rootDirectory ? { type: "empty", rootDirectory } : undefined;
}

function normalizeBuild(config: ServiceConfigInput): BuildConfig | undefined {
  if (typeof config.build === "string") return { buildCommand: config.build };
  return pruneEmpty({ ...config.build });
}

function normalizeDeploy(config: ServiceConfigInput): DeployConfig | undefined {
  const preDeployCommand = config.preDeploy ?? config.preDeployCommand ?? config.run?.preDeploy;
  return pruneEmpty({
    ...config.deploy,
    startCommand: config.start ?? config.startCommand ?? config.run?.command ?? config.deploy?.startCommand,
    preDeployCommand: Array.isArray(preDeployCommand) ? preDeployCommand : preDeployCommand ? [preDeployCommand] : config.deploy?.preDeployCommand,
    healthcheckPath: config.healthcheck ?? config.healthcheckPath ?? config.run?.healthcheck ?? config.deploy?.healthcheckPath,
    healthcheckTimeout: config.healthcheckTimeout ?? config.run?.healthcheckTimeout ?? config.deploy?.healthcheckTimeout,
    multiRegionConfig: config.regions ? normalizeRegions(config.regions) : config.deploy?.multiRegionConfig,
  }) as DeployConfig | undefined;
}

function normalizeRegions(regions: Record<string, RegionConfig>): DeployConfig["multiRegionConfig"] {
  return Object.fromEntries(
    Object.entries(regions).map(([region, value]) => [
      region,
      typeof value === "number"
        ? { numReplicas: value }
        : (pruneEmpty({ numReplicas: value.replicas, stackerAssignment: value.stacker }) ?? {}),
    ]),
  ) as DeployConfig["multiRegionConfig"];
}

function normalizeNetworking(config: ServiceConfigInput): ServiceNetworking | undefined {
  const customDomains = config.domains
    ? Object.fromEntries(config.domains.map(domain => (typeof domain === "string" ? [domain, {}] : [domain.domain, { port: domain.port }])))
    : undefined;
  const tcpProxies = config.tcp
    ? Object.fromEntries(config.tcp.map(port => [String(port), {}]))
    : config.tcpProxies
      ? Object.fromEntries(config.tcpProxies.map(port => [port, {}]))
      : undefined;
  return pruneEmpty({ ...config.networking, customDomains, tcpProxies }) as ServiceNetworking | undefined;
}

function normalizeVariables(variables: Record<string, string | VariableConfig | VariableValue>): Record<string, VariableValue> {
  return Object.fromEntries(
    Object.entries(variables).map(([key, value]) => {
      if (typeof value === "string") return [key, { type: "literal", value }];
      if ("type" in value) return [key, value];
      return [key, { type: "raw", value }];
    }),
  );
}

function pruneEmpty<T>(value: T): T | undefined {
  if (value == null || typeof value !== "object") return value;
  const entries = Object.entries(value).filter(([, child]) => child != null);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as T;
}
