import { appendFile, mkdir, readdir, rename, rm, stat } from "node:fs/promises";
import { dirname, extname, basename, join } from "node:path";
import type { LogEntry, Transport } from "./types";
import { humanFormatter, jsonFormatter } from "./formatters";
import type { LogFormatter } from "./formatters";

export interface FileRotationOptions {
  maxSize?: number;
  maxFiles?: number;
  date?: "daily" | "hourly";
}

export interface FileTransporterOptions {
  path: string;
  formatter?: LogFormatter;
  json?: boolean;
  rotation?: FileRotationOptions;
  onError?: (error: Error) => void;
}

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function formatStamp(date: Date): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `${y}${m}${d}-${h}${min}${s}`;
}

function periodKey(date: Date, granularity: "daily" | "hourly"): string {
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  return granularity === "daily" ? `${y}-${m}-${d}` : `${y}-${m}-${d}T${h}`;
}

export class FileTransporter implements Transport {
  readonly name = "file";

  private readonly filePath: string;
  private readonly formatter: LogFormatter;
  private readonly rotation?: FileRotationOptions;
  private readonly onError: (error: Error) => void;
  private queue: Promise<void> = Promise.resolve();
  private lastPeriod?: string;
  private closed = false;

  constructor(options: FileTransporterOptions) {
    this.filePath = options.path;
    this.formatter = options.json ? jsonFormatter() : options.formatter ?? humanFormatter();
    this.rotation = options.rotation;
    this.onError =
      options.onError ??
      ((error: Error) => {
        console.error("ts-logger file transport error:", error);
      });
  }

  log(entry: LogEntry): void {
    if (this.closed) {
      return;
    }
    const line = `${this.formatter.format(entry)}\n`;
    this.queue = this.queue
      .then(() => this.write(line))
      .catch((error: Error) => this.onError(error));
  }

  async close(): Promise<void> {
    this.closed = true;
    await this.queue;
  }

  private async write(line: string): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    if (this.rotation) {
      await this.rotateIfNeeded(line.length);
    }
    await appendFile(this.filePath, line, "utf8");
  }

  private async currentSize(): Promise<number> {
    try {
      const info = await stat(this.filePath);
      return info.size;
    } catch {
      return 0;
    }
  }

  private async rotateIfNeeded(extraBytes: number): Promise<void> {
    const now = new Date();
    let shouldRotate = false;

    if (this.rotation?.maxSize !== undefined) {
      const size = await this.currentSize();
      shouldRotate = size + extraBytes > this.rotation.maxSize;
    }

    if (this.rotation?.date) {
      if (this.lastPeriod === undefined) {
        try {
          const info = await stat(this.filePath);
          this.lastPeriod = periodKey(info.mtime, this.rotation.date);
        } catch {
          this.lastPeriod = periodKey(now, this.rotation.date);
        }
      }
      const key = periodKey(now, this.rotation.date);
      if (this.lastPeriod !== key) {
        shouldRotate = true;
        this.lastPeriod = key;
      }
    }

    if (shouldRotate) {
      await this.rotate(now);
    }
  }

  private async rotate(now: Date): Promise<void> {
    try {
      await rename(this.filePath, this.rotatedPath(now));
    } catch {
      // current file does not exist yet; nothing to rotate
    }
    await this.prune();
  }

  private rotatedPath(date: Date): string {
    const ext = extname(this.filePath);
    const base = ext.length > 0 ? this.filePath.slice(0, -ext.length) : this.filePath;
    return `${base}.${formatStamp(date)}${ext}`;
  }

  private async prune(): Promise<void> {
    const maxFiles = this.rotation?.maxFiles ?? 5;
    const ext = extname(this.filePath);
    const dir = dirname(this.filePath);
    const currentName = basename(this.filePath);
    const prefix = `${ext.length > 0 ? currentName.slice(0, -ext.length) : currentName}.`;

    const names = await readdir(dir);
    const candidates = names.filter(
      (name) => name !== currentName && name.startsWith(prefix),
    );

    const withMtime = await Promise.all(
      candidates.map(async (name) => {
        const info = await stat(join(dir, name));
        return { name, mtime: info.mtimeMs };
      }),
    );

    withMtime.sort((a, b) => b.mtime - a.mtime);
    for (const file of withMtime.slice(maxFiles)) {
      await rm(join(dir, file.name), { force: true });
    }
  }
}

export function fileTransporter(options: FileTransporterOptions): Transport {
  return new FileTransporter(options);
}
