import { parse } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { normalizeRailwayClientConfig, type RailwayClientConfig, type NormalizedRailwayClientConfig } from "../core/config.js";
import { requestGraphQL } from "../core/graphql-client.js";
import { RailwayGraphQLError, StaleEnvironmentError, STALE_ENVIRONMENT_BASE_CODE } from "../core/errors.js";
import type { BucketCreateInput, CustomDomainCreateInput, ServiceCreateInput, ServiceDomainCreateInput, ServiceDomainUpdateInput, VolumeCreateInput } from "../generated/graphql.js";
import type { CreateDomainChange, DeleteDomainChange, DomainType, RailwayChange, RailwayChangeSet, UpdateDomainChange } from "./change-set.js";
import type { RailwayGraph, ResourceNode } from "./graph.js";
import type { EnvironmentConfig } from "./schema.js";

export interface CurrentEnvironmentResult {
  projectId?: string | undefined;
  projectName?: string | undefined;
  environmentId: string;
  environmentName?: string | undefined;
  config: EnvironmentConfig;
  /** Opaque snapshot token of the environment config the plan was computed against. */
  configEtag?: string | undefined;
  serviceNamesById: Record<string, string>;
  volumeNamesById: Record<string, string>;
  volumeGroupIdsById: Record<string, string>;
  bucketNamesById: Record<string, string>;
  bucketGroupIdsById: Record<string, string>;
  customDomainsByServiceId: Record<string, Record<string, { port?: number }>>;
}

export interface StagedPatchResult {
  id: string;
  status: string;
  patch: EnvironmentConfig;
  meta?: unknown;
}

export interface ChangeOperationResult {
  kind: string;
  path?: string | null;
  summary?: string | null;
  status: string;
  outputs?: unknown;
}

export interface ChangeSetPreviewResult {
  changeSet: RailwayChangeSet;
  diagnostics: unknown[];
  effects: unknown[];
}

export interface ChangeSetApplyResult {
  id: string;
  status: string;
  changes: ChangeOperationResult[];
  diagnostics: unknown[];
  deploymentId?: string | null;
  stagedPatchId?: string | null;
}

export interface DomainRecord { id: string; domain: string; port?: number }
interface RawDomain { id: string; domain: string; targetPort?: number | null }

export interface DomainReconcileResult {
  kind: "domain.create" | "domain.update" | "domain.delete";
  domainType: DomainType;
  address: string;
  domain: string;
  status: "created" | "updated" | "deleted" | "skipped" | "failed";
  reason?: string;
}
export interface ProjectService { id: string; name: string }
export interface ProjectVolume { id: string; name?: string | null; serviceId?: string | null }
export interface ProjectBucket { id: string; name: string; groupId?: string | null }

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
      environment: { id: string; name?: string; projectId?: string; config: EnvironmentConfig; configEtag?: string; canvasGroupRefs?: Record<string, string> };
    }, { environmentId: string; decryptVariables: boolean }>(this.#config, `query IacEnvironmentConfig($environmentId: String!, $decryptVariables: Boolean) {
      environment(id: $environmentId) { id name projectId config(decryptVariables: $decryptVariables) configEtag canvasGroupRefs }
    }`, { environmentId, decryptVariables: options.decryptVariables ?? false });

    const projectName = data.environment.projectId ? await this.getProjectName(data.environment.projectId) : undefined;
    const services = data.environment.projectId ? await this.getProjectServices(data.environment.projectId) : [];
    const volumes = data.environment.projectId ? await this.getProjectVolumes(data.environment.projectId) : [];
    const buckets = data.environment.projectId ? await this.getProjectBuckets(data.environment.projectId) : [];
    const customDomainsByServiceId = data.environment.projectId ? await this.getEnvironmentCustomDomains(data.environment.projectId, environmentId, services) : {};
    return {
      projectId: data.environment.projectId,
      projectName,
      environmentId: data.environment.id,
      environmentName: data.environment.name,
      config: data.environment.config ?? {},
      serviceNamesById: Object.fromEntries(services.map(service => [service.id, service.name])),
      volumeNamesById: Object.fromEntries(volumes.flatMap(volume => volume.name ? [[volume.id, volume.name] as const] : [])),
      volumeGroupIdsById: Object.fromEntries(volumes.flatMap(volume => {
        const groupId = data.environment.canvasGroupRefs?.[volume.id];
        return groupId ? [[volume.id, groupId] as const] : [];
      })),
      bucketNamesById: Object.fromEntries(buckets.map(bucket => [bucket.id, bucket.name])),
      bucketGroupIdsById: Object.fromEntries(buckets.flatMap(bucket => bucket.groupId ? [[bucket.id, bucket.groupId] as const] : [])),
      customDomainsByServiceId,
      ...(data.environment.configEtag ? { configEtag: data.environment.configEtag } : {}),
    };
  }

  async getStagedPatch(environmentId: string, options: { decryptVariables?: boolean } = {}): Promise<StagedPatchResult> {
    const data = await gql<{ environmentStagedChanges: StagedPatchResult }, { environmentId: string; decryptVariables: boolean }>(this.#config, `query IacStagedPatch($environmentId: String!, $decryptVariables: Boolean) {
      environmentStagedChanges(environmentId: $environmentId) { id status patch(decryptVariables: $decryptVariables) meta }
    }`, { environmentId, decryptVariables: options.decryptVariables ?? false });
    return data.environmentStagedChanges;
  }

  async getProjectName(projectId: string): Promise<string | undefined> {
    const data = await gql<{ project: { name?: string | null } }, { projectId: string }>(this.#config, `query IacProjectName($projectId: String!) {
      project(id: $projectId) { name }
    }`, { projectId });
    return data.project.name ?? undefined;
  }

  async getProjectServices(projectId: string): Promise<ProjectService[]> {
    const data = await gql<{ project: { services: { edges: Array<{ node: ProjectService }> } } }, { projectId: string }>(this.#config, `query IacProjectServices($projectId: String!) {
      project(id: $projectId) { services(first: 1000) { edges { node { id name } } } }
    }`, { projectId });
    return data.project.services.edges.map(edge => edge.node);
  }

  async getProjectVolumes(projectId: string): Promise<ProjectVolume[]> {
    const data = await gql<{ project: { volumes: { edges: Array<{ node: ProjectVolume }> } } }, { projectId: string }>(this.#config, `query IacProjectVolumes($projectId: String!) {
      project(id: $projectId) { volumes(first: 1000) { edges { node { id name } } } }
    }`, { projectId });
    return data.project.volumes?.edges.map(edge => edge.node) ?? [];
  }

  async getProjectBuckets(projectId: string): Promise<ProjectBucket[]> {
    const data = await gql<{ project: { buckets: { edges: Array<{ node: ProjectBucket }> } } }, { projectId: string }>(this.#config, `query IacProjectBuckets($projectId: String!) {
      project(id: $projectId) { buckets(first: 1000) { edges { node { id name groupId } } } }
    }`, { projectId });
    return data.project.buckets.edges.map(edge => edge.node);
  }

  async getEnvironmentCustomDomains(projectId: string, environmentId: string, services: ProjectService[]): Promise<Record<string, Record<string, { port?: number }>>> {
    const entries = await Promise.all(services.map(async service => {
      const data = await gql<{ domains: { customDomains: Array<{ domain: string; targetPort?: number | null }> } }, { projectId: string; environmentId: string; serviceId: string }>(this.#config, `query IacServiceDomains($projectId: String!, $environmentId: String!, $serviceId: String!) {
        domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) { customDomains { domain targetPort } }
      }`, { projectId, environmentId, serviceId: service.id });
      return [service.id, Object.fromEntries(data.domains.customDomains.map(domain => [domain.domain, domain.targetPort == null ? {} : { port: domain.targetPort }]))] as const;
    }));
    return Object.fromEntries(entries.filter(([, domains]) => Object.keys(domains).length > 0));
  }

  // Fetches existing domains (custom + service) with their ids — needed to update/delete a
  // domain, which the dedicated mutations key by id rather than by name.
  async getServiceDomainRecords(projectId: string, environmentId: string, serviceId: string): Promise<{ custom: DomainRecord[]; service: DomainRecord[] }> {
    const data = await gql<{ domains: { customDomains: RawDomain[]; serviceDomains: RawDomain[] } }, { projectId: string; environmentId: string; serviceId: string }>(this.#config, `query IacServiceDomainRecords($projectId: String!, $environmentId: String!, $serviceId: String!) {
      domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
        customDomains { id domain targetPort }
        serviceDomains { id domain targetPort }
      }
    }`, { projectId, environmentId, serviceId });
    const map = (list: RawDomain[]): DomainRecord[] => list.map(domain => ({ id: domain.id, domain: domain.domain, ...(domain.targetPort == null ? {} : { port: domain.targetPort }) }));
    return { custom: map(data.domains.customDomains), service: map(data.domains.serviceDomains) };
  }

  async createCustomDomain(input: CustomDomainCreateInput): Promise<DomainRecord> {
    const data = await gql<{ customDomainCreate: { id: string; domain: string } }, { input: CustomDomainCreateInput }>(this.#config, `mutation IacCustomDomainCreate($input: CustomDomainCreateInput!) {
      customDomainCreate(input: $input) { id domain }
    }`, { input });
    return data.customDomainCreate;
  }

  async updateCustomDomain(args: { environmentId: string; id: string; targetPort?: number }): Promise<void> {
    await gql<{ customDomainUpdate: boolean }, { environmentId: string; id: string; targetPort?: number }>(this.#config, `mutation IacCustomDomainUpdate($environmentId: String!, $id: String!, $targetPort: Int) {
      customDomainUpdate(environmentId: $environmentId, id: $id, targetPort: $targetPort)
    }`, args);
  }

  async deleteCustomDomain(id: string): Promise<void> {
    await gql<{ customDomainDelete: boolean }, { id: string }>(this.#config, `mutation IacCustomDomainDelete($id: String!) {
      customDomainDelete(id: $id)
    }`, { id });
  }

  async createServiceDomain(input: ServiceDomainCreateInput): Promise<DomainRecord> {
    const data = await gql<{ serviceDomainCreate: { id: string; domain: string } }, { input: ServiceDomainCreateInput }>(this.#config, `mutation IacServiceDomainCreate($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) { id domain }
    }`, { input });
    return data.serviceDomainCreate;
  }

  async updateServiceDomain(input: ServiceDomainUpdateInput): Promise<void> {
    await gql<{ serviceDomainUpdate: boolean }, { input: ServiceDomainUpdateInput }>(this.#config, `mutation IacServiceDomainUpdate($input: ServiceDomainUpdateInput!) {
      serviceDomainUpdate(input: $input)
    }`, { input });
  }

  async deleteServiceDomain(id: string): Promise<void> {
    await gql<{ serviceDomainDelete: boolean }, { id: string }>(this.#config, `mutation IacServiceDomainDelete($id: String!) {
      serviceDomainDelete(id: $id)
    }`, { id });
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

  async previewChangeSet({ environmentId, changeSet }: { environmentId: string; changeSet: RailwayChangeSet }): Promise<ChangeSetPreviewResult> {
    const data = await gql<{ environmentPreviewChangeSet: ChangeSetPreviewResult }, { environmentId: string; input: RailwayChangeSet }>(this.#config, `mutation IacPreviewChangeSet($environmentId: String!, $input: JSON!) {
      environmentPreviewChangeSet(environmentId: $environmentId, input: $input) { changeSet diagnostics effects }
    }`, { environmentId, input: changeSet });
    return data.environmentPreviewChangeSet;
  }

  async applyChangeSet({ environmentId, changeSet, commitMessage, baseEtag }: { environmentId: string; changeSet: RailwayChangeSet; commitMessage?: string; baseEtag?: string }): Promise<ChangeSetApplyResult> {
    const variables: { environmentId: string; input: RailwayChangeSet; commitMessage?: string; baseConfigEtag?: string } = { environmentId, input: changeSet };
    if (commitMessage !== undefined) variables.commitMessage = commitMessage;
    // Optimistic concurrency: the server rejects the apply if the environment moved
    // since this plan's base. Omitted etag (older server/client) skips the check.
    if (baseEtag !== undefined) variables.baseConfigEtag = baseEtag;
    try {
      const data = await gql<{ environmentApplyChangeSet: ChangeSetApplyResult }, typeof variables>(this.#config, `mutation IacApplyChangeSet($environmentId: String!, $input: JSON!, $commitMessage: String, $baseConfigEtag: String) {
        environmentApplyChangeSet(environmentId: $environmentId, input: $input, commitMessage: $commitMessage, baseConfigEtag: $baseConfigEtag) { id status deploymentId stagedPatchId diagnostics changes { kind path summary status outputs } }
      }`, variables);
      return data.environmentApplyChangeSet;
    } catch (error) {
      if (isStaleBaseError(error)) {
        throw new StaleEnvironmentError("The environment changed since this plan was computed. Re-run plan and review the changes before applying.", { cause: error });
      }
      throw error;
    }
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

  // Realizes the plan's domain.* changes through the dedicated domain mutations, which are
  // the only mechanism that actually provisions domains (the config/change-set path does
  // not). Runs after applyChangeSet so services created by the change set already exist.
  async reconcileDomains({ projectId, environmentId, changes }: { projectId: string; environmentId: string; changes: RailwayChange[] }): Promise<DomainReconcileResult[]> {
    const domainChanges = changes.filter((change): change is CreateDomainChange | UpdateDomainChange | DeleteDomainChange =>
      change.kind === "domain.create" || change.kind === "domain.update" || change.kind === "domain.delete");
    if (domainChanges.length === 0) return [];

    // Resolve service ids from the post-apply project state (a change set may have just
    // created the target service).
    const services = await this.getProjectServices(projectId);
    const serviceIdByName = Object.fromEntries(services.map(service => [service.name, service.id]));
    const recordsCache = new Map<string, { custom: DomainRecord[]; service: DomainRecord[] }>();
    const findDomainId = async (serviceId: string, domainType: DomainType, domain: string): Promise<string | undefined> => {
      let records = recordsCache.get(serviceId);
      if (!records) { records = await this.getServiceDomainRecords(projectId, environmentId, serviceId); recordsCache.set(serviceId, records); }
      return (domainType === "custom" ? records.custom : records.service).find(record => record.domain === domain)?.id;
    };

    const results: DomainReconcileResult[] = [];
    for (const change of domainChanges) {
      const serviceName = change.address.slice("service.".length);
      const serviceId = serviceIdByName[serviceName];
      const base = { kind: change.kind, domainType: change.domainType, address: change.address, domain: change.domain } as const;
      if (!serviceId) { results.push({ ...base, status: "skipped", reason: `service ${serviceName} not found` }); continue; }
      const targetPort = "targetPort" in change && change.targetPort != null ? { targetPort: change.targetPort } : {};
      try {
        if (change.kind === "domain.create") {
          if (change.domainType === "custom") {
            await this.createCustomDomain({ domain: change.domain, environmentId, projectId, serviceId, ...targetPort });
          } else {
            // serviceDomainCreate assigns a random *.up.railway.app subdomain; immediately
            // rename it to the authored name so the result is deterministic and re-diffs clean.
            const created = await this.createServiceDomain({ environmentId, serviceId, ...targetPort });
            if (created.domain !== change.domain) {
              await this.updateServiceDomain({ environmentId, serviceId, serviceDomainId: created.id, domain: change.domain, ...targetPort });
            }
          }
          results.push({ ...base, status: "created" });
        } else if (change.kind === "domain.update") {
          const id = await findDomainId(serviceId, change.domainType, change.domain);
          if (!id) { results.push({ ...base, status: "skipped", reason: "existing domain not found" }); continue; }
          if (change.domainType === "custom") await this.updateCustomDomain({ environmentId, id, ...targetPort });
          else await this.updateServiceDomain({ environmentId, serviceId, serviceDomainId: id, domain: change.domain, ...targetPort });
          results.push({ ...base, status: "updated" });
        } else {
          const id = await findDomainId(serviceId, change.domainType, change.domain);
          if (!id) { results.push({ ...base, status: "skipped", reason: "existing domain not found" }); continue; }
          if (change.domainType === "custom") await this.deleteCustomDomain(id);
          else await this.deleteServiceDomain(id);
          results.push({ ...base, status: "deleted" });
        }
      } catch (error) {
        results.push({ ...base, status: "failed", reason: error instanceof Error ? error.message : String(error) });
      }
    }
    return results;
  }
}

async function gql<TResult, TVariables>(config: NormalizedRailwayClientConfig, source: string, variables: TVariables): Promise<TResult> {
  return requestGraphQL(config, parse(source) as TypedDocumentNode<TResult, TVariables>, variables);
}

function isStaleBaseError(error: unknown): boolean {
  if (!(error instanceof RailwayGraphQLError)) return false;
  return error.errors.some(item => item.extensions?.code === STALE_ENVIRONMENT_BASE_CODE);
}

function extractVolumeIdsByServiceName({ currentConfig, serviceIdsByName }: { currentConfig?: EnvironmentConfig; serviceIdsByName: Record<string, string> }): Record<string, string> {
  const volumeIdsByServiceName: Record<string, string> = {};
  for (const [serviceName, serviceId] of Object.entries(serviceIdsByName)) {
    const volumeId = Object.keys(currentConfig?.services?.[serviceId]?.volumeMounts ?? {})[0];
    if (volumeId) volumeIdsByServiceName[serviceName] = volumeId;
  }
  return volumeIdsByServiceName;
}
