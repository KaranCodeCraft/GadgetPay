import { prisma } from "./prisma.js";

// Helper functions for parsing and sanitizing
export function parseJsonColumn(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function sanitizePartnerOnsiteValidation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const { result, notes, ...sanitized } = value;
  return sanitized;
}

export function sanitizePartnerPaymentProof(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const { transactionRef, notes, ...sanitized } = value;
  return sanitized;
}

export function sanitizePartnerCompletionEvent(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const { remarks, ...sanitized } = value;
  if (sanitized.invoice?.payment && typeof sanitized.invoice.payment === "object" && !Array.isArray(sanitized.invoice.payment)) {
    const { transactionRef, ...payment } = sanitized.invoice.payment;
    return {
      ...sanitized,
      invoice: {
        ...sanitized.invoice,
        payment,
      },
    };
  }
  return sanitized;
}

export function mapMediaAsset(row) {
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

export function mapUserSellFlow(row) {
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

export function mapPartnerLeadUnlockOrder(row) {
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

export function mapPartnerLead(row) {
  if (!row) return null;
  const paymentProof = sanitizePartnerPaymentProof(parseJsonColumn(row.paymentProofJson, null));
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
    onsiteValidation: sanitizePartnerOnsiteValidation(parseJsonColumn(row.onsiteValidationJson, null)),
    onsiteValidatedAt: row.onsiteValidatedAt,
    onsiteValidatedBy: row.onsiteValidatedBy,
    paymentProof: paymentProof
      ? {
          ...paymentProof,
          mediaUrl: paymentProof.mediaAssetId ? `/api/v1/media/${paymentProof.mediaAssetId}` : paymentProof.mediaUrl || null,
        }
      : null,
    paymentSubmittedAt: row.paymentSubmittedAt,
    completionEvent: sanitizePartnerCompletionEvent(parseJsonColumn(row.completionEventJson, null)),
    completionEventAt: row.completionEventAt,
    unlockOrder: row.unlockOrder || null,
  };
}

export function mapPartnerLeadDispositionEvent(row) {
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

export function mapQuoteDeductionRule(row) {
  if (!row) return null;
  return {
    id: row.id,
    answerGroup: row.answerGroup,
    answerKey: row.answerKey,
    answerValue: row.answerValue,
    label: row.label,
    deductionType: row.deductionType,
    deductionValue: Number(row.deductionValue),
    maxDeductionAmount: row.maxDeductionAmount !== null && row.maxDeductionAmount !== undefined ? Number(row.maxDeductionAmount) : null,
    priority: row.priority,
    isActive: Boolean(row.isActive),
    appliesToBrand: row.appliesToBrand,
    appliesToModelId: row.appliesToModelId,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapPartnerCoinRechargeRequestRow(row) {
  if (!row) return null;
  return {
    ...row,
    metadata: row.metadataJson ? parseJsonColumn(row.metadataJson, null) : null,
  };
}

export async function attachPartnerUnlockOrder(lead, partnerId) {
  if (!lead || !partnerId) return lead;
  const unlockOrder = await getPartnerLeadUnlockOrderForPartner({ leadId: lead.id, partnerId });
  return {
    ...lead,
    unlockOrder,
  };
}

// Media Assets
export async function createMediaAsset(input) {
  const row = await prisma.mediaAsset.create({
    data: {
      id: input.id,
      tenantType: input.tenantType,
      tenantId: input.tenantId || null,
      ownerRole: input.ownerRole,
      ownerId: input.ownerId,
      entityType: input.entityType,
      entityId: input.entityId,
      slot: input.slot || null,
      originalFileName: input.originalFileName,
      storedFileName: input.storedFileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      relativePath: input.relativePath,
      storageProvider: input.storageProvider,
      status: input.status || "ACTIVE",
      checksum: input.checksum || null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      deletedAt: input.deletedAt || null,
    },
  });
  return mapMediaAsset(row);
}

export async function getMediaAssetById(id) {
  const row = await prisma.mediaAsset.findUnique({ where: { id } });
  return mapMediaAsset(row);
}

export async function listMediaAssetsForEntity({ entityType, entityId }) {
  const rows = await prisma.mediaAsset.findMany({
    where: { entityType, entityId, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapMediaAsset);
}

export async function markMediaAssetDeleted({ id, updatedAt, deletedAt }) {
  const row = await prisma.mediaAsset.update({
    where: { id },
    data: { status: "DELETED", updatedAt, deletedAt },
  });
  return mapMediaAsset(row);
}

// OTP Codes
export async function upsertOtpCode({ phone, otp, sentAt, expiresAt }) {
  await prisma.otpCode.upsert({
    where: { phone },
    update: { otp, sentAt, expiresAt },
    create: { phone, otp, sentAt, expiresAt },
  });
}

export async function getOtpCode(phone) {
  const row = await prisma.otpCode.findUnique({ where: { phone } });
  if (!row) return null;
  return {
    phone: row.phone,
    otp: row.otp,
    sentAt: row.sentAt,
    expiresAt: row.expiresAt,
  };
}

export async function deleteOtpCode(phone) {
  await prisma.otpCode.deleteMany({ where: { phone } });
}

// Partners
export async function upsertPartner(partner) {
  const row = await prisma.partner.upsert({
    where: { id: partner.id },
    update: { name: partner.name, updatedAt: partner.updatedAt },
    create: {
      id: partner.id,
      phone: partner.phone,
      name: partner.name,
      createdAt: partner.createdAt,
      updatedAt: partner.updatedAt,
    },
  });
  return getPartnerById(row.id);
}

export async function getPartnerById(id) {
  if (!id) return null;
  const row = await prisma.partner.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    status: row.status,
    statusUpdatedBy: row.statusUpdatedBy,
    statusUpdatedAt: row.statusUpdatedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPartnersForAdmin({ search, limit = 100 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
    ];
  }
  const rows = await prisma.partner.findMany({
    where,
    orderBy: { name: "asc" },
    take: safeLimit,
  });
  return rows.map((r) => ({
    id: r.id,
    phone: r.phone,
    name: r.name,
    status: r.status,
    statusUpdatedBy: r.statusUpdatedBy,
    statusUpdatedAt: r.statusUpdatedAt,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }));
}

export async function updatePartnerAccountStatus({ partnerId, status, updatedBy, updatedAt }) {
  try {
    const row = await prisma.partner.update({
      where: { id: partnerId },
      data: {
        status,
        statusUpdatedBy: updatedBy,
        statusUpdatedAt: updatedAt,
        updatedAt,
      },
    });
    return getPartnerById(row.id);
  } catch {
    return null;
  }
}

export async function listPartnersForAdminSearch({ search, pincode, includeUnmapped = false, limit = 20 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { phone: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
    ];
  }
  if (pincode) {
    if (includeUnmapped) {
      where.OR = [
        ...(where.OR || []),
        { scopes: { some: { pincode } } },
        { scopes: { none: {} } },
      ];
    } else {
      where.scopes = { some: { pincode } };
    }
  }

  const partners = await prisma.partner.findMany({
    where,
    include: {
      scopes: pincode ? { where: { pincode } } : true,
    },
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
  });

  return partners.map((p) => {
    const scope = p.scopes?.[0] || null;
    return {
      id: p.id,
      name: p.name,
      phone: p.phone,
      status: p.status,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      scopePincode: scope?.pincode || null,
      scopeActive: Boolean(scope?.isActive),
      lastAssignedAt: scope?.lastAssignedAt || null,
    };
  });
}

// Partner Pincode Scopes
export async function upsertPartnerPincodeScope({ id, partnerId, pincode, isActive = true, updatedBy, createdAt, updatedAt }) {
  await prisma.partnerPincodeScope.upsert({
    where: { partnerId_pincode: { partnerId, pincode } },
    update: {
      isActive: Boolean(isActive),
      updatedBy,
      updatedAt,
    },
    create: {
      id,
      partnerId,
      pincode,
      isActive: Boolean(isActive),
      updatedBy,
      createdAt,
      updatedAt,
    },
  });
  return getPartnerPincodeScope({ partnerId, pincode });
}

export async function getPartnerPincodeScope({ partnerId, pincode }) {
  const row = await prisma.partnerPincodeScope.findUnique({
    where: { partnerId_pincode: { partnerId, pincode } },
  });
  if (!row) return null;
  return {
    id: row.id,
    partnerId: row.partnerId,
    pincode: row.pincode,
    isActive: Boolean(row.isActive),
    lastAssignedAt: row.lastAssignedAt || null,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listPartnerPincodeScopes({ pincode, partnerId, activeOnly = false, limit = 100 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const where = {};
  if (pincode) where.pincode = pincode;
  if (partnerId) where.partnerId = partnerId;
  if (activeOnly) where.isActive = true;

  const rows = await prisma.partnerPincodeScope.findMany({
    where,
    include: { partner: true },
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
  });

  return rows.map((row) => ({
    id: row.id,
    partnerId: row.partnerId,
    pincode: row.pincode,
    isActive: Boolean(row.isActive),
    lastAssignedAt: row.lastAssignedAt || null,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    partnerName: row.partner?.name || null,
    partnerPhone: row.partner?.phone || null,
  }));
}

export async function listEligiblePartnersForPincode(pincode) {
  const rows = await prisma.partnerPincodeScope.findMany({
    where: {
      pincode,
      isActive: true,
      partner: { status: "ACTIVE" },
    },
    include: { partner: true },
    orderBy: [
      { lastAssignedAt: { sort: "asc", nulls: "first" } },
      { partnerId: "asc" },
    ],
  });

  return rows.map((row) => ({
    partnerId: row.partnerId,
    partnerName: row.partner?.name || null,
    partnerPhone: row.partner?.phone || null,
    lastAssignedAt: row.lastAssignedAt || null,
  }));
}

export async function partnerEligibleForPincode({ partnerId, pincode }) {
  const found = await prisma.partnerPincodeScope.findFirst({
    where: {
      partnerId,
      pincode,
      isActive: true,
      partner: { status: "ACTIVE" },
    },
  });
  return Boolean(found);
}

export async function touchPartnerPincodeAssignment({ partnerId, pincode, assignedAt, updatedBy }) {
  await prisma.partnerPincodeScope.updateMany({
    where: { partnerId, pincode },
    data: {
      lastAssignedAt: assignedAt,
      updatedBy,
      updatedAt: assignedAt,
    },
  });
}

export async function deactivatePartnerPincodeScope({ partnerId, pincode, updatedBy, updatedAt }) {
  const result = await prisma.partnerPincodeScope.updateMany({
    where: { partnerId, pincode },
    data: {
      isActive: false,
      updatedBy,
      updatedAt,
    },
  });
  return result.count > 0;
}

export async function listActivePartnerPincodes(partnerId) {
  const rows = await prisma.partnerPincodeScope.findMany({
    where: { partnerId, isActive: true },
    select: { pincode: true },
  });
  return rows.map((r) => r.pincode);
}

// Users
export async function upsertUser(user) {
  const row = await prisma.user.upsert({
    where: { phone: user.phone },
    update: { name: user.name, updatedAt: user.updatedAt },
    create: {
      id: user.id,
      phone: user.phone,
      name: user.name,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },
  });
  return getUserById(row.id);
}

export async function getUserById(id) {
  if (!id) return null;
  const row = await prisma.user.findUnique({ where: { id } });
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function getUserByPhone(phone) {
  if (!phone) return null;
  const row = await prisma.user.findUnique({ where: { phone } });
  if (!row) return null;
  return {
    id: row.id,
    phone: row.phone,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function updateUserProfile({ id, name, updatedAt }) {
  try {
    const row = await prisma.user.update({
      where: { id },
      data: { name, updatedAt },
    });
    return getUserById(row.id);
  } catch {
    return null;
  }
}

// Refresh Tokens
export async function saveRefreshToken(rec) {
  await prisma.refreshToken.create({
    data: {
      tokenId: rec.tokenId,
      subjectId: rec.subjectId,
      role: rec.role,
      createdAt: rec.createdAt,
    },
  });
}

export async function getRefreshToken(tokenId) {
  if (!tokenId) return null;
  const row = await prisma.refreshToken.findUnique({ where: { tokenId } });
  if (!row) return null;
  return {
    tokenId: row.tokenId,
    subjectId: row.subjectId,
    role: row.role,
    createdAt: row.createdAt,
  };
}

export async function revokeRefreshToken(tokenId) {
  const result = await prisma.refreshToken.deleteMany({ where: { tokenId } });
  return result.count > 0;
}

// User Account Deletion
export async function deleteUserAccount(userId) {
  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId } });
    if (!user) return null;

    const flows = await tx.userSellFlow.findMany({ where: { userId }, select: { id: true } });
    const flowIds = flows.map((f) => f.id);

    const leads = await tx.partnerLead.findMany({ where: { userId }, select: { id: true, paymentProofJson: true } });
    const leadIds = leads.map((l) => l.id);

    const paymentProofMediaIds = leads
      .map((l) => parseJsonColumn(l.paymentProofJson, null)?.mediaAssetId)
      .filter(Boolean);

    // Collect media paths to delete
    const mediaRows = await tx.mediaAsset.findMany({
      where: {
        OR: [
          { ownerRole: "user", ownerId: userId },
          { entityId: { in: [...leadIds, ...flowIds] } },
          { id: { in: paymentProofMediaIds } },
        ],
      },
      select: { relativePath: true },
    });
    const mediaRelativePaths = Array.from(new Set(mediaRows.map((m) => m.relativePath).filter(Boolean)));

    const deleted = {
      adminLeadAssignments: 0,
      leadEventOutbox: 0,
      partnerLeadDispositionEvents: 0,
      partnerLeadPaymentIntents: 0,
      partnerLeadUnlocks: 0,
      mediaAssets: 0,
      partnerLeads: 0,
      userSellFlows: 0,
      refreshTokens: 0,
      otpCodes: 0,
      users: 0,
    };

    if (leadIds.length > 0) {
      const d1 = await tx.adminLeadAssignment.deleteMany({ where: { leadId: { in: leadIds } } });
      deleted.adminLeadAssignments = d1.count;
      const d2 = await tx.leadEventOutbox.deleteMany({ where: { leadId: { in: leadIds } } });
      deleted.leadEventOutbox = d2.count;
      const d3 = await tx.partnerLeadDispositionEvent.deleteMany({ where: { leadId: { in: leadIds } } });
      deleted.partnerLeadDispositionEvents += d3.count;
      const d4 = await tx.partnerLeadPaymentIntent.deleteMany({ where: { leadId: { in: leadIds } } });
      deleted.partnerLeadPaymentIntents += d4.count;
      const d5 = await tx.partnerLeadUnlock.deleteMany({ where: { leadId: { in: leadIds } } });
      deleted.partnerLeadUnlocks += d5.count;
    }

    if (flowIds.length > 0) {
      const d6 = await tx.partnerLeadDispositionEvent.deleteMany({ where: { userSellFlowId: { in: flowIds } } });
      deleted.partnerLeadDispositionEvents += d6.count;
      const d7 = await tx.partnerLeadPaymentIntent.deleteMany({ where: { userSellFlowId: { in: flowIds } } });
      deleted.partnerLeadPaymentIntents += d7.count;
      const d8 = await tx.partnerLeadUnlock.deleteMany({ where: { userSellFlowId: { in: flowIds } } });
      deleted.partnerLeadUnlocks += d8.count;
    }

    const dMedia = await tx.mediaAsset.deleteMany({
      where: {
        OR: [
          { ownerRole: "user", ownerId: userId },
          { entityId: { in: [...leadIds, ...flowIds] } },
          { id: { in: paymentProofMediaIds } },
        ],
      },
    });
    deleted.mediaAssets = dMedia.count;

    const dLeads = await tx.partnerLead.deleteMany({ where: { userId } });
    deleted.partnerLeads = dLeads.count;

    const dFlows = await tx.userSellFlow.deleteMany({ where: { userId } });
    deleted.userSellFlows = dFlows.count;

    const dTokens = await tx.refreshToken.deleteMany({ where: { subjectId: userId, role: "user" } });
    deleted.refreshTokens = dTokens.count;

    const dOtp = await tx.otpCode.deleteMany({ where: { phone: { in: [`user:${user.phone}`, user.phone] } } });
    deleted.otpCodes = dOtp.count;

    const dUser = await tx.user.deleteMany({ where: { id: userId } });
    deleted.users = dUser.count;

    return { user, deleted, mediaRelativePaths };
  });
}

// User Sell Flows
export async function createUserSellFlow(row) {
  const created = await prisma.userSellFlow.create({
    data: {
      id: row.id,
      userId: row.userId,
      flowType: row.flowType || "sell-phone",
      status: row.status,
      selectedModelJson: row.selectedModelJson,
      deviceDetailsJson: row.deviceDetailsJson || null,
      pickupScheduleJson: row.pickupScheduleJson || null,
      quoteJson: row.quoteJson || null,
      flowJson: row.flowJson,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    },
  });
  return mapUserSellFlow(created);
}

export async function getUserSellFlowById({ id, userId }) {
  const where = { id };
  if (userId) where.userId = userId;
  const row = await prisma.userSellFlow.findFirst({ where });
  return mapUserSellFlow(row);
}

export async function updateUserSellFlow(row) {
  const updateData = {
    status: row.status,
    flowJson: row.flowJson,
    updatedAt: row.updatedAt,
  };
  if (row.selectedModelJson !== undefined) updateData.selectedModelJson = row.selectedModelJson;
  if (row.deviceDetailsJson !== undefined) updateData.deviceDetailsJson = row.deviceDetailsJson;
  if (row.pickupScheduleJson !== undefined) updateData.pickupScheduleJson = row.pickupScheduleJson;
  if (row.quoteJson !== undefined) updateData.quoteJson = row.quoteJson;

  const where = { id: row.id };
  if (row.userId) where.userId = row.userId;

  const updated = await prisma.userSellFlow.update({
    where,
    data: updateData,
  });
  return mapUserSellFlow(updated);
}

export async function cancelUserSellFlow({ id, userId, updatedAt }) {
  const existing = await getUserSellFlowById({ id, userId });
  if (!existing) return null;
  const flowJson = JSON.stringify({
    ...existing.flowJson,
    status: "CANCELLED",
    cancelledAt: updatedAt,
    updatedAt,
  });
  return await updateUserSellFlow({
    id,
    userId,
    status: "CANCELLED",
    flowJson,
    updatedAt,
  });
}

export async function expireUserSellFlow({ id, userId, updatedAt, reason }) {
  const existing = await getUserSellFlowById({ id, userId });
  if (!existing) return null;
  const flowJson = JSON.stringify({
    ...existing.flowJson,
    status: "CANCELLED",
    cancellationReason: reason,
    expiredAt: updatedAt,
    updatedAt,
  });
  return await updateUserSellFlow({
    id,
    userId,
    status: "CANCELLED",
    flowJson,
    updatedAt,
  });
}

export async function listUserSellFlows({ userId, status, limit = 50 }) {
  const where = {};
  if (userId) where.userId = userId;
  if (status) where.status = status;
  const rows = await prisma.userSellFlow.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });
  return rows.map(mapUserSellFlow);
}

// Partner Leads
export async function upsertPartnerLeadFromUserFlow(lead) {
  const existing = await prisma.partnerLead.findUnique({
    where: { userSellFlowId: lead.userSellFlowId },
  });

  const preserveStatus =
    existing &&
    ["CLAIMED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(existing.status) &&
    lead.status === "AVAILABLE";
  const targetStatus = preserveStatus ? existing.status : lead.status;

  const data = {
    id: lead.id,
    userSellFlowId: lead.userSellFlowId,
    userId: lead.userId,
    leadType: lead.leadType,
    status: targetStatus,
    partnerId: lead.partnerId || null,
    pincode: lead.pincode,
    city: lead.city || null,
    sellerName: lead.sellerName || null,
    sellerPhone: lead.sellerPhone || null,
    addressLine: lead.addressLine || null,
    landmark: lead.landmark || null,
    selectedModelJson: lead.selectedModelJson,
    deviceDetailsJson: lead.deviceDetailsJson || null,
    quoteJson: lead.quoteJson || null,
    pickupScheduleJson: lead.pickupScheduleJson || null,
    flowSnapshotJson: lead.flowSnapshotJson,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt,
  };

  if (existing) {
    await prisma.partnerLead.update({
      where: { userSellFlowId: lead.userSellFlowId },
      data: {
        leadType: lead.leadType,
        status: targetStatus,
        pincode: lead.pincode,
        city: lead.city || null,
        sellerName: lead.sellerName || null,
        sellerPhone: lead.sellerPhone || null,
        addressLine: lead.addressLine || null,
        landmark: lead.landmark || null,
        selectedModelJson: lead.selectedModelJson,
        deviceDetailsJson: lead.deviceDetailsJson || null,
        quoteJson: lead.quoteJson || null,
        pickupScheduleJson: lead.pickupScheduleJson || null,
        flowSnapshotJson: lead.flowSnapshotJson,
        updatedAt: lead.updatedAt,
      },
    });
  } else {
    await prisma.partnerLead.create({ data });
  }

  return await getPartnerLeadByFlowId(lead.userSellFlowId);
}

export async function getPartnerLeadByFlowId(userSellFlowId) {
  if (!userSellFlowId) return null;
  const row = await prisma.partnerLead.findUnique({
    where: { userSellFlowId },
  });
  return mapPartnerLead(row);
}

export async function getPartnerLeadById(id, options = {}) {
  if (!id) return null;
  const row = await prisma.partnerLead.findUnique({
    where: { id },
  });
  const mapped = mapPartnerLead(row);
  return await attachPartnerUnlockOrder(mapped, options.viewerPartnerId);
}

export async function listPartnerLeadsForScope({
  pincode,
  pincodes,
  leadType,
  status,
  partnerId,
  viewerPartnerId,
  date,
  timeSlot,
  limit = 50,
}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const where = {
    status: { not: "CANCELLED" },
    leadType,
  };

  if (Array.isArray(pincodes) && pincodes.length > 0) {
    where.pincode = { in: pincodes };
  } else if (pincode) {
    where.pincode = pincode;
  }

  if (status) {
    where.status = status;
  }

  if (partnerId) {
    where.OR = [{ partnerId: null }, { partnerId }];
  }

  const rows = await prisma.partnerLead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
  });

  const mapped = [];
  for (const row of rows) {
    const lead = await attachPartnerUnlockOrder(mapPartnerLead(row), viewerPartnerId);
    if (date) {
      const primaryDate = lead.pickupSchedule?.primaryDate;
      if (!primaryDate || primaryDate.slice(0, 10) !== date) continue;
    }
    if (timeSlot && timeSlot !== "All" && lead.pickupSchedule?.primaryTime !== timeSlot) {
      continue;
    }
    mapped.push(lead);
  }

  return mapped;
}

export async function listPartnerLeadsForPartner({ partnerId, status, limit = 50 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const where = {
    partnerId,
    status: { not: "CANCELLED" },
  };
  if (status) where.status = status;

  const rows = await prisma.partnerLead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
  });

  const mapped = [];
  for (const row of rows) {
    mapped.push(await attachPartnerUnlockOrder(mapPartnerLead(row), partnerId));
  }
  return mapped;
}

export async function claimPartnerLead({ id, partnerId, updatedAt }) {
  const result = await prisma.partnerLead.updateMany({
    where: {
      id,
      status: "AVAILABLE",
      partnerId: null,
    },
    data: {
      partnerId,
      status: "CLAIMED",
      claimedAt: updatedAt,
      updatedAt,
    },
  });

  return result.count > 0 ? await getPartnerLeadById(id) : null;
}

export async function updatePartnerLeadWorkflowStatus({ id, partnerId, status, rejectionReason, updatedAt }) {
  const lead = await prisma.partnerLead.findFirst({ where: { id, partnerId } });
  if (!lead) return null;

  const updateData = {
    status,
    rejectionReason: rejectionReason || null,
    updatedAt,
  };
  if (status === "COMPLETED") updateData.completedAt = updatedAt;
  if (["REJECTED", "CANCELLED"].includes(status)) updateData.cancelledAt = updatedAt;

  await prisma.partnerLead.update({
    where: { id },
    data: updateData,
  });

  return await getPartnerLeadById(id);
}

export async function releasePartnerLeadToBucket({ id, partnerId, updatedAt }) {
  await prisma.partnerLead.updateMany({
    where: {
      id,
      partnerId,
      status: { in: ["CLAIMED", "ACCEPTED", "IN_PROGRESS"] },
    },
    data: {
      partnerId: null,
      status: "AVAILABLE",
      rejectionReason: null,
      claimedAt: null,
      cancelledAt: null,
      pickupStartedAt: null,
      callStatus: null,
      callAttemptCount: 0,
      lastCalledAt: null,
      callHistoryJson: null,
      updatedAt,
    },
  });

  return await getPartnerLeadById(id);
}

export async function getPartnerLeadUnlockOrderForPartner({ leadId, partnerId }) {
  const row = await prisma.partnerLeadPaymentIntent.findFirst({
    where: { leadId, partnerId },
    orderBy: { createdAt: "desc" },
  });
  return mapPartnerLeadUnlockOrder(row);
}

export async function updatePartnerLeadReschedule({ id, partnerId, pickupScheduleJson, updatedAt }) {
  const result = await prisma.partnerLead.updateMany({
    where: {
      id,
      partnerId,
      status: { in: ["ACCEPTED", "IN_PROGRESS"] },
    },
    data: {
      pickupScheduleJson,
      callAttemptCount: 0,
      callStatus: "RESCHEDULE_REQUESTED",
      updatedAt,
    },
  });

  if (result.count === 0) return null;

  const lead = await getPartnerLeadById(id);
  if (lead?.userSellFlowId) {
    await prisma.userSellFlow.update({
      where: { id: lead.userSellFlowId },
      data: { pickupScheduleJson, updatedAt },
    });
  }
  return lead;
}

export async function expireStalePartnerLeadUnlockIntents(now) {
  await prisma.partnerLeadPaymentIntent.updateMany({
    where: {
      status: "PENDING_PAYMENT",
      expiresAt: { lt: now },
    },
    data: {
      status: "EXPIRED",
      adminNote: "Payment window expired",
    },
  });
}

export async function getPartnerLeadUnlockIntentById({ intentId, partnerId, now }) {
  if (now) await expireStalePartnerLeadUnlockIntents(now);
  const where = { id: intentId };
  if (partnerId) where.partnerId = partnerId;
  const row = await prisma.partnerLeadPaymentIntent.findFirst({ where });
  return mapPartnerLeadUnlockOrder(row);
}

export async function createPartnerLeadUnlockIntent({ leadId, partnerId, unlockPrice, intentId, now, expiresAt }) {
  return await prisma.$transaction(async (tx) => {
    await tx.partnerLeadPaymentIntent.updateMany({
      where: { status: "PENDING_PAYMENT", expiresAt: { lt: now } },
      data: { status: "EXPIRED", adminNote: "Payment window expired" },
    });

    const rawLead = await tx.partnerLead.findUnique({ where: { id: leadId } });
    const existingLead = mapPartnerLead(rawLead);
    if (!existingLead) {
      return { result: "NOT_FOUND", lead: null, intent: null };
    }

    if (existingLead.partnerId && existingLead.partnerId !== partnerId) {
      return { result: "OWNED_BY_OTHER", lead: existingLead, intent: null };
    }

    const activeReservationRaw = await tx.partnerLeadPaymentIntent.findFirst({
      where: {
        leadId,
        partnerId: { not: partnerId },
        status: { in: ["PENDING_PAYMENT", "SCREENSHOT_SENT"] },
      },
      orderBy: { createdAt: "desc" },
    });
    const activeReservation = mapPartnerLeadUnlockOrder(activeReservationRaw);
    if (activeReservation) {
      return { result: "LOCKED_BY_OTHER", lead: existingLead, intent: activeReservation };
    }

    const existingUnlockRaw = await tx.partnerLeadPaymentIntent.findFirst({
      where: {
        leadId,
        partnerId,
        status: { in: ["PENDING_PAYMENT", "SCREENSHOT_SENT", "APPROVED"] },
      },
      orderBy: { createdAt: "desc" },
    });
    const intent = mapPartnerLeadUnlockOrder(existingUnlockRaw);
    if (intent) {
      return {
        result: intent.status === "APPROVED" ? "ALREADY_APPROVED" : "EXISTING_INTENT",
        lead: await attachPartnerUnlockOrder(await getPartnerLeadById(leadId), partnerId),
        intent,
      };
    }

    if (existingLead.partnerId === partnerId && ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(existingLead.status)) {
      return {
        result: "ALREADY_APPROVED",
        lead: await attachPartnerUnlockOrder(existingLead, partnerId),
        intent: await getPartnerLeadUnlockOrderForPartner({ leadId: existingLead.id, partnerId }),
      };
    }

    if (["CANCELLED", "REJECTED", "COMPLETED"].includes(existingLead.status)) {
      return { result: "INVALID_STATUS", lead: existingLead, intent: null };
    }

    const metadata = {
      unlockOrderId: intentId,
      leadId: existingLead.id,
      partnerId,
      userSellFlowId: existingLead.userSellFlowId,
      quoteSellingPrice: existingLead.quote?.sellingPrice ?? null,
    };

    await tx.partnerLeadPaymentIntent.create({
      data: {
        id: intentId,
        leadId: existingLead.id,
        partnerId,
        userSellFlowId: existingLead.userSellFlowId,
        unlockPrice,
        paymentMethod: "UPI_QR",
        status: "PENDING_PAYMENT",
        screenshotStatus: "NOT_SENT",
        metadataJson: JSON.stringify(metadata),
        createdAt: now,
        expiresAt,
      },
    });

    const lead = await attachPartnerUnlockOrder(await getPartnerLeadById(existingLead.id), partnerId);
    const finalIntent = await getPartnerLeadUnlockOrderForPartner({ leadId: existingLead.id, partnerId });
    return {
      result: "CREATED",
      lead,
      intent: finalIntent,
    };
  });
}

export async function markPartnerLeadUnlockScreenshotSent({ intentId, partnerId, now }) {
  if (now) await expireStalePartnerLeadUnlockIntents(now);
  await prisma.partnerLeadPaymentIntent.updateMany({
    where: { id: intentId, partnerId, status: "PENDING_PAYMENT" },
    data: { status: "SCREENSHOT_SENT", screenshotStatus: "SENT" },
  });
  return await getPartnerLeadUnlockIntentById({ intentId, partnerId });
}

export async function listPartnerLeadUnlockIntentsForAdmin({ status, partnerId, limit = 100, now }) {
  if (now) await expireStalePartnerLeadUnlockIntents(now);
  const where = {};
  if (status) where.status = status;
  if (partnerId) where.partnerId = partnerId;
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 200);

  const rows = await prisma.partnerLeadPaymentIntent.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });

  const list = [];
  for (const row of rows) {
    const intent = mapPartnerLeadUnlockOrder(row);
    const lead = await getPartnerLeadById(intent.leadId);
    list.push({ ...intent, lead });
  }
  return list;
}

export async function verifyPartnerLeadUnlockIntent({ intentId, action, verifiedBy, adminNote, verifiedAt }) {
  return await prisma.$transaction(async (tx) => {
    await tx.partnerLeadPaymentIntent.updateMany({
      where: { status: "PENDING_PAYMENT", expiresAt: { lt: verifiedAt } },
      data: { status: "EXPIRED", adminNote: "Payment window expired" },
    });

    const rawIntent = await tx.partnerLeadPaymentIntent.findUnique({ where: { id: intentId } });
    const intent = mapPartnerLeadUnlockOrder(rawIntent);
    if (!intent) return { result: "NOT_FOUND", intent: null, lead: null };
    if (!["PENDING_PAYMENT", "SCREENSHOT_SENT"].includes(intent.status)) {
      const lead = await getPartnerLeadById(intent.leadId, { viewerPartnerId: intent.partnerId });
      return { result: "ALREADY_PROCESSED", intent, lead };
    }

    const existingLead = await getPartnerLeadById(intent.leadId);
    if (!existingLead) return { result: "LEAD_NOT_FOUND", intent, lead: null };

    if (action === "REJECT") {
      await tx.partnerLeadPaymentIntent.update({
        where: { id: intentId },
        data: { status: "REJECTED", rejectedAt: verifiedAt, adminNote: adminNote || "Rejected by admin" },
      });
      return {
        result: "REJECTED",
        intent: await getPartnerLeadUnlockIntentById({ intentId: intent.id }),
        lead: existingLead,
      };
    }

    if (existingLead.partnerId && existingLead.partnerId !== intent.partnerId) {
      return { result: "OWNED_BY_OTHER", intent, lead: existingLead };
    }

    const claimResult = await tx.partnerLead.updateMany({
      where: {
        id: intent.leadId,
        OR: [{ partnerId: null }, { partnerId: intent.partnerId }],
        status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
      },
      data: {
        partnerId: intent.partnerId,
        status: existingLead.status === "AVAILABLE" ? "CLAIMED" : existingLead.status,
        claimedAt: existingLead.claimedAt || verifiedAt,
        updatedAt: verifiedAt,
      },
    });

    if (claimResult.count === 0) {
      return {
        result: "OWNED_BY_OTHER",
        intent,
        lead: (await getPartnerLeadById(intent.leadId)) || existingLead,
      };
    }

    await tx.partnerLeadPaymentIntent.update({
      where: { id: intent.id },
      data: {
        status: "APPROVED",
        approvedBy: verifiedBy,
        approvedAt: verifiedAt,
        adminNote: adminNote || "Approved by admin",
      },
    });

    return {
      result: "APPROVED",
      intent: await getPartnerLeadUnlockIntentById({ intentId: intent.id }),
      lead: await getPartnerLeadById(intent.leadId, { viewerPartnerId: intent.partnerId }),
      fromStatus: existingLead.status,
    };
  });
}

export async function closePartnerLeadUnlockOrder({ leadId, partnerId, closedAt }) {
  await prisma.partnerLeadPaymentIntent.updateMany({
    where: { leadId, partnerId, status: "APPROVED" },
    data: { status: "CLOSED", closedAt },
  });
  return await getPartnerLeadUnlockOrderForPartner({ leadId, partnerId });
}

export async function setPartnerLeadPickupStartedAt({ id, partnerId, pickupStartedAt, updatedAt }) {
  const lead = await prisma.partnerLead.findFirst({ where: { id, partnerId } });
  if (lead) {
    await prisma.partnerLead.update({
      where: { id },
      data: {
        pickupStartedAt: lead.pickupStartedAt || pickupStartedAt,
        updatedAt,
      },
    });
  }
  return await getPartnerLeadById(id);
}

export async function markPartnerLeadCallStatus({ id, partnerId, callStatus, note, calledAt, updatedAt }) {
  const existing = await getPartnerLeadById(id);
  if (!existing || existing.partnerId !== partnerId) return null;

  const history = Array.isArray(existing.callHistory) ? existing.callHistory : [];
  history.push({
    status: callStatus,
    note: note || null,
    calledAt,
    actorId: partnerId,
  });

  await prisma.partnerLead.update({
    where: { id },
    data: {
      callStatus,
      callAttemptCount: (existing.callAttemptCount || 0) + 1,
      lastCalledAt: calledAt,
      callHistoryJson: JSON.stringify(history),
      updatedAt,
    },
  });

  return await getPartnerLeadById(id);
}

export async function listPartnerActivePickups({ partnerId, pincode, limit = 20 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const where = {
    partnerId,
    OR: [
      { status: { in: ["ACCEPTED", "IN_PROGRESS"] } },
      {
        status: "COMPLETED",
        OR: [{ completionEventJson: null }, { paymentProofJson: null }],
      },
    ],
  };
  if (pincode) where.pincode = pincode;

  const rows = await prisma.partnerLead.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: safeLimit,
  });
  return rows.map(mapPartnerLead);
}

export async function savePartnerLeadOnsiteValidation({
  id,
  partnerId,
  onsiteValidationJson,
  onsiteValidatedAt,
  onsiteValidatedBy,
  updatedAt,
}) {
  await prisma.partnerLead.updateMany({
    where: { id, partnerId },
    data: {
      onsiteValidationJson,
      onsiteValidatedAt,
      onsiteValidatedBy,
      updatedAt,
    },
  });
  return await getPartnerLeadById(id);
}

export async function savePartnerLeadPaymentProofMetadata({
  id,
  partnerId,
  paymentProofJson,
  paymentSubmittedAt,
  updatedAt,
}) {
  await prisma.partnerLead.updateMany({
    where: { id, partnerId },
    data: {
      paymentProofJson,
      paymentSubmittedAt,
      updatedAt,
    },
  });
  return await getPartnerLeadById(id);
}

export async function savePartnerLeadCompletionEvent({
  id,
  partnerId,
  completionEventJson,
  completionEventAt,
  updatedAt,
}) {
  await prisma.partnerLead.updateMany({
    where: { id, partnerId },
    data: {
      completionEventJson,
      completionEventAt,
      updatedAt,
    },
  });
  return await getPartnerLeadById(id);
}

export async function markPartnerLeadCancelledForFlow({ userSellFlowId, updatedAt }) {
  await prisma.partnerLead.updateMany({
    where: { userSellFlowId },
    data: { status: "CANCELLED", cancelledAt: updatedAt, updatedAt },
  });
  return await getPartnerLeadByFlowId(userSellFlowId);
}

export async function markPartnerLeadExpiredForFlow({ userSellFlowId, updatedAt, reason }) {
  const result = await prisma.partnerLead.updateMany({
    where: {
      userSellFlowId,
      leadType: "SERVICE_LEAD",
      status: { in: ["AVAILABLE", "CLAIMED"] },
    },
    data: {
      status: "CANCELLED",
      cancelledAt: updatedAt,
      rejectionReason: reason,
      updatedAt,
    },
  });
  return result.count > 0 ? await getPartnerLeadByFlowId(userSellFlowId) : null;
}

export async function appendPartnerLeadDispositionEvent(input) {
  await prisma.partnerLeadDispositionEvent.create({
    data: {
      id: input.id,
      leadId: input.leadId,
      userSellFlowId: input.userSellFlowId,
      partnerId: input.partnerId || null,
      fromStatus: input.fromStatus || null,
      toStatus: input.toStatus,
      dispositionKey: input.dispositionKey,
      note: input.note || null,
      actorRole: input.actorRole,
      actorId: input.actorId,
      createdAt: input.createdAt,
    },
  });
}

export async function enqueueLeadEventOutbox({ id, eventType, leadId, payloadJson, occurredAt }) {
  await prisma.leadEventOutbox.create({
    data: {
      id,
      eventType,
      leadId,
      payloadJson,
      occurredAt,
      deliveryStatus: "PENDING",
      retryCount: 0,
    },
  });
}

export async function getAdminOverviewMetrics({ fromDate, toDate, pincode, partnerId, leadType }) {
  const where = {};
  if (fromDate || toDate) {
    where.updatedAt = {};
    if (fromDate) where.updatedAt.gte = fromDate;
    if (toDate) where.updatedAt.lte = toDate;
  }
  if (pincode) where.pincode = pincode;
  if (partnerId) where.partnerId = partnerId;
  if (leadType) where.leadType = leadType;

  const leads = await prisma.partnerLead.findMany({
    where,
    select: {
      status: true,
      createdAt: true,
      partnerId: true,
      completionEventJson: true,
      quoteJson: true,
    },
  });

  let inProgressPickups = 0;
  let completedLeads = 0;
  let monthlyPayout = 0;
  const activePartnersSet = new Set();
  const weeklyTrendMap = new Map();

  for (const l of leads) {
    if (["ACCEPTED", "IN_PROGRESS"].includes(l.status)) inProgressPickups += 1;
    if (l.status === "COMPLETED") {
      completedLeads += 1;
      const completion = parseJsonColumn(l.completionEventJson, {});
      const quote = parseJsonColumn(l.quoteJson, {});
      const finalAmt = Number(completion?.finalAmount ?? quote?.sellingPrice ?? 0);
      if (Number.isFinite(finalAmt)) monthlyPayout += finalAmt;
    }
    if (l.partnerId) activePartnersSet.add(l.partnerId);

    const dateLabel = l.createdAt ? l.createdAt.slice(0, 10) : "";
    if (dateLabel) {
      weeklyTrendMap.set(dateLabel, (weeklyTrendMap.get(dateLabel) || 0) + 1);
    }
  }

  const totalLeads = leads.length;
  const weeklyTrend = Array.from(weeklyTrendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([label, value]) => ({ label, value }));

  return {
    totalLeads,
    inProgressPickups,
    completedLeads,
    conversionRate: totalLeads > 0 ? Number(((completedLeads / totalLeads) * 100).toFixed(2)) : 0,
    weeklyTrend,
    monthlyPayout: Math.round(monthlyPayout),
    activePartners: activePartnersSet.size,
  };
}

export async function getAdminLeadAssignmentMetrics({ fromDate, toDate, pincode, partnerId, leadType }) {
  const where = {};
  if (fromDate || toDate) {
    where.updatedAt = {};
    if (fromDate) where.updatedAt.gte = fromDate;
    if (toDate) where.updatedAt.lte = toDate;
  }
  if (pincode) where.pincode = pincode;
  if (partnerId) where.partnerId = partnerId;
  if (leadType) where.leadType = leadType;

  const leads = await prisma.partnerLead.findMany({
    where,
    select: { status: true, partnerId: true },
  });

  let unassigned = 0;
  let assigned = 0;
  let claimed = 0;
  for (const l of leads) {
    if (!l.partnerId && l.status === "AVAILABLE") unassigned += 1;
    if (l.partnerId) assigned += 1;
    if (l.status === "CLAIMED") claimed += 1;
  }

  const assignmentWhere = {};
  if (fromDate || toDate) {
    assignmentWhere.createdAt = {};
    if (fromDate) assignmentWhere.createdAt.gte = fromDate;
    if (toDate) assignmentWhere.createdAt.lte = toDate;
  }
  if (partnerId) assignmentWhere.assignedPartnerId = partnerId;
  if (pincode || leadType) {
    assignmentWhere.lead = {};
    if (pincode) assignmentWhere.lead.pincode = pincode;
    if (leadType) assignmentWhere.lead.leadType = leadType;
  }

  const assignments = await prisma.adminLeadAssignment.findMany({
    where: assignmentWhere,
    select: { assignedPartnerId: true },
  });

  const manualPartners = new Set(assignments.map((a) => a.assignedPartnerId)).size;

  return {
    assigned,
    claimed,
    unassigned,
    manualAssigned: assignments.length,
    manualPartners,
  };
}

export async function assignAdminLead({ leadId, partnerId, adminId, assignmentMode = "MANUAL", note = null, createdAt }) {
  return await prisma.$transaction(async (tx) => {
    const rawLead = await tx.partnerLead.findUnique({ where: { id: leadId } });
    const lead = mapPartnerLead(rawLead);
    if (!lead) return { result: "NOT_FOUND", lead: null, assignment: null };
    if (["COMPLETED", "REJECTED", "CANCELLED"].includes(lead.status)) {
      return { result: "TERMINAL", lead, assignment: null };
    }

    await tx.partnerLead.update({
      where: { id: leadId },
      data: {
        partnerId,
        status: lead.status === "AVAILABLE" ? "CLAIMED" : lead.status,
        claimedAt: lead.claimedAt || createdAt,
        updatedAt: createdAt,
      },
    });

    const assignmentId = `admin-assign-${leadId}-${Date.now()}`;
    await tx.adminLeadAssignment.create({
      data: {
        id: assignmentId,
        leadId,
        assignedPartnerId: partnerId,
        assignedByAdminId: adminId,
        assignmentMode,
        note,
        createdAt,
        updatedAt: createdAt,
      },
    });

    const updatedLead = await getPartnerLeadById(leadId);
    return {
      result: "UPDATED",
      lead: updatedLead,
      assignment: {
        id: assignmentId,
        leadId,
        partnerId,
        adminId,
        assignmentMode,
        note,
        createdAt,
      },
      previousStatus: lead.status,
    };
  });
}

export async function closeAdminLead({ leadId, closedBy, closedAt }) {
  const lead = await getPartnerLeadById(leadId);
  if (!lead) return { result: "NOT_FOUND", lead: null, previousStatus: null };
  if (["COMPLETED", "REJECTED", "CANCELLED"].includes(lead.status)) {
    return { result: "TERMINAL", lead, previousStatus: lead.status };
  }

  const result = await prisma.partnerLead.updateMany({
    where: {
      id: leadId,
      status: { notIn: ["COMPLETED", "REJECTED", "CANCELLED"] },
    },
    data: {
      status: "CANCELLED",
      cancelledAt: closedAt,
      updatedAt: closedAt,
    },
  });

  return {
    result: result.count > 0 ? "UPDATED" : "TERMINAL",
    lead: await getPartnerLeadById(leadId),
    previousStatus: lead.status,
    closedBy,
  };
}

export async function assignAdminLeadsBulk({ leadIds, partnerId, adminId, assignmentMode = "MANUAL", note = null, createdAt }) {
  const uniqueLeadIds = Array.from(new Set(leadIds));
  const results = [];
  for (const leadId of uniqueLeadIds) {
    const res = await assignAdminLead({
      leadId,
      partnerId,
      adminId,
      assignmentMode,
      note,
      createdAt,
    });
    results.push({
      leadId,
      result: res.result,
      lead: res.lead,
      assignment: res.assignment,
      previousStatus: res.previousStatus || null,
    });
  }
  return results;
}

export async function autoAssignLeadByPincodeRoundRobin({ leadId, adminId, note = null, createdAt }) {
  const lead = await getPartnerLeadById(leadId);
  if (!lead) return { result: "NOT_FOUND", lead: null, assignment: null, partnerCandidates: [] };
  if (lead.partnerId) {
    return { result: "ALREADY_ASSIGNED", lead, assignment: null, partnerCandidates: [] };
  }
  if (["COMPLETED", "REJECTED", "CANCELLED"].includes(lead.status)) {
    return { result: "TERMINAL", lead, assignment: null, partnerCandidates: [] };
  }

  const candidates = await listEligiblePartnersForPincode(lead.pincode);
  if (candidates.length === 0) {
    return { result: "NO_ELIGIBLE_PARTNER", lead, assignment: null, partnerCandidates: [] };
  }

  const selected = candidates[0];
  const assignResult = await assignAdminLead({
    leadId,
    partnerId: selected.partnerId,
    adminId,
    assignmentMode: "AUTO",
    note,
    createdAt,
  });

  if (assignResult.result !== "UPDATED") {
    return { ...assignResult, partnerCandidates: candidates };
  }

  await touchPartnerPincodeAssignment({
    partnerId: selected.partnerId,
    pincode: lead.pincode,
    assignedAt: createdAt,
    updatedBy: adminId,
  });

  return {
    result: "UPDATED",
    lead: assignResult.lead,
    assignment: assignResult.assignment,
    previousStatus: assignResult.previousStatus || null,
    selectedPartner: selected,
    partnerCandidates: candidates,
  };
}

export async function listPendingLeadEventOutbox(limit = 200) {
  const safeLimit = Math.min(Math.max(Number(limit) || 200, 1), 1000);
  const now = new Date().toISOString();
  const rows = await prisma.leadEventOutbox.findMany({
    where: {
      deliveryStatus: "PENDING",
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: now } }],
    },
    orderBy: { occurredAt: "asc" },
    take: safeLimit,
  });

  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    leadId: r.leadId,
    payloadJson: r.payloadJson,
    occurredAt: r.occurredAt,
    deliveryStatus: r.deliveryStatus,
    retryCount: r.retryCount,
    nextRetryAt: r.nextRetryAt,
    lastError: r.lastError,
    payload: r.payloadJson ? parseJsonColumn(r.payloadJson, {}) : {},
  }));
}

export async function listAllLeadEventOutbox(limit = 100000) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100000, 1), 1000000);
  const rows = await prisma.leadEventOutbox.findMany({
    orderBy: { occurredAt: "asc" },
    take: safeLimit,
  });
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    leadId: r.leadId,
    payloadJson: r.payloadJson,
    occurredAt: r.occurredAt,
    deliveryStatus: r.deliveryStatus,
    retryCount: r.retryCount,
    nextRetryAt: r.nextRetryAt,
    lastError: r.lastError,
    payload: r.payloadJson ? parseJsonColumn(r.payloadJson, {}) : {},
  }));
}

export async function markLeadEventOutboxProcessed(id) {
  await prisma.leadEventOutbox.update({
    where: { id },
    data: { deliveryStatus: "PROCESSED", lastError: null },
  });
}

export async function markLeadEventOutboxFailed(id, errorMessage, retryDelaySeconds = 10) {
  const nextRetry = new Date(Date.now() + Math.max(1, retryDelaySeconds) * 1000).toISOString();
  await prisma.leadEventOutbox.update({
    where: { id },
    data: {
      deliveryStatus: "PENDING",
      retryCount: { increment: 1 },
      nextRetryAt: nextRetry,
      lastError: errorMessage?.slice(0, 500) || "Unknown projector error",
    },
  });
}

export async function upsertAdminMetricSnapshot({ bucketDate, scopePincode, scopePartnerId, metricKey, metricValue, updatedAt }) {
  const stableId = `${bucketDate}|${scopePincode || '*'}|${scopePartnerId || '*'}|${metricKey}`;
  await prisma.adminMetricsSnapshot.upsert({
    where: { id: stableId },
    update: { metricValue, updatedAt },
    create: {
      id: stableId,
      bucketDate,
      scopePincode: scopePincode || null,
      scopePartnerId: scopePartnerId || null,
      metricKey,
      metricValue,
      updatedAt,
    },
  });
}

export async function clearAdminMetricSnapshots() {
  await prisma.adminMetricsSnapshot.deleteMany({});
}

export async function projectSingleOutboxRow(row, now, markProcessed) {
  const payload = row.payload || {};
  const bucketDate = (row.occurredAt || now).slice(0, 10);
  const pincode = payload.pincode || null;
  const partnerId = payload.partnerId || null;
  const toStatus = payload.toStatus || null;
  const dispositionKey = payload.dispositionKey || null;

  const totalEvents = await prisma.leadEventOutbox.count({
    where: {
      occurredAt: { startsWith: bucketDate },
    },
  });
  await upsertAdminMetricSnapshot({
    bucketDate,
    scopePincode: pincode,
    scopePartnerId: null,
    metricKey: "events.total",
    metricValue: totalEvents,
    updatedAt: now,
  });

  if (toStatus) {
    const count = await prisma.partnerLead.count({
      where: {
        status: toStatus,
        updatedAt: { startsWith: bucketDate },
        ...(pincode ? { pincode } : {}),
      },
    });
    await upsertAdminMetricSnapshot({
      bucketDate,
      scopePincode: pincode,
      scopePartnerId: null,
      metricKey: `status.${toStatus}`,
      metricValue: count,
      updatedAt: now,
    });
  }

  if (dispositionKey) {
    const count = await prisma.partnerLeadDispositionEvent.count({
      where: {
        dispositionKey,
        createdAt: { startsWith: bucketDate },
        ...(partnerId ? { partnerId } : {}),
      },
    });
    await upsertAdminMetricSnapshot({
      bucketDate,
      scopePincode: pincode,
      scopePartnerId: partnerId,
      metricKey: `disposition.${dispositionKey}`,
      metricValue: count,
      updatedAt: now,
    });

    if (dispositionKey === "ASSIGNED_MANUAL") {
      const manualCount = await prisma.adminLeadAssignment.count({
        where: { createdAt: { startsWith: bucketDate } },
      });
      await upsertAdminMetricSnapshot({
        bucketDate,
        scopePincode: pincode,
        scopePartnerId: null,
        metricKey: "assignment.manual",
        metricValue: manualCount,
        updatedAt: now,
      });
    }

    if (dispositionKey === "CREATED" || dispositionKey === "SCHEDULED") {
      const createdCount = await prisma.partnerLeadDispositionEvent.count({
        where: {
          dispositionKey: { in: ["CREATED", "SCHEDULED"] },
          createdAt: { startsWith: bucketDate },
        },
      });
      await upsertAdminMetricSnapshot({
        bucketDate,
        scopePincode: pincode,
        scopePartnerId: null,
        metricKey: "lead.created",
        metricValue: createdCount,
        updatedAt: now,
      });
    }
  }

  if (markProcessed) {
    await markLeadEventOutboxProcessed(row.id);
  }
}

export async function projectLeadEventOutboxBatch(limit = 200) {
  const rows = await listPendingLeadEventOutbox(limit);
  if (rows.length === 0) {
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;
  const now = new Date().toISOString();

  for (const row of rows) {
    try {
      await projectSingleOutboxRow(row, now, true);
      processed += 1;
    } catch (err) {
      await markLeadEventOutboxFailed(row.id, err instanceof Error ? err.message : String(err), 15);
      failed += 1;
    }
  }

  return { processed, failed };
}

export async function rebuildAdminMetricSnapshotsFromOutbox() {
  await clearAdminMetricSnapshots();
  const rows = await listAllLeadEventOutbox(1000000);
  const now = new Date().toISOString();
  let processed = 0;
  for (const row of rows) {
    try {
      await projectSingleOutboxRow(row, now, false);
      processed += 1;
    } catch {
      // Ignore malformed rows
    }
  }
  return { processed, source: "outbox" };
}

export async function getAdminOverviewMetricsFromSnapshot({ fromDate, toDate, pincode, partnerId, leadType }) {
  if (leadType || partnerId) return null;

  const where = {};
  if (fromDate || toDate) {
    where.bucketDate = {};
    if (fromDate) where.bucketDate.gte = fromDate.slice(0, 10);
    if (toDate) where.bucketDate.lte = toDate.slice(0, 10);
  }

  const rows = await prisma.adminMetricsSnapshot.findMany({
    where,
    orderBy: { bucketDate: "asc" },
  });

  if (rows.length === 0) return null;

  const weeklyTrendMap = new Map();
  const byStatus = new Map();
  let monthlyPayout = 0;

  for (const row of rows) {
    if (pincode && row.scopePincode && row.scopePincode !== pincode) continue;
    if (partnerId && row.scopePartnerId && row.scopePartnerId !== partnerId) continue;
    const value = Number(row.metricValue || 0);

    if (row.metricKey === "events.total" || row.metricKey === "lead.created") {
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
  const inProgressPickups = Number(byStatus.get("ACCEPTED") || 0) + Number(byStatus.get("IN_PROGRESS") || 0);

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

export async function getAdminLeadDispositionSummaryFromSnapshot({ fromDate, toDate, pincode, partnerId, leadType }) {
  if (leadType || partnerId) return null;

  const where = {};
  if (fromDate || toDate) {
    where.bucketDate = {};
    if (fromDate) where.bucketDate.gte = fromDate.slice(0, 10);
    if (toDate) where.bucketDate.lte = toDate.slice(0, 10);
  }

  const rows = await prisma.adminMetricsSnapshot.findMany({ where });
  if (rows.length === 0) return null;

  const byStatus = new Map();
  const byDisposition = new Map();
  for (const row of rows) {
    if (pincode && row.scopePincode && row.scopePincode !== pincode) continue;
    if (partnerId && row.scopePartnerId && row.scopePartnerId !== partnerId) continue;
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

export async function getAdminLeadAssignmentMetricsFromSnapshot({ fromDate, toDate, pincode, partnerId, leadType }) {
  if (leadType || partnerId) return null;

  const where = {};
  if (fromDate || toDate) {
    where.bucketDate = {};
    if (fromDate) where.bucketDate.gte = fromDate.slice(0, 10);
    if (toDate) where.bucketDate.lte = toDate.slice(0, 10);
  }

  const rows = await prisma.adminMetricsSnapshot.findMany({ where });
  if (rows.length === 0) return null;

  let claimed = 0;
  let assigned = 0;
  let unassigned = 0;
  let manualAssigned = 0;
  for (const row of rows) {
    if (pincode && row.scopePincode && row.scopePincode !== pincode) continue;
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

export async function getAdminPartnerActivityFeed({ fromDate, toDate, pincode, limit = 10 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const where = { partnerId: { not: null } };
  if (fromDate || toDate) {
    where.updatedAt = {};
    if (fromDate) where.updatedAt.gte = fromDate;
    if (toDate) where.updatedAt.lte = toDate;
  }
  if (pincode) where.pincode = pincode;

  const leads = await prisma.partnerLead.findMany({
    where,
    include: { partner: true },
  });

  const partnerMap = new Map();
  for (const l of leads) {
    if (!l.partnerId) continue;
    if (!partnerMap.has(l.partnerId)) {
      partnerMap.set(l.partnerId, {
        partnerId: l.partnerId,
        partnerName: l.partner?.name || l.partnerId,
        leadsTouched: 0,
        completedLeads: 0,
        activeLeads: 0,
        lastActivityAt: l.updatedAt,
      });
    }
    const item = partnerMap.get(l.partnerId);
    item.leadsTouched += 1;
    if (l.status === "COMPLETED") item.completedLeads += 1;
    if (["ACCEPTED", "IN_PROGRESS"].includes(l.status)) item.activeLeads += 1;
    if (l.updatedAt > item.lastActivityAt) item.lastActivityAt = l.updatedAt;
  }

  return Array.from(partnerMap.values())
    .sort((a, b) => b.leadsTouched - a.leadsTouched || b.lastActivityAt.localeCompare(a.lastActivityAt))
    .slice(0, safeLimit);
}

export async function listPartnerLeadDispositionTimeline({ leadId, limit = 100 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const rows = await prisma.partnerLeadDispositionEvent.findMany({
    where: { leadId },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
  });
  return rows.map(mapPartnerLeadDispositionEvent);
}

export async function listPartnerLeadsForAdmin({
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

  const where = {};
  if (status) where.status = status;
  if (leadType) where.leadType = leadType;
  if (pincode) where.pincode = pincode;
  if (partnerId) where.partnerId = partnerId;
  if (fromDate || toDate) {
    where.updatedAt = {};
    if (fromDate) where.updatedAt.gte = fromDate;
    if (toDate) where.updatedAt.lte = toDate;
  }
  if (search) {
    where.OR = [
      { sellerName: { contains: search, mode: "insensitive" } },
      { sellerPhone: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { pincode: { contains: search, mode: "insensitive" } },
      { id: { contains: search, mode: "insensitive" } },
    ];
  }

  const [rows, count] = await Promise.all([
    prisma.partnerLead.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: safeLimit,
      skip: safeOffset,
    }),
    prisma.partnerLead.count({ where }),
  ]);

  return {
    rows: rows.map(mapPartnerLead),
    count,
  };
}

export async function listPartnerLeadDispositionSummary({ pincode, partnerId, fromDate, toDate }) {
  const leadWhere = {};
  if (pincode) leadWhere.pincode = pincode;
  if (partnerId) leadWhere.partnerId = partnerId;
  if (fromDate || toDate) {
    leadWhere.updatedAt = {};
    if (fromDate) leadWhere.updatedAt.gte = fromDate;
    if (toDate) leadWhere.updatedAt.lte = toDate;
  }

  const leads = await prisma.partnerLead.findMany({
    where: leadWhere,
    select: { id: true, status: true },
  });

  const statusMap = new Map();
  for (const l of leads) {
    statusMap.set(l.status, (statusMap.get(l.status) || 0) + 1);
  }
  const byStatus = Array.from(statusMap.entries()).map(([key, count]) => ({ key, count }));

  const eventWhere = {};
  if (partnerId) eventWhere.partnerId = partnerId;
  if (fromDate || toDate) {
    eventWhere.createdAt = {};
    if (fromDate) eventWhere.createdAt.gte = fromDate;
    if (toDate) eventWhere.createdAt.lte = toDate;
  }
  if (pincode) {
    eventWhere.lead = { pincode };
  }

  const events = await prisma.partnerLeadDispositionEvent.findMany({
    where: eventWhere,
    select: { dispositionKey: true },
  });

  const dispMap = new Map();
  for (const e of events) {
    dispMap.set(e.dispositionKey, (dispMap.get(e.dispositionKey) || 0) + 1);
  }
  const byDisposition = Array.from(dispMap.entries()).map(([key, count]) => ({ key, count }));

  return { byStatus, byDisposition };
}

export async function getPartnerDashboardMetrics({ partnerId, pincode, now = new Date() }) {
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);

  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - 7);

  const monthStart = new Date(now);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const leads = await prisma.partnerLead.findMany({
    where: { partnerId, pincode, status: { not: "CANCELLED" } },
    select: {
      status: true,
      leadType: true,
      createdAt: true,
      completedAt: true,
      completionEventJson: true,
      quoteJson: true,
    },
  });

  let leadBucket = 0;
  let serviceLeads = 0;
  let todayLeads = 0;
  let weeklyLeads = 0;
  let monthlyLeads = 0;
  let monthlyEarnings = 0;
  let progressedLeads = 0;

  const dayIso = dayStart.toISOString();
  const weekIso = weekStart.toISOString();
  const monthIso = monthStart.toISOString();

  for (const l of leads) {
    if (l.leadType === "LEAD_BUCKET") leadBucket += 1;
    if (l.leadType === "SERVICE_LEAD") serviceLeads += 1;
    if (l.createdAt >= dayIso) todayLeads += 1;
    if (l.createdAt >= weekIso) weeklyLeads += 1;
    if (l.createdAt >= monthIso) monthlyLeads += 1;
    if (["CLAIMED", "ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(l.status)) progressedLeads += 1;

    if (l.status === "COMPLETED" && l.completedAt && l.completedAt >= monthIso) {
      const completion = parseJsonColumn(l.completionEventJson, {});
      const quote = parseJsonColumn(l.quoteJson, {});
      const amt = Number(completion?.finalAmount ?? quote?.sellingPrice ?? 0);
      if (Number.isFinite(amt)) monthlyEarnings += amt;
    }
  }

  const latestKyc = await prisma.partnerKycSubmission.findFirst({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    select: { verificationStatus: true },
  });

  let onboardingProgress = 25;
  if (latestKyc?.verificationStatus === "VERIFIED") onboardingProgress += 35;
  onboardingProgress += 20;
  if (progressedLeads > 0) onboardingProgress += 20;

  return {
    onboardingProgress: Math.min(onboardingProgress, 100),
    todayLeads,
    weeklyLeads,
    monthlyLeads,
    monthlyEarnings: Math.round(monthlyEarnings),
    leadBucket,
    serviceLeads,
  };
}

// Serviceability
export async function upsertServiceability(row) {
  const result = await prisma.serviceabilityPincode.upsert({
    where: { pincode: row.pincode },
    update: {
      status: row.status,
      reason: row.reason,
      state: row.state || null,
      district: row.district || null,
      officeCount: row.officeCount ?? null,
      deliveryOfficeCount: row.deliveryOfficeCount ?? null,
      metadataJson: row.metadataJson || null,
      sourceUploadId: row.sourceUploadId || null,
      sourceFileName: row.sourceFileName || null,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    },
    create: {
      pincode: row.pincode,
      status: row.status,
      reason: row.reason,
      state: row.state || null,
      district: row.district || null,
      officeCount: row.officeCount ?? null,
      deliveryOfficeCount: row.deliveryOfficeCount ?? null,
      metadataJson: row.metadataJson || null,
      sourceUploadId: row.sourceUploadId || null,
      sourceFileName: row.sourceFileName || null,
      updatedBy: row.updatedBy,
      updatedAt: row.updatedAt,
    },
  });
  return getServiceabilityByPincode(result.pincode);
}

export async function getServiceabilityByPincode(pincode) {
  if (!pincode) return null;
  const row = await prisma.serviceabilityPincode.findUnique({ where: { pincode } });
  if (!row) return null;
  return {
    ...row,
    metadata: row.metadataJson ? parseJsonColumn(row.metadataJson, null) : null,
  };
}

export async function listServiceability({ status, search } = {}) {
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { pincode: { contains: search, mode: "insensitive" } },
      { state: { contains: search, mode: "insensitive" } },
      { district: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.serviceabilityPincode.findMany({
    where,
    orderBy: { pincode: "asc" },
  });

  return rows.map((row) => ({
    ...row,
    metadata: row.metadataJson ? parseJsonColumn(row.metadataJson, null) : null,
  }));
}

export async function deleteServiceabilityByPincode(pincode) {
  const result = await prisma.serviceabilityPincode.deleteMany({ where: { pincode } });
  return result.count > 0;
}

export async function createServiceabilityUploadHistory(rec) {
  await prisma.serviceabilityUploadHistory.create({
    data: {
      id: rec.id,
      fileName: rec.fileName,
      uploadedBy: rec.uploadedBy,
      uploadedAt: rec.uploadedAt,
      status: rec.status || "ACTIVE",
      mediaId: rec.mediaId || null,
      deactivatedBy: rec.deactivatedBy || null,
      deactivatedAt: rec.deactivatedAt || null,
      deactivatedRowCount: rec.deactivatedRowCount || 0,
      insertedCount: rec.insertedCount || 0,
      updatedCount: rec.updatedCount || 0,
      totalProcessed: rec.totalProcessed || 0,
    },
  });
}

export async function listServiceabilityUploadHistory() {
  const rows = await prisma.serviceabilityUploadHistory.findMany({
    orderBy: { uploadedAt: "desc" },
  });

  const list = [];
  for (const h of rows) {
    const activeRowCount = await prisma.serviceabilityPincode.count({
      where: { sourceUploadId: h.id },
    });
    list.push({
      ...h,
      activeRowCount,
    });
  }
  return list;
}

export async function getServiceabilityUploadHistoryById(uploadId) {
  return await prisma.serviceabilityUploadHistory.findUnique({ where: { id: uploadId } });
}

export async function deactivateServiceabilityUploadAndRows({ uploadId, deactivatedBy, deactivatedAt }) {
  return await prisma.$transaction(async (tx) => {
    const rowDelete = await tx.serviceabilityPincode.deleteMany({ where: { sourceUploadId: uploadId } });
    const historyUpdate = await tx.serviceabilityUploadHistory.update({
      where: { id: uploadId },
      data: {
        status: "DEACTIVATED",
        deactivatedBy,
        deactivatedAt,
        deactivatedRowCount: rowDelete.count,
      },
    });
    return {
      deactivatedRowCount: rowDelete.count,
      updatedHistoryRows: 1,
    };
  });
}

export async function deleteServiceabilityUploadPermanently({ uploadId }) {
  return await prisma.$transaction(async (tx) => {
    const rowDelete = await tx.serviceabilityPincode.deleteMany({ where: { sourceUploadId: uploadId } });
    const historyDelete = await tx.serviceabilityUploadHistory.deleteMany({ where: { id: uploadId } });
    return {
      deletedRows: rowDelete.count,
      deletedHistoryRows: historyDelete.count,
    };
  });
}

// Partner KYC
export async function createKycSubmission(input) {
  const row = await prisma.partnerKycSubmission.create({
    data: {
      id: input.id,
      partnerId: input.partnerId,
      identityProof: input.identityProof,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageStatus: input.storageStatus,
      storageProvider: input.storageProvider,
      storageKey: input.storageKey || null,
      verificationStatus: input.verificationStatus,
      verificationNotes: input.verificationNotes || null,
      verifiedBy: input.verifiedBy || null,
      verifiedAt: input.verifiedAt || null,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    },
  });
  return await getKycById(row.id);
}

export async function getKycById(kycId) {
  if (!kycId) return null;
  const row = await prisma.partnerKycSubmission.findUnique({ where: { id: kycId } });
  if (!row) return null;
  return {
    ...row,
    mediaUrl: row.storageProvider === "LOCAL_DISK" ? `/api/v1/media/${row.id}` : null,
  };
}

export async function getLatestKycForPartner(partnerId) {
  if (!partnerId) return null;
  const row = await prisma.partnerKycSubmission.findFirst({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return {
    ...row,
    mediaUrl: row.storageProvider === "LOCAL_DISK" ? `/api/v1/media/${row.id}` : null,
  };
}

export async function listKycSubmissions({ status, partnerId } = {}) {
  const where = {};
  if (status) where.verificationStatus = status;
  if (partnerId) where.partnerId = partnerId;

  const rows = await prisma.partnerKycSubmission.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return rows.map((row) => ({
    ...row,
    mediaUrl: row.storageProvider === "LOCAL_DISK" ? `/api/v1/media/${row.id}` : null,
  }));
}

export async function updateKycVerification({ kycId, verificationStatus, verificationNotes, verifiedBy, verifiedAt, updatedAt }) {
  await prisma.partnerKycSubmission.update({
    where: { id: kycId },
    data: {
      verificationStatus,
      verificationNotes: verificationNotes || null,
      verifiedBy: verifiedBy || null,
      verifiedAt: verifiedAt || null,
      updatedAt,
    },
  });
  return await getKycById(kycId);
}

// Device Price Catalog
export async function upsertDevicePriceCatalogRows(rows) {
  let insertedCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    const existing = await prisma.devicePriceCatalog.findFirst({
      where: {
        deviceType: row.deviceType,
        brand: row.brand,
        series: row.series,
        model: row.model,
        storage: row.storage,
        launchYear: row.launchYear,
      },
    });

    if (existing) {
      await prisma.devicePriceCatalog.update({
        where: { id: existing.id },
        data: {
          cashifyPrice: row.cashifyPrice,
          rowJson: row.rowJson,
          sourceUploadId: row.sourceUploadId || null,
          sourceFileName: row.sourceFileName || null,
          updatedAt: row.updatedAt,
        },
      });
      updatedCount += 1;
    } else {
      await prisma.devicePriceCatalog.create({
        data: {
          deviceType: row.deviceType,
          brand: row.brand,
          series: row.series,
          model: row.model,
          storage: row.storage,
          launchYear: row.launchYear,
          cashifyPrice: row.cashifyPrice,
          rowJson: row.rowJson,
          sourceUploadId: row.sourceUploadId || null,
          sourceFileName: row.sourceFileName || null,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
      insertedCount += 1;
    }
  }

  return {
    insertedCount,
    updatedCount,
    totalProcessed: rows.length,
  };
}

export async function listDevicePriceCatalog({ search, deviceType, limit = 200 } = {}) {
  const where = {};
  if (deviceType) where.deviceType = deviceType;
  if (search) {
    where.OR = [
      { brand: { contains: search, mode: "insensitive" } },
      { series: { contains: search, mode: "insensitive" } },
      { model: { contains: search, mode: "insensitive" } },
      { storage: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.devicePriceCatalog.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: limit,
  });

  return rows.map((row) => ({
    ...row,
    row: row.rowJson ? parseJsonColumn(row.rowJson, null) : null,
  }));
}

export async function findDevicePriceByExactMatch({ deviceType, brand, series, model, storage, launchYear }) {
  const row = await prisma.devicePriceCatalog.findFirst({
    where: { deviceType, brand, series, model, storage, launchYear },
  });
  if (!row) return null;
  return {
    ...row,
    row: row.rowJson ? parseJsonColumn(row.rowJson, null) : null,
  };
}

export async function listDistinctBrands(deviceType) {
  const rows = await prisma.devicePriceCatalog.findMany({
    where: deviceType ? { deviceType } : {},
    select: { brand: true },
    distinct: ["brand"],
    orderBy: { brand: "asc" },
  });
  return rows.map((r) => r.brand);
}

export async function listModelsForBrand(brand, deviceType) {
  const rows = await prisma.devicePriceCatalog.findMany({
    where: { brand, ...(deviceType ? { deviceType } : {}) },
    select: {
      series: true,
      model: true,
      storage: true,
      launchYear: true,
      cashifyPrice: true,
    },
    orderBy: [{ series: "asc" }, { model: "asc" }, { storage: "asc" }],
  });
  return rows;
}

// Quote Deduction Rules
export async function listQuoteDeductionRules({ active, search } = {}) {
  const where = {};
  if (typeof active === "boolean") where.isActive = active;
  if (search) {
    where.OR = [
      { label: { contains: search, mode: "insensitive" } },
      { answerGroup: { contains: search, mode: "insensitive" } },
      { answerKey: { contains: search, mode: "insensitive" } },
      { answerValue: { contains: search, mode: "insensitive" } },
    ];
  }

  const rows = await prisma.quoteDeductionRule.findMany({
    where,
    orderBy: [{ priority: "asc" }, { updatedAt: "desc" }],
  });
  return rows.map(mapQuoteDeductionRule);
}

export async function getQuoteDeductionRuleById(id) {
  if (!id) return null;
  const row = await prisma.quoteDeductionRule.findUnique({ where: { id } });
  return mapQuoteDeductionRule(row);
}

export async function createQuoteDeductionRule(rule) {
  const created = await prisma.quoteDeductionRule.create({
    data: {
      id: rule.id,
      answerGroup: rule.answerGroup,
      answerKey: rule.answerKey,
      answerValue: rule.answerValue || null,
      label: rule.label,
      deductionType: rule.deductionType,
      deductionValue: rule.deductionValue,
      maxDeductionAmount: rule.maxDeductionAmount ?? null,
      priority: rule.priority ?? 100,
      isActive: rule.isActive ?? true,
      appliesToBrand: rule.appliesToBrand || null,
      appliesToModelId: rule.appliesToModelId || null,
      createdBy: rule.createdBy,
      createdAt: rule.createdAt,
      updatedAt: rule.updatedAt,
    },
  });
  return mapQuoteDeductionRule(created);
}

export async function updateQuoteDeductionRule(rule) {
  const updated = await prisma.quoteDeductionRule.update({
    where: { id: rule.id },
    data: {
      answerGroup: rule.answerGroup,
      answerKey: rule.answerKey,
      answerValue: rule.answerValue || null,
      label: rule.label,
      deductionType: rule.deductionType,
      deductionValue: rule.deductionValue,
      maxDeductionAmount: rule.maxDeductionAmount ?? null,
      priority: rule.priority ?? 100,
      isActive: rule.isActive ?? true,
      appliesToBrand: rule.appliesToBrand || null,
      appliesToModelId: rule.appliesToModelId || null,
      updatedAt: rule.updatedAt,
    },
  });
  return mapQuoteDeductionRule(updated);
}

export async function setQuoteDeductionRuleActive({ id, isActive, updatedAt }) {
  const updated = await prisma.quoteDeductionRule.update({
    where: { id },
    data: { isActive, updatedAt },
  });
  return mapQuoteDeductionRule(updated);
}

export async function listActiveQuoteDeductionRulesForModel({ brandSlug, modelId } = {}) {
  const rows = await prisma.quoteDeductionRule.findMany({
    where: {
      isActive: true,
      OR: [
        { appliesToBrand: null },
        { appliesToBrand: brandSlug || undefined },
      ],
      AND: [
        {
          OR: [
            { appliesToModelId: null },
            { appliesToModelId: modelId || undefined },
          ],
        },
      ],
    },
    orderBy: [{ priority: "asc" }, { label: "asc" }, { id: "asc" }],
  });
  return rows.map(mapQuoteDeductionRule);
}

// Device Price Upload History
export async function createDevicePriceUploadHistory(rec) {
  await prisma.devicePriceUploadHistory.create({
    data: {
      id: rec.id,
      deviceType: rec.deviceType,
      fileName: rec.fileName,
      uploadedBy: rec.uploadedBy,
      uploadedAt: rec.uploadedAt,
      status: rec.status || "ACTIVE",
      deactivatedBy: rec.deactivatedBy || null,
      deactivatedAt: rec.deactivatedAt || null,
      deactivatedRowCount: rec.deactivatedRowCount || 0,
      insertedCount: rec.insertedCount,
      updatedCount: rec.updatedCount,
      totalProcessed: rec.totalProcessed,
    },
  });
}

export async function createDevicePriceUploadSnapshotRows(rows) {
  for (const row of rows) {
    const existing = await prisma.devicePriceUploadRow.findFirst({
      where: {
        uploadId: row.uploadId,
        deviceType: row.deviceType,
        brand: row.brand,
        series: row.series,
        model: row.model,
        storage: row.storage,
        launchYear: row.launchYear,
      },
    });

    if (existing) {
      await prisma.devicePriceUploadRow.update({
        where: { id: existing.id },
        data: {
          cashifyPrice: row.cashifyPrice,
          rowJson: row.rowJson,
          updatedAt: row.updatedAt,
        },
      });
    } else {
      await prisma.devicePriceUploadRow.create({
        data: {
          uploadId: row.uploadId,
          deviceType: row.deviceType,
          brand: row.brand,
          series: row.series,
          model: row.model,
          storage: row.storage,
          launchYear: row.launchYear,
          cashifyPrice: row.cashifyPrice,
          rowJson: row.rowJson,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        },
      });
    }
  }
}

export async function listDevicePriceUploadSnapshotRows(uploadId) {
  return await prisma.devicePriceUploadRow.findMany({
    where: { uploadId },
    orderBy: { id: "asc" },
  });
}

export async function listDevicePriceUploadHistory({ deviceType } = {}) {
  const where = {};
  if (deviceType) where.deviceType = deviceType;

  const rows = await prisma.devicePriceUploadHistory.findMany({
    where,
    orderBy: { uploadedAt: "desc" },
  });

  const list = [];
  for (const h of rows) {
    const activeRowCount = await prisma.devicePriceCatalog.count({
      where: { sourceUploadId: h.id, deviceType: h.deviceType },
    });
    list.push({ ...h, activeRowCount });
  }
  return list;
}

export async function getDevicePriceUploadHistoryById(uploadId) {
  return await prisma.devicePriceUploadHistory.findUnique({ where: { id: uploadId } });
}

export async function deactivateDevicePriceUploadAndRows({ uploadId, deactivatedBy, deactivatedAt }) {
  return await prisma.$transaction(async (tx) => {
    const rowDelete = await tx.devicePriceCatalog.deleteMany({ where: { sourceUploadId: uploadId } });
    await tx.devicePriceUploadHistory.update({
      where: { id: uploadId },
      data: {
        status: "DEACTIVATED",
        deactivatedBy,
        deactivatedAt,
        deactivatedRowCount: rowDelete.count,
      },
    });
    return {
      deactivatedCatalogRows: rowDelete.count,
      deactivatedHistoryRows: 1,
    };
  });
}

export async function activateDevicePriceUploadAndRows({ uploadId, sourceFileName }) {
  return await prisma.$transaction(async (tx) => {
    const snapshotRows = await tx.devicePriceUploadRow.findMany({ where: { uploadId } });
    if (snapshotRows.length === 0) {
      return { reactivatedCatalogRows: 0, reactivatedHistoryRows: 0 };
    }

    const now = new Date().toISOString();
    const catalogInput = snapshotRows.map((row) => ({
      deviceType: row.deviceType,
      brand: row.brand,
      series: row.series,
      model: row.model,
      storage: row.storage,
      launchYear: row.launchYear,
      cashifyPrice: row.cashifyPrice,
      rowJson: row.rowJson,
      sourceUploadId: uploadId,
      sourceFileName: sourceFileName || null,
      createdAt: now,
      updatedAt: now,
    }));

    const upsertResult = await upsertDevicePriceCatalogRows(catalogInput);
    await tx.devicePriceUploadHistory.update({
      where: { id: uploadId },
      data: {
        status: "ACTIVE",
        deactivatedBy: null,
        deactivatedAt: null,
        deactivatedRowCount: 0,
      },
    });

    return {
      reactivatedCatalogRows: upsertResult.totalProcessed,
      reactivatedHistoryRows: 1,
    };
  });
}

export async function deleteDevicePriceUploadPermanently({ uploadId }) {
  return await prisma.$transaction(async (tx) => {
    const catalogDelete = await tx.devicePriceCatalog.deleteMany({ where: { sourceUploadId: uploadId } });
    const snapshotDelete = await tx.devicePriceUploadRow.deleteMany({ where: { uploadId } });
    const historyDelete = await tx.devicePriceUploadHistory.deleteMany({ where: { id: uploadId } });
    return {
      deletedCatalogRows: catalogDelete.count,
      deletedSnapshotRows: snapshotDelete.count,
      deletedHistoryRows: historyDelete.count,
    };
  });
}

// Partner Coins, Wallets & Ledgers
export async function ensurePartnerCoinWallet(partnerId, nowIso) {
  await prisma.partnerCoinWallet.upsert({
    where: { partnerId },
    update: {},
    create: { partnerId, balance: 0, updatedAt: nowIso },
  });
}

export async function getPartnerCoinWallet(partnerId) {
  if (!partnerId) return null;
  return await prisma.partnerCoinWallet.findUnique({ where: { partnerId } });
}

export async function listPartnerCoinLedger(partnerId, limit = 20) {
  const rows = await prisma.partnerCoinLedger.findMany({
    where: { partnerId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((row) => ({
    ...row,
    metadata: row.metadataJson ? parseJsonColumn(row.metadataJson, null) : null,
  }));
}

export async function getPendingPartnerRechargeRequestByTxnRef(partnerId, upiTxnRef) {
  const row = await prisma.partnerCoinRechargeRequest.findFirst({
    where: { partnerId, upiTxnRef, status: "PENDING" },
    orderBy: { requestedAt: "desc" },
  });
  return mapPartnerCoinRechargeRequestRow(row);
}

export async function createPartnerCoinRechargeRequest({
  id,
  partnerId,
  amount,
  upiTxnRef,
  upiApp,
  status,
  requestedAt,
  metadataJson,
}) {
  await prisma.partnerCoinRechargeRequest.create({
    data: {
      id,
      partnerId,
      amount,
      upiTxnRef,
      upiApp: upiApp || null,
      status,
      requestedAt,
      metadataJson: metadataJson || null,
    },
  });
  return await getPartnerCoinRechargeRequestById(id);
}

export async function getPartnerCoinRechargeRequestById(requestId) {
  const row = await prisma.partnerCoinRechargeRequest.findUnique({ where: { id: requestId } });
  return mapPartnerCoinRechargeRequestRow(row);
}

export async function listPartnerCoinRechargeRequests({ partnerId, status, limit = 30 } = {}) {
  const where = {};
  if (partnerId) where.partnerId = partnerId;
  if (status) where.status = status;

  const rows = await prisma.partnerCoinRechargeRequest.findMany({
    where,
    orderBy: { requestedAt: "desc" },
    take: limit,
  });
  return rows.map(mapPartnerCoinRechargeRequestRow);
}

export async function verifyPartnerCoinRechargeRequest({ requestId, action, verifiedBy, adminNote, verifiedAt, ledgerEntryId }) {
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.partnerCoinRechargeRequest.findUnique({ where: { id: requestId } });
    if (!existing) {
      return { result: "NOT_FOUND", request: null, wallet: null };
    }
    if (existing.status !== "PENDING") {
      const wallet = await tx.partnerCoinWallet.findUnique({ where: { partnerId: existing.partnerId } });
      return { result: "ALREADY_PROCESSED", request: mapPartnerCoinRechargeRequestRow(existing), wallet };
    }

    if (action === "APPROVE") {
      await tx.partnerCoinWallet.upsert({
        where: { partnerId: existing.partnerId },
        update: {},
        create: { partnerId: existing.partnerId, balance: 0, updatedAt: verifiedAt },
      });

      await tx.partnerCoinLedger.create({
        data: {
          id: ledgerEntryId,
          partnerId: existing.partnerId,
          txnType: "CREDIT",
          amount: existing.amount,
          method: "UPI",
          reference: existing.upiTxnRef,
          note: "Approved partner wallet recharge",
          metadataJson: JSON.stringify({
            rechargeRequestId: existing.id,
            upiApp: existing.upiApp || null,
            verifiedBy,
          }),
          createdAt: verifiedAt,
        },
      });

      await tx.partnerCoinWallet.update({
        where: { partnerId: existing.partnerId },
        data: {
          balance: { increment: existing.amount },
          updatedAt: verifiedAt,
        },
      });

      await tx.partnerCoinRechargeRequest.update({
        where: { id: existing.id },
        data: {
          status: "APPROVED",
          verifiedAt,
          verifiedBy,
          adminNote: adminNote || "Approved by admin",
          ledgerEntryId,
        },
      });
    } else {
      await tx.partnerCoinRechargeRequest.update({
        where: { id: existing.id },
        data: {
          status: "REJECTED",
          verifiedAt,
          verifiedBy,
          adminNote: adminNote || "Rejected by admin",
        },
      });
    }

    const updatedRequest = await tx.partnerCoinRechargeRequest.findUnique({ where: { id: existing.id } });
    const updatedWallet = await tx.partnerCoinWallet.findUnique({ where: { partnerId: existing.partnerId } });

    return {
      result: "UPDATED",
      request: mapPartnerCoinRechargeRequestRow(updatedRequest),
      wallet: updatedWallet,
    };
  });
}

export async function creditPartnerCoins({ id, partnerId, amount, method, reference, note, metadataJson, createdAt }) {
  return await prisma.$transaction(async (tx) => {
    await tx.partnerCoinWallet.upsert({
      where: { partnerId },
      update: {},
      create: { partnerId, balance: 0, updatedAt: createdAt },
    });

    await tx.partnerCoinLedger.create({
      data: {
        id,
        partnerId,
        txnType: "CREDIT",
        amount,
        method,
        reference: reference || null,
        note: note || null,
        metadataJson: metadataJson || null,
        createdAt,
      },
    });

    const updated = await tx.partnerCoinWallet.update({
      where: { partnerId },
      data: {
        balance: { increment: amount },
        updatedAt: createdAt,
      },
    });

    return updated;
  });
}
