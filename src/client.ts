import type { TypedDocumentNode } from "@graphql-typed-document-node/core";
import { print, type DocumentNode } from "graphql";

import {
  normalizeConfig,
  type NormalizedRailwaySandboxesConfig,
  type RailwaySandboxesConfig,
} from "./config.js";
import {
  RailwayGraphQLError,
  type RailwayGraphQLErrorItem,
} from "./errors.js";
import {
  RailwaySandboxCreateDocument,
  RailwaySandboxDestroyDocument,
  RailwaySandboxExecDocument,
  type RailwaySandboxCreateMutation,
  type RailwaySandboxCreateMutationVariables,
  type RailwaySandboxDestroyMutation,
  type RailwaySandboxDestroyMutationVariables,
  type RailwaySandboxExecMutation,
  type RailwaySandboxExecMutationVariables,
} from "./generated/graphql.js";
import {
  Sandbox,
  type CreateSandboxOptions,
  type ExecOptions,
  type SandboxExecResult,
} from "./sandbox.js";

export type SandboxRef = string | Pick<Sandbox, "id">;

interface GraphQLResponse<TResult> {
  data?: TResult;
  errors?: RailwayGraphQLErrorItem[];
}

export class RailwaySandboxes {
  readonly #config: NormalizedRailwaySandboxesConfig;

  constructor(config: RailwaySandboxesConfig) {
    this.#config = normalizeConfig(config);
  }

  get endpoint(): string {
    return this.#config.endpoint;
  }

  async create(options: CreateSandboxOptions = {}): Promise<Sandbox> {
    const input: RailwaySandboxCreateMutationVariables["input"] = {
      projectId: this.#config.projectId,
      environmentId: this.#config.environmentId,
    };

    if (options.name !== undefined) input.name = options.name;
    if (options.idleTimeoutMinutes !== undefined) {
      input.idleTimeoutMinutes = options.idleTimeoutMinutes;
    }

    const data = await this.request<
      RailwaySandboxCreateMutation,
      RailwaySandboxCreateMutationVariables
    >(RailwaySandboxCreateDocument, { input });

    return new Sandbox(this, data.sandboxCreate);
  }

  async exec(
    sandbox: SandboxRef,
    command: string,
    options: ExecOptions = {},
  ): Promise<SandboxExecResult> {
    const variables: RailwaySandboxExecMutationVariables = {
      id: sandboxId(sandbox),
      command,
    };

    if (options.timeoutSec !== undefined) variables.timeoutSec = options.timeoutSec;

    const data = await this.request<
      RailwaySandboxExecMutation,
      RailwaySandboxExecMutationVariables
    >(RailwaySandboxExecDocument, variables);

    return data.sandboxExec;
  }

  async delete(sandbox: SandboxRef): Promise<Sandbox> {
    const variables: RailwaySandboxDestroyMutationVariables = {
      id: sandboxId(sandbox),
    };
    const data = await this.request<
      RailwaySandboxDestroyMutation,
      RailwaySandboxDestroyMutationVariables
    >(RailwaySandboxDestroyDocument, variables);

    return new Sandbox(this, data.sandboxDestroy);
  }

  private async request<TResult, TVariables>(
    document: TypedDocumentNode<TResult, TVariables>,
    variables: TVariables,
  ): Promise<TResult> {
    const response = await this.#config.fetch(this.#config.endpoint, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${this.#config.token}`,
        "Content-Type": "application/json",
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
}

export function createRailwaySandboxes(
  config: RailwaySandboxesConfig,
): RailwaySandboxes {
  return new RailwaySandboxes(config);
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

function sandboxId(sandbox: SandboxRef): string {
  return typeof sandbox === "string" ? sandbox : sandbox.id;
}
