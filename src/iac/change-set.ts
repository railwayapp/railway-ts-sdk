import { composePatch, graphToEnvironmentConfig } from "./compiler.js";
import type { GraphCompileOptions, RailwayGraph, ResourceAddress, ResourceNode, VariableValue } from "./graph.js";
import type { EnvironmentConfig } from "./schema.js";

export const RAILWAY_CHANGE_SET_VERSION = 0 as const;

export type RailwayChangeSetVersion = typeof RAILWAY_CHANGE_SET_VERSION;
export type ChangeSeverity = "safe" | "destructive";
export type ChangeDeployEffect = "none" | "deploy" | "unknown";

export interface RailwayChangeSet {
  version: RailwayChangeSetVersion;
  changes: RailwayChange[];
  diagnostics: ChangeDiagnostic[];
}

export type RailwayChange =
  | CreateResourceChange
  | DeleteResourceChange
  | UpdateResourceChange
  | SetVariableChange
  | DeleteVariableChange
  | CreateDomainChange;

export interface ChangeBase {
  kind: string;
  path: string;
  summary: string;
  severity: ChangeSeverity;
  deployEffect: ChangeDeployEffect;
}

export interface CreateResourceChange extends ChangeBase {
  kind: "resource.create";
  address: ResourceAddress;
  resource: ResourceNode;
}

export interface DeleteResourceChange extends ChangeBase {
  kind: "resource.delete";
  address: ResourceAddress;
  previous: ResourceNode;
}

export interface UpdateResourceChange extends ChangeBase {
  kind: "resource.update";
  address: ResourceAddress;
  field: string;
  before: unknown;
  after: unknown;
  details?: string[];
}

export interface SetVariableChange extends ChangeBase {
  kind: "variable.set";
  address: ResourceAddress;
  variable: string;
  before?: VariableValue | undefined;
  after: VariableValue;
  details?: string[];
}

export interface DeleteVariableChange extends ChangeBase {
  kind: "variable.delete";
  address: ResourceAddress;
  variable: string;
  previous: VariableValue;
}

export interface CreateDomainChange extends ChangeBase {
  kind: "domain.create";
  address: ResourceAddress;
  domain: string;
  targetPort?: number;
}

export interface ChangeDiagnostic {
  severity: "warning" | "error";
  path: string;
  message: string;
}

export function diffGraphs({ current, desired }: { current: RailwayGraph; desired: RailwayGraph }): RailwayChangeSet {
  const changes: RailwayChange[] = [];
  const diagnostics: ChangeDiagnostic[] = [];
  const currentByAddress = new Map(current.resources.map(resource => [resource.address, resource]));
  const desiredByAddress = new Map(desired.resources.map(resource => [resource.address, resource]));

  for (const resource of desired.resources) {
    const previous = currentByAddress.get(resource.address);
    if (!previous) {
      changes.push({
        kind: "resource.create",
        address: resource.address,
        resource,
        path: `resources.${resource.address}`,
        summary: `Create ${resource.type} ${resource.name}`,
        severity: "safe",
        deployEffect: resource.type === "service" || resource.type === "database" ? "deploy" : "none",
      });
      continue;
    }

    if (previous.name !== resource.name) {
      changes.push(update(resource.address, "name", previous.name, resource.name, `Rename ${resource.type} ${previous.name} to ${resource.name}`));
    }

    diffVariables({ previous, resource, changes, resourcesByAddress: desiredByAddress });
    diffTopLevelField({ previous, resource, field: "source", changes });
    diffTopLevelField({ previous, resource, field: "build", changes });
    diffTopLevelField({ previous, resource, field: "deploy", changes });
    diffNetworking({ previous, resource, changes });
    // Volume lifecycle is not part of v0 authoring. Never plan an accidental unmount just
    // because imported config omitted a Railway-owned volume id.
    diffTopLevelField({ previous, resource, field: "config", changes });
    if (resource.type === "database") diffTopLevelField({ previous, resource, field: "defaultMountPath", changes });
  }

  for (const resource of current.resources) {
    if (desiredByAddress.has(resource.address)) continue;
    changes.push({
      kind: "resource.delete",
      address: resource.address,
      previous: resource,
      path: `resources.${resource.address}`,
      summary: `Delete ${resource.type} ${resource.name}`,
      severity: "destructive",
      deployEffect: resource.type === "service" || resource.type === "database" ? "deploy" : "none",
    });
  }

  return { version: RAILWAY_CHANGE_SET_VERSION, changes, diagnostics };
}

export function changeSetToGraph({ current, changeSet }: { current: RailwayGraph; changeSet: RailwayChangeSet }): RailwayGraph {
  const next = structuredClone(current) as RailwayGraph;
  const resources = new Map<ResourceAddress, ResourceNode>(next.resources.map(resource => [resource.address, resource]));

  for (const change of changeSet.changes) {
    if (change.kind === "resource.create") {
      resources.set(change.address, structuredClone(change.resource) as ResourceNode);
      continue;
    }

    if (change.kind === "resource.delete") {
      resources.delete(change.address);
      continue;
    }

    const resource = resources.get(change.address);
    if (!resource) continue;

    if (change.kind === "domain.create") {
      continue;
    }

    if (change.kind === "resource.update") {
      (resource as unknown as Record<string, unknown>)[change.field] = structuredClone(change.after);
      continue;
    }

    if (change.kind === "variable.set") {
      const serviceLike = resource as ResourceNode & { variables?: Record<string, VariableValue> };
      serviceLike.variables = serviceLike.variables ?? {};
      serviceLike.variables[change.variable] = structuredClone(change.after) as VariableValue;
      continue;
    }

    if (change.kind === "variable.delete" && "variables" in resource) {
      delete resource.variables?.[change.variable];
    }
  }

  next.resources = [...resources.values()];
  next.edges = next.edges.filter(edge => resources.has(edge.from) && resources.has(edge.to));
  return next;
}

export function changeSetToEnvironmentPatch({
  currentGraph,
  currentConfig,
  changeSet,
  compileOptions = {},
}: {
  currentGraph: RailwayGraph;
  currentConfig: EnvironmentConfig;
  changeSet: RailwayChangeSet;
  compileOptions?: GraphCompileOptions;
}): EnvironmentConfig {
  const desiredGraph = changeSetToGraph({ current: currentGraph, changeSet });
  const desiredConfig = graphToEnvironmentConfig(desiredGraph, compileOptions);
  return composePatch({ currentConfig, desiredConfig });
}

export function validateChangeSet(changeSet: RailwayChangeSet): ChangeDiagnostic[] {
  const diagnostics: ChangeDiagnostic[] = [];
  if (changeSet.version !== RAILWAY_CHANGE_SET_VERSION) {
    diagnostics.push({ severity: "error", path: "version", message: `Unsupported change set version: ${changeSet.version}` });
  }

  for (const [index, change] of changeSet.changes.entries()) {
    if (!change.path) diagnostics.push({ severity: "error", path: `changes.${index}.path`, message: "Change path is required" });
    if (!change.summary) diagnostics.push({ severity: "error", path: `changes.${index}.summary`, message: "Change summary is required" });
    if (change.kind === "resource.delete" && change.severity !== "destructive") {
      diagnostics.push({ severity: "warning", path: `changes.${index}.severity`, message: "Resource deletion should be marked destructive" });
    }
  }

  return diagnostics;
}

export function renderChangeSet(changeSet: RailwayChangeSet): string {
  if (changeSet.changes.length === 0) return "No changes.";
  return changeSet.changes.map(change => `${marker(change)} ${change.summary}`).join("\n");
}

function diffVariables({ previous, resource, changes, resourcesByAddress }: { previous: ResourceNode; resource: ResourceNode; changes: RailwayChange[]; resourcesByAddress: Map<ResourceAddress, ResourceNode> }) {
  if (!("variables" in previous) && !("variables" in resource)) return;
  const before = "variables" in previous ? previous.variables ?? {} : {};
  const after = "variables" in resource ? resource.variables ?? {} : {};
  for (const [key, value] of Object.entries(after)) {
    if (isPreservedVariable(value) || isPreservedVariable(before[key]) || isUnknownImportedVariable(before[key])) continue;
    if (stableStringify(normalizeVariableForDiff(before[key], resourcesByAddress)) === stableStringify(normalizeVariableForDiff(value, resourcesByAddress))) continue;
    changes.push({
      kind: "variable.set",
      address: resource.address,
      variable: key,
      before: before[key],
      after: value,
      path: `resources.${resource.address}.variables.${key}`,
      summary: `${before[key] ? "Update" : "Set"} variable ${resource.name}.${key}`,
      details: [`${resource.name}.${key} (${formatVariableDiffValue(before[key], resourcesByAddress)} → ${formatVariableDiffValue(value, resourcesByAddress)})`],
      severity: "safe",
      deployEffect: "deploy",
    });
  }
  for (const [key, value] of Object.entries(before)) {
    if (key in after) continue;
    changes.push({
      kind: "variable.delete",
      address: resource.address,
      variable: key,
      previous: value,
      path: `resources.${resource.address}.variables.${key}`,
      summary: `Delete variable ${resource.name}.${key}`,
      severity: "destructive",
      deployEffect: "deploy",
    });
  }
}

function diffNetworking({ previous, resource, changes }: { previous: ResourceNode; resource: ResourceNode; changes: RailwayChange[] }) {
  const before = "networking" in previous ? previous.networking : undefined;
  const after = "networking" in resource ? resource.networking : undefined;
  const beforeDomains = before?.customDomains ?? {};
  const afterDomains = after?.customDomains ?? {};

  for (const [domain, config] of Object.entries(afterDomains)) {
    if (beforeDomains[domain]) continue;
    changes.push({
      kind: "domain.create",
      address: resource.address,
      domain,
      ...(config?.port !== undefined && config.port !== null ? { targetPort: config.port } : {}),
      path: `resources.${resource.address}.domains.${domain}`,
      summary: `Create custom domain ${resource.name}.${domain}`,
      severity: "safe",
      deployEffect: "none",
    });
  }

  const normalizedBefore = normalizeForDiff("networking", { ...before, customDomains: undefined, serviceDomains: undefined });
  const normalizedAfter = normalizeForDiff("networking", { ...after, customDomains: undefined, serviceDomains: undefined });
  if (stableStringify(normalizedBefore) !== stableStringify(normalizedAfter)) {
    changes.push(update(resource.address, "networking", before, after, `Update ${resource.name} networking`));
  }
}

function diffTopLevelField({ previous, resource, field, changes }: { previous: ResourceNode; resource: ResourceNode; field: string; changes: RailwayChange[] }) {
  const before = (previous as unknown as Record<string, unknown>)[field];
  const after = (resource as unknown as Record<string, unknown>)[field];
  if (field === "source" && previous.type === "database" && isEquivalentDatabaseSource(previous, after)) return;
  const normalizedBefore = normalizeForDiff(field, before);
  const normalizedAfter = normalizeForDiff(field, after);
  if (stableStringify(normalizedBefore) === stableStringify(normalizedAfter)) return;
  changes.push(update(resource.address, field, before, after, summaryForField(resource, field, normalizedBefore, normalizedAfter), changedLeafPaths(normalizedBefore, normalizedAfter, field)));
}

function summaryForField(resource: ResourceNode, field: string, before: unknown, after: unknown): string {
  const details = changedLeafPaths(before, after, field);
  if (details.length > 0) {
    const shown = details.slice(0, 3).map(detailPathForSummary).join(", ");
    const remaining = details.length - 3;
    return `Update ${resource.name} ${shown}${remaining > 0 ? ` and ${remaining} more` : ""}`;
  }

  if (field === "networking") {
    const beforeDomains = Object.keys(((before as { customDomains?: Record<string, unknown> } | undefined)?.customDomains) ?? {});
    const afterDomains = Object.keys(((after as { customDomains?: Record<string, unknown> } | undefined)?.customDomains) ?? {});
    const created = afterDomains.filter(domain => !beforeDomains.includes(domain));
    if (created.length === 1) return `Create custom domain ${resource.name}.${created[0]}`;
    if (created.length > 1) return `Create ${created.length} custom domains for ${resource.name}`;
  }
  return `Update ${resource.name} ${field}`;
}

function detailPathForSummary(detail: string): string {
  return detail.replace(/ \(.+\)$/, "");
}

function changedLeafPaths(before: unknown, after: unknown, prefix: string): string[] {
  const beforeFlat = flattenForDiff(before);
  const afterFlat = flattenForDiff(after);
  const changed = [...new Set([...Object.keys(beforeFlat), ...Object.keys(afterFlat)])]
    .filter(key => stableStringify(beforeFlat[key]) !== stableStringify(afterFlat[key]))
    .sort();
  return changed
    .filter(key => key !== "" || changed.length === 1)
    .filter(key => key === "" || !changed.some(other => other !== key && other.startsWith(`${key}.`)))
    .map(key => {
      const path = key ? `${prefix}.${key}` : prefix;
      const beforeValue = beforeFlat[key];
      const afterValue = afterFlat[key];
      return `${friendlyPath(path)} (${formatDiffValue(beforeValue)} → ${formatDiffValue(afterValue)})`;
    });
}

function friendlyPath(path: string): string {
  const region = /^deploy\.multiRegionConfig\.([^.]+)\.numReplicas$/.exec(path);
  if (region) return `regions.${region[1]}`;
  return path;
}

function formatDiffValue(value: unknown): string {
  if (value === undefined) return "unset";
  if (value === null) return "null";
  if (typeof value === "string") return JSON.stringify(value);
  return JSON.stringify(value);
}

function flattenForDiff(value: unknown, prefix = ""): Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return { [prefix]: value };
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length === 0) return { [prefix]: value };
  return Object.fromEntries(entries.flatMap(([key, child]) => Object.entries(flattenForDiff(child, prefix ? `${prefix}.${key}` : key))));
}

function update(address: ResourceAddress, field: string, before: unknown, after: unknown, summary: string, details?: string[]): UpdateResourceChange {
  return {
    kind: "resource.update",
    address,
    field,
    before,
    after,
    ...(details && details.length > 0 ? { details } : {}),
    path: `resources.${address}.${field}`,
    summary,
    severity: "safe",
    deployEffect: field === "config" ? "none" : "deploy",
  };
}

function marker(change: RailwayChange): string {
  if (change.kind === "resource.create" || change.kind === "domain.create") return "+";
  if (change.kind === "resource.delete") return "-";
  return "~";
}

function formatVariableDiffValue(value: VariableValue | undefined, resourcesByAddress: Map<ResourceAddress, ResourceNode>): string {
  if (value === undefined) return "unset";
  if (value.type === "preserve") return "preserve()";
  if (value.type === "literal") return formatDiffValue(value.value);
  if (value.type === "reference") {
    const name = resourcesByAddress.get(value.resource)?.name ?? value.resource.split(".").slice(1).join(".") ?? value.resource;
    return `${name}.${value.output}`;
  }
  return formatDiffValue(normalizeVariableForDiff(value, resourcesByAddress));
}

function normalizeVariableForDiff(value: VariableValue | undefined, resourcesByAddress: Map<ResourceAddress, ResourceNode>): unknown {
  if (value?.type !== "reference") return value;
  const name = resourcesByAddress.get(value.resource)?.name ?? value.resource.split(".").slice(1).join(".") ?? value.resource;
  return { type: "literal", value: `\${{${name}.${value.output}}}` };
}

function isEquivalentDatabaseSource(previous: ResourceNode, after: unknown): boolean {
  if (previous.type !== "database" || after == null || typeof after !== "object") return false;
  const source = after as Record<string, unknown>;
  return source.type === "image" && normalizeImageTag(String(source.image)) === normalizeImageTag(previous.image);
}

function isPreservedVariable(value: VariableValue | undefined): boolean {
  return value?.type === "preserve";
}

function isUnknownImportedVariable(value: VariableValue | undefined): boolean {
  return value?.type === "literal" && value.value === "";
}

function normalizeForDiff(field: string, value: unknown): unknown {
  if (value == null || typeof value !== "object") return value;
  const copy = structuredClone(value) as Record<string, unknown>;

  if (field === "source") {
    if (copy.checkSuites === false) delete copy.checkSuites;
    if (copy.branch === "main") delete copy.branch;
    delete copy.commitSha;
    delete copy.upstreamUrl;
    if (copy.rootDirectory === "") delete copy.rootDirectory;
    if (typeof copy.image === "string") copy.image = normalizeImageTag(copy.image);
  }

  if (field === "build") {
    if (copy.builder === "RAILPACK") delete copy.builder;
    if (copy.buildEnvironment === "V3") delete copy.buildEnvironment;
  }

  if (field === "deploy") {
    if (copy.useLegacyStacker === false) delete copy.useLegacyStacker;
    if (copy.ipv6EgressEnabled === false) delete copy.ipv6EgressEnabled;
    if (copy.runtime === "V2") delete copy.runtime;
    copy.multiRegionConfig = normalizeMultiRegionConfig(copy.multiRegionConfig);
    if (isDefaultMultiRegionConfig(copy.multiRegionConfig)) delete copy.multiRegionConfig;
    if (copy.multiRegionConfig != null && typeof copy.multiRegionConfig === "object" && !Array.isArray(copy.multiRegionConfig) && Object.keys(copy.multiRegionConfig).length === 0) delete copy.multiRegionConfig;
  }

  return Object.keys(copy).length === 0 ? undefined : copy;
}

function normalizeMultiRegionConfig(value: unknown): unknown {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return value;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, config]) => {
      if (config == null || typeof config !== "object" || Array.isArray(config)) return true;
      const replicas = (config as Record<string, unknown>).numReplicas;
      return replicas !== null && replicas !== undefined;
    });
  return Object.fromEntries(entries);
}

function isDefaultMultiRegionConfig(value: unknown): boolean {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return false;
  const entries = Object.entries(value as Record<string, unknown>);
  if (entries.length !== 1) return false;
  const config = entries[0]?.[1];
  if (config == null || typeof config !== "object" || Array.isArray(config)) return false;
  const regionConfig = config as Record<string, unknown>;
  return Object.entries(regionConfig).every(([key, child]) =>
    (key === "numReplicas" && child === 1) ||
    (key === "stackerAssignment" && child == null)
  );
}

function normalizeImageTag(image: string): string {
  const match = /^(?:railwayapp\/|ghcr\.io\/railwayapp-templates\/)?(redis|mysql|mongo|postgres)(?:-ssl)?:(\d+)(?:\.\d+)*$/.exec(image);
  if (!match) return image;
  return `${match[1]}:${match[2]}`;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortForJson(value));
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortForJson);
  if (value == null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, child]) => [key, sortForJson(child)]),
  );
}
