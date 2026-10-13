import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { assertMinimumIacCliVersion } from "./cli-version.js";
import { resourceAddress } from "./graph.js";
import type {
  BucketNode,
  DatabaseNode,
  GroupNode,
  GroupableResourceInput,
  GroupableResourceNode,
  ProjectDefinition,
  ProjectResourceInput,
  ResourceNode,
  ServiceNode,
  SourceConfig,
  VariableValue,
  VolumeNode,
} from "./graph.js";
import type {
  AutoUpdateScheduleWindow,
  BucketConfig,
  BuildConfig,
  DeployConfig,
  ServiceConfig,
  ServiceNetworking,
  VariableConfig,
  VolumeConfig,
  VolumeMount,
} from "./schema.js";

assertMinimumIacCliVersion();

export interface RailwayContextInput {
  command?: string;
  projectId?: string;
  projectName?: string;
  environmentId?: string;
  environment?: string;
  environmentName?: string;
}

export interface RailwayContext extends RailwayContextInput {
  randomString: (label?: string, bytes?: number) => string;
  isEnvironment: (name: string) => boolean;
  shared: SharedVariableRef;
}

export type RailwayProgram = (
  ctx: RailwayContext,
  project: (name: string, definition: Omit<ProjectDefinition, "name">) => ProjectDefinition,
) => ProjectDefinition | Promise<ProjectDefinition>;

export function defineRailway(program: RailwayProgram): RailwayProgram {
  return program;
}

export const define = defineRailway;

export function project(name: string, definition: Omit<ProjectDefinition, "name">): ProjectDefinition {
  const resources = (definition.resources ?? definition.services ?? []).flat();
  return { name, ...definition, resources };
}

export function createRailwayContext(input: RailwayContextInput = {}): RailwayContext {
  const environment = input.environment ?? input.environmentName;
  return {
    ...input,
    ...(environment ? { environment, environmentName: environment } : {}),
    randomString: (label = "random", bytes = 12) =>
      createHash("sha256").update(`railway-iac:${environment ?? "default"}:${label}`).digest("hex").slice(0, bytes * 2),
    isEnvironment: (name: string) => environment === name,
    shared: createSharedVariableRefs(),
  };
}

export type RegionConfig = number | { count?: number; replicas?: number; stacker?: string | null };

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
  replicas?: number | Record<string, RegionConfig>;
  regions?: Record<string, RegionConfig>;
  networking?: ServiceNetworking;
  domains?: Array<string | { domain: string; port?: number }>;
  tcp?: Array<string | number>;
  tcpProxies?: string[];
  env?: Record<string, string | VariableConfig | VariableValue>;
  variables?: Record<string, string | VariableConfig | VariableValue>;
  volumeMounts?: Record<string, VolumeMount | null | VolumeNode>;
  configFile?: string;
  parentServiceId?: string;
  groupId?: string;
  clusterRole?: ServiceConfig["clusterRole"];
  replicaConfig?: ServiceConfig["replicaConfig"];
  clusterDisplay?: ServiceConfig["clusterDisplay"];
  tracing?: ServiceConfig["tracing"];
  cdn?: ServiceConfig["cdn"];
}

export type ServiceConfigInput = IntentServiceConfig;

export type RailwayProvidedVariable =
  | "RAILWAY_PUBLIC_DOMAIN"
  | "RAILWAY_PRIVATE_DOMAIN"
  | "RAILWAY_TCP_PROXY_DOMAIN"
  | "RAILWAY_TCP_PROXY_PORT"
  | "RAILWAY_DEPLOYMENT_ID"
  | "RAILWAY_DEPLOYMENT_DRAINING_SECONDS"
  | "RAILWAY_ENVIRONMENT"
  | "RAILWAY_ENVIRONMENT_ID"
  | "RAILWAY_PROJECT_ID"
  | "RAILWAY_PROJECT_NAME"
  | "RAILWAY_SERVICE_ID"
  | "RAILWAY_SERVICE_NAME"
  | "RAILWAY_REPLICA_ID"
  | "PORT";

export type PostgresVariable = RailwayProvidedVariable | "DATABASE_PUBLIC_URL" | "DATABASE_URL" | "PGDATA" | "PGDATABASE" | "PGHOST" | "PGPASSWORD" | "PGPORT" | "PGUSER" | "POSTGRES_DB" | "POSTGRES_PASSWORD" | "POSTGRES_USER" | "SSL_CERT_DAYS";
export type RedisVariable = RailwayProvidedVariable | "REDIS_PASSWORD" | "REDIS_PUBLIC_URL" | "REDIS_URL" | "REDISHOST" | "REDISPASSWORD" | "REDISPORT" | "REDISUSER";
export type MongoVariable = RailwayProvidedVariable | "MONGO_INITDB_ROOT_PASSWORD" | "MONGO_INITDB_ROOT_USERNAME" | "MONGO_PUBLIC_URL" | "MONGO_URL" | "MONGOHOST" | "MONGOPASSWORD" | "MONGOPORT" | "MONGOUSER";
export type MySqlVariable = RailwayProvidedVariable | "MYSQL_DATABASE" | "MYSQL_PUBLIC_URL" | "MYSQL_ROOT_PASSWORD" | "MYSQL_URL" | "MYSQLDATABASE" | "MYSQLHOST" | "MYSQLPASSWORD" | "MYSQLPORT" | "MYSQLUSER";
export type DatabaseVariable<E extends DatabaseNode["engine"]> = E extends "postgres" ? PostgresVariable : E extends "redis" ? RedisVariable : E extends "mongo" ? MongoVariable : E extends "mysql" ? MySqlVariable : RailwayProvidedVariable | string;
export type ServiceVariableRef<K extends string = RailwayProvidedVariable | string> = { readonly [P in K]: VariableValue };
export type SharedVariableRef = { readonly [name: string]: VariableValue } & { readonly [name: string]: any };
export type ReferencableServiceNode<K extends string = RailwayProvidedVariable | string> = ServiceNode & { readonly env: ServiceVariableRef<K> };
export type ReferencableDatabaseNode<E extends DatabaseNode["engine"]> = DatabaseNode & { readonly env: ServiceVariableRef<DatabaseVariable<E>> };

export function github(repo: string, options: Omit<SourceConfig, "type" | "repo" | "image" | "autoUpdates"> = {}): SourceConfig {
  if ((options as { autoUpdates?: unknown }).autoUpdates !== undefined) {
    throw new Error("Image auto updates are only supported for Docker image sources.");
  }
  return { type: "github", repo, branch: options.branch ?? "main", ...options };
}

export function image(imageName: string, options: Pick<SourceConfig, "rootDirectory" | "autoUpdates"> = {}): SourceConfig {
  if (options.autoUpdates !== undefined && !supportsImageAutoUpdates(imageName)) {
    throw new Error("Image auto updates are only supported for Docker Hub and GHCR images.");
  }
  if (options.autoUpdates?.schedule != null) {
    validateAutoUpdateSchedule(options.autoUpdates.schedule);
  }
  return { type: "image", image: imageName, ...options };
}

// Mirrors backboard's schedule window schema (@railway/models): day 0-6,
// startHour 0-23, endHour 1-24 exclusive and after startHour, all integers.
// Backboard rejects anything else at commit time; failing here surfaces the
// mistake at authoring time with the offending window named.
function validateAutoUpdateSchedule(schedule: unknown): asserts schedule is AutoUpdateScheduleWindow[] {
  if (!Array.isArray(schedule)) {
    throw new Error("Image auto update schedule must be an array of { day, startHour, endHour } windows.");
  }
  schedule.forEach((window, index) => {
    const where = `autoUpdates.schedule[${index}]`;
    if (typeof window !== "object" || window === null || Array.isArray(window)) {
      throw new Error(`${where} must be an object with day, startHour and endHour.`);
    }
    const { day, startHour, endHour } = window as Record<string, unknown>;
    if (!isIntegerInRange(day, 0, 6)) {
      throw new Error(`${where}.day must be an integer from 0 (Sunday) to 6 (Saturday) UTC.`);
    }
    if (!isIntegerInRange(startHour, 0, 23)) {
      throw new Error(`${where}.startHour must be an integer UTC hour from 0 to 23.`);
    }
    if (!isIntegerInRange(endHour, 1, 24)) {
      throw new Error(`${where}.endHour must be an integer UTC hour from 1 to 24 (exclusive).`);
    }
    if (endHour <= startHour) {
      throw new Error(`${where}.endHour must be greater than startHour; a window cannot cross midnight.`);
    }
  });
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function supportsImageAutoUpdates(imageName: string): boolean {
  const normalized = imageName.trim().toLowerCase();
  if (normalized === "") return false;
  if (!normalized.includes("/")) return true;
  const registry = normalized.split("/", 1)[0] ?? "";
  return (!registry.includes(".") && !registry.includes(":") && registry !== "localhost") || registry === "docker.io" || registry === "ghcr.io";
}

export function template(templateName: string, options: Omit<SourceConfig, "type" | "template"> = {}): SourceConfig {
  return { type: "template", template: templateName, ...options };
}

export function empty(): SourceConfig {
  return { type: "empty" };
}

export function service<const Env extends Record<string, string | VariableConfig | VariableValue> = {}>(name: string, config: Omit<ServiceConfigInput, "env" | "variables"> & { env?: Env; variables?: Env } = {}): ReferencableServiceNode<RailwayProvidedVariable | Extract<keyof Env, string>> {
  const source = normalizeSource(config.source, config.root ?? config.rootDirectory);
  const node = pruneEmpty({
    address: resourceAddress("service", name) as `service.${string}`,
    type: "service",
    kind: source?.type === "github" ? "github" : source?.type === "image" ? "docker-image" : source?.type === "template" ? "template" : "empty",
    name,
    ...(source ? { source } : {}),
    build: normalizeBuild(config),
    deploy: normalizeDeploy(config),
    networking: normalizeNetworking(config),
    ...(config.env || config.variables ? { variables: normalizeVariables({ ...(config.variables ?? {}), ...(config.env ?? {}) }) } : {}),
    ...normalizeVolumeMounts(config.volumeMounts),
    ...(config.configFile ? { configFile: config.configFile } : {}),
    ...(config.parentServiceId ? { parentServiceId: config.parentServiceId } : {}),
    ...(config.groupId ? { groupId: config.groupId } : {}),
    ...(config.clusterRole ? { clusterRole: config.clusterRole } : {}),
    ...(config.replicaConfig ? { replicaConfig: config.replicaConfig } : {}),
    ...(config.clusterDisplay ? { clusterDisplay: config.clusterDisplay } : {}),
    ...(config.tracing ? { tracing: config.tracing } : {}),
    ...(config.cdn ? { cdn: config.cdn } : {}),
  }) as ServiceNode;
  return withVariableRefs(node) as ReferencableServiceNode<RailwayProvidedVariable | Extract<keyof Env, string>>;
}

export type FunctionRuntime = "bun";

// Runtime images for Railway Functions. Pinned so an authored function plans
// the same on every machine; pass `source: image(...)` to pick another tag.
const FUNCTION_IMAGES: Readonly<Record<FunctionRuntime, string>> = {
  bun: "ghcr.io/railwayapp/function-bun:1.4.0",
};

// A start command reaches the container as one argv string, and Linux caps a
// single argument at MAX_ARG_STRLEN: 128 KiB counting the terminating NUL.
const MAX_COMMAND_BYTES = 128 * 1024 - 1;
const FUNCTION_START_COMMAND_PREFIX = "./run.sh ";

/**
 * Largest function source `fn()` accepts, in UTF-8 bytes: 98295. The source
 * is base64 after the `./run.sh ` prefix of that one argument, so the limit is
 * the largest whole number of 3-byte groups whose base64 still fits. The API
 * derives the same number and rejects anything larger on plan and apply.
 */
export const FUNCTION_SOURCE_MAX_BYTES = Math.floor((MAX_COMMAND_BYTES - FUNCTION_START_COMMAND_PREFIX.length) / 4) * 3;

export interface FunctionConfigInput extends IntentServiceConfig {
  /**
   * Path to the function's source file. `fn()` reads it when the config is
   * evaluated and base64-encodes it into the deploy start command, which is
   * how Railway stores function code; the service has no repository. A
   * relative path resolves against the directory of the file calling `fn()`,
   * normally `.railway/`. The file must stay within `FUNCTION_SOURCE_MAX_BYTES`.
   */
  codeFile?: string | URL;
  /** Runtime image the function runs on. Defaults to `"bun"`. */
  runtime?: FunctionRuntime;
}

export function fn<const Env extends Record<string, string | VariableConfig | VariableValue> = {}>(name: string, config: Omit<FunctionConfigInput, "env" | "variables"> & { env?: Env; variables?: Env } = {}): ReferencableServiceNode<RailwayProvidedVariable | Extract<keyof Env, string>> {
  const { codeFile, runtime, ...serviceConfig } = config;
  if (runtime !== undefined && !Object.hasOwn(FUNCTION_IMAGES, runtime)) {
    throw new Error(`Unknown function runtime "${String(runtime)}"; supported runtimes: ${Object.keys(FUNCTION_IMAGES).join(", ")}.`);
  }
  if ((codeFile !== undefined || runtime !== undefined) && serviceConfig.source === undefined) {
    serviceConfig.source = image(FUNCTION_IMAGES[runtime ?? "bun"]);
  }
  if (codeFile !== undefined) {
    if (serviceConfig.start ?? serviceConfig.startCommand ?? serviceConfig.run?.command ?? serviceConfig.deploy?.startCommand) {
      throw new Error(`fn("${name}"): "codeFile" sets the start command; drop "start", "startCommand", "run.command" or "deploy.startCommand".`);
    }
    serviceConfig.start = functionStartCommand(readFunctionSource(name, codeFile));
  }
  return withVariableRefs({ ...service(name, serviceConfig), kind: "function" } as ServiceNode) as ReferencableServiceNode<RailwayProvidedVariable | Extract<keyof Env, string>>;
}

function readFunctionSource(name: string, codeFile: string | URL): string {
  const path = codeFile instanceof URL ? fileURLToPath(codeFile) : isAbsolute(codeFile) ? codeFile : resolve(callerDirectory() ?? process.cwd(), codeFile);
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`fn("${name}"): cannot read codeFile ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Directory of the module that called into this one: the config file, so a
// relative `codeFile` means "next to railway.ts" no matter which directory
// `railway config plan` or `node` runs from. Node's CallSite API gives file
// names without parsing the stack text; ESM frames carry `file:` URLs (the
// CLI imports the config with a cache-busting query, which `fileURLToPath`
// drops). A host that overrides stack formatting or sets `stackTraceLimit`
// to 0 yields no frames, and the caller falls back to the working directory.
function callerDirectory(): string | undefined {
  const original = Error.prepareStackTrace;
  Error.prepareStackTrace = (_error, callSites) => callSites;
  const stack: unknown = new Error().stack;
  Error.prepareStackTrace = original;
  if (!Array.isArray(stack)) return undefined;
  const callSites = stack as NodeJS.CallSite[];
  const self = callSites[0]?.getFileName();
  for (const site of callSites) {
    const file = site.getFileName();
    if (!file || file === self || file.startsWith("node:")) continue;
    return dirname(file.startsWith("file:") ? fileURLToPath(file) : file);
  }
  return undefined;
}

// The function image's `run.sh` decodes its argument, writes it to
// `index.tsx` and runs it with the runtime; Railway decodes the same form to
// show the source in the dashboard. The error text matches the API's.
function functionStartCommand(code: string): string {
  const bytes = Buffer.byteLength(code, "utf8");
  if (bytes > FUNCTION_SOURCE_MAX_BYTES) {
    throw new Error(`Function source code is ${bytes} bytes; the limit is ${FUNCTION_SOURCE_MAX_BYTES} bytes`);
  }
  return `${FUNCTION_START_COMMAND_PREFIX}${Buffer.from(code, "utf8").toString("base64")}`;
}

export interface DatabaseConfig {
  region?: string;
}

export function postgres(name: string, config: DatabaseConfig = {}): ReferencableDatabaseNode<"postgres"> {
  return database(name, "postgres", {
    image: "ghcr.io/railwayapp-templates/postgres-ssl:18",
    output: "DATABASE_URL",
    defaultMountPath: "/var/lib/postgresql/data",
    ...config,
  });
}

export function mysql(name: string, config: DatabaseConfig = {}): ReferencableDatabaseNode<"mysql"> {
  return database(name, "mysql", { image: "mysql:9", output: "MYSQL_URL", defaultMountPath: "/var/lib/mysql", ...config });
}

export function redis(name: string, config: DatabaseConfig = {}): ReferencableDatabaseNode<"redis"> {
  return database(name, "redis", { image: "railwayapp/redis:8.2", output: "REDIS_URL", defaultMountPath: "/bitnami", ...config });
}

export function mongo(name: string, config: DatabaseConfig = {}): ReferencableDatabaseNode<"mongo"> {
  return database(name, "mongo", { image: "mongo:8", output: "MONGO_URL", defaultMountPath: "/data/db", ...config });
}

export function database<E extends DatabaseNode["engine"]>(
  name: string,
  engine: E,
  options: { image: string; output?: string; defaultMountPath?: string; region?: string },
): ReferencableDatabaseNode<E> {
  const output = options.output ?? "DATABASE_URL";
  const node = {
    address: resourceAddress("database", name) as `database.${string}`,
    type: "database",
    kind: "database",
    engine,
    name,
    image: options.image,
    output,
    defaultMountPath: options.defaultMountPath,
    source: image(options.image),
    ...(options.region ? { deploy: { multiRegionConfig: { [options.region]: { numReplicas: 1 } } } } : {}),
  } as DatabaseNode;
  return withVariableRefs(node) as ReferencableDatabaseNode<E>;
}

export function volume(name: string, config: VolumeConfig = {}): VolumeNode {
  return { address: resourceAddress("volume", name) as `volume.${string}`, type: "volume", name, config };
}

export function bucket(name: string, config: BucketConfig = {}): BucketNode {
  return { address: resourceAddress("bucket", name) as `bucket.${string}`, type: "bucket", name, config };
}

export function group(name: string, resources: GroupableResourceInput[], options?: Omit<GroupNode, "address" | "type" | "name">): GroupableResourceNode[];
export function group(name: string, options?: Omit<GroupNode, "address" | "type" | "name">): GroupNode;
export function group(
  name: string,
  resourcesOrOptions: GroupableResourceInput[] | Omit<GroupNode, "address" | "type" | "name"> = {},
  maybeOptions: Omit<GroupNode, "address" | "type" | "name"> = {},
): GroupNode | GroupableResourceNode[] {
  const resources = Array.isArray(resourcesOrOptions) ? resourcesOrOptions.flat(Infinity) as GroupableResourceNode[] : undefined;
  const options = Array.isArray(resourcesOrOptions) ? maybeOptions : resourcesOrOptions;
  const node: GroupNode = { address: resourceAddress("group", name) as `group.${string}`, type: "group", name, ...options };
  if (!resources) return node;
  return [node, ...resources.map(resource => ({ ...resource, groupId: name }))];
}

export function ref(resource: ResourceNode, output: string): VariableValue {
  return variableReference(resource, output);
}

export function preserve(): VariableValue {
  return { type: "preserve" };
}

function variableReference(resource: ResourceNode, output: string): VariableValue {
  return { type: "reference", resource: resource.address, output };
}

function sharedVariableReference(name: string): VariableValue {
  return { type: "sharedReference", name };
}

function createSharedVariableRefs(): SharedVariableRef {
  return new Proxy({} as SharedVariableRef, {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      return sharedVariableReference(property);
    },
  });
}

function createVariableRefAccessor(resource: ResourceNode): ServiceVariableRef<string> {
  return new Proxy({} as ServiceVariableRef<string>, {
    get(_target, property) {
      if (typeof property !== "string") return undefined;
      return variableReference(resource, property);
    },
  });
}

function withVariableRefs<T extends ServiceNode | DatabaseNode>(node: T): T {
  Object.defineProperty(node, "env", { enumerable: false, value: createVariableRefAccessor(node) });
  return node;
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
  const replicaConfig = normalizeReplicas(config.replicas, config.regions);
  return pruneEmpty({
    ...config.deploy,
    startCommand: config.start ?? config.startCommand ?? config.run?.command ?? config.deploy?.startCommand,
    preDeployCommand: Array.isArray(preDeployCommand) ? preDeployCommand : preDeployCommand ? [preDeployCommand] : config.deploy?.preDeployCommand,
    healthcheckPath: config.healthcheck ?? config.healthcheckPath ?? config.run?.healthcheck ?? config.deploy?.healthcheckPath,
    healthcheckTimeout: config.healthcheckTimeout ?? config.run?.healthcheckTimeout ?? config.deploy?.healthcheckTimeout,
    ...replicaConfig,
    multiRegionConfig: replicaConfig?.multiRegionConfig ?? config.deploy?.multiRegionConfig,
  }) as DeployConfig | undefined;
}

function normalizeReplicas(replicas: ServiceConfigInput["replicas"], regions: ServiceConfigInput["regions"]): Pick<DeployConfig, "numReplicas" | "multiRegionConfig"> | undefined {
  if (typeof replicas === "number") return { numReplicas: replicas };
  if (replicas) return { multiRegionConfig: normalizeRegions(replicas) };
  if (regions) return { multiRegionConfig: normalizeRegions(regions) };
  return undefined;
}

function normalizeRegions(regions: Record<string, RegionConfig>): NonNullable<DeployConfig["multiRegionConfig"]> {
  return Object.fromEntries(
    Object.entries(regions).map(([region, value]) => [
      region,
      typeof value === "number"
        ? { numReplicas: value }
        : (pruneEmpty({ numReplicas: value.count ?? value.replicas, stackerAssignment: value.stacker }) ?? {}),
    ]),
  ) as NonNullable<DeployConfig["multiRegionConfig"]>;
}

function normalizeNetworking(config: ServiceConfigInput): ServiceNetworking | undefined {
  const customDomains = config.domains
    ? Object.fromEntries(config.domains.map(domain => (typeof domain === "string" ? [domain, { port: 8080 }] : [domain.domain, { port: domain.port ?? 8080 }])))
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

function normalizeVolumeMounts(volumeMounts: ServiceConfigInput["volumeMounts"]): Pick<ServiceNode, "volumeMounts" | "volumeAttachments"> {
  if (!volumeMounts) return {};
  const rawMounts: ServiceNode["volumeMounts"] = {};
  const attachments: NonNullable<ServiceNode["volumeAttachments"]> = {};
  for (const [key, value] of Object.entries(volumeMounts)) {
    if (value && typeof value === "object" && "type" in value && value.type === "volume") {
      attachments[value.name] = {
        volume: value.address,
        mountPath: key,
        ...(value.config ? { volumeConfig: value.config } : {}),
      };
      continue;
    }
    rawMounts[key] = value as VolumeMount | null;
  }
  return pruneEmpty({ volumeMounts: rawMounts, volumeAttachments: attachments }) ?? {};
}

function pruneEmpty<T>(value: T): T | undefined {
  if (value == null || typeof value !== "object") return value;
  const entries = Object.entries(value).filter(([, child]) => child != null);
  if (entries.length === 0) return undefined;
  return Object.fromEntries(entries) as T;
}
