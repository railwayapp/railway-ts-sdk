import { normalizeRailwayClientConfig, type RailwayClientConfig } from "./core/config.js";
import { RailwayError } from "./core/errors.js";
import { requestGraphQL } from "./core/graphql-client.js";
import { RailwayServiceExecInstanceDocument } from "./generated/graphql.js";
import { startExec, type ExecContext, type ExecHandle } from "./sandbox/exec.js";
import type { ExecOptions } from "./sandbox/types.js";

/** Exact existing service replica; connecting never wakes or creates compute. */
export interface ServiceTarget {
  environmentId: string;
  serviceId: string;
  instanceId: string;
}

/**
 * Foreground calls on a verified existing service replica.
 * Service process controls are not guaranteed by sandbox capabilities; a missing
 * terminal exit leaves the command's outcome unknown and it may still be running.
 */
export class Service {
  readonly #context: ExecContext;

  private constructor(context: ExecContext) {
    this.#context = context;
  }

  static async connect(
    target: ServiceTarget,
    config: RailwayClientConfig = {},
    signal?: AbortSignal,
  ): Promise<Service> {
    for (const value of [target.environmentId, target.serviceId, target.instanceId]) {
      if (typeof value !== "string" || !value.trim()) {
        throw new RailwayError("An explicit environment, service and instance are required.");
      }
    }
    const normalized = normalizeRailwayClientConfig(config);
    const data = await requestGraphQL(normalized, RailwayServiceExecInstanceDocument, {
      environmentId: target.environmentId,
      serviceId: target.serviceId,
    }, signal);
    const running = data.serviceInstance.activeDeployments
      .filter(deployment => deployment.status !== "SLEEPING")
      .flatMap(deployment => deployment.instances)
      .some(instance => instance.id === target.instanceId && instance.status === "RUNNING");
    if (!running) {
      throw new RailwayError("Selected instance is not running in this service/environment; wake it before connecting.");
    }
    return new Service({
      config: normalized,
      environmentId: target.environmentId,
      instanceId: target.instanceId,
      serviceId: target.serviceId,
    });
  }

  /**
   * Reuses the native stream engine and requests ephemeral execution, without
   * promising service cleanup on disconnect. Timeout/abort send termination
   * requests; only a confirmed remote exit establishes that the command ended.
   * Durable session names, detach and reattach are not supported here.
   */
  exec(command: string, options: Omit<ExecOptions, "ephemeral"> = {}): ExecHandle {
    return startExec(this.#context, command, { ...options, ephemeral: true });
  }
}
