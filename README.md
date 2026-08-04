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

Requires Node.js >= 20.

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

### File transport with rotation

The built-in `fileTransporter()` writes to disk and supports rotation by size
and/or calendar period, keeping a bounded number of files.

```ts
import { Logger, fileTransporter } from "ts-logger";

const logger = new Logger({
  transports: [
    fileTransporter({
      path: "./logs/app.log",
      rotation: {
        maxSize: 10 * 1024 * 1024, // rotate at 10 MB
        maxFiles: 5, // keep the 5 most recent rotated files
        date: "daily", // also rotate when the calendar day changes
      },
    }),
  ],
});
```

Rotated files are named `app.YYYYMMDD-HHmmss.log`. `maxSize` and `date` are
independent: either one can be omitted. Writes are serialized through an
internal queue; failures are reported via the `onError` callback (defaults to
`console.error`). Call `logger.close()` to flush pending writes.

### Examples

Run the demos from the repository root after building:

```bash
npm run build
node examples/basic.mjs          # levels, child loggers, context
node examples/file-rotation.mjs  # file transport with size rotation
node examples/json.mjs           # structured JSON output
```

### Levels

Ordered by severity: `trace` < `debug` < `info` < `warn` < `error` < `fatal`.

Set `level: "silent"` to disable all output. The threshold can be changed at
runtime via `logger.level`.

## API

Full API reference: [ts-logger docs](https://m1huel.github.io/ts-logger/)

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
npm run docs       # TypeDoc → docs/ (published to GitHub Pages)
npm run test:coverage
```

## License

[MIT](./LICENSE)
