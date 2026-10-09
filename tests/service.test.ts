import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Service } from "../src/index.js";
import { clearRailwayEnv, createFetchMock } from "./test-helpers.js";
import { createExecWsMock } from "./exec-ws-mock.js";

const target = { environmentId: "env", serviceId: "service", instanceId: "replica" };
const deployment = (status = "SUCCESS", ids = ["replica"]) => ({
  data: { serviceInstance: { activeDeployments: [{ status, instances: ids.map(id => ({ id, status: "RUNNING" })) }] } },
});
beforeEach(clearRailwayEnv);
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("existing service execution", () => {
  it("requires all exact selectors instead of choosing an ambiguous replica", async () => {
    const mock = createFetchMock([]);
    await expect(Service.connect({ ...target, instanceId: "" }, { token: "synthetic", fetch: mock.fetch })).rejects.toThrow("explicit");
    expect(mock.calls).toHaveLength(0);
  });

  it.each([deployment("SLEEPING"), deployment("SUCCESS", ["other"]), { data: { serviceInstance: { activeDeployments: [{ status: "SUCCESS", instances: [{ id: "replica", status: "STOPPED" }] }] } } }])("refuses sleeping or wrong instances before minting a token", async response => {
    const mock = createFetchMock([response]);
    await expect(Service.connect(target, { token: "synthetic", fetch: mock.fetch })).rejects.toThrow("not running");
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0]!.body.variables).toEqual({ environmentId: "env", serviceId: "service" });
  });

  it("reuses native foreground stdin, EOF, streams and nonzero exit on the exact replica", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([deployment("SUCCESS", ["other", "replica"]), { data: { generateShellToken: "synthetic-jwt" } }]);
    const service = await Service.connect(target, { token: "synthetic", fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const handle = service.exec("cat; exit 7", { stdin: true });
    const socket = await ws.nextSocket();
    await handle.stdin.write("payload");
    handle.stdin.end();
    await vi.waitFor(() => expect(socket.sentText.map(frame => frame.type)).toContain("stdin_close"));
    expect(mock.calls[1]!.body.variables).toEqual({ input: { environmentId: "env", serviceId: "service", instanceId: "replica", kind: "deployment", scope: "shell" } });
    expect(socket.sentText.find(frame => frame.type === "init_exec")!.data).toMatchObject({ command: "bash -lc 'cat; exit 7'", ephemeral: true });
    expect(new TextDecoder().decode(socket.sentStdin[0])).toBe("payload");
    socket.serverStdout("payload");
    socket.serverStderr("diagnostic");
    socket.serverExit(7);
    await expect(handle).resolves.toMatchObject({ exitCode: 7, stdout: "payload", stderr: "diagnostic", timedOut: false });
    await expect(handle.detach()).rejects.toThrow("Ephemeral");
  });

  it("uses native abort termination and waits for remote exit", async () => {
    const ws = createExecWsMock();
    const mock = createFetchMock([deployment(), { data: { generateShellToken: "synthetic-jwt" } }]);
    const service = await Service.connect(target, { token: "synthetic", fetch: mock.fetch, webSocketImpl: ws.webSocketImpl });
    const controller = new AbortController();
    const handle = service.exec("sleep 30", { signal: controller.signal });
    const result = handle.catch(error => error);
    const socket = await ws.nextSocket();
    await vi.waitFor(() => expect(socket.sentText.some(frame => frame.type === "init_exec")).toBe(true));
    controller.abort(new Error("synthetic cancellation"));
    await vi.waitFor(() => expect(socket.sentText).toContainEqual({ type: "signal", data: { signal: "TERM" } }));
    expect(socket.readyState).toBe(1);
    socket.serverExit(143);
    expect(await result).toBeInstanceOf(Error);
    expect((await result as Error).message).toBe("synthetic cancellation");
    expect(socket.readyState).toBe(3);
  });
});
