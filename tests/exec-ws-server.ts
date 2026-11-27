/**
 * A real `/ws/exec` server on localhost (the `ws` package) for tests that need
 * actual sockets: grants reuse and pipelining when asked, answers each
 * init_exec with stdout `ran <n>` and exit 0 after `exitDelaysMs[n - 1]`, and
 * echoes stdin back as one stdout frame on stdin_close.
 */

import { once } from "node:events";
import type { AddressInfo } from "node:net";

import { WebSocketServer, type WebSocket } from "ws";

export interface ExecWsServer {
  endpoint: string;
  connections: () => number;
  hellos: { type: string; data?: unknown }[];
  close(): Promise<void>;
}

export async function startExecWsServer(options: {
  exitDelaysMs?: number[];
  refuse?: { status: number; retryAfter?: string };
} = {}): Promise<ExecWsServer> {
  const hellos: { type: string; data?: unknown }[] = [];
  let connections = 0;
  let inits = 0;
  const server = new WebSocketServer({
    host: "127.0.0.1",
    port: 0,
    handleProtocols: protocols => (protocols.has("railway-shell") ? "railway-shell" : false),
    verifyClient: (_info, done) => {
      if (!options.refuse) return done(true);
      const { status, retryAfter } = options.refuse;
      done(false, status, "refused", retryAfter === undefined ? {} : { "Retry-After": retryAfter });
    },
  });
  await once(server, "listening");

  server.on("connection", (socket: WebSocket) => {
    connections++;
    let stdin: Buffer[] = [];
    socket.on("message", (data, isBinary) => {
      if (isBinary) {
        stdin.push(Buffer.from(data as Buffer).subarray(1));
        socket.send(JSON.stringify({ type: "stdin_credit", data: { chunks: 1 } }));
        return;
      }
      const frame = JSON.parse(String(data)) as { type: string; data?: { reuse?: boolean; pipeline?: boolean } };
      if (frame.type === "exec_hello") {
        hellos.push(frame);
        socket.send(JSON.stringify({
          type: "exec_capabilities",
          data: {
            version: frame.data ? 3 : 2,
            stdin_chunks: 8,
            stdin_chunk_bytes: 16384,
            ...(frame.data?.reuse ? { reuse: true } : {}),
            ...(frame.data?.pipeline ? { pipeline: true } : {}),
          },
        }));
      } else if (frame.type === "init_exec") {
        const n = ++inits;
        stdin = [];
        socket.send(JSON.stringify({ type: "exec_started" }));
        setTimeout(() => {
          socket.send(Buffer.concat([Buffer.from([0x01]), Buffer.from(`ran ${n}\n`)]));
          socket.send(JSON.stringify({ type: "exit", data: { exit_code: 0 } }));
        }, options.exitDelaysMs?.[n - 1] ?? 0);
      } else if (frame.type === "stdin_close" && stdin.length > 0) {
        socket.send(Buffer.concat([Buffer.from([0x01]), ...stdin]));
      }
    });
  });

  return {
    endpoint: `ws://127.0.0.1:${(server.address() as AddressInfo).port}/ws/exec`,
    connections: () => connections,
    hellos,
    close: async () => {
      for (const client of server.clients) client.terminate();
      await new Promise(resolve => server.close(resolve));
    },
  };
}
