import { parse } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { normalizeRailwayClientConfig, type RailwayClientConfig, type NormalizedRailwayClientConfig } from "../core/config.js";
import { requestGraphQL } from "../core/graphql-client.js";
import type {
  BucketCreateInput,
  ServiceCreateInput,
  VolumeCreateInput,
} from "../generated/graphql.js";
import type { RailwayGraph, ResourceNode } from "./graph.js";
import type { EnvironmentConfig } from "./schema.js";

export interface CurrentEnvironmentResult {
  projectId?: string | undefined;
  projectName?: string | undefined;
  environmentId: string;
  environmentName?: string | undefined;
  config: EnvironmentConfig;
  serviceNamesById: Record<string, string>;
  bucketNamesById: Record<string, string>;
}

export interface StagedPatchResult {
  id: string;
  status: string;
  patch: EnvironmentConfig;
  meta?: unknown;
}

export interface ProjectService { id: string; name: string }
export interface ProjectVolume { id: string; name?: string | null; serviceId?: string | null }
export interface ProjectBucket { id: string; name: string }

export interface EnsuredGraphResources {
  serviceIdsByName: Record<string, string>;
  volumeIdsByServiceName: Record<string, string>;
  bucketIdsByName: Record<string, string>;
}

export class IacClient {
  readonly #config: NormalizedRailwayClientConfig;

  constructor(config: RailwayClientConfig) {
    this.#config = normalizeRailwayClientConfig(config);
  }

  async getCurrentEnvironment(environmentId: string, options: { decryptVariables?: boolean } = {}): Promise<CurrentEnvironmentResult> {
    const data = await gql<{
      environment: { id: string; name?: string; projectId?: string; config: EnvironmentConfig };
    }, { environmentId: string; decryptVariables: boolean }>(this.#config, `query IacEnvironmentConfig($environmentId: String!, $decryptVariables: Boolean) {
      environment(id: $environmentId) { id name projectId config(decryptVariables: $decryptVariables) }
    }`, { environmentId, decryptVariables: options.decryptVariables ?? false });

    const services = data.environment.projectId ? await this.getProjectServices(data.environment.projectId) : [];
    const buckets = data.environment.projectId ? await this.getProjectBuckets(data.environment.projectId) : [];
    return {
      projectId: data.environment.projectId,
      projectName: undefined,
      environmentId: data.environment.id,
      environmentName: data.environment.name,
      config: data.environment.config ?? {},
      serviceNamesById: Object.fromEntries(services.map(service => [service.id, service.name])),
      bucketNamesById: Object.fromEntries(buckets.map(bucket => [bucket.id, bucket.name])),
    };
  }

  async getStagedPatch(environmentId: string, options: { decryptVariables?: boolean } = {}): Promise<StagedPatchResult> {
    const data = await gql<{ environmentStagedChanges: StagedPatchResult }, { environmentId: string; decryptVariables: boolean }>(this.#config, `query IacStagedPatch($environmentId: String!, $decryptVariables: Boolean) {
      environmentStagedChanges(environmentId: $environmentId) { id status patch(decryptVariables: $decryptVariables) meta }
    }`, { environmentId, decryptVariables: options.decryptVariables ?? false });
    return data.environmentStagedChanges;
  }

  async getProjectServices(projectId: string): Promise<ProjectService[]> {
    const data = await gql<{ project: { services: { edges: Array<{ node: ProjectService }> } } }, { projectId: string }>(this.#config, `query IacProjectServices($projectId: String!) {
      project(id: $projectId) { services(first: 1000) { edges { node { id name } } } }
    }`, { projectId });
    return data.project.services.edges.map(edge => edge.node);
  }

  async getProjectBuckets(projectId: string): Promise<ProjectBucket[]> {
    const data = await gql<{ project: { buckets: { edges: Array<{ node: ProjectBucket }> } } }, { projectId: string }>(this.#config, `query IacProjectBuckets($projectId: String!) {
      project(id: $projectId) { buckets(first: 1000) { edges { node { id name } } } }
    }`, { projectId });
    return data.project.buckets.edges.map(edge => edge.node);
  }

  async ensureGraphResources({ projectId, environmentId, graph, currentConfig }: {
    projectId: string;
    environmentId: string;
    graph: RailwayGraph;
    currentConfig?: EnvironmentConfig;
  }): Promise<EnsuredGraphResources> {
    const existing = await this.getProjectServices(projectId);
    const serviceIdsByName = Object.fromEntries(existing.map(service => [service.name, service.id]));
    const volumeIdsByServiceName = extractVolumeIdsByServiceName({ ...(currentConfig ? { currentConfig } : {}), serviceIdsByName });

    for (const resource of graph.resources) {
      if (resource.type !== "service" && resource.type !== "database") continue;
      if (!serviceIdsByName[resource.name]) {
        const service = await this.createServiceForResource({ projectId, environmentId, resource });
        serviceIdsByName[resource.name] = service.id;
      }
      if (resource.type === "database" && resource.defaultMountPath && !volumeIdsByServiceName[resource.name]) {
        const volume = await this.createVolumeForService({ projectId, environmentId, serviceId: serviceIdsByName[resource.name]! });
        volumeIdsByServiceName[resource.name] = volume.id;
      }
    }

    const bucketIdsByName = await this.ensureGraphBuckets({ projectId, graph });
    return { serviceIdsByName, volumeIdsByServiceName, bucketIdsByName };
  }

  async stageEnvironmentChanges({ environmentId, patch, merge = true }: { environmentId: string; patch: EnvironmentConfig; merge?: boolean }): Promise<{ id: string }> {
    const data = await gql<{ environmentStageChanges: { id: string } }, { environmentId: string; payload: EnvironmentConfig; merge: boolean }>(this.#config, `mutation IacStageEnvironmentChanges($environmentId: String!, $payload: EnvironmentConfig!, $merge: Boolean) {
      environmentStageChanges(environmentId: $environmentId, input: $payload, merge: $merge) { id }
    }`, { environmentId, payload: patch, merge });
    return data.environmentStageChanges;
  }

  async commitStagedPatch({ environmentId, message, skipDeploys }: { environmentId: string; message?: string; skipDeploys?: boolean }): Promise<string> {
    const variables: { environmentId: string; message?: string; skipDeploys?: boolean } = { environmentId };
    if (message !== undefined) variables.message = message;
    if (skipDeploys !== undefined) variables.skipDeploys = skipDeploys;
    const data = await gql<{ environmentPatchCommitStaged: string }, { environmentId: string; message?: string; skipDeploys?: boolean }>(this.#config, `mutation IacCommitStagedPatch($environmentId: String!, $message: String, $skipDeploys: Boolean) {
      environmentPatchCommitStaged(environmentId: $environmentId, commitMessage: $message, skipDeploys: $skipDeploys)
    }`, variables);
    return data.environmentPatchCommitStaged;
  }

  private async ensureGraphBuckets({ projectId, graph }: { projectId: string; graph: RailwayGraph }): Promise<Record<string, string>> {
    const existing = await this.getProjectBuckets(projectId);
    const idsByName = Object.fromEntries(existing.map(bucket => [bucket.name, bucket.id]));
    for (const resource of graph.resources) {
      if (resource.type !== "bucket" || idsByName[resource.name]) continue;
      const bucket = await this.createBucketForResource({ projectId, name: resource.name });
      idsByName[resource.name] = bucket.id;
    }
    return idsByName;
  }

  private async createBucketForResource({ projectId, name }: { projectId: string; name?: string }): Promise<ProjectBucket> {
    const input: BucketCreateInput = { projectId, environmentId: null };
    if (name !== undefined) input.name = name;
    const data = await gql<{ bucketCreate: ProjectBucket }, { input: BucketCreateInput }>(this.#config, `mutation IacBucketCreate($input: BucketCreateInput!) {
      bucketCreate(input: $input) { id name }
    }`, { input });
    return data.bucketCreate;
  }

  private async createVolumeForService({ projectId, serviceId }: { projectId: string; environmentId: string; serviceId: string }): Promise<ProjectVolume> {
    const input: VolumeCreateInput = { projectId, environmentId: null, serviceId, mountPath: "/var/lib/postgresql/data" };
    const data = await gql<{ volumeCreate: ProjectVolume }, { input: VolumeCreateInput }>(this.#config, `mutation IacVolumeCreate($input: VolumeCreateInput!) {
      volumeCreate(input: $input) { id name }
    }`, { input });
    return data.volumeCreate;
  }

  private async createServiceForResource({ projectId, resource }: { projectId: string; environmentId: string; resource: Extract<ResourceNode, { type: "service" | "database" }> }): Promise<ProjectService> {
    const source = resource.type === "database"
      ? { image: resource.image }
      : resource.source?.type === "image" && resource.source.image
        ? { image: resource.source.image }
        : resource.source?.type === "github" && resource.source.repo
          ? { repo: resource.source.repo }
          : undefined;
    const input: ServiceCreateInput = {
      name: resource.name,
      projectId,
      environmentId: null,
    };
    if (source) (input as { source?: ServiceCreateInput["source"] }).source = source as ServiceCreateInput["source"];
    if (resource.type === "service" && resource.source?.type === "github" && resource.source.branch) {
      input.branch = resource.source.branch;
    }
    const data = await gql<{ serviceCreate: ProjectService }, { input: ServiceCreateInput }>(this.#config, `mutation IacServiceCreate($input: ServiceCreateInput!) {
      serviceCreate(input: $input) { id name }
    }`, { input });
    return data.serviceCreate;
  }
}

async function gql<TResult, TVariables>(config: NormalizedRailwayClientConfig, source: string, variables: TVariables): Promise<TResult> {
  return requestGraphQL(config, parse(source) as TypedDocumentNode<TResult, TVariables>, variables);
}

function extractVolumeIdsByServiceName({ currentConfig, serviceIdsByName }: { currentConfig?: EnvironmentConfig; serviceIdsByName: Record<string, string> }): Record<string, string> {
  const volumeIdsByServiceName: Record<string, string> = {};
  for (const [serviceName, serviceId] of Object.entries(serviceIdsByName)) {
    const volumeId = Object.keys(currentConfig?.services?.[serviceId]?.volumeMounts ?? {})[0];
    if (volumeId) volumeIdsByServiceName[serviceName] = volumeId;
  }
  return volumeIdsByServiceName;
}
