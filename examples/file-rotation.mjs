// File transport with size-based rotation.
// Run with: node examples/file-rotation.mjs (after `npm run build`)

import { Logger, fileTransporter } from "../dist/index.js";

const logger = new Logger({
  level: "info",
  transports: [
    fileTransporter({
      path: "./logs/app.log",
      rotation: {
        maxSize: 1024,
        maxFiles: 3,
      },
      onError: (error) => console.error("file transport failed:", error),
    }),
  ],
});

logger.info("writing to ./logs/app.log");

for (let i = 0; i < 100; i += 1) {
  logger.info(`line number ${i}`, { attempt: i });
}

console.log("Done. Rotated files appear as app.YYYYMMDD-HHmmss.log");
