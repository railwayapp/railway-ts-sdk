import { ExecNotStartedError } from "../core/errors.js";
import type { ExecWsSocket } from "../core/exec-ws-client.js";

/**
 * How long a negotiated, unused exec socket stays open. It holds a tunnel to
 * the guest and, in Node, keeps the process alive (Node's WebSocket cannot be
 * unref'd), so it is short: it covers the gap between `create()` resolving and
 * a first `exec()` issued straight after, not a script that never execs.
 */
export const PREWARM_IDLE_CLOSE_MS = 2_000;

/**
 * One exec socket opened when the sandbox reports RUNNING, so the first
 * `exec()` only sends its command. Single use: an exec takes it, or it closes
 * after `PREWARM_IDLE_CLOSE_MS` unused, or with the sandbox.
 */
export class Prewarm {
  /** Resolves with the negotiated socket; rejects if it could not be set up (nothing ran). */
  readonly ready: Promise<ExecWsSocket>;
  #socket: ExecWsSocket | undefined;
  #closed = false;
  #taken = false;
  #idleTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(args: {
    jwt: Promise<string>;
    open: (jwt: string) => ExecWsSocket;
    /** Called when the idle window closes the socket. */
    onIdleClose: () => void;
  }) {
    this.ready = (async () => {
      const jwt = await args.jwt;
      if (this.#closed) throw closedBeforeUse();
      const socket = args.open(jwt);
      this.#socket = socket;
      await socket.ready;
      if (this.#closed || !socket.usable) throw closedBeforeUse();
      return socket;
    })();
    this.ready.then(
      () => {
        if (this.#taken || this.#closed) return;
        this.#idleTimer = setTimeout(() => {
          this.close();
          args.onIdleClose();
        }, PREWARM_IDLE_CLOSE_MS);
        // Node timers hold the event loop open; the socket lingers at most
        // the idle window, and the timer itself never delays exit.
        (this.#idleTimer as { unref?: () => void }).unref?.();
      },
      () => {},
    );
  }

  /** True until the socket is taken, closed, or known to have failed. */
  get live(): boolean {
    return !this.#taken && !this.#closed && (this.#socket === undefined || this.#socket.usable);
  }

  /** Hands the socket to an exec; the idle window no longer applies. */
  take(): Promise<ExecWsSocket> {
    this.#taken = true;
    this.#clearTimer();
    return this.ready;
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#clearTimer();
    if (!this.#taken) this.#socket?.close();
  }

  /**
   * Closes the socket even though an exec took it: the exec gave up on it
   * (aborted, or it never answered) before sending a command, so nothing ran.
   */
  abandon(): void {
    this.#closed = true;
    this.#clearTimer();
    this.#socket?.close();
  }

  #clearTimer(): void {
    if (this.#idleTimer !== undefined) clearTimeout(this.#idleTimer);
    this.#idleTimer = undefined;
  }
}

function closedBeforeUse(): ExecNotStartedError {
  return new ExecNotStartedError({
    message: "Prewarmed exec socket closed before it was used; no command was sent.",
  });
}
