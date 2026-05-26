import type { RailwayGraph, ResourceAddress, ResourceNode, VariableValue } from "./graph.js";

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
  | DeleteVariableChange;

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
}

export interface SetVariableChange extends ChangeBase {
  kind: "variable.set";
  address: ResourceAddress;
  variable: string;
  before?: VariableValue | undefined;
  after: VariableValue;
}

export interface DeleteVariableChange extends ChangeBase {
  kind: "variable.delete";
  address: ResourceAddress;
  variable: string;
  previous: VariableValue;
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

    diffVariables({ previous, resource, changes });
    diffTopLevelField({ previous, resource, field: "source", changes });
    diffTopLevelField({ previous, resource, field: "build", changes });
    diffTopLevelField({ previous, resource, field: "deploy", changes });
    diffTopLevelField({ previous, resource, field: "networking", changes });
    diffTopLevelField({ previous, resource, field: "volumeMounts", changes });
    diffTopLevelField({ previous, resource, field: "config", changes });
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

export function renderChangeSet(changeSet: RailwayChangeSet): string {
  if (changeSet.changes.length === 0) return "No changes.";
  return changeSet.changes.map(change => `${marker(change)} ${change.summary}`).join("\n");
}

function diffVariables({ previous, resource, changes }: { previous: ResourceNode; resource: ResourceNode; changes: RailwayChange[] }) {
  if (!("variables" in previous) && !("variables" in resource)) return;
  const before = "variables" in previous ? previous.variables ?? {} : {};
  const after = "variables" in resource ? resource.variables ?? {} : {};
  for (const [key, value] of Object.entries(after)) {
    if (stableStringify(before[key]) === stableStringify(value)) continue;
    changes.push({
      kind: "variable.set",
      address: resource.address,
      variable: key,
      before: before[key],
      after: value,
      path: `resources.${resource.address}.variables.${key}`,
      summary: `${before[key] ? "Update" : "Set"} variable ${resource.name}.${key}`,
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

function diffTopLevelField({ previous, resource, field, changes }: { previous: ResourceNode; resource: ResourceNode; field: string; changes: RailwayChange[] }) {
  const before = (previous as unknown as Record<string, unknown>)[field];
  const after = (resource as unknown as Record<string, unknown>)[field];
  if (stableStringify(before) === stableStringify(after)) return;
  changes.push(update(resource.address, field, before, after, `Update ${resource.name} ${field}`));
}

function update(address: ResourceAddress, field: string, before: unknown, after: unknown, summary: string): UpdateResourceChange {
  return {
    kind: "resource.update",
    address,
    field,
    before,
    after,
    path: `resources.${address}.${field}`,
    summary,
    severity: "safe",
    deployEffect: field === "config" ? "none" : "deploy",
  };
}

function marker(change: RailwayChange): string {
  if (change.kind === "resource.create") return "+";
  if (change.kind === "resource.delete") return "-";
  return "~";
}

function stableStringify(value: unknown): string {
  return JSON.stringify(value, Object.keys(value as object | {}).sort());
}
