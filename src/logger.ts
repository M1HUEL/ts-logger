import type { LogContext, LoggerOptions, LogEntry, LogLevel, Level, Transport } from "./types";
import { isLevelEnabled } from "./levels";
import { consoleTransport } from "./transports";

interface SharedState {
  level: Level;
  transports: Transport[];
}

function defaultTimestamp(): string {
  return new Date().toISOString();
}

function resolveEntry(
  state: SharedState,
  level: LogLevel,
  message: string,
  args: unknown[],
  context: LogContext,
  createTimestamp: () => string,
): LogEntry {
  return {
    timestamp: createTimestamp(),
    level,
    message,
    args,
    context,
  };
}

export class Logger {
  readonly context: LogContext;
  private readonly state: SharedState;
  private readonly createTimestamp: () => string;

  constructor(options: LoggerOptions = {}) {
    const transports = options.transports ?? [];
    this.state = {
      level: options.level ?? "info",
      transports: transports.length > 0 ? transports : [consoleTransport()],
    };
    this.context = { ...options.context };
    this.createTimestamp = options.createTimestamp ?? defaultTimestamp;
  }

  get level(): Level {
    return this.state.level;
  }

  set level(level: Level) {
    this.state.level = level;
  }

  isEnabled(level: LogLevel): boolean {
    return isLevelEnabled(this.state.level, level);
  }

  log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (!this.isEnabled(level)) {
      return;
    }
    const entry = resolveEntry(
      this.state,
      level,
      message,
      args,
      this.context,
      this.createTimestamp,
    );
    for (const transport of this.state.transports) {
      try {
        transport.log(entry);
      } catch (error) {
        console.error("ts-logger transport error:", error);
      }
    }
  }

  trace(message: string, ...args: unknown[]): void {
    this.log("trace", message, ...args);
  }

  debug(message: string, ...args: unknown[]): void {
    this.log("debug", message, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    this.log("info", message, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    this.log("warn", message, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    this.log("error", message, ...args);
  }

  fatal(message: string, ...args: unknown[]): void {
    this.log("fatal", message, ...args);
  }

  child(context: LogContext): Logger {
    return new Logger({
      level: this.state.level,
      transports: this.state.transports,
      context: { ...this.context, ...context },
      createTimestamp: this.createTimestamp,
    });
  }

  addTransport(transport: Transport): void {
    this.state.transports.push(transport);
  }

  async close(): Promise<void> {
    await Promise.all(
      this.state.transports.map(async (transport) => {
        try {
          await transport.close?.();
        } catch (error) {
          console.error("ts-logger transport error:", error);
        }
      }),
    );
    this.state.transports = [];
  }
}
