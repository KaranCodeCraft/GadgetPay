import test from "node:test";
import assert from "node:assert/strict";

const migration = await import("../src/db/prisma-migration.js");

const { DEFAULT_TRANSFER_TABLES, prismaMigrationCatalog } = migration;

test("prisma migration catalog includes the core app tables and is safe to transfer", () => {
  const expected = [
    "partners",
    "users",
    "otp_codes",
    "refresh_tokens",
    "user_sell_flows",
    "partner_leads",
    "media_assets",
    "serviceability_pincodes",
    "partner_pincode_scopes",
    "device_price_catalog",
    "lead_event_outbox",
  ];

  for (const name of expected) {
    assert.ok(prismaMigrationCatalog.some((entry) => entry.sqliteTable === name), `Missing ${name}`);
  }

  assert.ok(DEFAULT_TRANSFER_TABLES.length > 0);
  assert.ok(DEFAULT_TRANSFER_TABLES.includes("partners"));
});
