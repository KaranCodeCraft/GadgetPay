import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Database } = require('node-sqlite3-wasm');

const db = new Database('./servergadgetpe.sqlite');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
console.log('--- TABLES & COLUMNS ---');
for (const t of tables) {
  if (t.name === 'sqlite_sequence') continue;
  const info = db.prepare(`PRAGMA table_info("${t.name}")`).all();
  const cols = info.map(c => `${c.name} (${c.type})`).join(', ');
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
  console.log(`\nTable: ${t.name} (Rows: ${count})`);
  console.log(`Columns: ${cols}`);
  if (count > 0) {
    const sample = db.prepare(`SELECT * FROM "${t.name}" LIMIT 1`).get();
    console.log('Sample row keys:', Object.keys(sample));
  }
}
db.close();
