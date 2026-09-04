import { resolvedDbPath, sqlite } from "../src/db/sqlite.js";

function parseArg(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((entry) => entry.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const apply = process.argv.includes("--apply");
const now = parseArg("now") || new Date().toISOString();

const ownedAvailableLeads = sqlite
  .prepare(`
    SELECT id, user_sell_flow_id, lead_type, status, partner_id, pincode, claimed_at, updated_at
    FROM partner_leads
    WHERE status = 'AVAILABLE' AND partner_id IS NOT NULL
    ORDER BY updated_at DESC, id ASC
  `)
  .all();

const stalePendingIntents = sqlite
  .prepare(`
    SELECT id, lead_id, partner_id, status, created_at, expires_at
    FROM partner_lead_payment_intents
    WHERE status = 'PENDING_PAYMENT' AND expires_at < ?
    ORDER BY expires_at ASC, id ASC
  `)
  .all(now);

if (apply && (ownedAvailableLeads.length > 0 || stalePendingIntents.length > 0)) {
  const tx = sqlite.transaction(() => {
    sqlite
      .prepare(`
        UPDATE partner_leads
        SET partner_id = NULL,
            claimed_at = NULL,
            updated_at = ?
        WHERE status = 'AVAILABLE' AND partner_id IS NOT NULL
      `)
      .run(now);

    sqlite
      .prepare(`
        UPDATE partner_lead_payment_intents
        SET status = 'EXPIRED',
            admin_note = COALESCE(admin_note, 'Payment window expired by repair script')
        WHERE status = 'PENDING_PAYMENT' AND expires_at < ?
      `)
      .run(now);
  });

  tx();
}

const payload = {
  mode: apply ? "apply" : "dry-run",
  database: resolvedDbPath,
  now,
  ownedAvailableLeadCount: ownedAvailableLeads.length,
  stalePendingIntentCount: stalePendingIntents.length,
  ownedAvailableLeads: ownedAvailableLeads.map((lead) => ({
    id: lead.id,
    userSellFlowId: lead.user_sell_flow_id,
    leadType: lead.lead_type,
    status: lead.status,
    partnerId: lead.partner_id,
    pincode: lead.pincode,
    claimedAt: lead.claimed_at,
    updatedAt: lead.updated_at,
    action: apply ? "released" : "would_release",
  })),
  stalePendingIntents: stalePendingIntents.map((intent) => ({
    id: intent.id,
    leadId: intent.lead_id,
    partnerId: intent.partner_id,
    status: intent.status,
    createdAt: intent.created_at,
    expiresAt: intent.expires_at,
    action: apply ? "expired" : "would_expire",
  })),
};

console.log(JSON.stringify(payload, null, 2));
sqlite.close();