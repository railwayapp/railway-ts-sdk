import { RAILWAY_GRAPH_VERSION, resourceAddress } from "./graph.js";
import type {
  DatabaseNode,
  Edge,
  GraphCompileOptions,
  ProjectDefinition,
  RailwayGraph,
  ResourceNode,
  ServiceNode,
  VariableValue,
} from "./graph.js";
import type { EnvironmentConfig, ServiceConfig, ServiceNetworking, VariableConfig, VariableValues } from "./schema.js";

export function projectDefinitionToGraph(definition: ProjectDefinition): RailwayGraph {
  const resources = definition.services.flat();
  const edges: Edge[] = [];
  for (const resource of resources) {
    if (resource.type !== "service" && resource.type !== "database") continue;
    for (const [key, value] of Object.entries(resource.variables ?? {})) {
      if (value.type !== "reference") continue;
      edges.push({ from: resource.address, to: value.resource as Edge["to"], type: "variable", key });
    }
  }
  return {
    version: RAILWAY_GRAPH_VERSION,
    project: { name: definition.name },
    environments: definition.environments.map(name => ({ name })),
    resources: resources.map(stripRuntimeHelpers),
    edges,
  };
}

function stripRuntimeHelpers<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripRuntimeHelpers) as T;
  if (value == null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, child]) => typeof child !== "function")
      .map(([key, child]) => [key, stripRuntimeHelpers(child)]),
  ) as T;
}

export function graphToEnvironmentConfig(graph: RailwayGraph, options: GraphCompileOptions = {}): EnvironmentConfig {
  const config: EnvironmentConfig = { services: {} };
  const resourceNamesById = Object.fromEntries(graph.resources.map(resource => [resource.address, resource.name]));
  const existingServiceIds = new Set(options.existingServiceIds ?? []);

  for (const resource of graph.resources) {
    if (resource.type === "service" || resource.type === "database") {
      const serviceKey = options.serviceIdsByName?.[resource.name] ?? resource.name;
      config.services![serviceKey] =
        resource.type === "database"
          ? databaseToEnvironmentConfig(resource, {
              isNew: !existingServiceIds.has(serviceKey),
              ...(options.volumeIdsByServiceName?.[resource.name]
                ? { volumeId: options.volumeIdsByServiceName[resource.name] }
                : {}),
            })
          : serviceToEnvironmentConfig(resource, resourceNamesById, {
              isNew: !existingServiceIds.has(serviceKey),
            });

      const volumeId = options.volumeIdsByServiceName?.[resource.name];
      if (resource.type === "database" && volumeId != null) {
        config.volumes = config.volumes ?? {};
        config.volumes[volumeId] = { isCreated: true };
      }
      continue;
    }

    if (resource.type === "volume") {
      config.volumes = config.volumes ?? {};
      config.volumes[resource.name] = { isCreated: true, ...resource.config };
      continue;
    }

    if (resource.type === "bucket") {
      const existingBucketId = options.bucketIdsByName?.[resource.name];
      const bucketKey = existingBucketId ?? resource.name;
      config.buckets = config.buckets ?? {};
      config.buckets[bucketKey] = { ...(existingBucketId ? {} : { isCreated: true }), ...resource.config, ...(resource.groupId ? { groupId: resource.groupId } : {}) };
      continue;
    }

    if (resource.type === "group") {
      config.groups = config.groups ?? {};
      config.groups[resource.name] = pruneEmpty({
        isCreated: true,
        name: resource.name,
        color: resource.color,
        icon: resource.icon,
        isCollapsed: resource.isCollapsed,
      }) as NonNullable<EnvironmentConfig["groups"]>[string];
    }
  }

  return pruneEmpty(config);
}

export function environmentConfigToGraph(
  config: EnvironmentConfig,
  options: { projectName?: string; serviceNamesById?: Record<string, string>; bucketNamesById?: Record<string, string>; customDomainsByServiceId?: Record<string, Record<string, { port?: number }>> } = {},
): RailwayGraph {
  const resources: ResourceNode[] = [];
  for (const [serviceId, serviceConfig] of Object.entries(config.services ?? {})) {
    if (serviceConfig == null || serviceConfig.isDeleted) continue;
    const name = options.serviceNamesById?.[serviceId] ?? serviceId;
    const imageName = serviceConfig.source?.image;
    const looksLikeDatabase = imageName?.includes("postgres") || imageName?.includes("mysql") || imageName?.includes("redis") || imageName?.includes("mongo");
    if (looksLikeDatabase) {
      const engine = imageName?.includes("mysql") ? "mysql" : imageName?.includes("redis") ? "redis" : imageName?.includes("mongo") ? "mongo" : "postgres";
      resources.push(pruneEmpty({
        address: resourceAddress("database", name) as `database.${string}`,
        type: "database",
        kind: "database",
        engine,
        name,
        image: imageName ?? "postgres:16",
        output: engine === "redis" ? "REDIS_URL" : engine === "mysql" ? "MYSQL_URL" : engine === "mongo" ? "MONGO_URL" : "DATABASE_URL",
        defaultMountPath: Object.keys(serviceConfig.volumeMounts ?? {}).length > 0 ? serviceConfig.deploy?.requiredMountPath : undefined,
        ...(serviceConfig.volumeMounts ? { volumeMounts: serviceConfig.volumeMounts } : {}),
      }) as ResourceNode);
      continue;
    }
    resources.push({
      address: resourceAddress("service", name) as `service.${string}`,
      type: "service",
      kind: serviceConfig.source?.repo ? "github" : serviceConfig.source?.image ? "docker-image" : serviceConfig.deploy?.cronSchedule ? "function" : "empty",
      name,
      ...(serviceConfig.source ? { source: { type: serviceConfig.source.image ? "image" : "github", ...serviceConfig.source } } : {}),
      ...(serviceConfig.build ? { build: serviceConfig.build } : {}),
      ...(serviceConfig.deploy ? { deploy: serviceConfig.deploy } : {}),
      ...(serviceConfig.variables ? { variables: variablesFromEnvironmentConfig(serviceConfig.variables) } : {}),
      ...(serviceConfig.networking || options.customDomainsByServiceId?.[serviceId] ? { networking: pruneEmpty({ ...serviceConfig.networking, customDomains: options.customDomainsByServiceId?.[serviceId] ?? serviceConfig.networking?.customDomains }) as ServiceNetworking } : {}),
      ...(serviceConfig.volumeMounts ? { volumeMounts: serviceConfig.volumeMounts } : {}),
      ...(serviceConfig.configFile ? { configFile: serviceConfig.configFile } : {}),
      ...(serviceConfig.groupId ? { groupId: serviceConfig.groupId } : {}),
    });
  }

  for (const [bucketId, bucketConfig] of Object.entries(config.buckets ?? {})) {
    if (bucketConfig == null || bucketConfig.isDeleted) continue;
    const name = options.bucketNamesById?.[bucketId] ?? bucketId;
    resources.push({ address: resourceAddress("bucket", name) as `bucket.${string}`, type: "bucket", name, config: bucketConfig });
  }

  return projectDefinitionToGraph({
    name: options.projectName ?? "imported-project",
    environments: ["imported-environment"],
    services: resources,
  });
}

export function composePatch({ currentConfig, desiredConfig }: { currentConfig: EnvironmentConfig; desiredConfig: EnvironmentConfig }): EnvironmentConfig {
  return pruneEmpty(addDeletionMarkers({ currentConfig, desiredConfig }));
}

function addDeletionMarkers({ currentConfig, desiredConfig }: { currentConfig: EnvironmentConfig; desiredConfig: EnvironmentConfig }): EnvironmentConfig {
  const next: EnvironmentConfig = structuredClone(desiredConfig);
  for (const [serviceId, currentService] of Object.entries(currentConfig.services ?? {})) {
    if (currentService == null || currentService.isDeleted) continue;
    const desiredService = desiredConfig.services?.[serviceId];
    if (desiredService == null) {
      next.services = next.services ?? {};
      next.services[serviceId] = { isDeleted: true };
      continue;
    }
    for (const [variableName, currentVariable] of Object.entries(currentService.variables ?? {})) {
      if (currentVariable == null) continue;
      if (desiredService.variables?.[variableName] != null) continue;
      next.services = next.services ?? {};
      next.services[serviceId] = next.services[serviceId] ?? {};
      next.services[serviceId]!.variables = next.services[serviceId]!.variables ?? {};
      next.services[serviceId]!.variables![variableName] = null;
    }
  }
  return next;
}

function databaseToEnvironmentConfig(database: DatabaseNode, options: { isNew: boolean; volumeId?: string }): ServiceConfig {
  if (database.engine !== "postgres") {
    return pruneEmpty({
      ...(options.isNew ? { isCreated: true } : {}),
      source: { image: database.image },
      ...(database.defaultMountPath ? { deploy: { requiredMountPath: database.defaultMountPath } } : {}),
      ...(options.volumeId && database.defaultMountPath ? { volumeMounts: { [options.volumeId]: { mountPath: database.defaultMountPath } } } : {}),
    });
  }
  return pruneEmpty({
    ...(options.isNew ? { isCreated: true } : {}),
    source: { image: database.image },
    deploy: { requiredMountPath: "/var/lib/postgresql/data" },
    variables: {
      PGDATA: { value: "/var/lib/postgresql/data/pgdata" },
      PGHOST: { value: "${{RAILWAY_PRIVATE_DOMAIN}}" },
      PGPORT: { value: "5432" },
      PGUSER: { value: "${{POSTGRES_USER}}" },
      PGDATABASE: { value: "${{POSTGRES_DB}}" },
      PGPASSWORD: { value: "${{POSTGRES_PASSWORD}}" },
      POSTGRES_DB: { value: "railway" },
      DATABASE_URL: { value: "postgresql://${{PGUSER}}:${{POSTGRES_PASSWORD}}@${{RAILWAY_PRIVATE_DOMAIN}}:5432/${{PGDATABASE}}" },
      POSTGRES_USER: { value: "postgres" },
      SSL_CERT_DAYS: { value: "820" },
      POSTGRES_PASSWORD: { generator: 'secret(32, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ")' },
      DATABASE_PUBLIC_URL: { value: "postgresql://${{PGUSER}}:${{POSTGRES_PASSWORD}}@${{RAILWAY_TCP_PROXY_DOMAIN}}:${{RAILWAY_TCP_PROXY_PORT}}/${{PGDATABASE}}" },
      RAILWAY_DEPLOYMENT_DRAINING_SECONDS: { value: "60" },
    },
    networking: { tcpProxies: { "5432": {} } },
    ...(options.volumeId ? { volumeMounts: { [options.volumeId]: { mountPath: "/var/lib/postgresql/data" } } } : {}),
  });
}

function serviceToEnvironmentConfig(service: ServiceNode, resourceNamesById: Record<string, string>, options: { isNew: boolean }): ServiceConfig {
  const config: ServiceConfig = { ...(options.isNew ? { isCreated: true } : {}) };
  if (service.source) {
    const source = pruneEmpty({
      repo: service.source.type === "github" ? service.source.repo : undefined,
      branch: service.source.type === "github" ? service.source.branch : undefined,
      image: service.source.type === "image" ? service.source.image : undefined,
      rootDirectory: service.source.rootDirectory,
      commitSha: service.source.commitSha,
      upstreamUrl: service.source.upstreamUrl,
      checkSuites: service.source.checkSuites,
      autoUpdates: service.source.autoUpdates,
    }) as ServiceConfig["source"];
    if (source) config.source = source;
  }
  if (service.build) config.build = service.build;
  if (service.deploy) config.deploy = service.deploy;
  if (service.variables) config.variables = variablesToEnvironmentConfig(service.variables, resourceNamesById);
  if (service.networking) config.networking = service.networking;
  if (service.volumeMounts) config.volumeMounts = service.volumeMounts;
  if (service.configFile) config.configFile = service.configFile;
  if (service.parentServiceId) config.parentServiceId = service.parentServiceId;
  if (service.groupId) config.groupId = service.groupId;
  if (service.clusterRole) config.clusterRole = service.clusterRole;
  if (service.replicaConfig) config.replicaConfig = service.replicaConfig;
  if (service.clusterDisplay) config.clusterDisplay = service.clusterDisplay;
  return pruneEmpty(config);
}

function variablesToEnvironmentConfig(variables: Record<string, VariableValue>, resourceNamesById: Record<string, string>): VariableValues {
  return Object.fromEntries(
    Object.entries(variables)
      .filter((entry): entry is [string, Exclude<VariableValue, { type: "preserve" }>] => entry[1].type !== "preserve")
      .map(([key, value]) => [
        key,
        value.type === "literal" ? literalVariable(value) : value.type === "raw" ? value.value : referenceVariable(value, resourceNamesById),
      ]),
  );
}

function referenceVariable(value: Extract<VariableValue, { type: "reference" }>, resourceNamesById: Record<string, string>): VariableConfig {
  return { value: `\${{${resourceNamesById[value.resource] ?? value.resource}.${value.output}}}` };
}

function literalVariable(value: Extract<VariableValue, { type: "literal" }>): VariableConfig {
  const { type: _type, ...variable } = value;
  return variable;
}

function variablesFromEnvironmentConfig(variables: VariableValues): Record<string, VariableValue> {
  return Object.fromEntries(Object.entries(variables).filter(([, value]) => value != null).map(([key, value]) => [key, value?.value == null || value.value === "" ? { type: "preserve" } : { type: "literal", value: value.value }]));
}

function pruneEmpty<T>(value: T, path: string[] = []): T {
  if (Array.isArray(value)) return value.map(child => pruneEmpty(child, path)) as T;
  if (value == null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .map(([key, child]) => [key, pruneEmpty(child, [...path, key])])
      .filter(([, child]) => {
        if (child == null) return false;
        if (typeof child === "object" && !Array.isArray(child)) {
          if (["customDomains", "serviceDomains", "tcpProxies"].includes(path[path.length - 1] ?? "")) return true;
          return Object.keys(child).length > 0;
        }
        return true;
      }),
  ) as T;
}
