import type { ResourceAddress } from "./graph.js";

/** Stored owner for a file that omitted `export const partial` (whole environment). */
export const PROJECT_PARTIAL = "*";

const PARTIAL_NAME = /^[a-zA-Z0-9._-]{1,64}$/;

export type IacPartials = Record<string, string>;

export function parsePartialExport(mod: unknown): string | undefined {
  const seen = new Set<unknown>();
  let current: unknown = mod;
  while (current != null && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const record = current as Record<string, unknown>;
    if ("partial" in record || "PARTIAL" in record || "Partial" in record) {
      const value = record.partial ?? record.PARTIAL ?? record.Partial;
      if (value === undefined || value === null) return undefined;
      if (typeof value !== "string" || value === PROJECT_PARTIAL || !PARTIAL_NAME.test(value)) {
        throw new Error(
          `Invalid partial export: ${JSON.stringify(value)}. Use a 1–64 character name matching [a-zA-Z0-9._-]+.`,
        );
      }
      return value;
    }
    if (!("default" in record)) break;
    current = record.default;
  }
  return undefined;
}

export function hasNamedPartials(owners: IacPartials | undefined): boolean {
  return Object.values(owners ?? {}).some(owner => owner !== PROJECT_PARTIAL);
}

export function ownerOf(owners: IacPartials | undefined, address: string): string | undefined {
  return owners?.[address];
}

export function isForeign(owners: IacPartials | undefined, address: string, partial: string): boolean {
  const owner = ownerOf(owners, address);
  return owner != null && owner !== partial;
}

export function effectivePartial(partial: string | undefined): string {
  return partial ?? PROJECT_PARTIAL;
}

export function declaredAddresses(addresses: readonly string[]): ResourceAddress[] {
  return [...addresses] as ResourceAddress[];
}

export function foreignResourceMessage(address: string, owner: string): string {
  const dot = address.indexOf(".");
  const type = dot > 0 ? address.slice(0, dot) : "resource";
  const name = dot > 0 ? address.slice(dot + 1) : address;
  return `Cannot manage ${type} "${name}": already managed by partial "${owner}".`;
}

export function namelessFileMessage(): string {
  return 'This environment already has named IaC partials. Export `const partial = "<name>"` from this file instead of managing the whole project.';
}

export function needsPartialClaimApply(
  declared: readonly string[],
  owners: IacPartials | undefined,
  partial: string | undefined,
): boolean {
  const p = effectivePartial(partial);
  return declared.some(address => ownerOf(owners, address) !== p);
}
