import type { LogEntry, Transport } from "./types";
import { humanFormatter, jsonFormatter } from "./formatters";
import type { LogFormatter } from "./formatters";

export interface ConsoleTransportOptions {
  formatter?: LogFormatter;
  json?: boolean;
}

const CONSOLE_METHOD: Record<LogEntry["level"], keyof Console> = {
  trace: "debug",
  debug: "debug",
  info: "log",
  warn: "warn",
  error: "error",
  fatal: "error",
};

export function consoleTransport(
  options: ConsoleTransportOptions = {},
): Transport {
  const formatter = options.json ? jsonFormatter() : options.formatter ?? humanFormatter();

  return {
    name: "console",
    log(entry: LogEntry): void {
      const method = CONSOLE_METHOD[entry.level] as "log" | "warn" | "error" | "debug";
      const line = formatter.format(entry);
      console[method](line);
    },
  };
}
