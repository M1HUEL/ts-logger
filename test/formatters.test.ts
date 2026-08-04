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
});
