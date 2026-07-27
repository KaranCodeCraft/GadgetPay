import { sqlite } from "./sqlite.js";

function mapMediaAsset(row) {
  if (!row) return null;
  return {
    id: row.id,
    tenantType: row.tenantType,
    tenantId: row.tenantId,
    ownerRole: row.ownerRole,
    ownerId: row.ownerId,
    entityType: row.entityType,
    entityId: row.entityId,
    slot: row.slot,
    originalFileName: row.originalFileName,
    storedFileName: row.storedFileName,
    mimeType: row.mimeType,
    sizeBytes: row.sizeBytes,
    relativePath: row.relativePath,
    storageProvider: row.storageProvider,
    status: row.status,
    checksum: row.checksum,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
  };
}

export function createMediaAsset(input) {
  sqlite.prepare(`
    INSERT INTO media_assets (
      id, tenant_type, tenant_id, owner_role, owner_id, entity_type, entity_id, slot,
      original_file_name, stored_file_name, mime_type, size_bytes, relative_path,
      storage_provider, status, checksum, created_at, updated_at, deleted_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    input.id,
    input.tenantType,
    input.tenantId || null,
    input.ownerRole,
    input.ownerId,
    input.entityType,
    input.entityId,
    input.slot || null,
    input.originalFileName,
    input.storedFileName,
    input.mimeType,
    input.sizeBytes,
    input.relativePath,
    input.storageProvider,
    input.status || "ACTIVE",
    input.checksum || null,
    input.createdAt,
    input.updatedAt,
    input.deletedAt || null,
  );

  return getMediaAssetById(input.id);
}

export function getMediaAssetById(id) {
  return mapMediaAsset(sqlite.prepare(`
    SELECT
      id,
      tenant_type as tenantType,
      tenant_id as tenantId,
      owner_role as ownerRole,
      owner_id as ownerId,
      entity_type as entityType,
      entity_id as entityId,
      slot,
      original_file_name as originalFileName,
      stored_file_name as storedFileName,
      mime_type as mimeType,
      size_bytes as sizeBytes,
      relative_path as relativePath,
      storage_provider as storageProvider,
      status,
      checksum,
      created_at as createdAt,
      updated_at as updatedAt,
      deleted_at as deletedAt
    FROM media_assets
    WHERE id = ?
  `).get(id));
}

export function listMediaAssetsForEntity({ entityType, entityId }) {
  return sqlite.prepare(`
    SELECT
      id,
      tenant_type as tenantType,
      tenant_id as tenantId,
      owner_role as ownerRole,
      owner_id as ownerId,
      entity_type as entityType,
      entity_id as entityId,
      slot,
      original_file_name as originalFileName,
      stored_file_name as storedFileName,
      mime_type as mimeType,
      size_bytes as sizeBytes,
      relative_path as relativePath,
      storage_provider as storageProvider,
      status,
      checksum,
      created_at as createdAt,
      updated_at as updatedAt,
      deleted_at as deletedAt
    FROM media_assets
    WHERE entity_type = ? AND entity_id = ? AND status = 'ACTIVE'
    ORDER BY created_at ASC
  `).all(entityType, entityId).map(mapMediaAsset);
}

export function markMediaAssetDeleted({ id, updatedAt, deletedAt }) {
  sqlite.prepare(`
    UPDATE media_assets
    SET status = 'DELETED', updated_at = ?, deleted_at = ?
    WHERE id = ?
  `).run(updatedAt, deletedAt, id);

  return getMediaAssetById(id);
}

export function upsertOtpCode({ phone, otp, sentAt, expiresAt }) {
  const stmt = sqlite.prepare(`
    INSERT INTO otp_codes (phone, otp, sent_at, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(phone)
    DO UPDATE SET otp = excluded.otp, sent_at = excluded.sent_at, expires_at = excluded.expires_at
  `);

  stmt.run(phone, otp, sentAt, expiresAt);
}

export function getOtpCode(phone) {
  return sqlite.prepare("SELECT phone, otp, sent_at as sentAt, expires_at as expiresAt FROM otp_codes WHERE phone = ?").get(phone);
}

export function deleteOtpCode(phone) {
  sqlite.prepare("DELETE FROM otp_codes WHERE phone = ?").run(phone);
}

export function upsertPartner(partner) {
  const stmt = sqlite.prepare(`
    INSERT INTO partners (id, phone, name, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at
  `);

  stmt.run(partner.id, partner.phone, partner.name, partner.createdAt, partner.updatedAt);
  return getPartnerById(partner.id);
}

export function getPartnerById(id) {
  return sqlite
    .prepare("SELECT id, phone, name, created_at as createdAt, updated_at as updatedAt FROM partners WHERE id = ?")
    .get(id);
}

export function listPartnersForAdminSearch({ search, pincode, includeUnmapped = false, limit = 20 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const clauses = ["1=1"];
  const params = [];

  if (search) {
    clauses.push("(p.name LIKE ? OR p.phone LIKE ? OR p.id LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (pincode) {
    if (includeUnmapped) {
      clauses.push("(s.pincode = ? OR s.pincode IS NULL)");
    } else {
      clauses.push("s.pincode = ?");
    }
    params.push(pincode);
  }

  return sqlite
    .prepare(
      `SELECT
        p.id,
        p.name,
        p.phone,
        p.created_at as createdAt,
        p.updated_at as updatedAt,
        s.pincode as scopePincode,
        s.is_active as scopeActive,
        s.last_assigned_at as lastAssignedAt
      FROM partners p
      LEFT JOIN partner_pincode_scopes s ON s.partner_id = p.id
      WHERE ${clauses.join(" AND ")}
      ORDER BY p.updated_at DESC
      LIMIT ?`
    )
    .all(...params, safeLimit)
    .map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      scopePincode: row.scopePincode || null,
      scopeActive: Boolean(row.scopeActive),
      lastAssignedAt: row.lastAssignedAt || null,
    }));
}

export function upsertPartnerPincodeScope({ id, partnerId, pincode, isActive = true, updatedBy, createdAt, updatedAt }) {
  sqlite
    .prepare(
      `INSERT INTO partner_pincode_scopes (
        id, partner_id, pincode, is_active, updated_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(partner_id, pincode)
      DO UPDATE SET
        is_active = excluded.is_active,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at`
    )
    .run(id, partnerId, pincode, isActive ? 1 : 0, updatedBy, createdAt, updatedAt);

  return getPartnerPincodeScope({ partnerId, pincode });
}

export function getPartnerPincodeScope({ partnerId, pincode }) {
  return (
    sqlite
      .prepare(
        `SELECT
          id,
          partner_id as partnerId,
          pincode,
          is_active as isActive,
          last_assigned_at as lastAssignedAt,
          updated_by as updatedBy,
          created_at as createdAt,
          updated_at as updatedAt
        FROM partner_pincode_scopes
        WHERE partner_id = ? AND pincode = ?`
      )
      .get(partnerId, pincode) || null
  );
}

export function listPartnerPincodeScopes({ pincode, partnerId, activeOnly = false, limit = 100 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const clauses = ["1=1"];
  const params = [];

  if (pincode) {
    clauses.push("s.pincode = ?");
    params.push(pincode);
  }
  if (partnerId) {
    clauses.push("s.partner_id = ?");
    params.push(partnerId);
  }
  if (activeOnly) {
    clauses.push("s.is_active = 1");
  }

  return sqlite
    .prepare(
      `SELECT
        s.id,
        s.partner_id as partnerId,
        s.pincode,
        s.is_active as isActive,
        s.last_assigned_at as lastAssignedAt,
        s.updated_by as updatedBy,
        s.created_at as createdAt,
        s.updated_at as updatedAt,
        p.name as partnerName,
        p.phone as partnerPhone
      FROM partner_pincode_scopes s
      JOIN partners p ON p.id = s.partner_id
      WHERE ${clauses.join(" AND ")}
      ORDER BY s.updated_at DESC
      LIMIT ?`
    )
    .all(...params, safeLimit)
    .map((row) => ({
      id: row.id,
      partnerId: row.partnerId,
      pincode: row.pincode,
      isActive: Boolean(row.isActive),
      lastAssignedAt: row.lastAssignedAt || null,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      partnerName: row.partnerName,
      partnerPhone: row.partnerPhone,
    }));
}

export function listEligiblePartnersForPincode(pincode) {
  return sqlite
    .prepare(
      `SELECT
        s.partner_id as partnerId,
        p.name as partnerName,
        p.phone as partnerPhone,
        s.last_assigned_at as lastAssignedAt
      FROM partner_pincode_scopes s
      JOIN partners p ON p.id = s.partner_id
      WHERE s.pincode = ? AND s.is_active = 1
      ORDER BY
        CASE WHEN s.last_assigned_at IS NULL THEN 0 ELSE 1 END ASC,
        s.last_assigned_at ASC,
        s.partner_id ASC`
    )
    .all(pincode)
    .map((row) => ({
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      partnerPhone: row.partnerPhone,
      lastAssignedAt: row.lastAssignedAt || null,
    }));
}

export function partnerEligibleForPincode({ partnerId, pincode }) {
  const row = sqlite
    .prepare(
      `SELECT 1 as ok
       FROM partner_pincode_scopes
       WHERE partner_id = ? AND pincode = ? AND is_active = 1
       LIMIT 1`
    )
    .get(partnerId, pincode);
  return Boolean(row?.ok);
}

export function touchPartnerPincodeAssignment({ partnerId, pincode, assignedAt, updatedBy }) {
  sqlite
    .prepare(
      `UPDATE partner_pincode_scopes
       SET last_assigned_at = ?, updated_at = ?, updated_by = ?
       WHERE partner_id = ? AND pincode = ? AND is_active = 1`
    )
    .run(assignedAt, assignedAt, updatedBy, partnerId, pincode);
}

export function upsertUser(user) {
  sqlite
    .prepare(
      `INSERT INTO users (id, phone, name, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id)
       DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
    )
    .run(user.id, user.phone, user.name, user.createdAt, user.updatedAt);
  return getUserById(user.id);
}

export function getUserById(id) {
  return sqlite
    .prepare("SELECT id, phone, name, created_at as createdAt, updated_at as updatedAt FROM users WHERE id = ?")
    .get(id);
}

export function getUserByPhone(phone) {
  return sqlite
    .prepare("SELECT id, phone, name, created_at as createdAt, updated_at as updatedAt FROM users WHERE phone = ?")
    .get(phone);
}

function parseJsonColumn(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapUserSellFlow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.userId,
    flowType: row.flowType,
    status: row.status,
    selectedModel: parseJsonColumn(row.selectedModelJson, {}),
    deviceDetails: parseJsonColumn(row.deviceDetailsJson, null),
    pickupSchedule: parseJsonColumn(row.pickupScheduleJson, null),
    quote: parseJsonColumn(row.quoteJson, null),
    flowJson: parseJsonColumn(row.flowJson, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const userSellFlowSelect = `
  SELECT
    id,
    user_id as userId,
    flow_type as flowType,
    status,
    selected_model_json as selectedModelJson,
    device_details_json as deviceDetailsJson,
    pickup_schedule_json as pickupScheduleJson,
    quote_json as quoteJson,
    flow_json as flowJson,
    created_at as createdAt,
    updated_at as updatedAt
  FROM user_sell_flows
`;

export function createUserSellFlow(row) {
  sqlite
    .prepare(
      `INSERT INTO user_sell_flows (
        id, user_id, flow_type, status, selected_model_json, device_details_json,
        pickup_schedule_json, quote_json, flow_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      row.id,
      row.userId,
      row.flowType,
      row.status,
      row.selectedModelJson,
      row.deviceDetailsJson || null,
      row.pickupScheduleJson || null,
      row.quoteJson || null,
      row.flowJson,
      row.createdAt,
      row.updatedAt,
    );

  return getUserSellFlowById({ id: row.id, userId: row.userId });
}

export function updateUserSellFlow(row) {
  sqlite
    .prepare(
      `UPDATE user_sell_flows
       SET status = ?,
           selected_model_json = COALESCE(?, selected_model_json),
           device_details_json = COALESCE(?, device_details_json),
           pickup_schedule_json = COALESCE(?, pickup_schedule_json),
           quote_json = COALESCE(?, quote_json),
           flow_json = ?,
           updated_at = ?
       WHERE id = ? AND user_id = ?`,
    )
    .run(
      row.status,
      row.selectedModelJson || null,
      row.deviceDetailsJson || null,
      row.pickupScheduleJson || null,
      row.quoteJson || null,
      row.flowJson,
      row.updatedAt,
      row.id,
      row.userId,
    );

  return getUserSellFlowById({ id: row.id, userId: row.userId });
}

export function getUserSellFlowById({ id, userId }) {
  const row = sqlite.prepare(`${userSellFlowSelect} WHERE id = ? AND user_id = ?`).get(id, userId);
  return mapUserSellFlow(row);
}

export function listUserSellFlows({ userId, status, limit = 25 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const params = [userId];
  let where = "WHERE user_id = ?";
  if (status) {
    where += " AND status = ?";
    params.push(status);
  }

  return sqlite
    .prepare(`${userSellFlowSelect} ${where} ORDER BY updated_at DESC LIMIT ?`)
    .all(...params, safeLimit)
    .map(mapUserSellFlow);
}

export function cancelUserSellFlow({ id, userId, updatedAt }) {
  const existing = getUserSellFlowById({ id, userId });
  if (!existing) return null;
  const flowJson = JSON.stringify({
    ...existing.flowJson,
    status: "CANCELLED",
    updatedAt,
  });
  return updateUserSellFlow({
    id,
    userId,
    status: "CANCELLED",
    flowJson,
    updatedAt,
  });
}

function mapPartnerLead(row) {
  if (!row) return null;
  const paymentProof = parseJsonColumn(row.paymentProofJson, null);
  return {
    id: row.id,
    userSellFlowId: row.userSellFlowId,
    userId: row.userId,
    leadType: row.leadType,
    status: row.status,
    partnerId: row.partnerId,
    pincode: row.pincode,
    city: row.city,
    seller: {
      name: row.sellerName,
      phone: row.sellerPhone,
      addressLine: row.addressLine,
      landmark: row.landmark,
      city: row.city,
      pincode: row.pincode,
    },
    selectedModel: parseJsonColumn(row.selectedModelJson, {}),
    deviceDetails: parseJsonColumn(row.deviceDetailsJson, null),
    quote: parseJsonColumn(row.quoteJson, null),
    pickupSchedule: parseJsonColumn(row.pickupScheduleJson, null),
    flowSnapshot: parseJsonColumn(row.flowSnapshotJson, {}),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    claimedAt: row.claimedAt,
    completedAt: row.completedAt,
    cancelledAt: row.cancelledAt,
    rejectionReason: row.rejectionReason,
    pickupStartedAt: row.pickupStartedAt,
    callStatus: row.callStatus,
    callAttemptCount: Number(row.callAttemptCount || 0),
    lastCalledAt: row.lastCalledAt,
    callHistory: parseJsonColumn(row.callHistoryJson, []),
    onsiteValidation: parseJsonColumn(row.onsiteValidationJson, null),
    onsiteValidatedAt: row.onsiteValidatedAt,
    onsiteValidatedBy: row.onsiteValidatedBy,
    paymentProof: paymentProof
      ? {
          ...paymentProof,
          mediaUrl: paymentProof.mediaAssetId ? `/api/v1/media/${paymentProof.mediaAssetId}` : paymentProof.mediaUrl || null,
        }
      : null,
    paymentSubmittedAt: row.paymentSubmittedAt,
    completionEvent: parseJsonColumn(row.completionEventJson, null),
    completionEventAt: row.completionEventAt,
    unlockOrder: row.unlockOrder || null,
  };
}

function mapPartnerLeadUnlockOrder(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.leadId,
    partnerId: row.partnerId,
    userSellFlowId: row.userSellFlowId,
    unlockPrice: Number(row.unlockPrice || 0),
    paymentMethod: row.paymentMethod,
    status: row.status,
    screenshotStatus: row.screenshotStatus,
    adminNote: row.adminNote,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    rejectedAt: row.rejectedAt,
    metadata: parseJsonColumn(row.metadataJson, null),
    createdAt: row.createdAt,
    expiresAt: row.expiresAt,
    closedAt: row.closedAt,
  };
}

const partnerLeadUnlockSelect = `
  SELECT
    id,
    lead_id as leadId,
    partner_id as partnerId,
    user_sell_flow_id as userSellFlowId,
    unlock_price as unlockPrice,
    payment_method as paymentMethod,
    status,
    screenshot_status as screenshotStatus,
    admin_note as adminNote,
    approved_by as approvedBy,
    approved_at as approvedAt,
    rejected_at as rejectedAt,
    metadata_json as metadataJson,
    created_at as createdAt,
    expires_at as expiresAt,
    closed_at as closedAt
  FROM partner_lead_payment_intents
`;

function attachPartnerUnlockOrder(lead, partnerId) {
  if (!lead || !partnerId) return lead;
  return {
    ...lead,
    unlockOrder: getPartnerLeadUnlockOrderForPartner({ leadId: lead.id, partnerId }),
  };
}

const partnerLeadSelect = `
  SELECT
    id,
    user_sell_flow_id as userSellFlowId,
    user_id as userId,
    lead_type as leadType,
    status,
    partner_id as partnerId,
    pincode,
    city,
    seller_name as sellerName,
    seller_phone as sellerPhone,
    address_line as addressLine,
    landmark,
    selected_model_json as selectedModelJson,
    device_details_json as deviceDetailsJson,
    quote_json as quoteJson,
    pickup_schedule_json as pickupScheduleJson,
    flow_snapshot_json as flowSnapshotJson,
    created_at as createdAt,
    updated_at as updatedAt,
    claimed_at as claimedAt,
    completed_at as completedAt,
    cancelled_at as cancelledAt,
    rejection_reason as rejectionReason,
    pickup_started_at as pickupStartedAt,
    call_status as callStatus,
    call_attempt_count as callAttemptCount,
    last_called_at as lastCalledAt,
    call_history_json as callHistoryJson,
    onsite_validation_json as onsiteValidationJson,
    onsite_validated_at as onsiteValidatedAt,
    onsite_validated_by as onsiteValidatedBy,
    payment_proof_json as paymentProofJson,
    payment_submitted_at as paymentSubmittedAt,
    completion_event_json as completionEventJson,
    completion_event_at as completionEventAt
  FROM partner_leads
`;

export function upsertPartnerLeadFromUserFlow(lead) {
  sqlite
    .prepare(
      `INSERT INTO partner_leads (
        id, user_sell_flow_id, user_id, lead_type, status, partner_id, pincode, city,
        seller_name, seller_phone, address_line, landmark, selected_model_json, device_details_json,
        quote_json, pickup_schedule_json, flow_snapshot_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_sell_flow_id)
      DO UPDATE SET
        lead_type = excluded.lead_type,
        status = CASE
          WHEN partner_leads.status IN ('CLAIMED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED') AND excluded.status = 'AVAILABLE'
          THEN partner_leads.status
          ELSE excluded.status
        END,
        pincode = excluded.pincode,
        city = excluded.city,
        seller_name = excluded.seller_name,
        seller_phone = excluded.seller_phone,
        address_line = excluded.address_line,
        landmark = excluded.landmark,
        selected_model_json = excluded.selected_model_json,
        device_details_json = excluded.device_details_json,
        quote_json = excluded.quote_json,
        pickup_schedule_json = excluded.pickup_schedule_json,
        flow_snapshot_json = excluded.flow_snapshot_json,
        updated_at = excluded.updated_at`,
    )
    .run(
      lead.id,
      lead.userSellFlowId,
      lead.userId,
      lead.leadType,
      lead.status,
      lead.partnerId || null,
      lead.pincode,
      lead.city || null,
      lead.sellerName || null,
      lead.sellerPhone || null,
      lead.addressLine || null,
      lead.landmark || null,
      lead.selectedModelJson,
      lead.deviceDetailsJson || null,
      lead.quoteJson || null,
      lead.pickupScheduleJson || null,
      lead.flowSnapshotJson,
      lead.createdAt,
      lead.updatedAt,
    );

  return getPartnerLeadByFlowId(lead.userSellFlowId);
}

export function getPartnerLeadByFlowId(userSellFlowId) {
  const row = sqlite.prepare(`${partnerLeadSelect} WHERE user_sell_flow_id = ?`).get(userSellFlowId);
  return mapPartnerLead(row);
}

export function getPartnerLeadById(id, options = {}) {
  const row = sqlite.prepare(`${partnerLeadSelect} WHERE id = ?`).get(id);
  return attachPartnerUnlockOrder(mapPartnerLead(row), options.viewerPartnerId);
}

export function listPartnerLeadsForScope({ pincode, leadType, status, partnerId, viewerPartnerId, date, timeSlot, limit = 50 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const clauses = ["pincode = ?", "lead_type = ?", "status != 'CANCELLED'"];
  const params = [pincode, leadType];

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  if (partnerId) {
    clauses.push("(partner_id IS NULL OR partner_id = ?)");
    params.push(partnerId);
  }

  const rows = sqlite
    .prepare(`${partnerLeadSelect} WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`)
    .all(...params, safeLimit)
    .map(mapPartnerLead)
    .map((lead) => attachPartnerUnlockOrder(lead, viewerPartnerId));

  return rows.filter((lead) => {
    if (date) {
      const primaryDate = lead.pickupSchedule?.primaryDate;
      if (!primaryDate || primaryDate.slice(0, 10) !== date) return false;
    }

    if (timeSlot && timeSlot !== "All" && lead.pickupSchedule?.primaryTime !== timeSlot) {
      return false;
    }

    return true;
  });
}

export function listPartnerLeadsForPartner({ partnerId, status, limit = 50 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const clauses = ["partner_id = ?", "status != 'CANCELLED'"];
  const params = [partnerId];

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  return sqlite
    .prepare(`${partnerLeadSelect} WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`)
    .all(...params, safeLimit)
    .map(mapPartnerLead)
    .map((lead) => attachPartnerUnlockOrder(lead, partnerId));
}

export function claimPartnerLead({ id, partnerId, updatedAt }) {
  const result = sqlite
    .prepare(
      `UPDATE partner_leads
       SET partner_id = ?, status = 'CLAIMED', claimed_at = ?, updated_at = ?
       WHERE id = ? AND status = 'AVAILABLE' AND partner_id IS NULL`,
    )
    .run(partnerId, updatedAt, updatedAt, id);

  return result.changes > 0 ? getPartnerLeadById(id) : null;
}

export function updatePartnerLeadWorkflowStatus({ id, partnerId, status, rejectionReason, updatedAt }) {
  sqlite
    .prepare(
      `UPDATE partner_leads
       SET status = ?,
           rejection_reason = ?,
           completed_at = CASE WHEN ? = 'COMPLETED' THEN ? ELSE completed_at END,
           cancelled_at = CASE WHEN ? IN ('REJECTED', 'CANCELLED') THEN ? ELSE cancelled_at END,
           updated_at = ?
       WHERE id = ? AND partner_id = ?`,
    )
    .run(status, rejectionReason || null, status, updatedAt, status, updatedAt, updatedAt, id, partnerId);

  return getPartnerLeadById(id);
}

export function releasePartnerLeadToBucket({ id, partnerId, updatedAt }) {
  sqlite
    .prepare(
      `UPDATE partner_leads
       SET partner_id = NULL,
           status = 'AVAILABLE',
           rejection_reason = NULL,
           claimed_at = NULL,
           cancelled_at = NULL,
           pickup_started_at = NULL,
           call_status = NULL,
           updated_at = ?
       WHERE id = ? AND partner_id = ? AND status IN ('ACCEPTED', 'IN_PROGRESS')`,
    )
    .run(updatedAt, id, partnerId);

  return getPartnerLeadById(id);
}

export function getPartnerLeadUnlockOrderForPartner({ leadId, partnerId }) {
  const row = sqlite
    .prepare(`${partnerLeadUnlockSelect} WHERE lead_id = ? AND partner_id = ? ORDER BY created_at DESC LIMIT 1`)
    .get(leadId, partnerId);
  return mapPartnerLeadUnlockOrder(row);
}

function expireStalePartnerLeadUnlockIntents(now) {
  sqlite
    .prepare(`
      UPDATE partner_lead_payment_intents
      SET status = 'EXPIRED', admin_note = COALESCE(admin_note, 'Payment window expired')
      WHERE status IN ('PENDING_PAYMENT', 'SCREENSHOT_SENT') AND expires_at < ?
    `)
    .run(now);
}

export function getPartnerLeadUnlockIntentById({ intentId, partnerId, now }) {
  if (now) expireStalePartnerLeadUnlockIntents(now);
  const clauses = ["id = ?"];
  const params = [intentId];
  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }
  const row = sqlite
    .prepare(`${partnerLeadUnlockSelect} WHERE ${clauses.join(" AND ")}`)
    .get(...params);
  return mapPartnerLeadUnlockOrder(row);
}

export function createPartnerLeadUnlockIntent({ leadId, partnerId, unlockPrice, intentId, now, expiresAt }) {
  const tx = sqlite.transaction((input) => {
    expireStalePartnerLeadUnlockIntents(input.now);

    const rawLead = sqlite.prepare(`${partnerLeadSelect} WHERE id = ?`).get(input.leadId);
    const existingLead = mapPartnerLead(rawLead);
    if (!existingLead) {
      return { result: "NOT_FOUND", lead: null, intent: null };
    }

    const existingUnlock = sqlite
      .prepare(`${partnerLeadUnlockSelect} WHERE lead_id = ? AND status IN ('PENDING_PAYMENT', 'SCREENSHOT_SENT', 'APPROVED') ORDER BY created_at DESC LIMIT 1`)
      .get(input.leadId);
    const intent = mapPartnerLeadUnlockOrder(existingUnlock);
    if (intent) {
      if (intent.partnerId === input.partnerId) {
        return {
          result: intent.status === "APPROVED" ? "ALREADY_APPROVED" : "EXISTING_INTENT",
          lead: attachPartnerUnlockOrder(getPartnerLeadById(input.leadId), input.partnerId),
          intent,
        };
      }
      return { result: "LOCKED_BY_OTHER", lead: existingLead, intent };
    }

    if (existingLead.partnerId && existingLead.partnerId !== input.partnerId) {
      return { result: "OWNED_BY_OTHER", lead: existingLead, intent: null };
    }

    if (existingLead.partnerId === input.partnerId && ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(existingLead.status)) {
      return {
        result: "ALREADY_APPROVED",
        lead: attachPartnerUnlockOrder(existingLead, input.partnerId),
        intent: getPartnerLeadUnlockOrderForPartner({ leadId: existingLead.id, partnerId: input.partnerId }),
      };
    }

    if (existingLead.status !== "AVAILABLE" && !(existingLead.status === "CLAIMED" && existingLead.partnerId === input.partnerId)) {
      return { result: "INVALID_STATUS", lead: existingLead, intent: null };
    }

    const metadata = {
      unlockOrderId: input.intentId,
      leadId: existingLead.id,
      partnerId: input.partnerId,
      userSellFlowId: existingLead.userSellFlowId,
      quoteSellingPrice: existingLead.quote?.sellingPrice ?? null,
    };

    sqlite
      .prepare(`
        INSERT INTO partner_lead_payment_intents (
          id, lead_id, partner_id, user_sell_flow_id, unlock_price, payment_method, status, screenshot_status, metadata_json, created_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, 'UPI_QR', 'PENDING_PAYMENT', 'NOT_SENT', ?, ?, ?)
      `)
      .run(
        input.intentId,
        existingLead.id,
        input.partnerId,
        existingLead.userSellFlowId,
        input.unlockPrice,
        JSON.stringify(metadata),
        input.now,
        input.expiresAt,
      );

    const lead = attachPartnerUnlockOrder(getPartnerLeadById(existingLead.id), input.partnerId);
    const finalIntent = getPartnerLeadUnlockOrderForPartner({ leadId: existingLead.id, partnerId: input.partnerId });
    return {
      result: "CREATED",
      lead,
      intent: finalIntent,
    };
  });

  return tx({ leadId, partnerId, unlockPrice, intentId, now, expiresAt });
}

export function markPartnerLeadUnlockScreenshotSent({ intentId, partnerId, now }) {
  expireStalePartnerLeadUnlockIntents(now);
  sqlite
    .prepare(`
      UPDATE partner_lead_payment_intents
      SET status = 'SCREENSHOT_SENT', screenshot_status = 'SENT'
      WHERE id = ? AND partner_id = ? AND status = 'PENDING_PAYMENT'
    `)
    .run(intentId, partnerId);

  return getPartnerLeadUnlockIntentById({ intentId, partnerId });
}

export function listPartnerLeadUnlockIntentsForAdmin({ status, partnerId, limit = 100, now }) {
  expireStalePartnerLeadUnlockIntents(now);
  const clauses = [];
  const params = [];
  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }
  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);
  const rows = sqlite
    .prepare(`${partnerLeadUnlockSelect} ${where} ORDER BY created_at DESC LIMIT ?`)
    .all(...params, safeLimit)
    .map(mapPartnerLeadUnlockOrder);

  return rows.map((intent) => ({
    ...intent,
    lead: getPartnerLeadById(intent.leadId),
  }));
}

export function verifyPartnerLeadUnlockIntent({ intentId, action, verifiedBy, adminNote, verifiedAt }) {
  const tx = sqlite.transaction((input) => {
    expireStalePartnerLeadUnlockIntents(input.verifiedAt);
    const intent = mapPartnerLeadUnlockOrder(
      sqlite.prepare(`${partnerLeadUnlockSelect} WHERE id = ?`).get(input.intentId),
    );
    if (!intent) return { result: "NOT_FOUND", intent: null, lead: null };
    if (!["PENDING_PAYMENT", "SCREENSHOT_SENT"].includes(intent.status)) {
      return { result: "ALREADY_PROCESSED", intent, lead: getPartnerLeadById(intent.leadId, { viewerPartnerId: intent.partnerId }) };
    }

    const existingLead = getPartnerLeadById(intent.leadId);
    if (!existingLead) return { result: "LEAD_NOT_FOUND", intent, lead: null };
    if (existingLead.partnerId && existingLead.partnerId !== intent.partnerId) {
      return { result: "OWNED_BY_OTHER", intent, lead: existingLead };
    }

    if (input.action === "REJECT") {
      sqlite
        .prepare(`
          UPDATE partner_lead_payment_intents
          SET status = 'REJECTED', rejected_at = ?, admin_note = ?
          WHERE id = ?
        `)
        .run(input.verifiedAt, input.adminNote || "Rejected by admin", intent.id);
      return { result: "REJECTED", intent: getPartnerLeadUnlockIntentById({ intentId: intent.id }), lead: existingLead };
    }

    sqlite
      .prepare(`
        UPDATE partner_lead_payment_intents
        SET status = 'APPROVED', approved_by = ?, approved_at = ?, admin_note = ?
        WHERE id = ?
      `)
      .run(input.verifiedBy, input.verifiedAt, input.adminNote || "Approved by admin", intent.id);

    sqlite
      .prepare(`
        UPDATE partner_leads
        SET partner_id = ?,
            status = 'ACCEPTED',
            claimed_at = COALESCE(claimed_at, ?),
            updated_at = ?
        WHERE id = ?
      `)
      .run(intent.partnerId, input.verifiedAt, input.verifiedAt, intent.leadId);

    return {
      result: "APPROVED",
      intent: getPartnerLeadUnlockIntentById({ intentId: intent.id }),
      lead: getPartnerLeadById(intent.leadId, { viewerPartnerId: intent.partnerId }),
      fromStatus: existingLead.status,
    };
  });

  return tx({ intentId, action, verifiedBy, adminNote, verifiedAt });
}

export function closePartnerLeadUnlockOrder({ leadId, partnerId, closedAt }) {
  sqlite
    .prepare(`
      UPDATE partner_lead_payment_intents
      SET status = 'CLOSED', closed_at = ?
      WHERE lead_id = ? AND partner_id = ? AND status = 'APPROVED'
    `)
    .run(closedAt, leadId, partnerId);

  return getPartnerLeadUnlockOrderForPartner({ leadId, partnerId });
}

export function setPartnerLeadPickupStartedAt({ id, partnerId, pickupStartedAt, updatedAt }) {
  sqlite
    .prepare(
      `UPDATE partner_leads
       SET pickup_started_at = COALESCE(pickup_started_at, ?),
           updated_at = ?
       WHERE id = ? AND partner_id = ?`
    )
    .run(pickupStartedAt, updatedAt, id, partnerId);

  return getPartnerLeadById(id);
}

export function markPartnerLeadCallStatus({
  id,
  partnerId,
  callStatus,
  note,
  calledAt,
  updatedAt,
}) {
  const existing = getPartnerLeadById(id);
  if (!existing || existing.partnerId !== partnerId) return null;

  const history = Array.isArray(existing.callHistory) ? existing.callHistory : [];
  history.push({
    status: callStatus,
    note: note || null,
    calledAt,
    actorId: partnerId,
  });

  sqlite
    .prepare(
      `UPDATE partner_leads
       SET call_status = ?,
           call_attempt_count = COALESCE(call_attempt_count, 0) + 1,
           last_called_at = ?,
           call_history_json = ?,
           updated_at = ?
       WHERE id = ? AND partner_id = ?`
    )
    .run(callStatus, calledAt, JSON.stringify(history), updatedAt, id, partnerId);

  return getPartnerLeadById(id);
}

export function listPartnerActivePickups({ partnerId, pincode, limit = 20 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const clauses = [
    "partner_id = ?",
    `(status IN ('ACCEPTED', 'IN_PROGRESS') OR (status = 'COMPLETED' AND (completion_event_json IS NULL OR payment_proof_json IS NULL)))`,
  ];
  const params = [partnerId];

  if (pincode) {
    clauses.push("pincode = ?");
    params.push(pincode);
  }

  return sqlite
    .prepare(`${partnerLeadSelect} WHERE ${clauses.join(" AND ")} ORDER BY updated_at DESC LIMIT ?`)
    .all(...params, safeLimit)
    .map(mapPartnerLead);
}

export function savePartnerLeadOnsiteValidation({
  id,
  partnerId,
  onsiteValidationJson,
  onsiteValidatedAt,
  onsiteValidatedBy,
  updatedAt,
}) {
  sqlite
    .prepare(
      `UPDATE partner_leads
       SET onsite_validation_json = ?,
           onsite_validated_at = ?,
           onsite_validated_by = ?,
           updated_at = ?
       WHERE id = ? AND partner_id = ?`
    )
    .run(onsiteValidationJson, onsiteValidatedAt, onsiteValidatedBy, updatedAt, id, partnerId);

  return getPartnerLeadById(id);
}

export function savePartnerLeadPaymentProofMetadata({
  id,
  partnerId,
  paymentProofJson,
  paymentSubmittedAt,
  updatedAt,
}) {
  sqlite
    .prepare(
      `UPDATE partner_leads
       SET payment_proof_json = ?,
           payment_submitted_at = ?,
           updated_at = ?
       WHERE id = ? AND partner_id = ?`
    )
    .run(paymentProofJson, paymentSubmittedAt, updatedAt, id, partnerId);

  return getPartnerLeadById(id);
}

export function savePartnerLeadCompletionEvent({
  id,
  partnerId,
  completionEventJson,
  completionEventAt,
  updatedAt,
}) {
  sqlite
    .prepare(
      `UPDATE partner_leads
       SET completion_event_json = ?,
           completion_event_at = ?,
           updated_at = ?
       WHERE id = ? AND partner_id = ?`
    )
    .run(completionEventJson, completionEventAt, updatedAt, id, partnerId);

  return getPartnerLeadById(id);
}

export function markPartnerLeadCancelledForFlow({ userSellFlowId, updatedAt }) {
  sqlite
    .prepare(
      `UPDATE partner_leads
       SET status = 'CANCELLED', cancelled_at = ?, updated_at = ?
       WHERE user_sell_flow_id = ?`,
    )
    .run(updatedAt, updatedAt, userSellFlowId);

  return getPartnerLeadByFlowId(userSellFlowId);
}

function mapPartnerLeadDispositionEvent(row) {
  if (!row) return null;
  return {
    id: row.id,
    leadId: row.leadId,
    userSellFlowId: row.userSellFlowId,
    partnerId: row.partnerId,
    fromStatus: row.fromStatus,
    toStatus: row.toStatus,
    dispositionKey: row.dispositionKey,
    note: row.note,
    actorRole: row.actorRole,
    actorId: row.actorId,
    createdAt: row.createdAt,
  };
}

const partnerLeadDispositionSelect = `
  SELECT
    id,
    lead_id as leadId,
    user_sell_flow_id as userSellFlowId,
    partner_id as partnerId,
    from_status as fromStatus,
    to_status as toStatus,
    disposition_key as dispositionKey,
    note,
    actor_role as actorRole,
    actor_id as actorId,
    created_at as createdAt
  FROM partner_lead_disposition_events
`;

export function appendPartnerLeadDispositionEvent(input) {
  sqlite
    .prepare(
      `INSERT INTO partner_lead_disposition_events (
        id, lead_id, user_sell_flow_id, partner_id, from_status, to_status,
        disposition_key, note, actor_role, actor_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      input.id,
      input.leadId,
      input.userSellFlowId,
      input.partnerId || null,
      input.fromStatus || null,
      input.toStatus,
      input.dispositionKey,
      input.note || null,
      input.actorRole,
      input.actorId,
      input.createdAt,
    );
}

export function enqueueLeadEventOutbox({
  id,
  eventType,
  leadId,
  payloadJson,
  occurredAt,
}) {
  sqlite
    .prepare(
      `INSERT INTO lead_event_outbox (
        id, event_type, lead_id, payload_json, occurred_at, delivery_status, retry_count
      ) VALUES (?, ?, ?, ?, ?, 'PENDING', 0)`
    )
    .run(id, eventType, leadId, payloadJson, occurredAt);
}

function getDateRangeFilter({ fromDate, toDate }, column) {
  const clauses = [];
  const params = [];
  if (fromDate) {
    clauses.push(`${column} >= ?`);
    params.push(fromDate);
  }
  if (toDate) {
    clauses.push(`${column} <= ?`);
    params.push(toDate);
  }
  return { clauses, params };
}

export function getAdminOverviewMetrics({ fromDate, toDate, pincode, partnerId, leadType }) {
  const clauses = ["1=1"];
  const params = [];
  const { clauses: timeClauses, params: timeParams } = getDateRangeFilter({ fromDate, toDate }, "updated_at");
  clauses.push(...timeClauses);
  params.push(...timeParams);

  if (pincode) {
    clauses.push("pincode = ?");
    params.push(pincode);
  }
  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }
  if (leadType) {
    clauses.push("lead_type = ?");
    params.push(leadType);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;

  const agg = sqlite.prepare(
    `SELECT
      COUNT(*) as totalLeads,
      SUM(CASE WHEN status IN ('ACCEPTED', 'IN_PROGRESS') THEN 1 ELSE 0 END) as inProgressPickups,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completedLeads,
      SUM(CASE
        WHEN status = 'COMPLETED'
        THEN COALESCE(
          CAST(json_extract(completion_event_json, '$.finalAmount') AS REAL),
          CAST(json_extract(quote_json, '$.sellingPrice') AS REAL),
          0
        )
        ELSE 0
      END) as monthlyPayout,
      COUNT(DISTINCT partner_id) as activePartners
    FROM partner_leads
    ${where}`
  ).get(...params) || {};

  const trendClauses = [...clauses];
  const trendParams = [...params];
  const trendWhere = `WHERE ${trendClauses.join(" AND ")}`;
  const weeklyTrend = sqlite.prepare(
    `SELECT
      substr(created_at, 1, 10) as label,
      COUNT(*) as value
    FROM partner_leads
    ${trendWhere}
    GROUP BY substr(created_at, 1, 10)
    ORDER BY label ASC`
  ).all(...trendParams);

  const totalLeads = Number(agg.totalLeads || 0);
  const completedLeads = Number(agg.completedLeads || 0);

  return {
    totalLeads,
    inProgressPickups: Number(agg.inProgressPickups || 0),
    completedLeads,
    conversionRate: totalLeads > 0 ? Number(((completedLeads / totalLeads) * 100).toFixed(2)) : 0,
    weeklyTrend: weeklyTrend.map((row) => ({ label: row.label, value: Number(row.value || 0) })),
    monthlyPayout: Math.round(Number(agg.monthlyPayout || 0)),
    activePartners: Number(agg.activePartners || 0),
  };
}

export function getAdminLeadAssignmentMetrics({ fromDate, toDate, pincode, partnerId, leadType }) {
  const clauses = ["1=1"];
  const params = [];
  const { clauses: timeClauses, params: timeParams } = getDateRangeFilter({ fromDate, toDate }, "updated_at");
  clauses.push(...timeClauses);
  params.push(...timeParams);

  if (pincode) {
    clauses.push("pincode = ?");
    params.push(pincode);
  }
  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }
  if (leadType) {
    clauses.push("lead_type = ?");
    params.push(leadType);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;

  const base = sqlite.prepare(
    `SELECT
      SUM(CASE WHEN partner_id IS NULL AND status = 'AVAILABLE' THEN 1 ELSE 0 END) as unassigned,
      SUM(CASE WHEN partner_id IS NOT NULL THEN 1 ELSE 0 END) as assigned,
      SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) as claimed
    FROM partner_leads
    ${where}`
  ).get(...params) || {};

  const manualClauses = ["1=1"];
  const manualParams = [];
  const { clauses: manualTimeClauses, params: manualTimeParams } = getDateRangeFilter({ fromDate, toDate }, "a.created_at");
  manualClauses.push(...manualTimeClauses);
  manualParams.push(...manualTimeParams);

  if (pincode) {
    manualClauses.push("l.pincode = ?");
    manualParams.push(pincode);
  }
  if (partnerId) {
    manualClauses.push("a.assigned_partner_id = ?");
    manualParams.push(partnerId);
  }
  if (leadType) {
    manualClauses.push("l.lead_type = ?");
    manualParams.push(leadType);
  }

  const manualWhere = `WHERE ${manualClauses.join(" AND ")}`;
  const manual = sqlite.prepare(
    `SELECT
      COUNT(*) as manualAssigned,
      COUNT(DISTINCT assigned_partner_id) as manualPartners
    FROM admin_lead_assignments a
    JOIN partner_leads l ON l.id = a.lead_id
    ${manualWhere}`
  ).get(...manualParams) || {};

  return {
    assigned: Number(base.assigned || 0),
    claimed: Number(base.claimed || 0),
    unassigned: Number(base.unassigned || 0),
    manualAssigned: Number(manual.manualAssigned || 0),
    manualPartners: Number(manual.manualPartners || 0),
  };
}

export function assignAdminLead({ leadId, partnerId, adminId, assignmentMode = "MANUAL", note = null, createdAt }) {
  const tx = sqlite.transaction((input) => {
    const lead = getPartnerLeadById(input.leadId);
    if (!lead) return { result: "NOT_FOUND", lead: null, assignment: null };
    if (["COMPLETED", "REJECTED", "CANCELLED"].includes(lead.status)) {
      return { result: "TERMINAL", lead, assignment: null };
    }

    sqlite
      .prepare(
        `UPDATE partner_leads
         SET partner_id = ?,
             status = CASE WHEN status = 'AVAILABLE' THEN 'CLAIMED' ELSE status END,
             claimed_at = COALESCE(claimed_at, ?),
             updated_at = ?
         WHERE id = ?`
      )
      .run(input.partnerId, input.createdAt, input.createdAt, input.leadId);

    const assignmentId = `admin-assign-${input.leadId}-${Date.now()}`;
    sqlite
      .prepare(
        `INSERT INTO admin_lead_assignments (
          id, lead_id, assigned_partner_id, assigned_by_admin_id, assignment_mode, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(assignmentId, input.leadId, input.partnerId, input.adminId, input.assignmentMode, input.note, input.createdAt, input.createdAt);

    const updatedLead = getPartnerLeadById(input.leadId);
    return {
      result: "UPDATED",
      lead: updatedLead,
      assignment: {
        id: assignmentId,
        leadId: input.leadId,
        partnerId: input.partnerId,
        adminId: input.adminId,
        assignmentMode: input.assignmentMode,
        note: input.note,
        createdAt: input.createdAt,
      },
      previousStatus: lead.status,
    };
  });

  return tx({ leadId, partnerId, adminId, assignmentMode, note, createdAt });
}

export function assignAdminLeadsBulk({ leadIds, partnerId, adminId, assignmentMode = "MANUAL", note = null, createdAt }) {
  const uniqueLeadIds = Array.from(new Set(leadIds));
  return uniqueLeadIds.map((leadId) => {
    const result = assignAdminLead({
      leadId,
      partnerId,
      adminId,
      assignmentMode,
      note,
      createdAt,
    });

    return {
      leadId,
      result: result.result,
      lead: result.lead,
      assignment: result.assignment,
      previousStatus: result.previousStatus || null,
    };
  });
}

export function autoAssignLeadByPincodeRoundRobin({ leadId, adminId, note = null, createdAt }) {
  const tx = sqlite.transaction((input) => {
    const lead = getPartnerLeadById(input.leadId);
    if (!lead) return { result: "NOT_FOUND", lead: null, assignment: null, partnerCandidates: [] };
    if (lead.partnerId) {
      return { result: "ALREADY_ASSIGNED", lead, assignment: null, partnerCandidates: [] };
    }
    if (["COMPLETED", "REJECTED", "CANCELLED"].includes(lead.status)) {
      return { result: "TERMINAL", lead, assignment: null, partnerCandidates: [] };
    }

    const candidates = listEligiblePartnersForPincode(lead.pincode);
    if (candidates.length === 0) {
      return { result: "NO_ELIGIBLE_PARTNER", lead, assignment: null, partnerCandidates: [] };
    }

    const selected = candidates[0];
    const assignResult = assignAdminLead({
      leadId: input.leadId,
      partnerId: selected.partnerId,
      adminId: input.adminId,
      assignmentMode: "AUTO",
      note: input.note,
      createdAt: input.createdAt,
    });

    if (assignResult.result !== "UPDATED") {
      return { ...assignResult, partnerCandidates: candidates };
    }

    touchPartnerPincodeAssignment({
      partnerId: selected.partnerId,
      pincode: lead.pincode,
      assignedAt: input.createdAt,
      updatedBy: input.adminId,
    });

    return {
      result: "UPDATED",
      lead: assignResult.lead,
      assignment: assignResult.assignment,
      previousStatus: assignResult.previousStatus || null,
      selectedPartner: selected,
      partnerCandidates: candidates,
    };
  });

  return tx({ leadId, adminId, note, createdAt });
}

function scopeMatches(filterValue, payloadValue) {
  if (!filterValue) return true;
  return filterValue === payloadValue;
}

export function listPendingLeadEventOutbox(limit = 200) {
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  return sqlite
    .prepare(
      `SELECT
        id,
        event_type as eventType,
        lead_id as leadId,
        payload_json as payloadJson,
        occurred_at as occurredAt,
        delivery_status as deliveryStatus,
        retry_count as retryCount,
        next_retry_at as nextRetryAt,
        last_error as lastError
      FROM lead_event_outbox
      WHERE delivery_status = 'PENDING' AND (next_retry_at IS NULL OR next_retry_at <= ?)
      ORDER BY occurred_at ASC
      LIMIT ?`
    )
    .all(new Date().toISOString(), safeLimit)
    .map((row) => ({
      ...row,
      payload: row.payloadJson ? JSON.parse(row.payloadJson) : {},
    }));
}

export function listAllLeadEventOutbox(limit = 100000) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100000, 1), 1000000);
  return sqlite
    .prepare(
      `SELECT
        id,
        event_type as eventType,
        lead_id as leadId,
        payload_json as payloadJson,
        occurred_at as occurredAt,
        delivery_status as deliveryStatus,
        retry_count as retryCount,
        next_retry_at as nextRetryAt,
        last_error as lastError
      FROM lead_event_outbox
      ORDER BY occurred_at ASC
      LIMIT ?`
    )
    .all(safeLimit)
    .map((row) => ({
      ...row,
      payload: row.payloadJson ? JSON.parse(row.payloadJson) : {},
    }));
}

export function markLeadEventOutboxProcessed(id) {
  sqlite
    .prepare(
      `UPDATE lead_event_outbox
       SET delivery_status = 'PROCESSED', last_error = NULL
       WHERE id = ?`
    )
    .run(id);
}

export function markLeadEventOutboxFailed(id, errorMessage, retryDelaySeconds = 10) {
  const nextRetry = new Date(Date.now() + Math.max(1, retryDelaySeconds) * 1000).toISOString();
  sqlite
    .prepare(
      `UPDATE lead_event_outbox
       SET delivery_status = 'FAILED',
           retry_count = retry_count + 1,
           next_retry_at = ?,
           last_error = ?
       WHERE id = ?`
    )
    .run(nextRetry, errorMessage?.slice(0, 500) || "Unknown projector error", id);

  sqlite
    .prepare(
      `UPDATE lead_event_outbox
       SET delivery_status = 'PENDING'
       WHERE id = ?`
    )
    .run(id);
}

export function upsertAdminMetricSnapshot({ bucketDate, scopePincode, scopePartnerId, metricKey, metricValue, updatedAt }) {
  const stableId = `${bucketDate}|${scopePincode || '*'}|${scopePartnerId || '*'}|${metricKey}`;
  sqlite
    .prepare(
      `INSERT INTO admin_metrics_snapshot (
        id, bucket_date, scope_pincode, scope_partner_id, metric_key, metric_value, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id)
      DO UPDATE SET
        metric_value = excluded.metric_value,
        updated_at = excluded.updated_at`
    )
    .run(stableId, bucketDate, scopePincode || null, scopePartnerId || null, metricKey, metricValue, updatedAt);
}

export function clearAdminMetricSnapshots() {
  sqlite.prepare("DELETE FROM admin_metrics_snapshot").run();
}

function projectSingleOutboxRow(row, now, markProcessed) {
  const payload = row.payload || {};
  const bucketDate = (row.occurredAt || now).slice(0, 10);
  const pincode = payload.pincode || null;
  const partnerId = payload.partnerId || null;
  const toStatus = payload.toStatus || null;
  const dispositionKey = payload.dispositionKey || null;
  const amount = Number(payload.amount || payload.amountCollected || 0);

  upsertAdminMetricSnapshot({
    bucketDate,
    scopePincode: pincode,
    scopePartnerId: null,
    metricKey: "events.total",
    metricValue: Number(
      (sqlite
        .prepare(
          `SELECT COUNT(*) as count
           FROM lead_event_outbox
           WHERE substr(occurred_at, 1, 10) = ?
             AND (? IS NULL OR json_extract(payload_json, '$.pincode') = ?)`
        )
        .get(bucketDate, pincode, pincode)?.count || 0)
    ),
    updatedAt: now,
  });

  if (toStatus) {
    upsertAdminMetricSnapshot({
      bucketDate,
      scopePincode: pincode,
      scopePartnerId: null,
      metricKey: `status.${toStatus}`,
      metricValue: Number(
        (sqlite
          .prepare(
            `SELECT COUNT(*) as count
             FROM partner_leads
             WHERE status = ? AND substr(updated_at, 1, 10) = ?
               AND (? IS NULL OR pincode = ?)`
          )
          .get(toStatus, bucketDate, pincode, pincode)?.count || 0)
      ),
      updatedAt: now,
    });
  }

  if (dispositionKey) {
    upsertAdminMetricSnapshot({
      bucketDate,
      scopePincode: pincode,
      scopePartnerId: partnerId,
      metricKey: `disposition.${dispositionKey}`,
      metricValue: Number(
        (sqlite
          .prepare(
            `SELECT COUNT(*) as count
             FROM partner_lead_disposition_events e
             JOIN partner_leads l ON l.id = e.lead_id
             WHERE e.disposition_key = ?
               AND substr(e.created_at, 1, 10) = ?
               AND (? IS NULL OR l.pincode = ?)
               AND (? IS NULL OR e.partner_id = ?)`
          )
          .get(dispositionKey, bucketDate, pincode, pincode, partnerId, partnerId)?.count || 0)
      ),
      updatedAt: now,
    });

    if (dispositionKey === "ASSIGNED_MANUAL") {
      upsertAdminMetricSnapshot({
        bucketDate,
        scopePincode: pincode,
        scopePartnerId: null,
        metricKey: "assignment.manual",
        metricValue: Number(
          (sqlite
            .prepare(
              `SELECT COUNT(*) as count
               FROM admin_lead_assignments a
               JOIN partner_leads l ON l.id = a.lead_id
               WHERE substr(a.created_at, 1, 10) = ?
                 AND (? IS NULL OR l.pincode = ?)`
            )
            .get(bucketDate, pincode, pincode)?.count || 0)
        ),
        updatedAt: now,
      });
    }

    if (dispositionKey === "CREATED" || dispositionKey === "SCHEDULED") {
      upsertAdminMetricSnapshot({
        bucketDate,
        scopePincode: pincode,
        scopePartnerId: null,
        metricKey: "lead.created",
        metricValue: Number(
          (sqlite
            .prepare(
              `SELECT COUNT(*) as count
               FROM partner_lead_disposition_events e
               JOIN partner_leads l ON l.id = e.lead_id
               WHERE e.disposition_key IN ('CREATED', 'SCHEDULED')
                 AND substr(e.created_at, 1, 10) = ?
                 AND (? IS NULL OR l.pincode = ?)`
            )
            .get(bucketDate, pincode, pincode)?.count || 0)
        ),
        updatedAt: now,
      });
    }
  }

  upsertAdminMetricSnapshot({
    bucketDate,
    scopePincode: pincode,
    scopePartnerId: null,
    metricKey: "assignment.claimed",
    metricValue: Number(
      (sqlite
        .prepare(
          `SELECT COUNT(*) as count
           FROM partner_leads
           WHERE status = 'CLAIMED'
             AND substr(updated_at, 1, 10) = ?
             AND (? IS NULL OR pincode = ?)`
        )
        .get(bucketDate, pincode, pincode)?.count || 0)
    ),
    updatedAt: now,
  });

  upsertAdminMetricSnapshot({
    bucketDate,
    scopePincode: pincode,
    scopePartnerId: null,
    metricKey: "assignment.assigned",
    metricValue: Number(
      (sqlite
        .prepare(
          `SELECT COUNT(*) as count
           FROM partner_leads
           WHERE partner_id IS NOT NULL
             AND substr(updated_at, 1, 10) = ?
             AND (? IS NULL OR pincode = ?)`
        )
        .get(bucketDate, pincode, pincode)?.count || 0)
    ),
    updatedAt: now,
  });

  upsertAdminMetricSnapshot({
    bucketDate,
    scopePincode: pincode,
    scopePartnerId: null,
    metricKey: "assignment.unassigned",
    metricValue: Number(
      (sqlite
        .prepare(
          `SELECT COUNT(*) as count
           FROM partner_leads
           WHERE partner_id IS NULL AND status = 'AVAILABLE'
             AND substr(updated_at, 1, 10) = ?
             AND (? IS NULL OR pincode = ?)`
        )
        .get(bucketDate, pincode, pincode)?.count || 0)
    ),
    updatedAt: now,
  });

  if (amount > 0 && toStatus === "COMPLETED") {
    upsertAdminMetricSnapshot({
      bucketDate,
      scopePincode: pincode,
      scopePartnerId: partnerId,
      metricKey: "payout.completed",
      metricValue: Number(
        (sqlite
          .prepare(
            `SELECT COALESCE(SUM(
                COALESCE(
                  CAST(json_extract(completion_event_json, '$.finalAmount') AS REAL),
                  CAST(json_extract(quote_json, '$.sellingPrice') AS REAL),
                  0
                )
              ), 0) as total
             FROM partner_leads
             WHERE status = 'COMPLETED'
               AND substr(completed_at, 1, 10) = ?
               AND (? IS NULL OR pincode = ?)
               AND (? IS NULL OR partner_id = ?)`
          )
          .get(bucketDate, pincode, pincode, partnerId, partnerId)?.total || 0)
      ),
      updatedAt: now,
    });
  }

  if (markProcessed) {
    markLeadEventOutboxProcessed(row.id);
  }
}

export function projectLeadEventOutboxBatch(limit = 200) {
  const rows = listPendingLeadEventOutbox(limit);
  if (rows.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      projectSingleOutboxRow(row, now, true);
      processed += 1;
    } catch (err) {
      markLeadEventOutboxFailed(row.id, err instanceof Error ? err.message : String(err), 15);
      failed += 1;
    }
  }

  return { processed, failed };
}

export function rebuildAdminMetricSnapshotsFromOutbox() {
  clearAdminMetricSnapshots();
  const rows = listAllLeadEventOutbox(1000000);
  if (rows.length === 0) {
    const statusRows = sqlite
      .prepare(
        `SELECT
          substr(updated_at, 1, 10) as bucketDate,
          pincode,
          status,
          COUNT(*) as count
         FROM partner_leads
         GROUP BY substr(updated_at, 1, 10), pincode, status`
      )
      .all();

    const dispositionRows = sqlite
      .prepare(
        `SELECT
          substr(e.created_at, 1, 10) as bucketDate,
          l.pincode as pincode,
          e.disposition_key as dispositionKey,
          COUNT(*) as count
         FROM partner_lead_disposition_events e
         JOIN partner_leads l ON l.id = e.lead_id
         GROUP BY substr(e.created_at, 1, 10), l.pincode, e.disposition_key`
      )
      .all();

    const assignmentRows = sqlite
      .prepare(
        `SELECT
          substr(updated_at, 1, 10) as bucketDate,
          pincode,
          SUM(CASE WHEN partner_id IS NOT NULL THEN 1 ELSE 0 END) as assigned,
          SUM(CASE WHEN status = 'CLAIMED' THEN 1 ELSE 0 END) as claimed,
          SUM(CASE WHEN partner_id IS NULL AND status = 'AVAILABLE' THEN 1 ELSE 0 END) as unassigned
         FROM partner_leads
         GROUP BY substr(updated_at, 1, 10), pincode`
      )
      .all();

    const manualRows = sqlite
      .prepare(
        `SELECT
          substr(a.created_at, 1, 10) as bucketDate,
          l.pincode as pincode,
          COUNT(*) as manualAssigned
         FROM admin_lead_assignments a
         JOIN partner_leads l ON l.id = a.lead_id
         GROUP BY substr(a.created_at, 1, 10), l.pincode`
      )
      .all();

    const payoutRows = sqlite
      .prepare(
        `SELECT
          substr(completed_at, 1, 10) as bucketDate,
          pincode,
          COALESCE(SUM(
            COALESCE(
              CAST(json_extract(completion_event_json, '$.finalAmount') AS REAL),
              CAST(json_extract(quote_json, '$.sellingPrice') AS REAL),
              0
            )
          ), 0) as total
         FROM partner_leads
         WHERE status = 'COMPLETED' AND completed_at IS NOT NULL
         GROUP BY substr(completed_at, 1, 10), pincode`
      )
      .all();

    const now = new Date().toISOString();
    for (const row of statusRows) {
      upsertAdminMetricSnapshot({
        bucketDate: row.bucketDate,
        scopePincode: row.pincode || null,
        scopePartnerId: null,
        metricKey: `status.${row.status}`,
        metricValue: Number(row.count || 0),
        updatedAt: now,
      });
    }

    for (const row of dispositionRows) {
      upsertAdminMetricSnapshot({
        bucketDate: row.bucketDate,
        scopePincode: row.pincode || null,
        scopePartnerId: null,
        metricKey: `disposition.${row.dispositionKey}`,
        metricValue: Number(row.count || 0),
        updatedAt: now,
      });

      if (row.dispositionKey === "CREATED" || row.dispositionKey === "SCHEDULED") {
        upsertAdminMetricSnapshot({
          bucketDate: row.bucketDate,
          scopePincode: row.pincode || null,
          scopePartnerId: null,
          metricKey: "lead.created",
          metricValue: Number(row.count || 0),
          updatedAt: now,
        });
      }
    }

    for (const row of assignmentRows) {
      upsertAdminMetricSnapshot({
        bucketDate: row.bucketDate,
        scopePincode: row.pincode || null,
        scopePartnerId: null,
        metricKey: "assignment.assigned",
        metricValue: Number(row.assigned || 0),
        updatedAt: now,
      });
      upsertAdminMetricSnapshot({
        bucketDate: row.bucketDate,
        scopePincode: row.pincode || null,
        scopePartnerId: null,
        metricKey: "assignment.claimed",
        metricValue: Number(row.claimed || 0),
        updatedAt: now,
      });
      upsertAdminMetricSnapshot({
        bucketDate: row.bucketDate,
        scopePincode: row.pincode || null,
        scopePartnerId: null,
        metricKey: "assignment.unassigned",
        metricValue: Number(row.unassigned || 0),
        updatedAt: now,
      });
    }

    for (const row of manualRows) {
      upsertAdminMetricSnapshot({
        bucketDate: row.bucketDate,
        scopePincode: row.pincode || null,
        scopePartnerId: null,
        metricKey: "assignment.manual",
        metricValue: Number(row.manualAssigned || 0),
        updatedAt: now,
      });
    }

    for (const row of payoutRows) {
      upsertAdminMetricSnapshot({
        bucketDate: row.bucketDate,
        scopePincode: row.pincode || null,
        scopePartnerId: null,
        metricKey: "payout.completed",
        metricValue: Number(row.total || 0),
        updatedAt: now,
      });
    }

    return {
      processed: statusRows.length + dispositionRows.length + assignmentRows.length + manualRows.length + payoutRows.length,
      source: "historical-tables",
    };
  }

  const now = new Date().toISOString();
  let processed = 0;
  for (const row of rows) {
    try {
      projectSingleOutboxRow(row, now, false);
      processed += 1;
    } catch {
      // Ignore malformed historical rows; continue rebuilding best-effort.
    }
  }
  return { processed, source: "outbox" };
}

export function getAdminOverviewMetricsFromSnapshot({ fromDate, toDate, pincode, partnerId, leadType }) {
  if (leadType || partnerId) return null;

  const rows = sqlite
    .prepare(
      `SELECT
        bucket_date as bucketDate,
        scope_pincode as scopePincode,
        scope_partner_id as scopePartnerId,
        metric_key as metricKey,
        metric_value as metricValue
      FROM admin_metrics_snapshot
      WHERE (? IS NULL OR bucket_date >= ?)
        AND (? IS NULL OR bucket_date <= ?)
      ORDER BY bucket_date ASC`
    )
    .all(fromDate ? fromDate.slice(0, 10) : null, fromDate ? fromDate.slice(0, 10) : null, toDate ? toDate.slice(0, 10) : null, toDate ? toDate.slice(0, 10) : null);

  if (rows.length === 0) return null;

  const weeklyTrendMap = new Map();
  const byStatus = new Map();
  let monthlyPayout = 0;
  for (const row of rows) {
    if (!scopeMatches(pincode, row.scopePincode)) continue;
    if (!scopeMatches(partnerId, row.scopePartnerId)) continue;
    const value = Number(row.metricValue || 0);
    if (row.metricKey === "events.total") {
      weeklyTrendMap.set(row.bucketDate, value);
    }
    if (row.metricKey === "lead.created") {
      weeklyTrendMap.set(row.bucketDate, value);
    }
    if (row.metricKey.startsWith("status.")) {
      const key = row.metricKey.replace("status.", "");
      byStatus.set(key, (byStatus.get(key) || 0) + value);
    }
    if (row.metricKey === "payout.completed") {
      monthlyPayout += value;
    }
  }

  const weeklyTrend = Array.from(weeklyTrendMap.entries()).map(([label, value]) => ({ label, value }));
  const totalLeads = Array.from(byStatus.values()).reduce((sum, value) => sum + value, 0);
  const completedLeads = Number(byStatus.get("COMPLETED") || 0);
  const inProgressPickups =
    Number(byStatus.get("ACCEPTED") || 0) +
    Number(byStatus.get("IN_PROGRESS") || 0);

  if (weeklyTrend.length === 0 && totalLeads === 0 && monthlyPayout === 0) return null;

  return {
    totalLeads,
    inProgressPickups,
    completedLeads,
    conversionRate: totalLeads > 0 ? Number(((completedLeads / totalLeads) * 100).toFixed(2)) : 0,
    weeklyTrend,
    monthlyPayout: Math.round(monthlyPayout),
    activePartners: 0,
  };
}

export function getAdminLeadDispositionSummaryFromSnapshot({ fromDate, toDate, pincode, partnerId, leadType }) {
  if (leadType || partnerId) return null;

  const rows = sqlite
    .prepare(
      `SELECT
        bucket_date as bucketDate,
        scope_pincode as scopePincode,
        scope_partner_id as scopePartnerId,
        metric_key as metricKey,
        metric_value as metricValue
      FROM admin_metrics_snapshot
      WHERE (? IS NULL OR bucket_date >= ?)
        AND (? IS NULL OR bucket_date <= ?)`
    )
    .all(fromDate ? fromDate.slice(0, 10) : null, fromDate ? fromDate.slice(0, 10) : null, toDate ? toDate.slice(0, 10) : null, toDate ? toDate.slice(0, 10) : null);

  if (rows.length === 0) return null;

  const byStatus = new Map();
  const byDisposition = new Map();
  for (const row of rows) {
    if (!scopeMatches(pincode, row.scopePincode)) continue;
    if (!scopeMatches(partnerId, row.scopePartnerId)) continue;
    const value = Number(row.metricValue || 0);
    if (row.metricKey.startsWith("status.")) {
      const key = row.metricKey.replace("status.", "");
      byStatus.set(key, (byStatus.get(key) || 0) + value);
    }
    if (row.metricKey.startsWith("disposition.")) {
      const key = row.metricKey.replace("disposition.", "");
      byDisposition.set(key, (byDisposition.get(key) || 0) + value);
    }
  }

  if (byStatus.size === 0 && byDisposition.size === 0) return null;

  return {
    byStatus: Array.from(byStatus.entries()).map(([key, count]) => ({ key, count })),
    byDisposition: Array.from(byDisposition.entries()).map(([key, count]) => ({ key, count })),
  };
}

export function getAdminLeadAssignmentMetricsFromSnapshot({ fromDate, toDate, pincode, partnerId, leadType }) {
  if (leadType || partnerId) return null;

  const rows = sqlite
    .prepare(
      `SELECT
        bucket_date as bucketDate,
        scope_pincode as scopePincode,
        metric_key as metricKey,
        metric_value as metricValue
      FROM admin_metrics_snapshot
      WHERE (? IS NULL OR bucket_date >= ?)
        AND (? IS NULL OR bucket_date <= ?)`
    )
    .all(fromDate ? fromDate.slice(0, 10) : null, fromDate ? fromDate.slice(0, 10) : null, toDate ? toDate.slice(0, 10) : null, toDate ? toDate.slice(0, 10) : null);

  if (rows.length === 0) return null;

  let claimed = 0;
  let assigned = 0;
  let unassigned = 0;
  let manualAssigned = 0;
  for (const row of rows) {
    if (!scopeMatches(pincode, row.scopePincode)) continue;
    const value = Number(row.metricValue || 0);
    if (row.metricKey === "assignment.claimed") claimed += value;
    if (row.metricKey === "assignment.assigned") assigned += value;
    if (row.metricKey === "assignment.unassigned") unassigned += value;
    if (row.metricKey === "assignment.manual") manualAssigned += value;
  }

  if (claimed === 0 && assigned === 0 && unassigned === 0 && manualAssigned === 0) return null;

  return {
    assigned,
    claimed,
    unassigned,
    manualAssigned,
    manualPartners: 0,
  };
}

export function getAdminPartnerActivityFeed({ fromDate, toDate, pincode, limit = 10 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const clauses = ["l.partner_id IS NOT NULL"];
  const params = [];

  if (fromDate) {
    clauses.push("l.updated_at >= ?");
    params.push(fromDate);
  }
  if (toDate) {
    clauses.push("l.updated_at <= ?");
    params.push(toDate);
  }
  if (pincode) {
    clauses.push("l.pincode = ?");
    params.push(pincode);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;
  return sqlite
    .prepare(
      `SELECT
        l.partner_id as partnerId,
        COALESCE(p.name, l.partner_id) as partnerName,
        COUNT(*) as leadsTouched,
        SUM(CASE WHEN l.status = 'COMPLETED' THEN 1 ELSE 0 END) as completedLeads,
        SUM(CASE WHEN l.status IN ('ACCEPTED', 'IN_PROGRESS') THEN 1 ELSE 0 END) as activeLeads,
        MAX(l.updated_at) as lastActivityAt
      FROM partner_leads l
      LEFT JOIN partners p ON p.id = l.partner_id
      ${where}
      GROUP BY l.partner_id, p.name
      ORDER BY leadsTouched DESC, lastActivityAt DESC
      LIMIT ?`
    )
    .all(...params, safeLimit)
    .map((row) => ({
      partnerId: row.partnerId,
      partnerName: row.partnerName,
      leadsTouched: Number(row.leadsTouched || 0),
      completedLeads: Number(row.completedLeads || 0),
      activeLeads: Number(row.activeLeads || 0),
      lastActivityAt: row.lastActivityAt,
    }));
}

export function listPartnerLeadDispositionTimeline({ leadId, limit = 100 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  return sqlite
    .prepare(`${partnerLeadDispositionSelect} WHERE lead_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(leadId, safeLimit)
    .map(mapPartnerLeadDispositionEvent);
}

export function listPartnerLeadsForAdmin({
  status,
  leadType,
  pincode,
  partnerId,
  search,
  fromDate,
  toDate,
  limit = 100,
  offset = 0,
}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const safeOffset = Math.max(Number(offset) || 0, 0);
  const clauses = ["1=1"];
  const params = [];

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  if (leadType) {
    clauses.push("lead_type = ?");
    params.push(leadType);
  }

  if (pincode) {
    clauses.push("pincode = ?");
    params.push(pincode);
  }

  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }

  if (search) {
    clauses.push("(seller_name LIKE ? OR seller_phone LIKE ? OR city LIKE ? OR pincode LIKE ? OR id LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (fromDate) {
    clauses.push("updated_at >= ?");
    params.push(fromDate);
  }

  if (toDate) {
    clauses.push("updated_at <= ?");
    params.push(toDate);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;

  const rows = sqlite
    .prepare(`${partnerLeadSelect} ${where} ORDER BY updated_at DESC LIMIT ? OFFSET ?`)
    .all(...params, safeLimit, safeOffset)
    .map(mapPartnerLead);

  const countRow = sqlite
    .prepare(`SELECT COUNT(*) as count FROM partner_leads ${where}`)
    .get(...params);

  return {
    rows,
    count: countRow?.count || 0,
  };
}

export function listPartnerLeadDispositionSummary({
  pincode,
  partnerId,
  fromDate,
  toDate,
}) {
  const clauses = ["1=1"];
  const params = [];

  if (pincode) {
    clauses.push("pincode = ?");
    params.push(pincode);
  }

  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }

  if (fromDate) {
    clauses.push("updated_at >= ?");
    params.push(fromDate);
  }

  if (toDate) {
    clauses.push("updated_at <= ?");
    params.push(toDate);
  }

  const where = `WHERE ${clauses.join(" AND ")}`;

  const byStatus = sqlite
    .prepare(`SELECT status as key, COUNT(*) as count FROM partner_leads ${where} GROUP BY status`)
    .all(...params);

  const eventClauses = ["1=1"];
  const eventParams = [];
  if (partnerId) {
    eventClauses.push("partner_id = ?");
    eventParams.push(partnerId);
  }
  if (fromDate) {
    eventClauses.push("created_at >= ?");
    eventParams.push(fromDate);
  }
  if (toDate) {
    eventClauses.push("created_at <= ?");
    eventParams.push(toDate);
  }
  if (pincode) {
    eventClauses.push("lead_id IN (SELECT id FROM partner_leads WHERE pincode = ?)");
    eventParams.push(pincode);
  }

  const eventWhere = `WHERE ${eventClauses.join(" AND ")}`;
  const byDisposition = sqlite
    .prepare(`SELECT disposition_key as key, COUNT(*) as count FROM partner_lead_disposition_events ${eventWhere} GROUP BY disposition_key`)
    .all(...eventParams);

  return {
    byStatus,
    byDisposition,
  };
}

export function getPartnerDashboardMetrics({ partnerId, pincode, now = new Date() }) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const leadAgg = sqlite.prepare(
    `SELECT
      SUM(CASE WHEN lead_type = 'LEAD_BUCKET' AND status != 'CANCELLED' THEN 1 ELSE 0 END) as leadBucket,
      SUM(CASE WHEN lead_type = 'SERVICE_LEAD' AND status != 'CANCELLED' THEN 1 ELSE 0 END) as serviceLeads,
      SUM(CASE WHEN created_at >= ? AND status != 'CANCELLED' THEN 1 ELSE 0 END) as todayLeads,
      SUM(CASE WHEN created_at >= ? AND status != 'CANCELLED' THEN 1 ELSE 0 END) as weeklyLeads,
      SUM(CASE WHEN created_at >= ? AND status != 'CANCELLED' THEN 1 ELSE 0 END) as monthlyLeads,
      SUM(CASE
            WHEN status = 'COMPLETED' AND completed_at >= ?
            THEN COALESCE(
              CAST(json_extract(completion_event_json, '$.finalAmount') AS REAL),
              CAST(json_extract(quote_json, '$.sellingPrice') AS REAL),
              0
            )
            ELSE 0
          END) as monthlyEarnings,
      SUM(CASE WHEN status IN ('CLAIMED', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED') THEN 1 ELSE 0 END) as progressedLeads
    FROM partner_leads
    WHERE partner_id = ? AND pincode = ?`
  ).get(dayStart.toISOString(), weekStart.toISOString(), monthStart.toISOString(), monthStart.toISOString(), partnerId, pincode) || {};

  const latestKyc = sqlite.prepare(
    `SELECT verification_status as verificationStatus
      FROM partner_kyc_submissions
     WHERE partner_id = ?
     ORDER BY created_at DESC
     LIMIT 1`
  ).get(partnerId);

  let onboardingProgress = 25;
  if (latestKyc?.verificationStatus === "VERIFIED") onboardingProgress += 35;
  onboardingProgress += 20; // Scoped pincode selected for dashboard query.
  if (Number(leadAgg.progressedLeads || 0) > 0) onboardingProgress += 20;

  return {
    onboardingProgress: Math.min(onboardingProgress, 100),
    todayLeads: Number(leadAgg.todayLeads || 0),
    weeklyLeads: Number(leadAgg.weeklyLeads || 0),
    monthlyLeads: Number(leadAgg.monthlyLeads || 0),
    monthlyEarnings: Math.round(Number(leadAgg.monthlyEarnings || 0)),
    leadBucket: Number(leadAgg.leadBucket || 0),
    serviceLeads: Number(leadAgg.serviceLeads || 0),
  };
}

export function saveRefreshToken(rec) {
  sqlite
    .prepare("INSERT INTO refresh_tokens (token_id, subject_id, role, created_at) VALUES (?, ?, ?, ?)")
    .run(rec.tokenId, rec.subjectId, rec.role, rec.createdAt);
}

export function getRefreshToken(tokenId) {
  return sqlite
    .prepare("SELECT token_id as tokenId, subject_id as subjectId, role, created_at as createdAt FROM refresh_tokens WHERE token_id = ?")
    .get(tokenId);
}

export function revokeRefreshToken(tokenId) {
  const result = sqlite.prepare("DELETE FROM refresh_tokens WHERE token_id = ?").run(tokenId);
  return result.changes > 0;
}

export function upsertServiceability(row) {
  sqlite
    .prepare(`
      INSERT INTO serviceability_pincodes (
        pincode, status, reason, state, district, office_count, delivery_office_count, metadata_json, source_upload_id, source_file_name, updated_by, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(pincode)
      DO UPDATE SET
        status = excluded.status,
        reason = excluded.reason,
        state = excluded.state,
        district = excluded.district,
        office_count = excluded.office_count,
        delivery_office_count = excluded.delivery_office_count,
        metadata_json = excluded.metadata_json,
        source_upload_id = excluded.source_upload_id,
        source_file_name = excluded.source_file_name,
        updated_by = excluded.updated_by,
        updated_at = excluded.updated_at
    `)
    .run(
      row.pincode,
      row.status,
      row.reason,
      row.state || null,
      row.district || null,
      row.officeCount ?? null,
      row.deliveryOfficeCount ?? null,
      row.metadataJson || null,
      row.sourceUploadId || null,
      row.sourceFileName || null,
      row.updatedBy,
      row.updatedAt,
    );

  return getServiceabilityByPincode(row.pincode);
}

export function getServiceabilityByPincode(pincode) {
  const row = sqlite
    .prepare(
      "SELECT pincode, status, reason, state, district, office_count as officeCount, delivery_office_count as deliveryOfficeCount, metadata_json as metadataJson, source_upload_id as sourceUploadId, source_file_name as sourceFileName, updated_by as updatedBy, updated_at as updatedAt FROM serviceability_pincodes WHERE pincode = ?",
    )
    .get(pincode);

  if (!row) return null;
  return {
    ...row,
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : null,
  };
}

export function listServiceability({ status, search }) {
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  if (search) {
    clauses.push("(pincode LIKE ? OR state LIKE ? OR district LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = `
    SELECT
      pincode,
      status,
      reason,
      state,
      district,
      office_count as officeCount,
      delivery_office_count as deliveryOfficeCount,
      metadata_json as metadataJson,
      source_upload_id as sourceUploadId,
      source_file_name as sourceFileName,
      updated_by as updatedBy,
      updated_at as updatedAt
    FROM serviceability_pincodes
    ${where}
    ORDER BY pincode ASC
  `;

  return sqlite.prepare(query).all(...params).map((row) => ({
    ...row,
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : null,
  }));
}

export function deleteServiceabilityByPincode(pincode) {
  return sqlite.prepare("DELETE FROM serviceability_pincodes WHERE pincode = ?").run(pincode);
}

export function createServiceabilityUploadHistory(rec) {
  sqlite
    .prepare(`
      INSERT INTO serviceability_upload_history (
        id, file_name, uploaded_by, uploaded_at, status, media_id, deactivated_by, deactivated_at, deactivated_row_count, inserted_count, updated_count, total_processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      rec.id,
      rec.fileName,
      rec.uploadedBy,
      rec.uploadedAt,
      rec.status || "ACTIVE",
      rec.mediaId || null,
      rec.deactivatedBy || null,
      rec.deactivatedAt || null,
      rec.deactivatedRowCount || 0,
      rec.insertedCount || 0,
      rec.updatedCount || 0,
      rec.totalProcessed || 0,
    );
}

export function listServiceabilityUploadHistory() {
  return sqlite
    .prepare(`
      SELECT
        h.id,
        h.file_name as fileName,
        h.uploaded_by as uploadedBy,
        h.uploaded_at as uploadedAt,
        h.status,
        h.media_id as mediaId,
        h.deactivated_by as deactivatedBy,
        h.deactivated_at as deactivatedAt,
        h.deactivated_row_count as deactivatedRowCount,
        h.inserted_count as insertedCount,
        h.updated_count as updatedCount,
        h.total_processed as totalProcessed,
        (
          SELECT COUNT(*)
          FROM serviceability_pincodes s
          WHERE s.source_upload_id = h.id
        ) as activeRowCount
      FROM serviceability_upload_history h
      ORDER BY h.uploaded_at DESC
    `)
    .all();
}

export function getServiceabilityUploadHistoryById(uploadId) {
  return sqlite
    .prepare(`
      SELECT
        id,
        file_name as fileName,
        uploaded_by as uploadedBy,
        uploaded_at as uploadedAt,
        status,
        media_id as mediaId,
        deactivated_by as deactivatedBy,
        deactivated_at as deactivatedAt,
        deactivated_row_count as deactivatedRowCount,
        inserted_count as insertedCount,
        updated_count as updatedCount,
        total_processed as totalProcessed
      FROM serviceability_upload_history
      WHERE id = ?
    `)
    .get(uploadId);
}

export function deactivateServiceabilityUploadAndRows({ uploadId, deactivatedBy, deactivatedAt }) {
  const tx = sqlite.transaction((id) => {
    const rowDeleteResult = sqlite.prepare("DELETE FROM serviceability_pincodes WHERE source_upload_id = ?").run(id);
    const historyUpdateResult = sqlite
      .prepare(`
        UPDATE serviceability_upload_history
        SET status = 'DEACTIVATED', deactivated_by = ?, deactivated_at = ?, deactivated_row_count = ?
        WHERE id = ?
      `)
      .run(deactivatedBy, deactivatedAt, rowDeleteResult.changes, id);

    return {
      deactivatedRowCount: rowDeleteResult.changes,
      updatedHistoryRows: historyUpdateResult.changes,
    };
  });

  return tx(uploadId);
}

export function deleteServiceabilityUploadPermanently({ uploadId }) {
  const tx = sqlite.transaction((id) => {
    const rowDeleteResult = sqlite.prepare("DELETE FROM serviceability_pincodes WHERE source_upload_id = ?").run(id);
    const historyDeleteResult = sqlite.prepare("DELETE FROM serviceability_upload_history WHERE id = ?").run(id);

    return {
      deletedRows: rowDeleteResult.changes,
      deletedHistoryRows: historyDeleteResult.changes,
    };
  });

  return tx(uploadId);
}

export function createKycSubmission(input) {
  sqlite
    .prepare(`
      INSERT INTO partner_kyc_submissions (
        id, partner_id, identity_proof, file_name, mime_type, size_bytes,
        storage_status, storage_provider, storage_key, verification_status,
        verification_notes, verified_by, verified_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      input.id,
      input.partnerId,
      input.identityProof,
      input.fileName,
      input.mimeType,
      input.sizeBytes,
      input.storageStatus,
      input.storageProvider,
      input.storageKey,
      input.verificationStatus,
      input.verificationNotes || null,
      input.verifiedBy || null,
      input.verifiedAt || null,
      input.createdAt,
      input.updatedAt,
    );

  return getKycById(input.id);
}

export function getKycById(kycId) {
  const row = sqlite
    .prepare(`
      SELECT
        id,
        partner_id as partnerId,
        identity_proof as identityProof,
        file_name as fileName,
        mime_type as mimeType,
        size_bytes as sizeBytes,
        storage_status as storageStatus,
        storage_provider as storageProvider,
        storage_key as storageKey,
        verification_status as verificationStatus,
        verification_notes as verificationNotes,
        verified_by as verifiedBy,
        verified_at as verifiedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM partner_kyc_submissions
      WHERE id = ?
    `)
    .get(kycId);

  if (!row) return null;
  return {
    ...row,
    mediaUrl: row.storageProvider === "LOCAL_DISK" ? `/api/v1/media/${row.id}` : null,
  };
}

export function getLatestKycForPartner(partnerId) {
  const row = sqlite
    .prepare(`
      SELECT
        id,
        partner_id as partnerId,
        identity_proof as identityProof,
        file_name as fileName,
        mime_type as mimeType,
        size_bytes as sizeBytes,
        storage_status as storageStatus,
        storage_provider as storageProvider,
        storage_key as storageKey,
        verification_status as verificationStatus,
        verification_notes as verificationNotes,
        verified_by as verifiedBy,
        verified_at as verifiedAt,
        created_at as createdAt,
        updated_at as updatedAt
      FROM partner_kyc_submissions
      WHERE partner_id = ?
      ORDER BY created_at DESC
      LIMIT 1
    `)
    .get(partnerId);

  if (!row) return null;
  return {
    ...row,
    mediaUrl: row.storageProvider === "LOCAL_DISK" ? `/api/v1/media/${row.id}` : null,
  };
}

export function listKycSubmissions({ status, partnerId }) {
  const clauses = [];
  const params = [];

  if (status) {
    clauses.push("verification_status = ?");
    params.push(status);
  }

  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = `
    SELECT
      id,
      partner_id as partnerId,
      identity_proof as identityProof,
      file_name as fileName,
      mime_type as mimeType,
      size_bytes as sizeBytes,
      storage_status as storageStatus,
      storage_provider as storageProvider,
      storage_key as storageKey,
      verification_status as verificationStatus,
      verification_notes as verificationNotes,
      verified_by as verifiedBy,
      verified_at as verifiedAt,
      created_at as createdAt,
      updated_at as updatedAt
    FROM partner_kyc_submissions
    ${where}
    ORDER BY created_at DESC
  `;

  return sqlite.prepare(query).all(...params).map((row) => ({
    ...row,
    mediaUrl: row.storageProvider === "LOCAL_DISK" ? `/api/v1/media/${row.id}` : null,
  }));
}

export function updateKycVerification({ kycId, verificationStatus, verificationNotes, verifiedBy, verifiedAt, updatedAt }) {
  sqlite
    .prepare(`
      UPDATE partner_kyc_submissions
      SET verification_status = ?, verification_notes = ?, verified_by = ?, verified_at = ?, updated_at = ?
      WHERE id = ?
    `)
    .run(verificationStatus, verificationNotes || null, verifiedBy || null, verifiedAt || null, updatedAt, kycId);

  return getKycById(kycId);
}

export function upsertDevicePriceCatalogRows(rows) {
  const findStmt = sqlite.prepare(`
    SELECT id
    FROM device_price_catalog
    WHERE brand = ? AND series = ? AND model = ? AND storage = ? AND launch_year = ?
  `);

  const upsertStmt = sqlite.prepare(`
    INSERT INTO device_price_catalog (
      brand, series, model, storage, launch_year, cashify_price, row_json, source_upload_id, source_file_name, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(brand, series, model, storage, launch_year)
    DO UPDATE SET
      cashify_price = excluded.cashify_price,
      row_json = excluded.row_json,
      source_upload_id = excluded.source_upload_id,
      source_file_name = excluded.source_file_name,
      updated_at = excluded.updated_at
  `);

  const tx = sqlite.transaction((items) => {
    let insertedCount = 0;
    let updatedCount = 0;

    for (const row of items) {
      const existing = findStmt.get(row.brand, row.series, row.model, row.storage, row.launchYear);
      if (existing) {
        updatedCount += 1;
      } else {
        insertedCount += 1;
      }

      upsertStmt.run(
        row.brand,
        row.series,
        row.model,
        row.storage,
        row.launchYear,
        row.cashifyPrice,
        row.rowJson,
        row.sourceUploadId || null,
        row.sourceFileName || null,
        row.createdAt,
        row.updatedAt,
      );
    }

    return {
      insertedCount,
      updatedCount,
      totalProcessed: items.length,
    };
  });

  return tx(rows);
}

export function listDevicePriceCatalog({ search, limit = 200 }) {
  const clauses = [];
  const params = [];

  if (search) {
    clauses.push("(brand LIKE ? OR series LIKE ? OR model LIKE ? OR storage LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const query = `
    SELECT
      id,
      brand,
      series,
      model,
      storage,
      launch_year as launchYear,
      cashify_price as cashifyPrice,
      row_json as rowJson,
      source_upload_id as sourceUploadId,
      source_file_name as sourceFileName,
      created_at as createdAt,
      updated_at as updatedAt
    FROM device_price_catalog
    ${where}
    ORDER BY updated_at DESC
    LIMIT ?
  `;

  return sqlite.prepare(query).all(...params, limit).map((row) => ({
    ...row,
    row: row.rowJson ? JSON.parse(row.rowJson) : null,
  }));
}

export function findDevicePriceByExactMatch({ brand, series, model, storage, launchYear }) {
  const row = sqlite
    .prepare(`
      SELECT
        id,
        brand,
        series,
        model,
        storage,
        launch_year as launchYear,
        cashify_price as cashifyPrice,
        row_json as rowJson,
        source_upload_id as sourceUploadId,
        source_file_name as sourceFileName,
        created_at as createdAt,
        updated_at as updatedAt
      FROM device_price_catalog
      WHERE brand = ? AND series = ? AND model = ? AND storage = ? AND launch_year = ?
      LIMIT 1
    `)
    .get(brand, series, model, storage, launchYear);

  if (!row) {
    return null;
  }

  return {
    ...row,
    row: row.rowJson ? JSON.parse(row.rowJson) : null,
  };
}

export function listDistinctBrands() {
  return sqlite
    .prepare(`SELECT DISTINCT brand FROM device_price_catalog ORDER BY brand`)
    .all()
    .map((row) => row.brand);
}

export function listModelsForBrand(brand) {
  return sqlite
    .prepare(`
      SELECT
        series,
        model,
        storage,
        launch_year AS launchYear,
        cashify_price AS cashifyPrice
      FROM device_price_catalog
      WHERE brand = ?
      ORDER BY series, model, storage
    `)
    .all(brand);
}

function mapQuoteDeductionRule(row) {
  if (!row) return null;
  return {
    id: row.id,
    answerGroup: row.answerGroup,
    answerKey: row.answerKey,
    answerValue: row.answerValue,
    label: row.label,
    deductionType: row.deductionType,
    deductionValue: row.deductionValue,
    maxDeductionAmount: row.maxDeductionAmount,
    priority: row.priority,
    isActive: Boolean(row.isActive),
    appliesToBrand: row.appliesToBrand,
    appliesToModelId: row.appliesToModelId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

const quoteDeductionRuleSelect = `
  SELECT
    id,
    answer_group as answerGroup,
    answer_key as answerKey,
    answer_value as answerValue,
    label,
    deduction_type as deductionType,
    deduction_value as deductionValue,
    max_deduction_amount as maxDeductionAmount,
    priority,
    is_active as isActive,
    applies_to_brand as appliesToBrand,
    applies_to_model_id as appliesToModelId,
    created_by as createdBy,
    created_at as createdAt,
    updated_at as updatedAt
  FROM quote_deduction_rules
`;

export function listQuoteDeductionRules({ active, search } = {}) {
  const clauses = [];
  const params = [];

  if (typeof active === "boolean") {
    clauses.push("is_active = ?");
    params.push(active ? 1 : 0);
  }

  if (search) {
    clauses.push("(label LIKE ? OR answer_group LIKE ? OR answer_key LIKE ? OR answer_value LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  return sqlite
    .prepare(`${quoteDeductionRuleSelect} ${where} ORDER BY priority ASC, updated_at DESC`)
    .all(...params)
    .map(mapQuoteDeductionRule);
}

export function getQuoteDeductionRuleById(id) {
  const row = sqlite.prepare(`${quoteDeductionRuleSelect} WHERE id = ?`).get(id);
  return mapQuoteDeductionRule(row);
}

export function createQuoteDeductionRule(rule) {
  sqlite
    .prepare(
      `INSERT INTO quote_deduction_rules (
        id, answer_group, answer_key, answer_value, label, deduction_type,
        deduction_value, max_deduction_amount, priority, is_active,
        applies_to_brand, applies_to_model_id, created_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      rule.id,
      rule.answerGroup,
      rule.answerKey,
      rule.answerValue || null,
      rule.label,
      rule.deductionType,
      rule.deductionValue,
      rule.maxDeductionAmount ?? null,
      rule.priority,
      rule.isActive ? 1 : 0,
      rule.appliesToBrand || null,
      rule.appliesToModelId || null,
      rule.createdBy,
      rule.createdAt,
      rule.updatedAt,
    );

  return getQuoteDeductionRuleById(rule.id);
}

export function updateQuoteDeductionRule(rule) {
  sqlite
    .prepare(
      `UPDATE quote_deduction_rules
       SET answer_group = ?,
           answer_key = ?,
           answer_value = ?,
           label = ?,
           deduction_type = ?,
           deduction_value = ?,
           max_deduction_amount = ?,
           priority = ?,
           is_active = ?,
           applies_to_brand = ?,
           applies_to_model_id = ?,
           updated_at = ?
       WHERE id = ?`,
    )
    .run(
      rule.answerGroup,
      rule.answerKey,
      rule.answerValue || null,
      rule.label,
      rule.deductionType,
      rule.deductionValue,
      rule.maxDeductionAmount ?? null,
      rule.priority,
      rule.isActive ? 1 : 0,
      rule.appliesToBrand || null,
      rule.appliesToModelId || null,
      rule.updatedAt,
      rule.id,
    );

  return getQuoteDeductionRuleById(rule.id);
}

export function setQuoteDeductionRuleActive({ id, isActive, updatedAt }) {
  sqlite
    .prepare("UPDATE quote_deduction_rules SET is_active = ?, updated_at = ? WHERE id = ?")
    .run(isActive ? 1 : 0, updatedAt, id);
  return getQuoteDeductionRuleById(id);
}

export function listActiveQuoteDeductionRulesForModel({ brandSlug, modelId }) {
  return sqlite
    .prepare(
      `${quoteDeductionRuleSelect}
       WHERE is_active = 1
         AND (applies_to_brand IS NULL OR applies_to_brand = ?)
         AND (applies_to_model_id IS NULL OR applies_to_model_id = ?)
       ORDER BY priority ASC, label ASC, id ASC`,
    )
    .all(brandSlug || null, modelId || null)
    .map(mapQuoteDeductionRule);
}

export function createDevicePriceUploadHistory(rec) {
  sqlite
    .prepare(`
      INSERT INTO device_price_upload_history (
        id, file_name, uploaded_by, uploaded_at, status, deactivated_by, deactivated_at, deactivated_row_count, inserted_count, updated_count, total_processed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      rec.id,
      rec.fileName,
      rec.uploadedBy,
      rec.uploadedAt,
      rec.status || "ACTIVE",
      rec.deactivatedBy || null,
      rec.deactivatedAt || null,
      rec.deactivatedRowCount || 0,
      rec.insertedCount,
      rec.updatedCount,
      rec.totalProcessed,
    );
}

export function createDevicePriceUploadSnapshotRows(rows) {
  const upsertStmt = sqlite.prepare(`
    INSERT INTO device_price_upload_rows (
      upload_id, brand, series, model, storage, launch_year, cashify_price, row_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(upload_id, brand, series, model, storage, launch_year)
    DO UPDATE SET
      cashify_price = excluded.cashify_price,
      row_json = excluded.row_json,
      updated_at = excluded.updated_at
  `);

  const tx = sqlite.transaction((items) => {
    for (const row of items) {
      upsertStmt.run(
        row.uploadId,
        row.brand,
        row.series,
        row.model,
        row.storage,
        row.launchYear,
        row.cashifyPrice,
        row.rowJson,
        row.createdAt,
        row.updatedAt,
      );
    }
  });

  tx(rows);
}

export function listDevicePriceUploadSnapshotRows(uploadId) {
  return sqlite
    .prepare(`
      SELECT
        upload_id as uploadId,
        brand,
        series,
        model,
        storage,
        launch_year as launchYear,
        cashify_price as cashifyPrice,
        row_json as rowJson,
        created_at as createdAt,
        updated_at as updatedAt
      FROM device_price_upload_rows
      WHERE upload_id = ?
      ORDER BY id ASC
    `)
    .all(uploadId);
}

export function listDevicePriceUploadHistory() {
  return sqlite
    .prepare(`
      SELECT
        h.id,
        h.file_name as fileName,
        h.uploaded_by as uploadedBy,
        h.uploaded_at as uploadedAt,
        h.status,
        h.deactivated_by as deactivatedBy,
        h.deactivated_at as deactivatedAt,
        h.deactivated_row_count as deactivatedRowCount,
        h.inserted_count as insertedCount,
        h.updated_count as updatedCount,
        h.total_processed as totalProcessed,
        (
          SELECT COUNT(*)
          FROM device_price_catalog c
          WHERE c.source_upload_id = h.id
        ) as activeRowCount
      FROM device_price_upload_history h
      ORDER BY h.uploaded_at DESC
    `)
    .all();
}

export function getDevicePriceUploadHistoryById(uploadId) {
  return sqlite
    .prepare(`
      SELECT
        id,
        file_name as fileName,
        uploaded_by as uploadedBy,
        uploaded_at as uploadedAt,
        status,
        deactivated_by as deactivatedBy,
        deactivated_at as deactivatedAt,
        deactivated_row_count as deactivatedRowCount,
        inserted_count as insertedCount,
        updated_count as updatedCount,
        total_processed as totalProcessed
      FROM device_price_upload_history
      WHERE id = ?
    `)
    .get(uploadId);
}

export function deactivateDevicePriceUploadAndRows({ uploadId, deactivatedBy, deactivatedAt }) {
  const tx = sqlite.transaction((id) => {
    const rowDeleteResult = sqlite.prepare("DELETE FROM device_price_catalog WHERE source_upload_id = ?").run(id);
    const historyUpdateResult = sqlite
      .prepare(`
        UPDATE device_price_upload_history
        SET status = 'DEACTIVATED', deactivated_by = ?, deactivated_at = ?, deactivated_row_count = ?
        WHERE id = ?
      `)
      .run(deactivatedBy, deactivatedAt, rowDeleteResult.changes, id);

    return {
      deactivatedCatalogRows: rowDeleteResult.changes,
      deactivatedHistoryRows: historyUpdateResult.changes,
    };
  });

  return tx(uploadId);
}

export function activateDevicePriceUploadAndRows({ uploadId, sourceFileName }) {
  const tx = sqlite.transaction((id) => {
    const snapshotRows = listDevicePriceUploadSnapshotRows(id);
    if (snapshotRows.length === 0) {
      return {
        reactivatedCatalogRows: 0,
        reactivatedHistoryRows: 0,
      };
    }

    const now = new Date().toISOString();
    const catalogInput = snapshotRows.map((row) => ({
      brand: row.brand,
      series: row.series,
      model: row.model,
      storage: row.storage,
      launchYear: row.launchYear,
      cashifyPrice: row.cashifyPrice,
      rowJson: row.rowJson,
      sourceUploadId: id,
      sourceFileName: sourceFileName || null,
      createdAt: now,
      updatedAt: now,
    }));

    const upsertResult = upsertDevicePriceCatalogRows(catalogInput);
    const historyUpdateResult = sqlite
      .prepare(`
        UPDATE device_price_upload_history
        SET status = 'ACTIVE', deactivated_by = NULL, deactivated_at = NULL, deactivated_row_count = 0
        WHERE id = ?
      `)
      .run(id);

    return {
      reactivatedCatalogRows: upsertResult.totalProcessed,
      reactivatedHistoryRows: historyUpdateResult.changes,
    };
  });

  return tx(uploadId);
}

export function deleteDevicePriceUploadPermanently({ uploadId }) {
  const tx = sqlite.transaction((id) => {
    const catalogDeleteResult = sqlite
      .prepare("DELETE FROM device_price_catalog WHERE source_upload_id = ?")
      .run(id);
    const snapshotDeleteResult = sqlite
      .prepare("DELETE FROM device_price_upload_rows WHERE upload_id = ?")
      .run(id);
    const historyDeleteResult = sqlite
      .prepare("DELETE FROM device_price_upload_history WHERE id = ?")
      .run(id);

    return {
      deletedCatalogRows: catalogDeleteResult.changes,
      deletedSnapshotRows: snapshotDeleteResult.changes,
      deletedHistoryRows: historyDeleteResult.changes,
    };
  });

  return tx(uploadId);
}

export function ensurePartnerCoinWallet(partnerId, nowIso) {
  sqlite
    .prepare(`
      INSERT INTO partner_coin_wallets (partner_id, balance, updated_at)
      VALUES (?, 0, ?)
      ON CONFLICT(partner_id) DO NOTHING
    `)
    .run(partnerId, nowIso);
}

export function getPartnerCoinWallet(partnerId) {
  return sqlite
    .prepare(`
      SELECT
        partner_id as partnerId,
        balance,
        updated_at as updatedAt
      FROM partner_coin_wallets
      WHERE partner_id = ?
    `)
    .get(partnerId);
}

export function listPartnerCoinLedger(partnerId, limit = 20) {
  return sqlite
    .prepare(`
      SELECT
        id,
        partner_id as partnerId,
        txn_type as txnType,
        amount,
        method,
        reference,
        note,
        metadata_json as metadataJson,
        created_at as createdAt
      FROM partner_coin_ledger
      WHERE partner_id = ?
      ORDER BY created_at DESC
      LIMIT ?
    `)
    .all(partnerId, limit)
    .map((row) => ({
      ...row,
      metadata: row.metadataJson ? JSON.parse(row.metadataJson) : null,
    }));
}

function mapPartnerCoinRechargeRequestRow(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: row.metadataJson ? JSON.parse(row.metadataJson) : null,
  };
}

export function getPendingPartnerRechargeRequestByTxnRef(partnerId, upiTxnRef) {
  const row = sqlite
    .prepare(`
      SELECT
        id,
        partner_id as partnerId,
        amount,
        upi_txn_ref as upiTxnRef,
        upi_app as upiApp,
        status,
        requested_at as requestedAt,
        verified_at as verifiedAt,
        verified_by as verifiedBy,
        admin_note as adminNote,
        ledger_entry_id as ledgerEntryId,
        metadata_json as metadataJson
      FROM partner_coin_recharge_requests
      WHERE partner_id = ? AND upi_txn_ref = ? AND status = 'PENDING'
      ORDER BY requested_at DESC
      LIMIT 1
    `)
    .get(partnerId, upiTxnRef);

  return mapPartnerCoinRechargeRequestRow(row);
}

export function createPartnerCoinRechargeRequest({
  id,
  partnerId,
  amount,
  upiTxnRef,
  upiApp,
  status,
  requestedAt,
  metadataJson,
}) {
  sqlite
    .prepare(`
      INSERT INTO partner_coin_recharge_requests (
        id,
        partner_id,
        amount,
        upi_txn_ref,
        upi_app,
        status,
        requested_at,
        metadata_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      id,
      partnerId,
      amount,
      upiTxnRef,
      upiApp || null,
      status,
      requestedAt,
      metadataJson || null,
    );

  return getPartnerCoinRechargeRequestById(id);
}

export function getPartnerCoinRechargeRequestById(requestId) {
  const row = sqlite
    .prepare(`
      SELECT
        id,
        partner_id as partnerId,
        amount,
        upi_txn_ref as upiTxnRef,
        upi_app as upiApp,
        status,
        requested_at as requestedAt,
        verified_at as verifiedAt,
        verified_by as verifiedBy,
        admin_note as adminNote,
        ledger_entry_id as ledgerEntryId,
        metadata_json as metadataJson
      FROM partner_coin_recharge_requests
      WHERE id = ?
    `)
    .get(requestId);

  return mapPartnerCoinRechargeRequestRow(row);
}

export function listPartnerCoinRechargeRequests({ partnerId, status, limit = 30 }) {
  const clauses = [];
  const params = [];

  if (partnerId) {
    clauses.push("partner_id = ?");
    params.push(partnerId);
  }

  if (status) {
    clauses.push("status = ?");
    params.push(status);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const rows = sqlite
    .prepare(`
      SELECT
        id,
        partner_id as partnerId,
        amount,
        upi_txn_ref as upiTxnRef,
        upi_app as upiApp,
        status,
        requested_at as requestedAt,
        verified_at as verifiedAt,
        verified_by as verifiedBy,
        admin_note as adminNote,
        ledger_entry_id as ledgerEntryId,
        metadata_json as metadataJson
      FROM partner_coin_recharge_requests
      ${where}
      ORDER BY requested_at DESC
      LIMIT ?
    `)
    .all(...params, limit);

  return rows.map((row) => mapPartnerCoinRechargeRequestRow(row));
}

export function verifyPartnerCoinRechargeRequest({ requestId, action, verifiedBy, adminNote, verifiedAt, ledgerEntryId }) {
  const tx = sqlite.transaction((input) => {
    const existing = sqlite
      .prepare(`
        SELECT
          id,
          partner_id as partnerId,
          amount,
          upi_txn_ref as upiTxnRef,
          upi_app as upiApp,
          status,
          requested_at as requestedAt,
          verified_at as verifiedAt,
          verified_by as verifiedBy,
          admin_note as adminNote,
          ledger_entry_id as ledgerEntryId,
          metadata_json as metadataJson
        FROM partner_coin_recharge_requests
        WHERE id = ?
      `)
      .get(input.requestId);

    if (!existing) {
      return { result: "NOT_FOUND", request: null, wallet: null };
    }

    if (existing.status !== "PENDING") {
      return { result: "ALREADY_PROCESSED", request: mapPartnerCoinRechargeRequestRow(existing), wallet: getPartnerCoinWallet(existing.partnerId) };
    }

    if (input.action === "APPROVE") {
      ensurePartnerCoinWallet(existing.partnerId, input.verifiedAt);

      sqlite
        .prepare(`
          INSERT INTO partner_coin_ledger (
            id, partner_id, txn_type, amount, method, reference, note, metadata_json, created_at
          ) VALUES (?, ?, 'CREDIT', ?, 'UPI', ?, ?, ?, ?)
        `)
        .run(
          input.ledgerEntryId,
          existing.partnerId,
          existing.amount,
          existing.upiTxnRef,
          "Approved partner wallet recharge",
          JSON.stringify({ rechargeRequestId: existing.id, upiApp: existing.upiApp || null, verifiedBy: input.verifiedBy }),
          input.verifiedAt,
        );

      sqlite
        .prepare(`
          UPDATE partner_coin_wallets
          SET balance = balance + ?, updated_at = ?
          WHERE partner_id = ?
        `)
        .run(existing.amount, input.verifiedAt, existing.partnerId);

      sqlite
        .prepare(`
          UPDATE partner_coin_recharge_requests
          SET
            status = 'APPROVED',
            verified_at = ?,
            verified_by = ?,
            admin_note = ?,
            ledger_entry_id = ?
          WHERE id = ?
        `)
        .run(input.verifiedAt, input.verifiedBy, input.adminNote || "Approved by admin", input.ledgerEntryId, existing.id);
    } else {
      sqlite
        .prepare(`
          UPDATE partner_coin_recharge_requests
          SET
            status = 'REJECTED',
            verified_at = ?,
            verified_by = ?,
            admin_note = ?
          WHERE id = ?
        `)
        .run(input.verifiedAt, input.verifiedBy, input.adminNote || "Rejected by admin", existing.id);
    }

    return {
      result: "UPDATED",
      request: getPartnerCoinRechargeRequestById(existing.id),
      wallet: getPartnerCoinWallet(existing.partnerId),
    };
  });

  return tx({ requestId, action, verifiedBy, adminNote, verifiedAt, ledgerEntryId });
}

export function creditPartnerCoins({ id, partnerId, amount, method, reference, note, metadataJson, createdAt }) {
  const tx = sqlite.transaction((input) => {
    ensurePartnerCoinWallet(input.partnerId, input.createdAt);

    sqlite
      .prepare(`
        INSERT INTO partner_coin_ledger (
          id, partner_id, txn_type, amount, method, reference, note, metadata_json, created_at
        ) VALUES (?, ?, 'CREDIT', ?, ?, ?, ?, ?, ?)
      `)
      .run(
        input.id,
        input.partnerId,
        input.amount,
        input.method,
        input.reference || null,
        input.note || null,
        input.metadataJson || null,
        input.createdAt,
      );

    sqlite
      .prepare(`
        UPDATE partner_coin_wallets
        SET balance = balance + ?, updated_at = ?
        WHERE partner_id = ?
      `)
      .run(input.amount, input.createdAt, input.partnerId);

    return getPartnerCoinWallet(input.partnerId);
  });

  return tx({ id, partnerId, amount, method, reference, note, metadataJson, createdAt });
}
