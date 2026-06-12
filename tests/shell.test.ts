import { describe, expect, it } from "vitest";

import { RailwayError } from "../src/index.js";
import { shellQuote, wrapCommand } from "../src/sandbox/shell.js";

describe("shellQuote", () => {
  it("leaves safe values unquoted", () => {
    expect(shellQuote("npm")).toBe("npm");
    expect(shellQuote("/app/dir-1/file.txt")).toBe("/app/dir-1/file.txt");
    expect(shellQuote("a=b:c@d")).toBe("a=b:c@d");
  });

  it("single-quotes everything else", () => {
    expect(shellQuote("hello world")).toBe("'hello world'");
    expect(shellQuote("")).toBe("''");
    expect(shellQuote("a;rm -rf /")).toBe("'a;rm -rf /'");
    expect(shellQuote("$HOME `id` \\")).toBe("'$HOME `id` \\'");
    expect(shellQuote("line1\nline2")).toBe("'line1\nline2'");
    expect(shellQuote("emoji 🚂")).toBe("'emoji 🚂'");
  });

  it("escapes embedded single quotes", () => {
    expect(shellQuote("it's")).toBe("'it'\\''s'");
    expect(shellQuote("''")).toBe("''\\'''\\'''");
  });
});

describe("wrapCommand", () => {
  it("returns the command untouched without cwd or env", () => {
    expect(wrapCommand("npm test", {})).toBe("npm test");
    expect(wrapCommand("npm test", { env: {} })).toBe("npm test");
  });

  it("composes cwd and env around a nested sh -c", () => {
    expect(
      wrapCommand("npm test", { cwd: "/app", env: { NODE_ENV: "test" } }),
    ).toBe("cd /app && NODE_ENV=test sh -c 'npm test'");
  });

  it("composes env only", () => {
    expect(wrapCommand("npm test", { env: { A: "1", B: "two words" } })).toBe(
      "A=1 B='two words' sh -c 'npm test'",
    );
  });

  it("composes cwd only", () => {
    expect(wrapCommand("npm test", { cwd: "/my dir" })).toBe(
      "cd '/my dir' && sh -c 'npm test'",
    );
  });

  it("quotes hostile values so they cannot escape", () => {
    expect(
      wrapCommand("echo $V", { env: { V: "'; rm -rf / #" } }),
    ).toBe("V=''\\''; rm -rf / #' sh -c 'echo $V'");
  });

  it("keeps a ;-separated command behind the cd", () => {
    // The nested sh -c means a failed cd skips the whole user command.
    expect(wrapCommand("a; b", { cwd: "/app" })).toBe(
      "cd /app && sh -c 'a; b'",
    );
  });

  it("rejects invalid env var names", () => {
    expect(() => wrapCommand("x", { env: { "BAD NAME": "1" } })).toThrow(
      RailwayError,
    );
    expect(() => wrapCommand("x", { env: { "1ABC": "1" } })).toThrow(
      /environment variable/i,
    );
    expect(() => wrapCommand("x", { env: { "A=B": "1" } })).toThrow(
      RailwayError,
    );
  });
});
