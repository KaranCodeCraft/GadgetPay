import crypto from "crypto";

import { sqlite, resolvedDbPath } from "../src/db/sqlite.js";
import {
  AUTO_EXPIRED_PICKUP_REASON,
  getPickupExpiryDecision,
} from "../src/domains/user/pickup-expiry.js";

const APPLY_FLAG = "--apply";
const LIMIT_PREFIX = "--limit=";
const DRY_RUN_FLAG = "--dry-run";
const REOPEN_DISPOSITION_KEY = "REOPENED_AFTER_EXPIRY_POLICY_FIX";
const POLICY_VERSION = "alternate-slot-aware-v1";

function parseArgs(argv) {
  const args = new Set(argv);
  const limitArg = argv.find((arg) => arg.startsWith(LIMIT_PREFIX));
  const limitRaw = limitArg ? Number(limitArg.slice(LIMIT_PREFIX.length)) : null;
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : null;
  const apply = args.has(APPLY_FLAG) && !args.has(DRY_RUN_FLAG);
  return { apply, limit };
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function nowIso() {
  return new Date().toISOString();
}

function buildCandidateQuery(limit) {
  const limitClause = limit ? " LIMIT ?" : "";
  return {
    sql: `
      SELECT
        f.id as flowId,
        f.user_id as userId,
        f.status as flowStatus,
        f.pickup_schedule_json as flowPickupScheduleJson,
        f.flow_json as flowJson,
        f.updated_at as flowUpdatedAt,
        l.id as leadId,
        l.status as leadStatus,
        l.partner_id as leadPartnerId,
        l.claimed_at as leadClaimedAt,
        l.pickup_schedule_json as leadPickupScheduleJson,
        l.cancelled_at as leadCancelledAt,
        l.rejection_reason as leadRejectionReason,
        l.updated_at as leadUpdatedAt
      FROM user_sell_flows f
      LEFT JOIN partner_leads l ON l.user_sell_flow_id = f.id
      WHERE f.status = 'CANCELLED'
        AND json_extract(f.flow_json, '$.cancellationReason') = ?
      ORDER BY f.updated_at DESC${limitClause}
    `,
    params: limit ? [AUTO_EXPIRED_PICKUP_REASON, limit] : [AUTO_EXPIRED_PICKUP_REASON],
  };
}

function toMillis(value) {
  const ms = new Date(String(value || "")).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function pickSchedule(row) {
  const flowSchedule = parseJson(row.flowPickupScheduleJson, null);
  const leadSchedule = parseJson(row.leadPickupScheduleJson, null);
  return flowSchedule || leadSchedule;
}

function getHistoricalClaimEvidence(row) {
  if (row.leadPartnerId) {
    return {
      shouldRestoreClaimed: true,
      partnerId: row.leadPartnerId,
      source: "lead.partner_id",
    };
  }

  const event = sqlite
    .prepare(
      `SELECT partner_id as partnerId, to_status as toStatus
       FROM partner_lead_disposition_events
       WHERE lead_id = ?
         AND partner_id IS NOT NULL
         AND to_status IN ('CLAIMED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED')
       ORDER BY created_at DESC
       LIMIT 1`
    )
    .get(row.leadId);

  if (event?.partnerId) {
    return {
      shouldRestoreClaimed: true,
      partnerId: event.partnerId,
      source: `disposition:${event.toStatus || "CLAIMED"}`,
    };
  }

  if (row.leadClaimedAt) {
    return {
      shouldRestoreClaimed: false,
      partnerId: null,
      source: "lead.claimed_at_without_partner",
    };
  }

  return {
    shouldRestoreClaimed: false,
    partnerId: null,
    source: "none",
  };
}

function buildFlowJsonForReopen(flowJsonRaw, updatedAt, metadata) {
  const flowJson = parseJson(flowJsonRaw, {});
  return JSON.stringify({
    ...flowJson,
    status: "PICKUP_SCHEDULED",
    cancellationReason: null,
    expiredAt: null,
    reopenMetadata: metadata,
    updatedAt,
  });
}

function reopenCandidate(row, updatedAt, recovery) {
  const reopenMetadata = {
    reopenedAt: updatedAt,
    reopenedBy: "system-backfill",
    policyVersion: POLICY_VERSION,
    previousCancellationReason: recovery.previousCancellationReason,
    previousExpiredAt: recovery.previousExpiredAt,
    expiryWindow: {
      primaryEndUtc: recovery.primaryEndUtc,
      alternateEndUtc: recovery.alternateEndUtc,
      usedAlternateSlotForRecovery: true,
    },
    restore: {
      leadStatus: recovery.restoreLeadStatus,
      partnerId: recovery.restorePartnerId,
      ownershipEvidence: recovery.ownershipEvidence,
    },
  };

  sqlite
    .prepare(
      `UPDATE user_sell_flows
       SET status = 'PICKUP_SCHEDULED',
           flow_json = ?,
           updated_at = ?
       WHERE id = ? AND user_id = ? AND status = 'CANCELLED'`
    )
    .run(buildFlowJsonForReopen(row.flowJson, updatedAt, reopenMetadata), updatedAt, row.flowId, row.userId);

  if (row.leadId) {
    sqlite
      .prepare(
        `UPDATE partner_leads
         SET status = ?,
             partner_id = ?,
             claimed_at = CASE WHEN ? = 'CLAIMED' THEN COALESCE(claimed_at, ?) ELSE NULL END,
             cancelled_at = NULL,
             rejection_reason = NULL,
             updated_at = ?
         WHERE id = ? AND user_sell_flow_id = ? AND status = 'CANCELLED'`
      )
      .run(
        recovery.restoreLeadStatus,
        recovery.restorePartnerId,
        recovery.restoreLeadStatus,
        row.leadClaimedAt || updatedAt,
        updatedAt,
        row.leadId,
        row.flowId,
      );

    sqlite
      .prepare(
        `INSERT INTO partner_lead_disposition_events (
          id, lead_id, user_sell_flow_id, partner_id, from_status, to_status,
          disposition_key, note, actor_role, actor_id, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        crypto.randomUUID(),
        row.leadId,
        row.flowId,
        recovery.restorePartnerId,
        row.leadStatus || "CANCELLED",
        recovery.restoreLeadStatus,
        REOPEN_DISPOSITION_KEY,
        `Reopened by policy fix: alternate pickup window was still valid; restored ${recovery.restoreLeadStatus}${recovery.restorePartnerId ? ` to ${recovery.restorePartnerId}` : ""}`,
        "system",
        "system-backfill",
        updatedAt,
      );

    sqlite
      .prepare(
        `INSERT INTO lead_event_outbox (
          id, event_type, lead_id, payload_json, occurred_at, delivery_status, retry_count
        ) VALUES (?, ?, ?, ?, ?, 'PENDING', 0)`
      )
      .run(
        crypto.randomUUID(),
        "lead.reopened",
        row.leadId,
        JSON.stringify({
          leadId: row.leadId,
          userSellFlowId: row.flowId,
          fromStatus: row.leadStatus || "CANCELLED",
          toStatus: recovery.restoreLeadStatus,
          dispositionKey: REOPEN_DISPOSITION_KEY,
          actorRole: "system",
          actorId: "system-backfill",
          metadata: reopenMetadata,
        }),
        updatedAt,
      );
  }
}

function main() {
  const { apply, limit } = parseArgs(process.argv.slice(2));
  const query = buildCandidateQuery(limit);
  const rows = sqlite.prepare(query.sql).all(...query.params);

  const counters = {
    dbPath: resolvedDbPath,
    mode: apply ? "apply" : "dry-run",
    scanned: rows.length,
    eligible: 0,
    reopened: 0,
    eligibleRestoreClaimed: 0,
    eligibleRestoreAvailable: 0,
    skippedNoSchedule: 0,
    skippedMissingLead: 0,
    skippedNotLeadCancelled: 0,
    skippedNoAlternateWindow: 0,
    skippedMissingExpiredAt: 0,
    skippedAlreadyPastAlternateNow: 0,
    skippedExpiredAfterAlternate: 0,
  };

  const sampleEligibleIds = [];
  const nowMs = Date.now();
  const updatedAt = nowIso();

  const tx = sqlite.transaction((eligibleRows) => {
    for (const recovery of eligibleRows) {
      reopenCandidate(recovery.row, updatedAt, recovery);
    }
  });

  const eligibleRows = [];

  for (const row of rows) {
    if (!row.leadId) {
      counters.skippedMissingLead += 1;
      continue;
    }

    if (row.leadStatus !== "CANCELLED") {
      counters.skippedNotLeadCancelled += 1;
      continue;
    }

    const schedule = pickSchedule(row);
    if (!schedule) {
      counters.skippedNoSchedule += 1;
      continue;
    }

    const expiryDecision = getPickupExpiryDecision(schedule);
    if (!expiryDecision) {
      counters.skippedNoSchedule += 1;
      continue;
    }

    if (!expiryDecision.usesAlternateSlot || !expiryDecision.alternateEndUtc) {
      counters.skippedNoAlternateWindow += 1;
      continue;
    }

    const flowJson = parseJson(row.flowJson, {});
    const expiredAtMs = toMillis(flowJson.expiredAt || row.leadCancelledAt || row.flowUpdatedAt);
    if (!Number.isFinite(expiredAtMs)) {
      counters.skippedMissingExpiredAt += 1;
      continue;
    }

    const alternateEndMs = expiryDecision.alternateEndUtc.getTime();
    if (expiredAtMs > alternateEndMs) {
      counters.skippedExpiredAfterAlternate += 1;
      continue;
    }

    if (nowMs > alternateEndMs) {
      counters.skippedAlreadyPastAlternateNow += 1;
      continue;
    }

    const ownership = getHistoricalClaimEvidence(row);
    const recovery = {
      row,
      restoreLeadStatus: ownership.shouldRestoreClaimed ? "CLAIMED" : "AVAILABLE",
      restorePartnerId: ownership.shouldRestoreClaimed ? ownership.partnerId : null,
      ownershipEvidence: ownership.source,
      previousCancellationReason: flowJson.cancellationReason || row.leadRejectionReason || AUTO_EXPIRED_PICKUP_REASON,
      previousExpiredAt: new Date(expiredAtMs).toISOString(),
      primaryEndUtc: expiryDecision.primaryEndUtc.toISOString(),
      alternateEndUtc: expiryDecision.alternateEndUtc.toISOString(),
    };

    counters.eligible += 1;
    if (recovery.restoreLeadStatus === "CLAIMED") counters.eligibleRestoreClaimed += 1;
    else counters.eligibleRestoreAvailable += 1;
    eligibleRows.push(recovery);
    if (sampleEligibleIds.length < 20) {
      sampleEligibleIds.push(row.flowId);
    }
  }

  if (apply && eligibleRows.length > 0) {
    tx(eligibleRows);
    counters.reopened = eligibleRows.length;
  }

  console.log(JSON.stringify({ counters, sampleEligibleIds }, null, 2));
}

main();
