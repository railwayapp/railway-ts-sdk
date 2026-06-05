import { afterEach, describe, expect, it, vi } from "vitest";

import { createLogger } from "../src/core/logger.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createLogger", () => {
  it("is a no-op when verbose is off", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    createLogger(false)("nothing should print");

    expect(spy).not.toHaveBeenCalled();
  });

  it("writes a [railway]-prefixed line to stderr when verbose is on", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    createLogger(true)("hello");

    expect(spy).toHaveBeenCalledWith("[railway] hello");
  });
});
