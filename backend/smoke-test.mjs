import fs from 'fs';
const outFile = 'smoke-result.txt';
try {
  const NodeSqlite3Wasm = (await import('node-sqlite3-wasm')).default;
  const dbPath = 'data/smoke-test-wal.sqlite';
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
  const db = new NodeSqlite3Wasm.Database(dbPath);
  fs.writeFileSync(outFile, 'Constructor OK\n');
  db.exec('PRAGMA journal_mode = WAL');
  fs.appendFileSync(outFile, 'WAL OK\n');
  db.exec('CREATE TABLE IF NOT EXISTS t (id INTEGER PRIMARY KEY)');
  fs.appendFileSync(outFile, 'CREATE OK\n');
  db.run('INSERT INTO t VALUES (?)', 1);
  fs.appendFileSync(outFile, 'INSERT OK\n');
  const row = db.get('SELECT * FROM t WHERE id = ?', 1);
  fs.appendFileSync(outFile, 'GET OK: ' + JSON.stringify(row) + '\n');
  db.close();
  fs.appendFileSync(outFile, 'ALL DONE\n');
} catch (e) {
  fs.appendFileSync(outFile, 'FAIL: ' + e.message + '\n');
}
process.exit(0);
