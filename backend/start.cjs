// CommonJS bootstrap for Hostinger's process manager (which may use require())
// This file must have .cjs extension to override "type": "module" in package.json
const http = require("http");
const PORT = process.env.PORT || 4000;

console.log("[cjs-boot] starting, PORT=" + PORT + ", node=" + process.version);

// Immediate minimal server
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", boot: "cjs", port: PORT, node: process.version, cwd: process.cwd() }));
});

server.listen(PORT, () => {
  console.log("[cjs-boot] probe listening on port " + PORT);

  // Now try loading the real ESM app
  import("./src/server.js").then(() => {
    console.log("[cjs-boot] ESM app loaded, closing probe");
    server.close();
  }).catch((err) => {
    console.error("[cjs-boot] ESM load failed, keeping probe alive:", err.message);
  });
});
