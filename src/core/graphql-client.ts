import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print, type DocumentNode } from "graphql";

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

  if (!response.ok || errors.length > 0) {
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
    throw new RailwayGraphQLError({
      message: "Railway GraphQL response did not include data.",
      status: response.status,
      responseBody: body,
    });
  }

  return body.data;
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
