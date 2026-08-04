import { describe, expect, it, vi } from "vitest";
import { Logger } from "../src/logger";
import { consoleTransport } from "../src/transports";
import type { LogEntry, Transport } from "../src/types";

function recordingTransport(entries: LogEntry[]): Transport {
  return {
    name: "recording",
    log(entry: LogEntry): void {
      entries.push(entry);
    },
  };
}

describe("Logger", () => {
  it("defaults to info level and console transport", () => {
    const logger = new Logger();
    expect(logger.level).toBe("info");
    expect(logger.isEnabled("info")).toBe(true);
    expect(logger.isEnabled("debug")).toBe(false);
  });

  it("filters entries below the configured level", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      level: "warn",
      transports: [recordingTransport(entries)],
    });
    logger.info("ignored");
    logger.warn("kept");
    expect(entries).toHaveLength(1);
    expect(entries[0]?.message).toBe("kept");
  });

  it("does not log when silent", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      level: "silent",
      transports: [recordingTransport(entries)],
    });
    logger.error("nope");
    expect(entries).toHaveLength(0);
  });

  it("captures message and args", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      transports: [recordingTransport(entries)],
    });
    logger.info("m", { key: "value" }, 3);
    expect(entries[0]?.message).toBe("m");
    expect(entries[0]?.args).toEqual([{ key: "value" }, 3]);
  });

  it("includes timestamp and level in the entry", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      transports: [recordingTransport(entries)],
      createTimestamp: () => "fixed-time",
    });
    logger.error("boom");
    expect(entries[0]?.timestamp).toBe("fixed-time");
    expect(entries[0]?.level).toBe("error");
  });

  it("sends entries to every transport", () => {
    const first: LogEntry[] = [];
    const second: LogEntry[] = [];
    const logger = new Logger({
      transports: [recordingTransport(first), recordingTransport(second)],
    });
    logger.info("fan-out");
    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
  });

  it("exposes convenience methods for every level", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      level: "trace",
      transports: [recordingTransport(entries)],
    });
    logger.trace("t");
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    logger.fatal("f");
    expect(entries.map((entry) => entry.level)).toEqual([
      "trace",
      "debug",
      "info",
      "warn",
      "error",
      "fatal",
    ]);
  });

  it("merges context into child loggers", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      context: { app: "api" },
      transports: [recordingTransport(entries)],
    });
    const child = logger.child({ requestId: "r-1" });
    child.info("ctx");
    expect(entries[0]?.context).toEqual({ app: "api", requestId: "r-1" });
    expect(child.context).toEqual({ app: "api", requestId: "r-1" });
  });

  it("child shares level filtering", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      level: "error",
      transports: [recordingTransport(entries)],
    });
    logger.child({}).info("filtered");
    expect(entries).toHaveLength(0);
  });

  it("allows changing level at runtime", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      level: "error",
      transports: [recordingTransport(entries)],
    });
    logger.level = "trace";
    logger.debug("now visible");
    expect(entries).toHaveLength(1);
  });

  it("adds transports dynamically", () => {
    const entries: LogEntry[] = [];
    const logger = new Logger({
      transports: [],
    });
    logger.addTransport(recordingTransport(entries));
    logger.info("added");
    expect(entries).toHaveLength(1);
  });

  it("calls close on transports", () => {
    const close = vi.fn();
    const logger = new Logger({
      transports: [{ name: "closable", log: () => undefined, close }],
    });
    logger.close();
    expect(close).toHaveBeenCalledOnce();
  });

  it("does not throw when close has no transports", () => {
    const logger = new Logger({ transports: [] });
    expect(() => logger.close()).not.toThrow();
  });
});

describe("consoleTransport", () => {
  it("writes formatted lines to the console", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const transport = consoleTransport({ formatter: { format: () => "LINE" } });
      transport.log({
        timestamp: "t",
        level: "info",
        message: "m",
        args: [],
        context: {},
      });
      expect(spy).toHaveBeenCalledWith("LINE");
    } finally {
      spy.mockRestore();
    }
  });

  it("writes errors to console.error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const transport = consoleTransport({ formatter: { format: () => "ERR" } });
      transport.log({
        timestamp: "t",
        level: "error",
        message: "m",
        args: [],
        context: {},
      });
      expect(spy).toHaveBeenCalledWith("ERR");
    } finally {
      spy.mockRestore();
    }
  });

  it("supports json output", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    try {
      const transport = consoleTransport({ json: true });
      transport.log({
        timestamp: "t",
        level: "info",
        message: "m",
        args: [],
        context: {},
      });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"m"'),
      );
    } finally {
      spy.mockRestore();
    }
  });
});
