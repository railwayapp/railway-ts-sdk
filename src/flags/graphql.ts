import { Kind, parse, type DocumentNode } from "graphql";
import type { TypedDocumentNode } from "@graphql-typed-document-node/core";

import { requestGraphQL } from "../core/graphql-client.js";
import type { NormalizedRailwayClientConfig } from "../core/config.js";
import type { RegistrySignalRow } from "./types.js";

export interface SignalsQueryResult {
  signals: RegistrySignalRow[];
}

export interface SignalsQueryWithOwnerVariables {
  owner: string;
}

const SIGNALS_WITH_OWNER_QUERY = parse(`
  query RailwaySignalsWithOwner($owner: String!) {
    signals(owner: $owner) {
      name
      type
      default
      rules
      version
    }
  }
`) as DocumentNode;

const SIGNALS_INFERRED_QUERY = parse(`
  query RailwaySignalsInferred {
    signals {
      name
      type
      default
      rules
      version
    }
  }
`) as DocumentNode;

export const RailwaySignalsWithOwnerDocument =
  SIGNALS_WITH_OWNER_QUERY as TypedDocumentNode<
    SignalsQueryResult,
    SignalsQueryWithOwnerVariables
  >;

export const RailwaySignalsInferredDocument =
  SIGNALS_INFERRED_QUERY as TypedDocumentNode<SignalsQueryResult, Record<string, never>>;

export async function fetchRegistrySignals(
  config: NormalizedRailwayClientConfig,
  owner: string | undefined,
): Promise<RegistrySignalRow[]> {
  if (owner === undefined) {
    const data = await requestGraphQL(
      config,
      RailwaySignalsInferredDocument,
      {},
    );
    return data.signals;
  }

  const data = await requestGraphQL(config, RailwaySignalsWithOwnerDocument, {
    owner,
  });
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
