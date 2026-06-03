import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print, type DocumentNode } from "graphql";
import { createClient } from "graphql-ws";

import type { NormalizedRailwayClientConfig } from "./config.js";
import {
  RailwayConnectionError,
  RailwayGraphQLError,
  type RailwayGraphQLErrorItem,
} from "./errors.js";

/** Returned from `onNext` to end the subscription early from the client side. */
export const STOP_SUBSCRIPTION = Symbol("stop-subscription");

/**
 * graphql-ws close codes where reconnecting cannot help (bad request/response,
 * auth, protocol misuse). Everything else — including abnormal closures and
 * server restarts (4500, which backboard also uses for masked resolver
 * errors) — is worth a retry.
 */
const FATAL_CLOSE_CODES = new Set([4004, 4005, 4400, 4401, 4403, 4406, 4409, 4429]);

export function isRetryableSubscriptionError(error: unknown): boolean {
  return (
    error instanceof RailwayConnectionError &&
    (error.closeCode === undefined || !FATAL_CLOSE_CODES.has(error.closeCode))
  );
}

/**
 * Runs a single GraphQL subscription over graphql-ws until the server
 * completes it (or `onNext` returns STOP_SUBSCRIPTION). Rejects with
 * RailwayGraphQLError for server-sent errors and RailwayConnectionError for
 * transport failures.
 *
 * Each call opens a fresh connection and never auto-retries: callers own
 * resume so they can re-subscribe with an updated cursor instead of letting
 * graphql-ws replay stale variables.
 */
export async function executeGraphQLSubscription<
  TResult,
  TVariables extends Record<string, unknown>,
>(
  config: NormalizedRailwayClientConfig,
  document: TypedDocumentNode<TResult, TVariables>,
  variables: TVariables,
  onNext: (data: TResult) => void | typeof STOP_SUBSCRIPTION,
): Promise<void> {
  const client = createClient({
    url: deriveWebSocketUrl(config.endpoint),
    connectionParams: { Authorization: `Bearer ${config.token}` },
    webSocketImpl: resolveWebSocketImpl(config),
    retryAttempts: 0,
    lazy: true,
  });

  try {
    await new Promise<void>((resolve, reject) => {
      // Any socket close ends this attempt (no-op if already settled). This
      // also defeats graphql-ws's internal re-subscribe after a clean 1000
      // close, which would replay the stale cursor in `variables`. A clean
      // close counts as completion, not failure, so a server ending its
      // streaming window never burns the caller's retry budget.
      client.on("closed", event => {
        if (isCloseEventLike(event) && event.code === 1000) resolve();
        else reject(classifySubscriptionError(event));
      });
      client.subscribe<TResult>(
        { query: print(document as DocumentNode), variables },
        {
          next: result => {
            if (result.errors && result.errors.length > 0) {
              reject(toRailwayGraphQLError(result.errors));
              return;
            }
            if (result.data != null && onNext(result.data) === STOP_SUBSCRIPTION) {
              resolve();
            }
          },
          error: error => reject(classifySubscriptionError(error)),
          complete: () => resolve(),
        },
      );
    });
  } finally {
    await client.dispose();
  }
}

export function deriveWebSocketUrl(endpoint: string): string {
  return endpoint.replace(/^http/, "ws");
}

export function resolveWebSocketImpl(config: NormalizedRailwayClientConfig): unknown {
  const impl =
    config.webSocketImpl ??
    (globalThis as { WebSocket?: unknown }).WebSocket;
  if (!impl) {
    throw new RailwayConnectionError({
      message:
        "No WebSocket implementation found. Pass `webSocketImpl` in the config " +
        "(e.g. the `ws` package) to stream exec output.",
    });
  }
  return impl;
}

function classifySubscriptionError(error: unknown): Error {
  if (isGraphQLErrorList(error)) return toRailwayGraphQLError(error);

  if (error instanceof Error) {
    return new RailwayConnectionError({ message: error.message, cause: error });
  }

  if (isCloseEventLike(error)) {
    return new RailwayConnectionError({
      message: `WebSocket closed with code ${error.code}${
        error.reason ? `: ${error.reason}` : ""
      }.`,
      closeCode: error.code,
    });
  }

  return new RailwayConnectionError({
    message: "WebSocket connection failed.",
    cause: error,
  });
}

function toRailwayGraphQLError(
  errors: readonly { message: string }[],
): RailwayGraphQLError {
  const items = errors as readonly RailwayGraphQLErrorItem[];
  return new RailwayGraphQLError({
    message: items[0]?.message ?? "GraphQL subscription failed.",
    status: 0,
    errors: items,
  });
}

function isGraphQLErrorList(
  error: unknown,
): error is readonly { message: string }[] {
  return (
    Array.isArray(error) &&
    error.length > 0 &&
    error.every(
      item =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { message?: unknown }).message === "string",
    )
  );
}

function isCloseEventLike(error: unknown): error is { code: number; reason?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as { code?: unknown }).code === "number"
  );
}
