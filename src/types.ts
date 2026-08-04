export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;

export type LogLevel = (typeof LOG_LEVELS)[number];

export const SILENT_LEVEL = "silent" as const;

export type Level = LogLevel | typeof SILENT_LEVEL;

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  args: unknown[];
  context: LogContext;
}

export interface Transport {
  readonly name?: string;
  log(entry: LogEntry): void;
  close?(): void;
}

export interface LoggerOptions {
  level?: Level;
  transports?: Transport[];
  context?: LogContext;
  createTimestamp?: () => string;
}
