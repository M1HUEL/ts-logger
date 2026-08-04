import { describe, expect, it } from "vitest";
import { isLevelEnabled, isLogLevel, severityOf } from "../src/levels";

describe("levels", () => {
  it("assigns increasing severity to each level", () => {
    expect(severityOf("trace")).toBe(10);
    expect(severityOf("fatal")).toBe(60);
    expect(severityOf("info")).toBeLessThan(severityOf("warn"));
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
