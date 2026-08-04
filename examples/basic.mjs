// Basic usage: console logging, levels, child loggers with context.
// Run with: node examples/basic.mjs (after `npm run build`)

import { Logger } from "../dist/index.js";

const logger = new Logger({ level: "trace" });

logger.trace("lowest level");
logger.debug("debugging detail", { module: "auth" });
logger.info("Server started", { port: 3000 });
logger.warn("High memory usage", { usedMB: 512 });
logger.error("Failed to connect", new Error("ECONNREFUSED"));

// Child logger inherits the parent context and adds its own.
const requestLogger = logger.child({ service: "api" });

function handleRequest(requestId) {
  const req = requestLogger.child({ requestId });
  req.info("handling request");
  req.warn("slow query", { ms: 812 });
}

handleRequest("req-001");
handleRequest("req-002");
