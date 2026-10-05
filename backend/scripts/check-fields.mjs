import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Database: WasmDatabase } = require("node-sqlite3-wasm");
import { Prisma } from "@prisma/client";

const sqlitePath = path.resolve("servergadgetpe.sqlite");

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

const migrationOrder = [
  { sqliteTable: "partners", prismaModel: "Partner" },
  { sqliteTable: "users", prismaModel: "User" },
  { sqliteTable: "otp_codes", prismaModel: "OtpCode" },
  { sqliteTable: "refresh_tokens", prismaModel: "RefreshToken" },
  { sqliteTable: "serviceability_pincodes", prismaModel: "ServiceabilityPincode" },
  { sqliteTable: "serviceability_upload_history", prismaModel: "ServiceabilityUploadHistory" },
  { sqliteTable: "media_assets", prismaModel: "MediaAsset" },
  { sqliteTable: "device_price_catalog", prismaModel: "DevicePriceCatalog" },
  { sqliteTable: "quote_deduction_rules", prismaModel: "QuoteDeductionRule" },
  { sqliteTable: "device_price_upload_history", prismaModel: "DevicePriceUploadHistory" },
  { sqliteTable: "device_price_upload_rows", prismaModel: "DevicePriceUploadRow" },
  { sqliteTable: "lead_event_outbox", prismaModel: "LeadEventOutbox" },
  { sqliteTable: "admin_metrics_snapshot", prismaModel: "AdminMetricsSnapshot" },
  { sqliteTable: "partner_coin_wallets", prismaModel: "PartnerCoinWallet" },
  { sqliteTable: "partner_coin_ledger", prismaModel: "PartnerCoinLedger" },
  { sqliteTable: "partner_coin_recharge_requests", prismaModel: "PartnerCoinRechargeRequest" },
  { sqliteTable: "partner_kyc_submissions", prismaModel: "PartnerKycSubmission" },
  { sqliteTable: "partner_pincode_scopes", prismaModel: "PartnerPincodeScope" },
  { sqliteTable: "user_sell_flows", prismaModel: "UserSellFlow" },
  { sqliteTable: "partner_leads", prismaModel: "PartnerLead" },
  { sqliteTable: "partner_lead_unlocks", prismaModel: "PartnerLeadUnlock" },
  { sqliteTable: "partner_lead_payment_intents", prismaModel: "PartnerLeadPaymentIntent" },
  { sqliteTable: "admin_lead_assignments", prismaModel: "AdminLeadAssignment" },
  { sqliteTable: "partner_lead_disposition_events", prismaModel: "PartnerLeadDispositionEvent" },
];

const modelMeta = new Map();
for (const m of Prisma.dmmf.datamodel.models) {
  const fields = new Map();
  for (const f of m.fields) {
    if (f.kind === "scalar") {
      fields.set(f.name, f);
    }
  }
  modelMeta.set(m.name, fields);
}

for (const entry of migrationOrder) {
  const tableCols = db.prepare(`PRAGMA table_info("${entry.sqliteTable}")`).all().map(c => c.name);
  const prismaFields = modelMeta.get(entry.prismaModel);

  const missingInPrisma = [];
  for (const col of tableCols) {
    const camelCol = col.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());
    if (!prismaFields.has(camelCol)) {
      missingInPrisma.push(`${col} (camel: ${camelCol})`);
    }
  }

  const missingInSqlite = [];
  for (const [fieldName, field] of prismaFields.entries()) {
    // Check if snake_case exists
    const snakeCol = fieldName.replace(/[A-Z0-9]/g, letter => `_${letter.toLowerCase()}`).replace(/^_/, '');
    if (!tableCols.includes(snakeCol) && !tableCols.includes(fieldName)) {
      missingInSqlite.push(`${fieldName} (${field.isRequired ? 'REQUIRED' : 'optional'})`);
    }
  }

  console.log(`\nTable: ${entry.sqliteTable} -> Model: ${entry.prismaModel}`);
  if (missingInPrisma.length > 0) {
    console.log(`  Cols in SQLite not in Prisma:`, missingInPrisma.join(', '));
  }
  if (missingInSqlite.length > 0) {
    console.log(`  Fields in Prisma not in SQLite:`, missingInSqlite.join(', '));
  }
  if (missingInPrisma.length === 0 && missingInSqlite.length === 0) {
    console.log(`  -> Perfect 1:1 match!`);
  }
}

db.close();
cleanLock(sqlitePath);
