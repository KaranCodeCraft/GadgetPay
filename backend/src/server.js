console.log("[boot] server.js top-level reached");
let app, env, startLeadEventProjectorWorker, stopLeadEventProjectorWorker;
try {
  ({ app } = await import("./app.js"));
  ({ env } = await import("./config/env.js"));
  ({ startLeadEventProjectorWorker, stopLeadEventProjectorWorker } = await import("./jobs/lead-event-projector.js"));
} catch (err) {
  console.error("[boot] FATAL import error:", err);
  process.exit(1);
}

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
