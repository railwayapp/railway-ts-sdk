import { afterEach, describe, expect, it, vi } from "vitest";

import { ShellTokenCache } from "../src/sandbox/shell-token.js";

const b64url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const jwt = (claims: Record<string, number>, sig = "sig") => `${b64url({ alg: "EdDSA" })}.${b64url(claims)}.${sig}`;

afterEach(() => vi.restoreAllMocks());

describe("ShellTokenCache", () => {
  it("times reuse from when the token arrived, so a slow client clock never reuses an expired token", async () => {
    // Server time: issued now, five-minute lifetime. The client clock is 10 minutes slow.
    const serverNowSec = 2_000_000_000;
    const clientNow = vi.spyOn(Date, "now").mockReturnValue((serverNowSec - 600) * 1000);
    let n = 0;
    const cache = new ShellTokenCache(async () => jwt({ iat: serverNowSec, exp: serverNowSec + 300 }, `t${++n}`));

    expect(await cache.get("shell")).toMatch(/t1$/);
    clientNow.mockReturnValue((serverNowSec - 600 + 239) * 1000);
    expect(await cache.get("shell")).toMatch(/t1$/);
    // 4 minutes after arrival (lifetime minus the minute's margin) it is re-minted,
    // even though the slow local clock still reads well before `exp`.
    clientNow.mockReturnValue((serverNowSec - 600 + 241) * 1000);
    expect(await cache.get("shell")).toMatch(/t2$/);
  });

  it("abandons a mint that never answers and mints fresh for the next caller", async () => {
    let calls = 0;
    const cache = new ShellTokenCache(
      () => {
        calls++;
        return calls === 1 ? new Promise<string>(() => {}) : Promise.resolve(jwt({ iat: 1, exp: 301 }));
      },
      { timeoutMs: 20 },
    );
    await expect(cache.get("shell")).rejects.toThrow("did not answer");
    await expect(cache.get("shell")).resolves.toContain(".");
    expect(calls).toBe(2);
  });

  it("shares one in-flight mint between callers", async () => {
    let calls = 0;
    const cache = new ShellTokenCache(async () => {
      calls++;
      return jwt({ iat: 1, exp: 301 });
    });
    await Promise.all([cache.get("shell"), cache.get("shell"), cache.get("shell")]);
    expect(calls).toBe(1);
  });
});
