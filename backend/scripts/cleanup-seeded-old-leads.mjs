import Database from "better-sqlite3";

import { resolvedDbPath, sqlite as appSqlite } from "../src/db/sqlite.js";

if (appSqlite) {
  appSqlite.close();
}

const db = new Database(resolvedDbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const today = new Date().toISOString().slice(0, 10);

const toDelete = db
  .prepare(`
    SELECT id
    FROM partner_leads
    WHERE (
      id LIKE 'seed-%'
      OR user_sell_flow_id LIKE 'seed-%'
    )
      AND substr(COALESCE(json_extract(pickup_schedule_json, '$.primaryDate'), ''), 1, 10) <> ?
  `)
  .all(today);

const ids = toDelete.map((row) => row.id);

const countBefore = db.prepare("SELECT COUNT(*) as count FROM partner_leads").get().count;
const todayCountBefore = db
  .prepare(
    `SELECT COUNT(*) as count FROM partner_leads WHERE substr(COALESCE(json_extract(pickup_schedule_json, '$.primaryDate'), ''), 1, 10) = ?`,
  )
  .get(today).count;

if (ids.length > 0) {
  const tx = db.transaction((leadIds) => {
    const delEvents = db.prepare("DELETE FROM partner_lead_disposition_events WHERE lead_id = ?");
    const delOutboxByLead = db.prepare("DELETE FROM lead_event_outbox WHERE lead_id = ?");
    const delLead = db.prepare("DELETE FROM partner_leads WHERE id = ?");

    for (const id of leadIds) {
      delEvents.run(id);
      delOutboxByLead.run(id);
      delLead.run(id);
    }
  });

  tx(ids);
}

const countAfter = db.prepare("SELECT COUNT(*) as count FROM partner_leads").get().count;
const todayCountAfter = db
  .prepare(
    `SELECT COUNT(*) as count FROM partner_leads WHERE substr(COALESCE(json_extract(pickup_schedule_json, '$.primaryDate'), ''), 1, 10) = ?`,
  )
  .get(today).count;

console.log(
  JSON.stringify(
    {
      today,
      deletedSeededOldLeadCount: ids.length,
      totalLeadsBefore: countBefore,
      totalLeadsAfter: countAfter,
      leadsForTodayBefore: todayCountBefore,
      leadsForTodayAfter: todayCountAfter,
    },
    null,
    2,
  ),
);

db.close();
