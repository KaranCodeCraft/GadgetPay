import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { Database: WasmDatabase } = require("node-sqlite3-wasm");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const prismaMigrationCatalog = [
  { sqliteTable: "partners", prismaModel: "Partner" },
  { sqliteTable: "users", prismaModel: "User" },
  { sqliteTable: "otp_codes", prismaModel: "OtpCode" },
  { sqliteTable: "refresh_tokens", prismaModel: "RefreshToken" },
  { sqliteTable: "user_sell_flows", prismaModel: "UserSellFlow" },
  { sqliteTable: "partner_leads", prismaModel: "PartnerLead" },
  { sqliteTable: "media_assets", prismaModel: "MediaAsset" },
  { sqliteTable: "serviceability_pincodes", prismaModel: "ServiceabilityPincode" },
  { sqliteTable: "partner_pincode_scopes", prismaModel: "PartnerPincodeScope" },
  { sqliteTable: "partner_kyc_submissions", prismaModel: "PartnerKycSubmission" },
  { sqliteTable: "partner_coin_wallets", prismaModel: "PartnerCoinWallet" },
  { sqliteTable: "partner_coin_ledger", prismaModel: "PartnerCoinLedger" },
  { sqliteTable: "partner_lead_unlocks", prismaModel: "PartnerLeadUnlock" },
  { sqliteTable: "partner_lead_payment_intents", prismaModel: "PartnerLeadPaymentIntent" },
  { sqliteTable: "partner_coin_recharge_requests", prismaModel: "PartnerCoinRechargeRequest" },
  { sqliteTable: "lead_event_outbox", prismaModel: "LeadEventOutbox" },
  { sqliteTable: "admin_metrics_snapshot", prismaModel: "AdminMetricsSnapshot" },
  { sqliteTable: "admin_lead_assignments", prismaModel: "AdminLeadAssignment" },
  { sqliteTable: "device_price_catalog", prismaModel: "DevicePriceCatalog" },
  { sqliteTable: "quote_deduction_rules", prismaModel: "QuoteDeductionRule" },
  { sqliteTable: "device_price_upload_history", prismaModel: "DevicePriceUploadHistory" },
  { sqliteTable: "device_price_upload_rows", prismaModel: "DevicePriceUploadRow" },
];

export const DEFAULT_TRANSFER_TABLES = prismaMigrationCatalog.map(({ sqliteTable }) => sqliteTable);

export function getSqliteDbPath(sqlitePath = process.env.SQLITE_PATH) {
  if (sqlitePath) {
    return path.resolve(process.cwd(), sqlitePath);
  }

  return path.resolve(__dirname, "../../data/gadgetpe.sqlite");
}

export function normalizeSqliteRow(row) {
  if (!row || typeof row !== "object") return row;

  const booleanKeys = new Set(["isActive"]);
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    const camelKey = key.replace(/_([a-z0-9])/g, (_, char) => char.toUpperCase());

    if (value === null || value === undefined) {
      normalized[camelKey] = value;
      continue;
    }

    if (booleanKeys.has(camelKey)) {
      normalized[camelKey] = Boolean(value);
      continue;
    }

    if (typeof value === "number") {
      normalized[camelKey] = Number.isFinite(value) ? value : 0;
      continue;
    }

    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) {
      normalized[camelKey] = value;
      continue;
    }

    normalized[camelKey] = value;
  }

  return normalized;
}

export function openSqliteDatabase(dbPath = getSqliteDbPath()) {
  const fullPath = path.resolve(dbPath);
  const normalizedPath = fullPath.replace(/\\/g, "/");
  if (!fs.existsSync(fullPath)) {
    throw new Error(`SQLite source database not found: ${fullPath}`);
  }

  return new WasmDatabase(normalizedPath);
}

export async function migrateSqliteToPostgres({
  sqliteDbPath = getSqliteDbPath(),
  transferTables = DEFAULT_TRANSFER_TABLES,
  prismaClient,
  dryRun = false,
  onProgress,
} = {}) {
  if (!prismaClient) {
    throw new Error("A Prisma client instance is required for SQLite-to-Postgres migration.");
  }

  const db = openSqliteDatabase(sqliteDbPath);
  const tableSet = new Set(transferTables);
  const results = [];

  try {
    for (const entry of prismaMigrationCatalog) {
      if (!tableSet.has(entry.sqliteTable)) continue;

      const rows = db.prepare(`SELECT * FROM ${entry.sqliteTable}`).all();
      if (rows.length === 0) {
        results.push({ sqliteTable: entry.sqliteTable, prismaModel: entry.prismaModel, migrated: 0, skipped: 0, dryRun });
        continue;
      }

      const data = rows.map(normalizeSqliteRow);
      if (onProgress) onProgress({ sqliteTable: entry.sqliteTable, rowCount: data.length });

      if (dryRun) {
        results.push({ sqliteTable: entry.sqliteTable, prismaModel: entry.prismaModel, migrated: data.length, skipped: 0, dryRun: true });
        continue;
      }

      await prismaClient[entry.prismaModel].createMany({
        data,
        skipDuplicates: true,
      });

      results.push({ sqliteTable: entry.sqliteTable, prismaModel: entry.prismaModel, migrated: data.length, skipped: 0, dryRun: false });
    }
  } finally {
    db.close();
  }

  return results;
}

async function runCli() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const sqlitePath = args.find((arg) => !arg.startsWith("--"));

  const { PrismaClient } = await import("@prisma/client");
  const prismaClient = new PrismaClient();

  const results = await migrateSqliteToPostgres({
    sqliteDbPath: sqlitePath || getSqliteDbPath(),
    dryRun,
    prismaClient,
  });

  console.log(JSON.stringify({ dryRun, results }, null, 2));
  await prismaClient.$disconnect();
}

if (process.argv[1] && process.argv[1].endsWith("prisma-migration.js")) {
  runCli();
}
