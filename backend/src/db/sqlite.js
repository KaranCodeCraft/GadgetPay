import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Database: WasmDatabase } = require("node-sqlite3-wasm");
import { env } from "../config/env.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
const defaultDbPath = path.resolve(moduleDir, "../../data/gadgetpe.sqlite");
const resolvedDbPath = path.resolve(process.cwd(), env.sqlitePath || defaultDbPath);
const resolvedMediaRoot = path.resolve(process.cwd(), env.mediaRoot);

fs.mkdirSync(path.dirname(resolvedDbPath), { recursive: true });
fs.mkdirSync(resolvedMediaRoot, { recursive: true });

const wasmDb = new WasmDatabase(resolvedDbPath);

let _savepointId = 0;

const sqlite = {
  exec(sql) { return wasmDb.exec(sql); },
  pragma(str) {
    const [key, val] = str.split("=").map(s => s.trim());
    if (val !== undefined) {
      wasmDb.exec(`PRAGMA ${key} = ${val}`);
      return;
    }
    return wasmDb.exec(`PRAGMA ${key}`);
  },
  prepare(sql) {
    const stmt = wasmDb.prepare(sql);
    const normalizeParams = (args) => {
      if (args.length === 0) return undefined;
      if (args.length === 1 && Array.isArray(args[0])) return args[0];
      if (args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])) return args[0];
      return args;
    };
    return {
      run(...args) {
        return stmt.run(normalizeParams(args));
      },
      get(...args) {
        return stmt.get(normalizeParams(args));
      },
      all(...args) {
        return stmt.all(normalizeParams(args));
      },
    };
  },
  transaction(fn) {
    return (...args) => {
      const nested = wasmDb.inTransaction;
      const sp = `_sp${++_savepointId}`;
      if (nested) {
        wasmDb.exec(`SAVEPOINT ${sp}`);
      } else {
        wasmDb.exec("BEGIN");
      }
      try {
        const result = fn(...args);
        if (nested) {
          wasmDb.exec(`RELEASE ${sp}`);
        } else {
          wasmDb.exec("COMMIT");
        }
        return result;
      } catch (err) {
        if (nested) {
          wasmDb.exec(`ROLLBACK TO ${sp}`);
          wasmDb.exec(`RELEASE ${sp}`);
        } else {
          wasmDb.exec("ROLLBACK");
        }
        throw err;
      }
    };
  },
  close() { wasmDb.close(); },
};

sqlite.pragma("journal_mode = WAL");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS partners (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    phone TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS otp_codes (
    phone TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    sent_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    token_id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_sell_flows (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    flow_type TEXT NOT NULL DEFAULT 'sell-phone',
    status TEXT NOT NULL CHECK(status IN ('DRAFT', 'QUESTIONNAIRE_COMPLETED', 'QUOTE_READY', 'PICKUP_SCHEDULED', 'CANCELLED')),
    selected_model_json TEXT NOT NULL,
    device_details_json TEXT,
    pickup_schedule_json TEXT,
    quote_json TEXT,
    flow_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_user_sell_flows_user_updated
    ON user_sell_flows(user_id, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_user_sell_flows_status
    ON user_sell_flows(status);

  CREATE TABLE IF NOT EXISTS partner_leads (
    id TEXT PRIMARY KEY,
    user_sell_flow_id TEXT NOT NULL UNIQUE,
    user_id TEXT NOT NULL,
    lead_type TEXT NOT NULL CHECK(lead_type IN ('LEAD_BUCKET', 'SERVICE_LEAD')),
    status TEXT NOT NULL CHECK(status IN ('AVAILABLE', 'CLAIMED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED', 'CANCELLED')),
    partner_id TEXT,
    pincode TEXT NOT NULL,
    city TEXT,
    seller_name TEXT,
    seller_phone TEXT,
    address_line TEXT,
    landmark TEXT,
    selected_model_json TEXT NOT NULL,
    device_details_json TEXT,
    quote_json TEXT,
    pickup_schedule_json TEXT,
    flow_snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    claimed_at TEXT,
    completed_at TEXT,
    cancelled_at TEXT,
    rejection_reason TEXT,
    pickup_started_at TEXT,
    call_status TEXT,
    call_attempt_count INTEGER NOT NULL DEFAULT 0,
    last_called_at TEXT,
    call_history_json TEXT,
    onsite_validation_json TEXT,
    onsite_validated_at TEXT,
    onsite_validated_by TEXT,
    payment_proof_json TEXT,
    payment_submitted_at TEXT,
    completion_event_json TEXT,
    completion_event_at TEXT,
    FOREIGN KEY(user_sell_flow_id) REFERENCES user_sell_flows(id),
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(partner_id) REFERENCES partners(id)
  );

  CREATE INDEX IF NOT EXISTS idx_partner_leads_scope_status
    ON partner_leads(pincode, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_partner_leads_partner_status
    ON partner_leads(partner_id, status, updated_at DESC);

  CREATE INDEX IF NOT EXISTS idx_partner_leads_type_status
    ON partner_leads(lead_type, status);

  CREATE TABLE IF NOT EXISTS media_assets (
    id TEXT PRIMARY KEY,
    tenant_type TEXT NOT NULL,
    tenant_id TEXT,
    owner_role TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    slot TEXT,
    original_file_name TEXT NOT NULL,
    stored_file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    relative_path TEXT NOT NULL,
    storage_provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE',
    checksum TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_media_tenant
    ON media_assets(tenant_type, tenant_id, status, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_media_entity
    ON media_assets(entity_type, entity_id, status, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_media_owner
    ON media_assets(owner_role, owner_id, status, created_at DESC);

  CREATE TABLE IF NOT EXISTS partner_lead_disposition_events (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    user_sell_flow_id TEXT NOT NULL,
    partner_id TEXT,
    from_status TEXT,
    to_status TEXT NOT NULL,
    disposition_key TEXT NOT NULL,
    note TEXT,
    actor_role TEXT NOT NULL,
    actor_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(lead_id) REFERENCES partner_leads(id),
    FOREIGN KEY(user_sell_flow_id) REFERENCES user_sell_flows(id),
    FOREIGN KEY(partner_id) REFERENCES partners(id)
  );

  CREATE INDEX IF NOT EXISTS idx_partner_lead_disp_events_lead_time
    ON partner_lead_disposition_events(lead_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_partner_lead_disp_events_status_time
    ON partner_lead_disposition_events(to_status, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_partner_lead_disp_events_key_time
    ON partner_lead_disposition_events(disposition_key, created_at DESC);

  CREATE TABLE IF NOT EXISTS serviceability_pincodes (
    pincode TEXT PRIMARY KEY,
    status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'INACTIVE', 'LIMITED')),
    reason TEXT,
    state TEXT,
    district TEXT,
    office_count INTEGER,
    delivery_office_count INTEGER,
    metadata_json TEXT,
    source_upload_id TEXT,
    source_file_name TEXT,
    updated_by TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS serviceability_upload_history (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'DEACTIVATED')),
    media_id TEXT,
    deactivated_by TEXT,
    deactivated_at TEXT,
    deactivated_row_count INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL DEFAULT 0,
    updated_count INTEGER NOT NULL DEFAULT 0,
    total_processed INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY(media_id) REFERENCES media_assets(id)
  );

  CREATE TABLE IF NOT EXISTS partner_pincode_scopes (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    pincode TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    last_assigned_at TEXT,
    updated_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(partner_id, pincode),
    FOREIGN KEY(partner_id) REFERENCES partners(id),
    FOREIGN KEY(pincode) REFERENCES serviceability_pincodes(pincode)
  );

  CREATE TABLE IF NOT EXISTS partner_kyc_submissions (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    identity_proof TEXT NOT NULL,
    file_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_status TEXT NOT NULL,
    storage_provider TEXT NOT NULL,
    storage_key TEXT,
    verification_status TEXT NOT NULL,
    verification_notes TEXT,
    verified_by TEXT,
    verified_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(partner_id) REFERENCES partners(id)
  );

  CREATE INDEX IF NOT EXISTS idx_kyc_partner_id ON partner_kyc_submissions(partner_id);
  CREATE INDEX IF NOT EXISTS idx_kyc_verification_status ON partner_kyc_submissions(verification_status);

  CREATE TABLE IF NOT EXISTS partner_coin_wallets (
    partner_id TEXT PRIMARY KEY,
    balance INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(partner_id) REFERENCES partners(id)
  );

  CREATE TABLE IF NOT EXISTS partner_coin_ledger (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    txn_type TEXT NOT NULL CHECK(txn_type IN ('CREDIT', 'DEBIT')),
    amount INTEGER NOT NULL,
    method TEXT NOT NULL,
    reference TEXT,
    note TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(partner_id) REFERENCES partners(id)
  );

  CREATE TABLE IF NOT EXISTS partner_coin_recharge_requests (
    id TEXT PRIMARY KEY,
    partner_id TEXT NOT NULL,
    amount INTEGER NOT NULL,
    upi_txn_ref TEXT NOT NULL,
    upi_app TEXT,
    status TEXT NOT NULL CHECK(status IN ('PENDING', 'APPROVED', 'REJECTED')),
    requested_at TEXT NOT NULL,
    verified_at TEXT,
    verified_by TEXT,
    admin_note TEXT,
    ledger_entry_id TEXT,
    metadata_json TEXT,
    FOREIGN KEY(partner_id) REFERENCES partners(id)
  );

  CREATE INDEX IF NOT EXISTS idx_partner_coin_ledger_partner
    ON partner_coin_ledger(partner_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_partner_coin_recharge_requests_partner
    ON partner_coin_recharge_requests(partner_id, requested_at DESC);

  CREATE INDEX IF NOT EXISTS idx_partner_coin_recharge_requests_status
    ON partner_coin_recharge_requests(status, requested_at DESC);

  CREATE INDEX IF NOT EXISTS idx_partner_pincode_scopes_pincode_active
    ON partner_pincode_scopes(pincode, is_active, last_assigned_at ASC);

  CREATE TABLE IF NOT EXISTS lead_event_outbox (
    id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    occurred_at TEXT NOT NULL,
    delivery_status TEXT NOT NULL DEFAULT 'PENDING' CHECK(delivery_status IN ('PENDING', 'PROCESSED', 'FAILED')),
    retry_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TEXT,
    last_error TEXT
  );

  CREATE TABLE IF NOT EXISTS admin_metrics_snapshot (
    id TEXT PRIMARY KEY,
    bucket_date TEXT NOT NULL,
    scope_pincode TEXT,
    scope_partner_id TEXT,
    metric_key TEXT NOT NULL,
    metric_value REAL NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS admin_lead_assignments (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    assigned_partner_id TEXT NOT NULL,
    assigned_by_admin_id TEXT NOT NULL,
    assignment_mode TEXT NOT NULL CHECK(assignment_mode IN ('MANUAL', 'AUTO')),
    note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(lead_id) REFERENCES partner_leads(id),
    FOREIGN KEY(assigned_partner_id) REFERENCES partners(id)
  );

  CREATE INDEX IF NOT EXISTS idx_lead_event_outbox_status_time
    ON lead_event_outbox(delivery_status, occurred_at ASC);

  CREATE INDEX IF NOT EXISTS idx_admin_metrics_snapshot_scope
    ON admin_metrics_snapshot(bucket_date, scope_pincode, scope_partner_id, metric_key);

  CREATE INDEX IF NOT EXISTS idx_admin_lead_assignments_lead_time
    ON admin_lead_assignments(lead_id, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_admin_lead_assignments_partner_time
    ON admin_lead_assignments(assigned_partner_id, created_at DESC);

  CREATE TABLE IF NOT EXISTS device_price_catalog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    brand TEXT NOT NULL,
    series TEXT NOT NULL,
    model TEXT NOT NULL,
    storage TEXT NOT NULL,
    launch_year INTEGER NOT NULL,
    cashify_price REAL NOT NULL,
    row_json TEXT NOT NULL,
    source_upload_id TEXT,
    source_file_name TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(brand, series, model, storage, launch_year)
  );

  CREATE TABLE IF NOT EXISTS quote_deduction_rules (
    id TEXT PRIMARY KEY,
    answer_group TEXT NOT NULL,
    answer_key TEXT NOT NULL,
    answer_value TEXT,
    label TEXT NOT NULL,
    deduction_type TEXT NOT NULL CHECK(deduction_type IN ('RUPEES', 'PERCENT')),
    deduction_value REAL NOT NULL,
    max_deduction_amount REAL,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active INTEGER NOT NULL DEFAULT 1,
    applies_to_brand TEXT,
    applies_to_model_id TEXT,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS device_price_upload_history (
    id TEXT PRIMARY KEY,
    file_name TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DEACTIVATED')),
    deactivated_by TEXT,
    deactivated_at TEXT,
    deactivated_row_count INTEGER NOT NULL DEFAULT 0,
    inserted_count INTEGER NOT NULL,
    updated_count INTEGER NOT NULL,
    total_processed INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS device_price_upload_rows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    upload_id TEXT NOT NULL,
    brand TEXT NOT NULL,
    series TEXT NOT NULL,
    model TEXT NOT NULL,
    storage TEXT NOT NULL,
    launch_year INTEGER NOT NULL,
    cashify_price REAL NOT NULL,
    row_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(upload_id, brand, series, model, storage, launch_year),
    FOREIGN KEY(upload_id) REFERENCES device_price_upload_history(id)
  );

  CREATE INDEX IF NOT EXISTS idx_price_catalog_lookup
    ON device_price_catalog(brand, series, model, storage, launch_year);

  CREATE INDEX IF NOT EXISTS idx_price_upload_rows_upload
    ON device_price_upload_rows(upload_id);
`);

function ensureServiceabilityColumn(columnName, sqlType) {
  const columns = sqlite.prepare("PRAGMA table_info(serviceability_pincodes)").all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    sqlite.exec(`ALTER TABLE serviceability_pincodes ADD COLUMN ${columnName} ${sqlType}`);
  }
}

ensureServiceabilityColumn("state", "TEXT");
ensureServiceabilityColumn("district", "TEXT");
ensureServiceabilityColumn("office_count", "INTEGER");
ensureServiceabilityColumn("delivery_office_count", "INTEGER");
ensureServiceabilityColumn("metadata_json", "TEXT");
ensureServiceabilityColumn("source_upload_id", "TEXT");
ensureServiceabilityColumn("source_file_name", "TEXT");

function ensureDevicePriceCatalogColumn(columnName, sqlType) {
  const columns = sqlite.prepare("PRAGMA table_info(device_price_catalog)").all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    sqlite.exec(`ALTER TABLE device_price_catalog ADD COLUMN ${columnName} ${sqlType}`);
  }
}

ensureDevicePriceCatalogColumn("source_upload_id", "TEXT");

sqlite.exec(`
  CREATE INDEX IF NOT EXISTS idx_serviceability_source_upload
    ON serviceability_pincodes(source_upload_id);

  CREATE INDEX IF NOT EXISTS idx_serviceability_upload_history_uploaded_at
    ON serviceability_upload_history(uploaded_at DESC);

  CREATE INDEX IF NOT EXISTS idx_price_catalog_upload
    ON device_price_catalog(source_upload_id);

  CREATE INDEX IF NOT EXISTS idx_quote_deduction_rules_active_match
    ON quote_deduction_rules(is_active, answer_group, answer_key, answer_value);

  CREATE INDEX IF NOT EXISTS idx_quote_deduction_rules_brand_model
    ON quote_deduction_rules(applies_to_brand, applies_to_model_id);
`);

function ensureDevicePriceUploadHistoryColumn(columnName, sqlType) {
  const columns = sqlite.prepare("PRAGMA table_info(device_price_upload_history)").all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    sqlite.exec(`ALTER TABLE device_price_upload_history ADD COLUMN ${columnName} ${sqlType}`);
  }
}

ensureDevicePriceUploadHistoryColumn("status", "TEXT NOT NULL DEFAULT 'ACTIVE'");
ensureDevicePriceUploadHistoryColumn("deactivated_by", "TEXT");
ensureDevicePriceUploadHistoryColumn("deactivated_at", "TEXT");
ensureDevicePriceUploadHistoryColumn("deactivated_row_count", "INTEGER NOT NULL DEFAULT 0");

function migrateDevicePriceUploadHistorySchema() {
  const table = sqlite
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'device_price_upload_history'")
    .get();
  if (!table?.sql) return;

  const sqlText = String(table.sql);
  const needsMigration =
    sqlText.includes("ARCHIVED") ||
    sqlText.includes("archived_by") ||
    sqlText.includes("archived_at") ||
    sqlText.includes("archived_row_count");

  if (!needsMigration) return;

  const columns = sqlite
    .prepare("PRAGMA table_info(device_price_upload_history)")
    .all()
    .map((column) => column.name);

  const deactivatedByExpr = columns.includes("deactivated_by")
    ? "deactivated_by"
    : columns.includes("archived_by")
      ? "archived_by"
      : "NULL";
  const deactivatedAtExpr = columns.includes("deactivated_at")
    ? "deactivated_at"
    : columns.includes("archived_at")
      ? "archived_at"
      : "NULL";
  const deactivatedRowCountExpr = columns.includes("deactivated_row_count")
    ? "deactivated_row_count"
    : columns.includes("archived_row_count")
      ? "archived_row_count"
      : "0";

  sqlite.exec("BEGIN TRANSACTION");
  try {
    sqlite.exec("ALTER TABLE device_price_upload_history RENAME TO device_price_upload_history_old");

    sqlite.exec(`
      CREATE TABLE device_price_upload_history (
        id TEXT PRIMARY KEY,
        file_name TEXT NOT NULL,
        uploaded_by TEXT NOT NULL,
        uploaded_at TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'DEACTIVATED')),
        deactivated_by TEXT,
        deactivated_at TEXT,
        deactivated_row_count INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL,
        updated_count INTEGER NOT NULL,
        total_processed INTEGER NOT NULL
      )
    `);

    sqlite.exec(`
      INSERT INTO device_price_upload_history (
        id,
        file_name,
        uploaded_by,
        uploaded_at,
        status,
        deactivated_by,
        deactivated_at,
        deactivated_row_count,
        inserted_count,
        updated_count,
        total_processed
      )
      SELECT
        id,
        file_name,
        uploaded_by,
        uploaded_at,
        CASE WHEN status IN ('ARCHIVED', 'DEACTIVATED') THEN 'DEACTIVATED' ELSE 'ACTIVE' END,
        ${deactivatedByExpr},
        ${deactivatedAtExpr},
        COALESCE(${deactivatedRowCountExpr}, 0),
        inserted_count,
        updated_count,
        total_processed
      FROM device_price_upload_history_old
    `);

    sqlite.exec("DROP TABLE device_price_upload_history_old");
    sqlite.exec("COMMIT");
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}

migrateDevicePriceUploadHistorySchema();

function repairDevicePriceUploadRowsForeignKey() {
  const tableInfo = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'device_price_upload_rows'")
    .get();
  if (!tableInfo) return;

  const fkRows = sqlite.prepare("PRAGMA foreign_key_list(device_price_upload_rows)").all();
  const uploadHistoryFk = fkRows.find((row) => row.from === "upload_id");
  if (uploadHistoryFk?.table === "device_price_upload_history") {
    return;
  }

  sqlite.exec("BEGIN TRANSACTION");
  try {
    sqlite.exec(`
      CREATE TABLE device_price_upload_rows_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        upload_id TEXT NOT NULL,
        brand TEXT NOT NULL,
        series TEXT NOT NULL,
        model TEXT NOT NULL,
        storage TEXT NOT NULL,
        launch_year INTEGER NOT NULL,
        cashify_price REAL NOT NULL,
        row_json TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(upload_id, brand, series, model, storage, launch_year),
        FOREIGN KEY(upload_id) REFERENCES device_price_upload_history(id)
      )
    `);

    sqlite.exec(`
      INSERT INTO device_price_upload_rows_new (
        id,
        upload_id,
        brand,
        series,
        model,
        storage,
        launch_year,
        cashify_price,
        row_json,
        created_at,
        updated_at
      )
      SELECT
        id,
        upload_id,
        brand,
        series,
        model,
        storage,
        launch_year,
        cashify_price,
        row_json,
        created_at,
        updated_at
      FROM device_price_upload_rows
    `);

    sqlite.exec("DROP TABLE device_price_upload_rows");
    sqlite.exec("ALTER TABLE device_price_upload_rows_new RENAME TO device_price_upload_rows");
    sqlite.exec(
      "CREATE INDEX IF NOT EXISTS idx_price_upload_rows_upload ON device_price_upload_rows(upload_id)",
    );
    sqlite.exec("COMMIT");
  } catch (error) {
    sqlite.exec("ROLLBACK");
    throw error;
  }
}

repairDevicePriceUploadRowsForeignKey();

function ensurePartnerLeadColumn(columnName, sqlType) {
  const columns = sqlite.prepare("PRAGMA table_info(partner_leads)").all();
  const exists = columns.some((column) => column.name === columnName);
  if (!exists) {
    sqlite.exec(`ALTER TABLE partner_leads ADD COLUMN ${columnName} ${sqlType}`);
  }
}

ensurePartnerLeadColumn("onsite_validation_json", "TEXT");
ensurePartnerLeadColumn("onsite_validated_at", "TEXT");
ensurePartnerLeadColumn("onsite_validated_by", "TEXT");
ensurePartnerLeadColumn("pickup_started_at", "TEXT");
ensurePartnerLeadColumn("call_status", "TEXT");
ensurePartnerLeadColumn("call_attempt_count", "INTEGER NOT NULL DEFAULT 0");
ensurePartnerLeadColumn("last_called_at", "TEXT");
ensurePartnerLeadColumn("call_history_json", "TEXT");
ensurePartnerLeadColumn("payment_proof_json", "TEXT");
ensurePartnerLeadColumn("payment_submitted_at", "TEXT");
ensurePartnerLeadColumn("completion_event_json", "TEXT");
ensurePartnerLeadColumn("completion_event_at", "TEXT");

const countRows = sqlite.prepare("SELECT COUNT(*) as count FROM serviceability_pincodes").get();
if (!countRows || countRows.count === 0) {
  const now = new Date().toISOString();
  const seedStmt = sqlite.prepare(
    "INSERT INTO serviceability_pincodes (pincode, status, reason, state, district, office_count, delivery_office_count, metadata_json, updated_by, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
  );

  const seedRows = [
    ["560001", "ACTIVE", "Seed active zone", null, null, null, null, null, "system", now],
    ["110001", "INACTIVE", "Seed inactive zone", null, null, null, null, null, "system", now],
  ];

  const tx = sqlite.transaction((rows) => {
    for (const row of rows) {
      seedStmt.run(...row);
    }
  });

  tx(seedRows);
}

export { sqlite, resolvedDbPath };
