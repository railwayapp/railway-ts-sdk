import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { Kind, print, type DocumentNode } from "graphql";

import type { NormalizedRailwayClientConfig } from "./config.js";
import {
  RailwayGraphQLError,
  type RailwayGraphQLErrorItem,
} from "./errors.js";
import { USER_AGENT } from "./version.js";

interface GraphQLResponse<TResult> {
  data?: TResult;
  errors?: RailwayGraphQLErrorItem[];
}

export async function requestGraphQL<TResult, TVariables>(
  config: NormalizedRailwayClientConfig,
  document: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables,
): Promise<TResult> {
  const operation = operationName(document as DocumentNode);
  const start = Date.now();
  config.log(`→ ${operation} POST ${config.endpoint}`);

  const response = await config.fetch(config.endpoint, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...authHeader(config),
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({
      query: print(document as DocumentNode),
      variables,
    }),
  });

  const body = await parseGraphQLResponse<TResult>(response);
  const errors = body?.errors ?? [];
  const elapsed = Date.now() - start;

  if (!response.ok || errors.length > 0) {
    config.log(
      `← ${operation} failed http=${response.status} errors=${errors.length} in ${elapsed}ms`,
    );
    throw new RailwayGraphQLError({
      message:
        errors[0]?.message ??
        `Railway GraphQL request failed with HTTP ${response.status}.`,
      status: response.status,
      errors,
      responseBody: body,
    });
  }

  if (!body?.data) {
    config.log(`← ${operation} returned no data`);
    throw new RailwayGraphQLError({
      message: "Railway GraphQL response did not include data.",
      status: response.status,
      responseBody: body,
    });
  }

  config.log(`← ${operation} ok in ${elapsed}ms`);
  return body.data;
}

function operationName(document: DocumentNode): string {
  for (const definition of document.definitions) {
    if (definition.kind === Kind.OPERATION_DEFINITION) {
      return definition.name?.value ?? "anonymous";
    }
  }
  return "operation";
}

function authHeader(config: NormalizedRailwayClientConfig): Record<string, string> {
  if (config.authType === "project-token") return { "project-access-token": config.token };
  return { Authorization: `Bearer ${config.token}` };
}

async function parseGraphQLResponse<TResult>(
  response: Response,
): Promise<GraphQLResponse<TResult> | undefined> {
  try {
    return (await response.json()) as GraphQLResponse<TResult>;
  } catch {
    return undefined;
  }
}
