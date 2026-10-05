import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Database: WasmDatabase } = require("node-sqlite3-wasm");

const sqlitePath = path.resolve("servergadgetpe.sqlite");
function cleanLock(filePath) {
  for (const ext of [".lock", "-wal", "-shm", "-journal"]) {
    const p = filePath + ext;
    if (fs.existsSync(p)) {
      try { fs.rmSync(p, { recursive: true, force: true }); } catch {}
    }
  }
}
cleanLock(sqlitePath);
const db = new WasmDatabase(sqlitePath.replace(/\\/g, "/"));
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();

for (const t of tables) {
  if (t.name === 'sqlite_sequence') continue;
  const cols = db.prepare(`PRAGMA table_info("${t.name}")`).all();
  for (const col of cols) {
    const emptyCount = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}" WHERE "${col.name}" = ''`).get().c;
    const nullCount = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}" WHERE "${col.name}" IS NULL`).get().c;
    if (emptyCount > 0) {
      console.log(`Table ${t.name}, Col ${col.name}: ${emptyCount} empty strings ('') [nulls: ${nullCount}]`);
    }
  }
}

db.close();
cleanLock(sqlitePath);
