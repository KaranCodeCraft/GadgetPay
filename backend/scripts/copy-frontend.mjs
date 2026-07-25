// Copies frontend build output into backend/public/ for unified serving
import { cpSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const src = join(__dirname, "..", "..", "frontend", "dist");
const dest = join(__dirname, "..", "public");

if (!existsSync(src)) {
  console.error("Frontend build not found at", src);
  process.exit(1);
}

// Clean previous copy
if (existsSync(dest)) {
  rmSync(dest, { recursive: true, force: true });
}

cpSync(src, dest, { recursive: true });
console.log("Copied frontend build to backend/public/");
