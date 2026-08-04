import { LOG_LEVELS } from "./types";
import type { LogLevel, Level } from "./types";

const LEVEL_SEVERITY: Record<LogLevel, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

export function severityOf(level: LogLevel): number {
  return LEVEL_SEVERITY[level];
}

export function isLevelEnabled(configured: Level, level: LogLevel): boolean {
  if (configured === "silent") {
    return false;
  }
  return severityOf(level) >= severityOf(configured);
}

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}
