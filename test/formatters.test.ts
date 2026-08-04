import { describe, expect, it } from "vitest";
import { humanFormatter, jsonFormatter, serialize } from "../src/formatters";
import type { LogEntry } from "../src/types";

function entry(overrides: Partial<LogEntry> = {}): LogEntry {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    level: "info",
    message: "hello",
    args: [],
    context: {},
    ...overrides,
  };
}

describe("humanFormatter", () => {
  it("includes timestamp, level and message", () => {
    const line = humanFormatter({ color: false }).format(entry());
    expect(line).toContain("2026-01-01T00:00:00.000Z");
    expect(line).toContain("INFO");
    expect(line).toContain("hello");
  });

  it("renders context and args", () => {
    const line = humanFormatter({ color: false }).format(
      entry({ context: { requestId: "abc" }, args: ["extra", 42] }),
    );
    expect(line).toContain("requestId");
    expect(line).toContain("extra");
    expect(line).toContain("42");
  });

  it("omits args when printArgs is false", () => {
    const line = humanFormatter({ color: false, printArgs: false }).format(
      entry({ args: ["secret"] }),
    );
    expect(line).not.toContain("secret");
  });

  it("applies ANSI codes when color is enabled", () => {
    const line = humanFormatter({ color: true }).format(entry());
    expect(line).toContain("\u001b[");
  });
});

describe("jsonFormatter", () => {
  it("serializes the entry as JSON", () => {
    const parsed = JSON.parse(
      jsonFormatter().format(entry({ message: "hi", context: { a: 1 } })),
    ) as LogEntry;
    expect(parsed.message).toBe("hi");
    expect(parsed.level).toBe("info");
    expect(parsed.context).toEqual({ a: 1 });
  });

  it("serializes Error arguments with name, message and stack", () => {
    const error = new Error("boom");
    const parsed = JSON.parse(
      jsonFormatter().format(entry({ args: [error] })),
    ) as { args: [{ name: string; message: string; stack: string }] };
    expect(parsed.args[0].name).toBe("Error");
    expect(parsed.args[0].message).toBe("boom");
    expect(parsed.args[0].stack).toContain("boom");
  });

  it("serializes Errors nested in context", () => {
    const parsed = JSON.parse(
      jsonFormatter().format(entry({ context: { failure: new Error("ctx") } })),
    ) as { context: { failure: { message: string } } };
    expect(parsed.context.failure.message).toBe("ctx");
  });

  it("serializes the cause of an Error", () => {
    const error = new Error("outer", { cause: new Error("inner") });
    const parsed = JSON.parse(jsonFormatter().format(entry({ args: [error] }))) as {
      args: [{ cause: { message: string } }];
    };
    expect(parsed.args[0].cause.message).toBe("inner");
  });
});

describe("serialize", () => {
  it("returns strings as-is", () => {
    expect(serialize("abc")).toBe("abc");
  });

  it("serializes objects as JSON", () => {
    expect(serialize({ a: 1 })).toBe('{"a":1}');
  });

  it("uses error stack when available", () => {
    const error = new Error("boom");
    expect(serialize(error)).toContain("boom");
  });

  it("falls back to String for primitives", () => {
    expect(serialize(42)).toBe("42");
    expect(serialize(null)).toBe("null");
  });

  it("falls back to String for cyclic objects", () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(serialize(cyclic)).toBe("[object Object]");
  });
});
