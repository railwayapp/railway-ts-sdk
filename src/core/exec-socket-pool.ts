import type { ExecSocketPoolOptions, NormalizedRailwayClientConfig } from "./config.js";
import { openExecSocket, type ExecSocket } from "./exec-ws-client.js";

/** One sandbox's `/ws/exec` sockets: an idle one is reused, otherwise a new one opens. */
export class ExecSocketPool {
  readonly #config: NormalizedRailwayClientConfig;
  readonly #options: ExecSocketPoolOptions;
  readonly #idle = new Map<ExecSocket, ReturnType<typeof setTimeout> | undefined>();
  #closed = false;

  constructor(config: NormalizedRailwayClientConfig, options: ExecSocketPoolOptions) {
    this.#config = config;
    this.#options = options;
  }

  async acquire(args: { jwt: string; legacy?: boolean; fresh?: boolean; signal?: AbortSignal }): Promise<ExecSocket> {
    // The token cache stops handing out a token a minute before it expires, so
    // a socket on an older token would soon be refused at init_exec.
    for (const socket of [...this.#idle.keys()]) {
      if (socket.jwt !== args.jwt) socket.close();
    }
    const idle = this.#idle.keys().next();
    if (!args.fresh && !idle.done) {
      this.#busy(idle.value);
      return idle.value;
    }
    const socket = await openExecSocket({
      config: this.#config,
      jwt: args.jwt,
      reuse: true,
      ...(args.legacy ? { legacy: true } : {}),
      ...(args.signal ? { signal: args.signal } : {}),
      onIdle: s => this.#release(s),
      onClose: s => this.#busy(s),
    });
    if (this.#closed) socket.close();
    return socket;
  }

  /** Closes idle sockets now and busy ones when their exec ends. */
  close(): void {
    this.#closed = true;
    for (const socket of [...this.#idle.keys()]) socket.close();
  }

  #release(socket: ExecSocket): void {
    if (this.#closed || socket.closed) {
      socket.close();
      return;
    }
    const { idleTimeoutMs } = this.#options;
    const timer = idleTimeoutMs === undefined ? undefined : setTimeout(() => socket.close(), idleTimeoutMs);
    (timer as { unref?: () => void } | undefined)?.unref?.();
    this.#idle.set(socket, timer);
  }

  #busy(socket: ExecSocket): void {
    clearTimeout(this.#idle.get(socket));
    this.#idle.delete(socket);
  }
}
