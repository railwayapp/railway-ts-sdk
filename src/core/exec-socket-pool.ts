import type { ExecSocketPoolOptions, NormalizedRailwayClientConfig } from "./config.js";
import { openExecSocket, type ExecSocket } from "./exec-ws-client.js";

const SURPLUS_IDLE_MS = 120_000;

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
    this.#idle.delete(socket);
    this.#idle.set(socket, undefined);
    this.#arm();
  }

  #busy(socket: ExecSocket): void {
    clearTimeout(this.#idle.get(socket));
    this.#idle.delete(socket);
    this.#arm();
  }

  /** Without `idleTimeoutMs`, the most recently idle socket is exempt and the rest close after `SURPLUS_IDLE_MS`. */
  #arm(): void {
    const { idleTimeoutMs } = this.#options;
    const kept = idleTimeoutMs === undefined ? [...this.#idle.keys()].at(-1) : undefined;
    for (const [socket, timer] of this.#idle) {
      if (socket === kept) {
        clearTimeout(timer);
        this.#idle.set(socket, undefined);
      } else if (timer === undefined) {
        const next = setTimeout(() => socket.close(), idleTimeoutMs ?? SURPLUS_IDLE_MS);
        (next as { unref?: () => void }).unref?.();
        this.#idle.set(socket, next);
      }
    }
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
