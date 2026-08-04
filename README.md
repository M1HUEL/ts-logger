# ts-logger

Transport-agnostic logging library for Node.js, written in TypeScript.

- **Agnostic**: the core emits typed `LogEntry` objects; you decide where they go via transports (console included).
- **Minimal**: zero runtime dependencies, tiny footprint.
- **Dual module**: ships ESM + CJS with TypeScript types.
- **Filtering**: configurable level threshold, runtime changes, `silent` mode.
- **Context**: child loggers with inherited metadata (e.g. `requestId`).

## Installation

```bash
npm install ts-logger
```

Requires Node.js >= 18.

## Usage

```ts
import { Logger } from "ts-logger";

const logger = new Logger({ level: "info" });

logger.info("Server started", { port: 3000 });
logger.warn("High memory usage", { usedMB: 512 });
logger.error("Failed to connect", new Error("ECONNREFUSED"));
```

### Child loggers

```ts
const logger = new Logger({ context: { app: "api" } });

function handleRequest(requestId: string) {
  const req = logger.child({ requestId });
  req.info("handling request");
}
```

### Custom transports

Any object implementing the `Transport` interface can be plugged in:

```ts
import type { Transport } from "ts-logger";

const httpTransport: Transport = {
  name: "http",
  log(entry) {
    fetch("https://logs.example.com", {
      method: "POST",
      body: JSON.stringify(entry),
    });
  },
};

const logger = new Logger({ transports: [httpTransport] });
```

The built-in `consoleTransport()` uses a human-readable formatter with ANSI colors.

### JSON output

```ts
import { Logger, consoleTransport } from "ts-logger";

const logger = new Logger({
  transports: [consoleTransport({ json: true })],
});
```

### Levels

Ordered by severity: `trace` < `debug` < `info` < `warn` < `error` < `fatal`.

Set `level: "silent"` to disable all output. The threshold can be changed at
runtime via `logger.level`.

## API

### `new Logger(options?)`

| Option            | Type                    | Default               |
| ----------------- | ----------------------- | --------------------- |
| `level`           | `LogLevel \| "silent"`  | `"info"`              |
| `transports`      | `Transport[]`           | `[consoleTransport()]` |
| `context`         | `LogContext`            | `{}`                  |
| `createTimestamp` | `() => string`          | ISO 8601 now          |

### `Logger`

- `log(level, message, ...args)`
- `trace / debug / info / warn / error / fatal(message, ...args)`
- `child(context): Logger`
- `addTransport(transport)`
- `close()`
- `isEnabled(level): boolean`
- `level` (get/set)

### `LogEntry`

```ts
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  args: unknown[];
  context: LogContext;
}
```

## Development

```bash
npm install
npm run typecheck  # TypeScript type checking
npm run lint       # ESLint
npm test           # Vitest (unit tests)
npm run build      # tsup: ESM + CJS + d.ts
npm run test:coverage
```

## License

[MIT](./LICENSE)
