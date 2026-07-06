import { Kind, parse, type DocumentNode } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import { requestGraphQL } from "../core/graphql-client.js";
import type { NormalizedRailwayClientConfig } from "../core/config.js";
import type { RegistrySignalRow } from "./types.js";

export interface SignalsQueryResult {
  signals: RegistrySignalRow[];
}

export interface SignalsQueryVariables {
  owner: string;
}

const SIGNALS_QUERY = parse(`
  query RailwaySignals($owner: String!) {
    signals(owner: $owner) {
      name
      type
      default
      rules
      version
    }
  }
`) as DocumentNode;

export const RailwaySignalsDocument = SIGNALS_QUERY as TypedDocumentNode<
  SignalsQueryResult,
  SignalsQueryVariables
>;

export async function fetchRegistrySignals(
  config: NormalizedRailwayClientConfig,
  owner: string,
): Promise<RegistrySignalRow[]> {
  const data = await requestGraphQL(config, RailwaySignalsDocument, { owner });
  return data.signals;
}

export function operationName(document: DocumentNode): string {
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      return definition.name?.value ?? "anonymous";
    }
  }
  return "operation";
}
