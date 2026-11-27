import {
  deriveInternalGraphQLWsEndpoint,
  type NormalizedRailwayClientConfig,
} from "../core/config.js";
import { subscribeGraphQL } from "../core/graphql-subscription.js";

const SANDBOX_INVALIDATION =
  "subscription RailwaySandboxInvalidation($environmentId: String!) { sandboxInvalidation(environmentId: $environmentId) { id } }";

/** Poll sleeps that end early when backboard reports a sandbox change in the environment. */
export interface SandboxWatch {
  sleep(ms: number): Promise<void>;
  close(): void;
}

// Project tokens are left to the poll: backboard lifts only `Authorization`
// from connection_init, and they authenticate with a different header.
export function watchSandboxes(
  config: NormalizedRailwayClientConfig,
  environmentId: string,
): SandboxWatch {
  let wake: (() => void) | undefined;
  let pending = false;

  const endpoint =
    config.authType === "bearer"
      ? deriveInternalGraphQLWsEndpoint(config.endpoint)
      : undefined;
  const subscription =
    endpoint === undefined
      ? undefined
      : subscribeGraphQL(config, {
          endpoint,
          query: SANDBOX_INVALIDATION,
          variables: { environmentId },
          onNext: () => {
            if (wake) wake();
            else pending = true;
          },
        });

  return {
    sleep(ms) {
      if (pending) {
        pending = false;
        return Promise.resolve();
      }
      return new Promise(resolve => {
        const done = (): void => {
          clearTimeout(timer);
          wake = undefined;
          resolve();
        };
        const timer = setTimeout(done, ms);
        wake = done;
      });
    },
    close() {
      subscription?.close();
    },
  };
}
