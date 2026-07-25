import http from "node:http";

console.log("[boot] server.js starting — phase 1: http module loaded");
console.log("[boot] PORT=" + process.env.PORT + " NODE_ENV=" + process.env.NODE_ENV);
console.log("[boot] cwd=" + process.cwd());
console.log("[boot] __dirname substitute=" + new URL(".", import.meta.url).pathname);

const PORT = Number(process.env.PORT || 4000);

// Phase 1: Minimal HTTP server to prove Node.js works on Hostinger
const probe = http.createServer((req, res) => {
  if (req.url === "/health" || req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", phase: "probe", port: PORT, node: process.version, cwd: process.cwd() }));
    return;
  }
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "not found" }));
});

probe.listen(PORT, () => {
  console.log(`[boot] probe server listening on port ${PORT}`);
});

// Phase 2: Try loading the real app (deferred)
setTimeout(async () => {
  try {
    console.log("[boot] phase 2: loading app modules...");
    const { app } = await import("./app.js");
    const { env } = await import("./config/env.js");
    const { startLeadEventProjectorWorker, stopLeadEventProjectorWorker } = await import("./jobs/lead-event-projector.js");
    
    // Replace probe with real app
    probe.close(() => {
      const server = app.listen(PORT, () => {
        console.log(`[boot] phase 2 complete — real app on port ${PORT}`);
        startLeadEventProjectorWorker({
          intervalMs: env.leadEventProjectorIntervalMs,
          batchSize: env.leadEventProjectorBatchSize,
        });
      });

      function shutdown() {
        stopLeadEventProjectorWorker();
        server.close(() => process.exit(0));
      }
      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    });
  } catch (err) {
    console.error("[boot] phase 2 FAILED — keeping probe alive:", err.message, err.stack);
    // Keep probe running so we can at least see the error in /health
    probe._bootError = err.message;
  }
}, 1000);

process.on("SIGINT", () => process.exit(0));
process.on("SIGTERM", () => process.exit(0));
