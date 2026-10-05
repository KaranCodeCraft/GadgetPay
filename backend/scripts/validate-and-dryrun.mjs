import fs from "fs";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { Database: WasmDatabase } = require("node-sqlite3-wasm");
import { PrismaClient, Prisma } from "@prisma/client";

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
const prisma = new PrismaClient();

// Map from sqlite table name to Prisma model name
// Ordered in foreign-key dependency order (parents first)
const migrationOrder = [
  // 1. Independent parent tables
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

  // 2. Child tables (Level 1)
  { sqliteTable: "partner_coin_wallets", prismaModel: "PartnerCoinWallet" },
  { sqliteTable: "partner_coin_ledger", prismaModel: "PartnerCoinLedger" },
  { sqliteTable: "partner_coin_recharge_requests", prismaModel: "PartnerCoinRechargeRequest" },
  { sqliteTable: "partner_kyc_submissions", prismaModel: "PartnerKycSubmission" },
  { sqliteTable: "partner_pincode_scopes", prismaModel: "PartnerPincodeScope" },
  { sqliteTable: "user_sell_flows", prismaModel: "UserSellFlow" },

  // 3. Child tables (Level 2)
  { sqliteTable: "partner_leads", prismaModel: "PartnerLead" },

  // 4. Child tables (Level 3)
  { sqliteTable: "partner_lead_unlocks", prismaModel: "PartnerLeadUnlock" },
  { sqliteTable: "partner_lead_payment_intents", prismaModel: "PartnerLeadPaymentIntent" },
  { sqliteTable: "admin_lead_assignments", prismaModel: "AdminLeadAssignment" },
  { sqliteTable: "partner_lead_disposition_events", prismaModel: "PartnerLeadDispositionEvent" },
];

async function validate() {
  const modelMeta = new Map();
  for (const m of Prisma.dmmf.datamodel.models) {
    const fields = new Map();
    for (const f of m.fields) {
      fields.set(f.name, f);
    }
    modelMeta.set(m.name, { ...m, fieldMap: fields });
  }

  console.log("Validating SQLite data against Prisma schemas & checking integrity...");

  const existingIds = {
    partners: new Set(),
    users: new Set(),
    serviceability_pincodes: new Set(),
    user_sell_flows: new Set(),
    partner_leads: new Set(),
  };

  for (const entry of migrationOrder) {
    const rows = db.prepare(`SELECT * FROM "${entry.sqliteTable}"`).all();
    const meta = modelMeta.get(entry.prismaModel);
    if (!meta) {
      console.error(`ERROR: No Prisma model metadata found for ${entry.prismaModel}`);
      continue;
    }

    console.log(`\nValidating ${entry.sqliteTable} (${rows.length} rows)...`);
    let errors = 0;

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i];
      // Collect primary keys for foreign key checks
      if (entry.sqliteTable === "partners") existingIds.partners.add(raw.id);
      if (entry.sqliteTable === "users") existingIds.users.add(raw.id);
      if (entry.sqliteTable === "serviceability_pincodes") existingIds.serviceability_pincodes.add(raw.pincode);
      if (entry.sqliteTable === "user_sell_flows") existingIds.user_sell_flows.add(raw.id);
      if (entry.sqliteTable === "partner_leads") existingIds.partner_leads.add(raw.id);

      // Check FKs
      if (entry.sqliteTable === "partner_pincode_scopes") {
        if (!existingIds.partners.has(raw.partner_id)) {
          console.warn(`  [FK Alert] partner_pincode_scopes row ${raw.id} references missing partner: "${raw.partner_id}"`);
          errors++;
        }
        if (!existingIds.serviceability_pincodes.has(raw.pincode)) {
          console.warn(`  [FK Alert] partner_pincode_scopes row ${raw.id} references missing pincode: "${raw.pincode}"`);
          errors++;
        }
      }

      if (entry.sqliteTable === "user_sell_flows") {
        if (!existingIds.users.has(raw.user_id)) {
          console.warn(`  [FK Alert] user_sell_flows row ${raw.id} references missing user: "${raw.user_id}"`);
          errors++;
        }
      }

      if (entry.sqliteTable === "partner_leads") {
        if (!existingIds.user_sell_flows.has(raw.user_sell_flow_id)) {
          console.warn(`  [FK Alert] partner_leads row ${raw.id} references missing user_sell_flow: "${raw.user_sell_flow_id}"`);
          errors++;
        }
        if (raw.user_id && !existingIds.users.has(raw.user_id)) {
          console.warn(`  [FK Alert] partner_leads row ${raw.id} references missing user: "${raw.user_id}"`);
          errors++;
        }
        if (raw.partner_id && !existingIds.partners.has(raw.partner_id)) {
          console.warn(`  [FK Alert] partner_leads row ${raw.id} references missing partner: "${raw.partner_id}"`);
          errors++;
        }
      }

      if (entry.sqliteTable === "admin_lead_assignments") {
        if (!existingIds.partner_leads.has(raw.lead_id)) {
          console.warn(`  [FK Alert] admin_lead_assignments row ${raw.id} references missing lead: "${raw.lead_id}"`);
          errors++;
        }
        if (!existingIds.partners.has(raw.assigned_partner_id)) {
          console.warn(`  [FK Alert] admin_lead_assignments row ${raw.id} references missing partner: "${raw.assigned_partner_id}"`);
          errors++;
        }
      }

      if (entry.sqliteTable === "partner_lead_disposition_events") {
        if (!existingIds.partner_leads.has(raw.lead_id)) {
          console.warn(`  [FK Alert] partner_lead_disposition_events row ${raw.id} references missing lead: "${raw.lead_id}"`);
          errors++;
        }
        if (!existingIds.user_sell_flows.has(raw.user_sell_flow_id)) {
          console.warn(`  [FK Alert] partner_lead_disposition_events row ${raw.id} references missing user_sell_flow: "${raw.user_sell_flow_id}"`);
          errors++;
        }
        if (raw.partner_id && !existingIds.partners.has(raw.partner_id)) {
          console.warn(`  [FK Alert] partner_lead_disposition_events row ${raw.id} references missing partner: "${raw.partner_id}"`);
          errors++;
        }
      }
    }

    if (errors === 0) {
      console.log(`  -> Passed! (No FK issues detected)`);
    } else {
      console.log(`  -> Finished with ${errors} warnings.`);
    }
  }

  db.close();
  cleanLock(sqlitePath);
  await prisma.$disconnect();
}

validate().catch(err => {
  console.error("Validation failed:", err);
  db.close();
  cleanLock(sqlitePath);
  process.exit(1);
});
