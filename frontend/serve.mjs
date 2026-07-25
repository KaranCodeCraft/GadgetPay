// Production server for GadgetPe frontend (TanStack Start SSR)
// Serves static client assets + SSR for HTML pages + proxies /api/* to backend
import { createServer, request as httpRequest } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const API_BACKEND = process.env.API_BACKEND || "http://localhost:4000";
const CLIENT_DIR = join(__dirname, "dist", "client");

// Load the SSR handler (Cloudflare Workers-style fetch export)
const ssrModule = await import("./dist/server/server.js");
const ssrHandler = ssrModule.default;

const MIME_TYPES = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json",
};

async function tryServeStatic(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const urlPath = new URL(req.url, "http://localhost").pathname;
  // Only serve files with extensions (not route paths)
  if (!extname(urlPath)) return false;
  const filePath = join(CLIENT_DIR, urlPath);
  // Prevent directory traversal
  if (!filePath.startsWith(CLIENT_DIR)) return false;
  try {
    const stats = await stat(filePath);
    if (!stats.isFile()) return false;
    const ext = extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || "application/octet-stream";
    const data = await readFile(filePath);
    res.writeHead(200, {
      "Content-Type": mime,
      "Content-Length": data.length,
      "Cache-Control": urlPath.includes("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600",
    });
    res.end(data);
    return true;
  } catch {
    return false;
  }
}

function proxyToBackend(req, res) {
  const backendUrl = new URL(req.url, API_BACKEND);
  const proxyReq = httpRequest(
    backendUrl,
    {
      method: req.method,
      headers: { ...req.headers, host: backendUrl.host },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (err) => {
    console.error("API proxy error:", err.message);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Backend unavailable" }));
  });
  req.pipe(proxyReq);
}

async function handleSSR(req, res) {
  try {
    const protocol = req.headers["x-forwarded-proto"] || "http";
    const host = req.headers.host || "localhost";
    const url = new URL(req.url, `${protocol}://${host}`);
    const headers = new Headers();
    for (const [key, val] of Object.entries(req.headers)) {
      if (typeof val === "string") headers.set(key, val);
    }
    const webReq = new Request(url.toString(), { method: req.method, headers });
    const webRes = await ssrHandler.fetch(webReq, {}, {});
    res.writeHead(webRes.status, Object.fromEntries(webRes.headers));
    res.end(Buffer.from(await webRes.arrayBuffer()));
  } catch (err) {
    console.error("SSR error:", err);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal Server Error");
  }
}

const server = createServer(async (req, res) => {
  // 1. Proxy /api/* and /health to backend
  if (req.url.startsWith("/api/") || req.url === "/health") {
    return proxyToBackend(req, res);
  }

  // 2. Try serving static client asset
  if (await tryServeStatic(req, res)) return;

  // 3. SSR for everything else
  await handleSSR(req, res);
});

server.listen(PORT, () => {
  console.log(`GadgetPe frontend listening on port ${PORT}`);
  console.log(`API backend proxy → ${API_BACKEND}`);
});

process.on("SIGINT", () => { server.close(); process.exit(0); });
process.on("SIGTERM", () => { server.close(); process.exit(0); });
