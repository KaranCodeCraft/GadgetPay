import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Database: WasmDatabase } = require("node-sqlite3-wasm");
import { PrismaClient } from "@prisma/client";

const sqlitePath = path.resolve("servergadgetpe.sqlite");

// Cleanup stale lock if any
function cleanLock(filePath) {
  for (const ext of [".lock", "-wal", "-shm", "-journal"]) {
    const p = filePath + ext;
    if (fs.existsSync(p)) {
      try {
        fs.rmSync(p, { recursive: true, force: true });
      } catch (e) {
        console.error(`Failed to remove ${p}:`, e.message);
      }
    }
  }
}

cleanLock(sqlitePath);

const db = new WasmDatabase(sqlitePath.replace(/\\/g, "/"));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

const prisma = new PrismaClient();

async function main() {
  console.log("=== SQLITE TABLES ===");
  const sqliteTableMap = new Map();
  for (const t of tables) {
    if (t.name === 'sqlite_sequence') continue;
    const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
    const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
    sqliteTableMap.set(t.name, { count, cols });
    console.log(`Table: ${t.name.padEnd(35)} Rows: ${count}`);
  }

  console.log("\n=== PRISMA CLIENT MODELS ===");
  const prismaModels = Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_'));
  console.log("Models:", prismaModels.join(", "));

  db.close();
  cleanLock(sqlitePath);
  await prisma.$disconnect();
}

main().catch(err => {
  console.error("Error:", err);
  db.close();
  cleanLock(sqlitePath);
  process.exit(1);
});
