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
    // A socket on a token that expires sooner would soon be refused at init_exec.
    for (const socket of [...this.#idle.keys()]) {
      if (socket.jwt !== args.jwt && !(tokenExpiry(socket.jwt) >= tokenExpiry(args.jwt))) socket.close();
    }
    const idle = args.fresh ? undefined : [...this.#idle.keys()].at(-1);
    if (idle) {
      this.#busy(idle);
      return idle;
    }
    const socket = await openExecSocket({
      config: this.#config,
      jwt: args.jwt,
      reuse: true,
      pipeline: true,
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
    clearTimeout(this.#idle.get(socket));
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

/** The JWT's `exp`, or NaN when it cannot be read. */
function tokenExpiry(jwt: string): number {
  try {
    const payload = jwt.split(".")[1]!.replaceAll("-", "+").replaceAll("_", "/");
    const { exp } = JSON.parse(atob(payload)) as { exp?: unknown };
    return typeof exp === "number" ? exp : Number.NaN;
  } catch {
    return Number.NaN;
  }
}
