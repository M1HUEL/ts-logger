import { describe, expect, it } from "vitest";
import { isLevelEnabled, isLogLevel, severityOf } from "../src/levels";
import type { LogLevel } from "../src/types";

describe("levels", () => {
  it("assigns increasing severity to each level", () => {
    expect(severityOf("trace")).toBe(10);
    expect(severityOf("fatal")).toBe(60);
    expect(severityOf("info")).toBeLessThan(severityOf("warn"));
  });

  it("orders all levels by increasing severity", () => {
    const order = ["trace", "debug", "info", "warn", "error", "fatal"].map(
      (level) => severityOf(level as LogLevel),
    );
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  it("enables levels at or above the configured threshold", () => {
    expect(isLevelEnabled("info", "info")).toBe(true);
    expect(isLevelEnabled("info", "warn")).toBe(true);
    expect(isLevelEnabled("info", "debug")).toBe(false);
  });

  it("disables everything when configured as silent", () => {
    expect(isLevelEnabled("silent", "fatal")).toBe(false);
    expect(isLevelEnabled("silent", "trace")).toBe(false);
  });

  it("recognizes valid log levels", () => {
    expect(isLogLevel("info")).toBe(true);
    expect(isLogLevel("verbose")).toBe(false);
  });
});
