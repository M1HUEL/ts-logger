import type { LogEntry, LogLevel } from "./types";

export interface HumanFormatterOptions {
  color?: boolean;
  printArgs?: boolean;
}

export interface LogFormatter {
  format(entry: LogEntry): string;
}

const LEVEL_LABEL: Record<LogLevel, string> = {
  trace: "TRACE",
  debug: "DEBUG",
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  fatal: "FATAL",
};

const LEVEL_COLOR: Record<LogLevel, number> = {
  trace: 90,
  debug: 36,
  info: 32,
  warn: 33,
  error: 31,
  fatal: 35,
};

const NO_COLOR_ENABLED =
  typeof process !== "undefined" && process.env.NO_COLOR !== undefined;

function colorize(text: string, code: number, enabled: boolean): string {
  if (!enabled) {
    return text;
  }
  return `\u001b[${code}m${text}\u001b[0m`;
}

export function humanFormatter(
  options: HumanFormatterOptions = {},
): LogFormatter {
  const colorEnabled = options.color ?? !NO_COLOR_ENABLED;
  const printArgs = options.printArgs ?? true;

  return {
    format(entry: LogEntry): string {
      const time = colorize(entry.timestamp, 90, colorEnabled);
      const level = colorize(
        LEVEL_LABEL[entry.level].padEnd(5),
        LEVEL_COLOR[entry.level],
        colorEnabled,
      );
      const parts: string[] = [`${time} ${level} ${entry.message}`];

      const contextKeys = Object.keys(entry.context);
      if (contextKeys.length > 0) {
        parts.push(colorize(serialize(entry.context), 90, colorEnabled));
      }

      if (printArgs && entry.args.length > 0) {
        const rendered = entry.args.map(serialize).join(" ");
        parts.push(rendered);
      }

      return parts.join(" ");
    },
  };
}

function errorToJson(error: Error): Record<string, unknown> {
  const serialized: Record<string, unknown> = {
    name: error.name,
    message: error.message,
  };
  if (error.stack) {
    serialized.stack = error.stack;
  }
  if (error.cause !== undefined) {
    serialized.cause = error.cause;
  }
  return serialized;
}

function safeJsonStringify(value: unknown): string {
  const seen = new Set<object>();

  function replacer(_key: string, current: unknown): unknown {
    if (current instanceof Error) {
      return errorToJson(current);
    }
    if (typeof current === "bigint") {
      return current.toString();
    }
    if (typeof current === "function" || typeof current === "symbol") {
      return undefined;
    }
    if (current !== null && typeof current === "object") {
      if (seen.has(current)) {
        return "[Circular]";
      }
      seen.add(current);
    }
    return current;
  }

  try {
    return JSON.stringify(value, replacer);
  } catch {
    return JSON.stringify({ error: "Unserializable log entry" });
  }
}

export function jsonFormatter(): LogFormatter {
  return {
    format(entry: LogEntry): string {
      return safeJsonStringify(entry);
    },
  };
}

export function serialize(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  if (typeof value === "object" && value !== null) {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}
