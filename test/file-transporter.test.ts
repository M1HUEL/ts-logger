import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileTransporter, fileTransporter } from "../src/file-transporter";
import type { LogEntry } from "../src/types";

const SHORT: LogEntry = {
  timestamp: "t",
  level: "info",
  message: "m",
  args: [],
  context: {},
};

function makeEntry(message: string): LogEntry {
  return { ...SHORT, message };
}

const dirs: string[] = [];

function tempDir(): string {
  const dir = mkdtempSync(join(tmpdir(), "ts-logger-test-"));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("fileTransporter", () => {
  it("appends formatted lines to the file", async () => {
    const file = join(tempDir(), "app.log");
    const transport = fileTransporter({
      path: file,
      formatter: { format: (entry) => entry.message },
    });
    transport.log(makeEntry("one"));
    transport.log(makeEntry("two"));
    await transport.close();

    const content = readFileSync(file, "utf8");
    expect(content.split("\n")).toEqual(["one", "two", ""]);
  });

  it("creates the directory when it does not exist", async () => {
    const file = join(tempDir(), "nested", "deep", "app.log");
    const transport = fileTransporter({
      path: file,
      formatter: { format: (entry) => entry.message },
    });
    transport.log(makeEntry("hi"));
    await transport.close();
    expect(readFileSync(file, "utf8")).toContain("hi");
  });

  it("writes valid JSON lines when json is enabled", async () => {
    const file = join(tempDir(), "app.log");
    const transport = fileTransporter({ path: file, json: true });
    transport.log(SHORT);
    await transport.close();

    const lines = readFileSync(file, "utf8").trim().split("\n");
    const parsed = JSON.parse(lines[0] ?? "{}") as LogEntry;
    expect(parsed.message).toBe("m");
    expect(parsed.level).toBe("info");
  });

  it("rotates by size and restarts the current file", async () => {
    const dir = tempDir();
    const file = join(dir, "app.log");
    const transport = fileTransporter({
      path: file,
      formatter: { format: () => "abc" },
      rotation: { maxSize: 8 },
    });
    transport.log(makeEntry("1"));
    transport.log(makeEntry("2"));
    transport.log(makeEntry("3"));
    await transport.close();

    expect(readFileSync(file, "utf8")).toBe("abc\n");

    const rotated = readdirSync(dir).filter((name) => name !== "app.log");
    expect(rotated).toHaveLength(1);
    const rotatedPath = join(dir, rotated[0] ?? "");
    expect(readFileSync(rotatedPath, "utf8")).toBe("abc\nabc\n");
  });

  it("keeps only maxFiles rotated files", async () => {
    const dir = tempDir();
    const file = join(dir, "app.log");
    const transport = fileTransporter({
      path: file,
      formatter: { format: () => "a" },
      rotation: { maxSize: 1, maxFiles: 2 },
    });
    for (let i = 0; i < 6; i += 1) {
      transport.log(makeEntry(String(i)));
    }
    await transport.close();

    const rotated = readdirSync(dir).filter((name) => name !== "app.log");
    expect(rotated).toHaveLength(2);
  });

  it("gives each rotated file a unique name within the same second", async () => {
    const dir = tempDir();
    const file = join(dir, "app.log");
    const transport = fileTransporter({
      path: file,
      formatter: { format: () => "a" },
      rotation: { maxSize: 1, maxFiles: 10 },
    });
    for (let i = 0; i < 6; i += 1) {
      transport.log(makeEntry(String(i)));
    }
    await transport.close();

    const rotated = readdirSync(dir).filter((name) => name !== "app.log");
    expect(rotated).toHaveLength(5);
    expect(new Set(rotated).size).toBe(5);
  });

  it("rotates on a new calendar day after restart", async () => {
    const dir = tempDir();
    const file = join(dir, "app.log");
    const first = fileTransporter({
      path: file,
      formatter: { format: () => "x" },
      rotation: { date: "daily" },
    });
    first.log(makeEntry("1"));
    await first.close();

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    utimesSync(file, yesterday, yesterday);

    const second = fileTransporter({
      path: file,
      formatter: { format: () => "y" },
      rotation: { date: "daily" },
    });
    second.log(makeEntry("2"));
    await second.close();

    const rotated = readdirSync(dir).filter((name) => name !== "app.log");
    expect(rotated).toHaveLength(1);
    expect(readFileSync(file, "utf8")).toBe("y\n");
  });

  it("reports write errors through onError", async () => {
    const dir = tempDir();
    const onError = vi.fn();
    const transport = fileTransporter({ path: dir, onError });
    transport.log(makeEntry("boom"));
    await transport.close();
    expect(onError).toHaveBeenCalledOnce();
  });

  it("uses console.error for write errors by default", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const transport = fileTransporter({ path: tempDir() });
      transport.log(makeEntry("boom"));
      await transport.close();
      expect(spy).toHaveBeenCalledOnce();
    } finally {
      spy.mockRestore();
    }
  });

  it("exposes close that flushes pending writes", async () => {
    const file = join(tempDir(), "app.log");
    const transport = new FileTransporter({ path: file });
    transport.log(makeEntry("queued"));
    await transport.close();
    expect(readFileSync(file, "utf8")).toContain("queued");
  });

  it("drops writes after close", async () => {
    const file = join(tempDir(), "app.log");
    const transport = fileTransporter({
      path: file,
      formatter: { format: (entry) => entry.message },
    });
    transport.log(makeEntry("first"));
    await transport.close();
    transport.log(makeEntry("late"));
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(readFileSync(file, "utf8")).toBe("first\n");
  });

  it("keeps the current file untouched when nothing triggers rotation", async () => {
    const file = join(tempDir(), "app.log");
    const transport = fileTransporter({
      path: file,
      rotation: { maxSize: 1024 },
    });
    transport.log(makeEntry("only"));
    await transport.close();

    const files = readdirSync(tempDir()).filter((name) => name !== "app.log");
    expect(files).toHaveLength(0);
    expect(statSync(file).size).toBeGreaterThan(0);
  });
});
