// Structured (JSON) output for machine consumers.
// Run with: node examples/json.mjs (after `npm run build`)

import { Logger, consoleTransport } from "../dist/index.js";

const logger = new Logger({
  transports: [consoleTransport({ json: true })],
});

logger.info("checkout completed", { orderId: 1234, total: 19.99 });
logger.warn("payment retry", { orderId: 1234, attempt: 2 });
logger.error("payment failed", new Error("card declined"), { orderId: 1234 });
