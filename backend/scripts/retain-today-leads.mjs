import Database from "better-sqlite3";

import { resolvedDbPath, sqlite as appSqlite } from "../src/db/sqlite.js";

if (appSqlite) {
  appSqlite.close();
}

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function localDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const today = parseArg("date") || localDateString();
const apply = process.argv.includes("--apply");

const db = new Database(resolvedDbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const summaryBefore = {
  total: db.prepare("SELECT COUNT(*) as count FROM partner_leads").get().count,
  today: db
    .prepare(
      `SELECT COUNT(*) as count
       FROM partner_leads
       WHERE substr(COALESCE(json_extract(pickup_schedule_json, '$.primaryDate'), ''), 1, 10) = ?`,
    )
    .get(today).count,
  leadBucket: db
    .prepare("SELECT COUNT(*) as count FROM partner_leads WHERE lead_type = 'LEAD_BUCKET'")
    .get().count,
  serviceLeads: db
    .prepare("SELECT COUNT(*) as count FROM partner_leads WHERE lead_type = 'SERVICE_LEAD'")
    .get().count,
};

const rowsToDelete = db
  .prepare(
    `SELECT id, lead_type as leadType, user_sell_flow_id as userSellFlowId
     FROM partner_leads
     WHERE substr(COALESCE(json_extract(pickup_schedule_json, '$.primaryDate'), ''), 1, 10) <> ?`,
  )
  .all(today);

if (apply && rowsToDelete.length > 0) {
  const tx = db.transaction((rows) => {
    const delAssignments = db.prepare("DELETE FROM admin_lead_assignments WHERE lead_id = ?");
    const delEvents = db.prepare("DELETE FROM partner_lead_disposition_events WHERE lead_id = ?");
    const delOutbox = db.prepare("DELETE FROM lead_event_outbox WHERE lead_id = ?");
    const delLead = db.prepare("DELETE FROM partner_leads WHERE id = ?");

    for (const row of rows) {
      delAssignments.run(row.id);
      delEvents.run(row.id);
      delOutbox.run(row.id);
      delLead.run(row.id);
    }
  });

  tx(rowsToDelete);
}

const summaryAfter = {
  total: db.prepare("SELECT COUNT(*) as count FROM partner_leads").get().count,
  today: db
    .prepare(
      `SELECT COUNT(*) as count
       FROM partner_leads
       WHERE substr(COALESCE(json_extract(pickup_schedule_json, '$.primaryDate'), ''), 1, 10) = ?`,
    )
    .get(today).count,
  leadBucket: db
    .prepare("SELECT COUNT(*) as count FROM partner_leads WHERE lead_type = 'LEAD_BUCKET'")
    .get().count,
  serviceLeads: db
    .prepare("SELECT COUNT(*) as count FROM partner_leads WHERE lead_type = 'SERVICE_LEAD'")
    .get().count,
};

const payload = {
  mode: apply ? "apply" : "dry-run",
  today,
  willDeleteCount: rowsToDelete.length,
  before: summaryBefore,
  after: summaryAfter,
};

console.log(JSON.stringify(payload, null, 2));

db.close();
