import { app } from "./app.js";
import { env } from "./config/env.js";
import { startLeadEventProjectorWorker, stopLeadEventProjectorWorker } from "./jobs/lead-event-projector.js";

// Restart server with updated Prisma schema enums
const server = app.listen(env.port, () => {
  console.log(`GadgetPe backend listening on port ${env.port}`);
  startLeadEventProjectorWorker({
    intervalMs: env.leadEventProjectorIntervalMs,
    batchSize: env.leadEventProjectorBatchSize,
  });
});

function shutdown() {
  stopLeadEventProjectorWorker();
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
