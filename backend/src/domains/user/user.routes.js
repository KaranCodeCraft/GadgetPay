import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import {
  appendPartnerLeadDispositionEvent,
  cancelUserSellFlow,
  createUserSellFlow,
  enqueueLeadEventOutbox,
  deleteUserAccount,
  expireUserSellFlow,
  getUserById,
  getPartnerLeadByFlowId,
  getUserSellFlowById,
  listUserSellFlows,
  markPartnerLeadCancelledForFlow,
  markPartnerLeadExpiredForFlow,
  updateUserProfile,
  updateUserSellFlow,
  upsertPartnerLeadFromUserFlow,
} from "../../db/repository.js";
import { badRequest, notFound } from "../../shared/http/errors.js";
import { success } from "../../shared/http/response.js";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { deleteMediaFile } from "../../shared/store/local-media.js";
import { calculateUserQuote } from "../pricing/quote-deduction.service.js";
import { getPincodeDetails } from "../serviceability/serviceability.service.js";
import {
  AUTO_EXPIRED_PICKUP_REASON,
  getPickupExpiryDecision,
  hasSameDayPickupSlotPassed,
  parsePickupSlotBoundary,
  PICKUP_CUTOFF_TIME_ZONE,
} from "./pickup-expiry.js";

const flowStatuses = ["DRAFT", "QUESTIONNAIRE_COMPLETED", "QUOTE_READY", "PICKUP_SCHEDULED", "CANCELLED"];
const PICKUP_SLOT_OPTIONS = [
  "10:00 AM - 11:00 AM",
  "11:00 AM - 12:00 PM",
  "12:00 PM - 1:00 PM",
  "1:00 PM - 2:00 PM",
  "2:00 PM - 3:00 PM",
  "3:00 PM - 4:00 PM",
  "4:00 PM - 5:00 PM",
  "5:00 PM - 6:00 PM",
];

const selectedModelSchema = z.object({
  brandSlug: z.string().trim().min(1).max(80),
  modelId: z.string().trim().min(1).max(120),
  modelName: z.string().trim().min(1).max(160),
  listedPrice: z.number().int().nonnegative().max(1000000),
  thumbnailUrl: z.string().url().optional(),
});

const answerValueSchema = z.enum(["yes", "no", "na"]);
const answerMapSchema = z.record(answerValueSchema.optional());

const deviceDetailsSchema = z.object({
  basicFunctionality: answerMapSchema.optional().default({}),
  warrantyAndBill: answerMapSchema.optional().default({}),
  physicalIssues: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  nestedPhysicalIssueAnswers: z.record(z.union([
    z.string().trim().min(1).max(160),
    z.array(z.string().trim().min(1).max(160)).min(1),
  ])).optional().default({}),
  functionalProblems: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  accessories: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  mobileAge: z.string().trim().min(1).max(80).optional(),
  cameraAndBiometrics: answerMapSchema.optional().default({}),
  sensorsAndConnectivity: answerMapSchema.optional().default({}),
  batteryAndCharging: answerMapSchema.optional().default({}),
  accessoriesAndOwnership: answerMapSchema.optional().default({}),
  metadata: z.object({
    useCase: z.literal("device-details").optional(),
    questionnaireVersion: z.string().trim().min(1).max(80).optional(),
    flowType: z.enum(["sell-phone", "sell-tablet"]).optional(),
    selectedIssues: z.array(z.string().trim().min(1).max(160)).optional().default([]),
    selectedIssueGroups: z.array(z.string().trim().min(1).max(80)).optional().default([]),
    hasScreenDefectBranch: z.boolean().optional(),
    hasBodyDefectBranch: z.boolean().optional(),
    updatedAt: z.string().datetime().optional(),
  }).optional().default({}),
}).passthrough();

const pickupScheduleSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  primaryDate: z.string().datetime(),
  primaryTime: z.string().trim().min(3).max(40),
  alternateDate: z.string().datetime(),
  alternateTime: z.string().trim().min(3).max(40),
  sellerName: z.string().trim().min(2).max(80),
  callingPhoneNumber: z.string().regex(/^\d{10}$/),
  addressLine: z.string().trim().min(5).max(240),
  landmark: z.string().trim().max(160).optional().default(""),
  city: z.string().trim().max(80).optional().default(""),
});

const createSellFlowSchema = z.object({
  flowType: z.enum(["sell-phone", "sell-tablet"]).optional().default("sell-phone"),
  selectedModel: selectedModelSchema,
  servicePincode: z.string().regex(/^\d{6}$/).optional(),
});

const deviceDetailsBodySchema = z.object({
  deviceDetails: deviceDetailsSchema,
});

const pickupScheduleBodySchema = z.object({
  pickupSchedule: pickupScheduleSchema,
});

const rescheduleBodySchema = z.object({
  primaryDate: z.string().datetime(),
  primaryTime: z.string().trim().min(3).max(40),
  alternateDate: z.string().datetime(),
  alternateTime: z.string().trim().min(3).max(40),
});

const updateUserProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

const deleteUserAccountSchema = z.object({
  confirm: z.literal("DELETE"),
});

const listQuerySchema = z.object({
  status: z.enum(flowStatuses).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const userRouter = Router();

userRouter.use(requireAuth, requireRole("user"));
userRouter.use(async (req, _res, next) => {
  try {
    const user = await getUserById(req.auth.sub);
    if (!user) throw notFound("User not found");
    req.userAccount = user;
    next();
  } catch (err) {
    next(err);
  }
});

function nowIso() {
  return new Date().toISOString();
}

function validatePickupScheduleTiming({ primaryDate, primaryTime, alternateDate, alternateTime }) {
  if (!PICKUP_SLOT_OPTIONS.includes(primaryTime) || !PICKUP_SLOT_OPTIONS.includes(alternateTime)) {
    throw badRequest("Invalid pickup slot selected. Please choose a valid time window.", {
      allowedSlots: PICKUP_SLOT_OPTIONS,
    });
  }

  const now = new Date();
  if (hasSameDayPickupSlotPassed(primaryDate, primaryTime, now)) {
    throw badRequest("Selected preferred pickup slot has already passed for today. Please choose a later slot.", {
      field: "primaryTime",
      timeZone: PICKUP_CUTOFF_TIME_ZONE,
    });
  }

  if (hasSameDayPickupSlotPassed(alternateDate, alternateTime, now)) {
    throw badRequest("Selected alternate pickup slot has already passed for today. Please choose a later slot.", {
      field: "alternateTime",
      timeZone: PICKUP_CUTOFF_TIME_ZONE,
    });
  }

  const alternateDateValue = new Date(alternateDate);
  const primaryDateValue = new Date(primaryDate);
  if (alternateDateValue.getTime() < primaryDateValue.getTime()) {
    throw badRequest("Alternate pickup date must be on or after preferred pickup date.");
  }
}

function getUser(req) {
  return req.userAccount;
}

function buildFlowJson({
  id,
  flowType = "sell-phone",
  user,
  selectedModel,
  deviceDetails = null,
  pickupSchedule = null,
  quote = null,
  servicePincode = null,
  status,
  createdAt,
  updatedAt,
}) {
  return {
    id,
    flowType,
    status,
    servicePincode,
    user: {
      id: user.id,
      phone: user.phone || null,
      name: user.name,
    },
    selectedModel,
    deviceDetails,
    quote,
    pickupSchedule,
    createdAt,
    updatedAt,
  };
}

function getFlowPincode(flow, pickupSchedule = null) {
  return pickupSchedule?.pincode || flow.flowJson?.servicePincode || flow.pickupSchedule?.pincode || null;
}

async function maybeAutoExpireScheduledFlow(flow) {
  if (!flow || flow.status !== "PICKUP_SCHEDULED") return flow;
  const lead = await getPartnerLeadByFlowId(flow.id);
  if (!lead || lead.leadType !== "SERVICE_LEAD" || !["AVAILABLE", "CLAIMED"].includes(lead.status)) return flow;

  const pickupSchedule = flow.pickupSchedule || lead.pickupSchedule;
  const expiryDecision = getPickupExpiryDecision(pickupSchedule);
  if (!expiryDecision || Date.now() <= expiryDecision.expiresAt.getTime()) return flow;

  const expiryReason = expiryDecision.reason;
  const expiryNote = expiryDecision.usesAlternateSlot
    ? "Pickup expired before partner accepted the lead in both preferred and alternate pickup windows"
    : "Pickup slot expired before partner accepted the lead";

  const updatedAt = nowIso();
  const expiredLead = await markPartnerLeadExpiredForFlow({
    userSellFlowId: flow.id,
    updatedAt,
    reason: expiryReason,
  });
  if (!expiredLead) return flow;

  await appendPartnerLeadDispositionEvent({
    id: crypto.randomUUID(),
    leadId: expiredLead.id,
    userSellFlowId: expiredLead.userSellFlowId,
    partnerId: lead.partnerId || null,
    fromStatus: lead.status,
    toStatus: "CANCELLED",
    dispositionKey: expiryReason,
    note: expiryNote,
    actorRole: "system",
    actorId: "auto-expiry",
    createdAt: updatedAt,
  });

  await enqueueLeadEventOutbox({
    id: crypto.randomUUID(),
    eventType: "lead.expired",
    leadId: expiredLead.id,
    payloadJson: JSON.stringify({
      leadId: expiredLead.id,
      userSellFlowId: expiredLead.userSellFlowId,
      leadType: expiredLead.leadType,
      fromStatus: lead.status,
      toStatus: "CANCELLED",
      dispositionKey: expiryReason,
      partnerId: lead.partnerId || null,
      pincode: expiredLead.pincode,
      actorRole: "system",
      actorId: "auto-expiry",
      expiryEndsAt: expiryDecision.expiresAt.toISOString(),
      usedAlternateSlot: expiryDecision.usesAlternateSlot,
    }),
    occurredAt: updatedAt,
  });

  return (await expireUserSellFlow({
    id: flow.id,
    userId: flow.userId,
    updatedAt,
    reason: expiryReason,
  })) || flow;
}

async function expireScheduledFlowsForUser(userId) {
  const flows = await listUserSellFlows({ userId, status: "PICKUP_SCHEDULED", limit: 100 });
  await Promise.all(flows.map(maybeAutoExpireScheduledFlow));
}

async function syncPartnerLead({ flow, user, leadType, pincode, status = "AVAILABLE", updatedAt }) {
  if (!pincode) return null;

  const pickupSchedule = flow.pickupSchedule || null;
  const existingLead = await getPartnerLeadByFlowId(flow.id);
  const lead = await upsertPartnerLeadFromUserFlow({
    id: `lead-${flow.id}`,
    userSellFlowId: flow.id,
    userId: flow.userId,
    leadType,
    status,
    pincode,
    city: pickupSchedule?.city || null,
    sellerName: pickupSchedule?.sellerName || user.name,
    sellerPhone: pickupSchedule?.callingPhoneNumber || user.phone || null,
    addressLine: pickupSchedule?.addressLine || null,
    landmark: pickupSchedule?.landmark || null,
    selectedModelJson: JSON.stringify(flow.selectedModel),
    deviceDetailsJson: flow.deviceDetails ? JSON.stringify(flow.deviceDetails) : null,
    quoteJson: flow.quote ? JSON.stringify(flow.quote) : null,
    pickupScheduleJson: pickupSchedule ? JSON.stringify(pickupSchedule) : null,
    flowSnapshotJson: JSON.stringify(flow.flowJson || flow),
    createdAt: flow.createdAt,
    updatedAt,
  });

  if (lead && (!existingLead || existingLead.status !== lead.status || existingLead.leadType !== lead.leadType)) {
    const dispositionKey = lead.status === "AVAILABLE" ? (lead.leadType === "SERVICE_LEAD" ? "SCHEDULED" : "CREATED") : lead.status;
    await appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: lead.id,
      userSellFlowId: lead.userSellFlowId,
      partnerId: lead.partnerId,
      fromStatus: existingLead?.status || null,
      toStatus: lead.status,
      dispositionKey,
      note: lead.leadType === "SERVICE_LEAD" ? "Pickup scheduled by user" : "Lead created from user quote",
      actorRole: "user",
      actorId: user.id,
      createdAt: updatedAt,
    });

    await enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.synced",
      leadId: lead.id,
      payloadJson: JSON.stringify({
        leadId: lead.id,
        userSellFlowId: lead.userSellFlowId,
        leadType: lead.leadType,
        fromStatus: existingLead?.status || null,
        toStatus: lead.status,
        dispositionKey,
        partnerId: lead.partnerId,
        pincode: lead.pincode,
        actorRole: "user",
        actorId: user.id,
      }),
      occurredAt: updatedAt,
    });
  }

  return lead;
}

async function requireFlow(req) {
  const flow = await getUserSellFlowById({ id: req.params.flowId, userId: req.auth.sub });
  if (!flow) throw notFound("Sell flow not found");
  return flow;
}

userRouter.get("/me", (req, res) => {
  res.json(success({ user: getUser(req) }));
});

userRouter.patch("/me", async (req, res, next) => {
  try {
    const input = updateUserProfileSchema.parse(req.body);
    const user = await updateUserProfile({ id: req.auth.sub, name: input.name, updatedAt: nowIso() });
    if (!user) throw notFound("User not found");
    res.json(success({ user }));
  } catch (err) {
    next(err);
  }
});

userRouter.delete("/me", async (req, res, next) => {
  try {
    deleteUserAccountSchema.parse(req.body || {});
    const result = await deleteUserAccount(req.auth.sub);
    if (!result) throw notFound("User not found");

    const mediaErrors = [];
    result.mediaRelativePaths.forEach((relativePath) => {
      try {
        deleteMediaFile(relativePath);
      } catch (error) {
        mediaErrors.push({ relativePath, message: error instanceof Error ? error.message : "Failed to delete media file" });
      }
    });

    res.json(success({ deleted: true, deletedCounts: result.deleted, mediaFileErrors: mediaErrors }));
  } catch (err) {
    next(err);
  }
});

userRouter.post("/sell-flows", async (req, res, next) => {
  try {
    const input = createSellFlowSchema.parse(req.body);
    const user = getUser(req);
    const id = `${input.flowType}-${crypto.randomUUID()}`;
    const now = nowIso();
    const flowJson = buildFlowJson({
      id,
      flowType: input.flowType,
      user,
      selectedModel: input.selectedModel,
      servicePincode: input.servicePincode || null,
      status: "DRAFT",
      createdAt: now,
      updatedAt: now,
    });

    const flow = await createUserSellFlow({
      id,
      userId: req.auth.sub,
      flowType: input.flowType,
      status: "DRAFT",
      selectedModelJson: JSON.stringify(input.selectedModel),
      flowJson: JSON.stringify(flowJson),
      createdAt: now,
      updatedAt: now,
    });

    res.json(success({ flow }));
  } catch (err) {
    next(err);
  }
});

userRouter.get("/sell-flows", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    await expireScheduledFlowsForUser(req.auth.sub);
    const rawRows = await listUserSellFlows({ userId: req.auth.sub, status: query.status, limit: query.limit });
    const rows = (await Promise.all(rawRows.map(maybeAutoExpireScheduledFlow)))
      .filter((flow) => !query.status || flow.status === query.status);
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

userRouter.get("/sell-flows/:flowId", async (req, res, next) => {
  try {
    const existing = await requireFlow(req);
    res.json(success({ flow: await maybeAutoExpireScheduledFlow(existing) }));
  } catch (err) {
    next(err);
  }
});

userRouter.patch("/sell-flows/:flowId/device-details", async (req, res, next) => {
  try {
    const input = deviceDetailsBodySchema.parse(req.body);
    const existing = await requireFlow(req);
    if (existing.status === "CANCELLED") throw badRequest("Cancelled sell flow cannot be updated");
    const user = getUser(req);
    const updatedAt = nowIso();
    const flowJson = buildFlowJson({
      id: existing.id,
      flowType: existing.flowType,
      user,
      selectedModel: existing.selectedModel,
      deviceDetails: input.deviceDetails,
      pickupSchedule: existing.pickupSchedule,
      quote: existing.quote,
      servicePincode: getFlowPincode(existing),
      status: "QUESTIONNAIRE_COMPLETED",
      createdAt: existing.createdAt,
      updatedAt,
    });

    const flow = await updateUserSellFlow({
      id: existing.id,
      userId: req.auth.sub,
      status: "QUESTIONNAIRE_COMPLETED",
      deviceDetailsJson: JSON.stringify(input.deviceDetails),
      flowJson: JSON.stringify(flowJson),
      updatedAt,
    });

    res.json(success({ flow }));
  } catch (err) {
    next(err);
  }
});

userRouter.post("/sell-flows/:flowId/quote", async (req, res, next) => {
  try {
    const existing = await requireFlow(req);
    if (existing.status === "CANCELLED") throw badRequest("Cancelled sell flow cannot be quoted");
    if (existing.status !== "QUESTIONNAIRE_COMPLETED") {
      throw badRequest("Complete questionnaire before generating quote", {
        requiredStatus: "QUESTIONNAIRE_COMPLETED",
        currentStatus: existing.status,
      });
    }
    if (!existing.deviceDetails) {
      throw badRequest("Complete questionnaire before generating quote");
    }
    const user = getUser(req);
    const quote = await calculateUserQuote({ selectedModel: existing.selectedModel, deviceDetails: existing.deviceDetails });
    const updatedAt = nowIso();
    const flowJson = buildFlowJson({
      id: existing.id,
      flowType: existing.flowType,
      user,
      selectedModel: existing.selectedModel,
      deviceDetails: existing.deviceDetails,
      pickupSchedule: existing.pickupSchedule,
      quote,
      servicePincode: getFlowPincode(existing),
      status: "QUOTE_READY",
      createdAt: existing.createdAt,
      updatedAt,
    });

    const flow = await updateUserSellFlow({
      id: existing.id,
      userId: req.auth.sub,
      status: "QUOTE_READY",
      quoteJson: JSON.stringify(quote),
      flowJson: JSON.stringify(flowJson),
      updatedAt,
    });

    await syncPartnerLead({
      flow,
      user,
      leadType: "LEAD_BUCKET",
      pincode: getFlowPincode(flow),
      updatedAt,
    });

    res.json(success({ flow, quote }));
  } catch (err) {
    next(err);
  }
});

userRouter.patch("/sell-flows/:flowId/pickup-schedule", async (req, res, next) => {
  try {
    const input = pickupScheduleBodySchema.parse(req.body);
    validatePickupScheduleTiming(input.pickupSchedule);
    const existing = await requireFlow(req);
    if (existing.status === "CANCELLED") throw badRequest("Cancelled sell flow cannot be scheduled");
    if (existing.status !== "QUOTE_READY") {
      throw badRequest("Generate quote before scheduling pickup", {
        requiredStatus: "QUOTE_READY",
        currentStatus: existing.status,
      });
    }
    if (!existing.quote) {
      throw badRequest("Generate quote before scheduling pickup");
    }
    const user = getUser(req);
    const quote = existing.quote;
    const updatedAt = nowIso();
    const flowPincode = input.pickupSchedule.pincode || getFlowPincode(existing, input.pickupSchedule);
    if (!flowPincode) {
      throw badRequest("Serviceable pincode is required before scheduling pickup");
    }

    const pincodeRecord = await getPincodeDetails(flowPincode);
    if (pincodeRecord.serviceability.status !== "ACTIVE") {
      throw badRequest("Selected pincode is currently not serviceable", {
        status: pincodeRecord.serviceability.status,
        pincode: flowPincode,
      });
    }

    const pickupSchedule = {
      ...input.pickupSchedule,
      pincode: flowPincode,
      city: input.pickupSchedule.city || pincodeRecord.provider.district,
      modelName: existing.selectedModel.modelName,
      listedPrice: existing.selectedModel.listedPrice,
      updatedAt,
    };
    const flowJson = buildFlowJson({
      id: existing.id,
      flowType: existing.flowType,
      user,
      selectedModel: existing.selectedModel,
      deviceDetails: existing.deviceDetails,
      pickupSchedule,
      quote,
      servicePincode: pickupSchedule.pincode || getFlowPincode(existing),
      status: "PICKUP_SCHEDULED",
      createdAt: existing.createdAt,
      updatedAt,
    });

    const flow = await updateUserSellFlow({
      id: existing.id,
      userId: req.auth.sub,
      status: "PICKUP_SCHEDULED",
      pickupScheduleJson: JSON.stringify(pickupSchedule),
      quoteJson: JSON.stringify(quote),
      flowJson: JSON.stringify(flowJson),
      updatedAt,
    });

    const serviceLead = await syncPartnerLead({
      flow,
      user,
      leadType: "SERVICE_LEAD",
      pincode: pickupSchedule.pincode,
      updatedAt,
    });

    res.json(success({ flow }));
  } catch (err) {
    next(err);
  }
});

// User reschedule: update pickup dates/times only, preserve address, sync partner lead + disposition
userRouter.patch("/sell-flows/:flowId/reschedule", async (req, res, next) => {
  try {
    const input = rescheduleBodySchema.parse(req.body);
    validatePickupScheduleTiming(input);
    const existing = await requireFlow(req);
    if (existing.status === "CANCELLED") throw badRequest("Cancelled sell flow cannot be rescheduled");
    if (existing.status !== "PICKUP_SCHEDULED") throw badRequest("Only PICKUP_SCHEDULED flows can be rescheduled", { currentStatus: existing.status });
    if (!existing.pickupSchedule) throw badRequest("No existing pickup schedule found to base reschedule on");
    const existingLead = await getPartnerLeadByFlowId(existing.id);
    if (existingLead && ["COMPLETED", "CANCELLED"].includes(existingLead.status)) {
      throw badRequest("Pickup is already " + existingLead.status.toLowerCase() + " and cannot be rescheduled");
    }
    const updatedAt = nowIso();
    const user = getUser(req);
    const pickupSchedule = {
      ...existing.pickupSchedule,
      primaryDate: input.primaryDate,
      primaryTime: input.primaryTime,
      alternateDate: input.alternateDate,
      alternateTime: input.alternateTime,
      updatedAt,
    };
    const flowJson = buildFlowJson({
      id: existing.id, flowType: existing.flowType, user,
      selectedModel: existing.selectedModel, deviceDetails: existing.deviceDetails,
      pickupSchedule, quote: existing.quote,
      servicePincode: getFlowPincode(existing),
      status: "PICKUP_SCHEDULED", createdAt: existing.createdAt, updatedAt,
    });
    const flow = await updateUserSellFlow({
      id: existing.id, userId: req.auth.sub, status: "PICKUP_SCHEDULED",
      pickupScheduleJson: JSON.stringify(pickupSchedule),
      quoteJson: null, flowJson: JSON.stringify(flowJson), updatedAt,
    });
    const pincode = getFlowPincode(flow) || existingLead?.pincode;
    if (pincode) {
      await upsertPartnerLeadFromUserFlow({
        id: `lead-${flow.id}`, userSellFlowId: flow.id, userId: flow.userId,
        leadType: existingLead?.leadType || "SERVICE_LEAD",
        status: existingLead?.status || "AVAILABLE",
        pincode, city: pickupSchedule.city || existingLead?.city || null,
        sellerName: pickupSchedule.sellerName || user.name,
        sellerPhone: pickupSchedule.callingPhoneNumber || user.phone || null,
        addressLine: pickupSchedule.addressLine || null,
        landmark: pickupSchedule.landmark || null,
        selectedModelJson: JSON.stringify(flow.selectedModel),
        deviceDetailsJson: flow.deviceDetails ? JSON.stringify(flow.deviceDetails) : null,
        quoteJson: flow.quote ? JSON.stringify(flow.quote) : null,
        pickupScheduleJson: JSON.stringify(pickupSchedule),
        flowSnapshotJson: JSON.stringify(flowJson),
        createdAt: flow.createdAt, updatedAt,
      });
      if (existingLead?.id) {
        await appendPartnerLeadDispositionEvent({
          id: crypto.randomUUID(), leadId: existingLead.id,
          userSellFlowId: flow.id, partnerId: existingLead.partnerId || null,
          fromStatus: existingLead.status, toStatus: existingLead.status,
          dispositionKey: "RESCHEDULE_REQUESTED",
          note: `Pickup rescheduled by user to ${input.primaryDate.split("T")[0]} ${input.primaryTime}`,
          actorRole: "user", actorId: req.auth.sub, createdAt: updatedAt,
        });
        await enqueueLeadEventOutbox({
          id: crypto.randomUUID(), eventType: "lead.rescheduled", leadId: existingLead.id,
          payloadJson: JSON.stringify({
            leadId: existingLead.id, userSellFlowId: flow.id,
            primaryDate: input.primaryDate, primaryTime: input.primaryTime,
            alternateDate: input.alternateDate, alternateTime: input.alternateTime,
            partnerId: existingLead.partnerId || null, actorRole: "user", actorId: req.auth.sub,
          }),
          occurredAt: updatedAt,
        });
      }
    }
    res.json(success({ flow, rescheduled: true }));
  } catch (err) {
    next(err);
  }
});

// User-facing: get partner lead pickup/payment status for invoice display
userRouter.get("/sell-flows/:flowId/lead-status", async (req, res, next) => {
  try {
    const existing = await requireFlow(req);
    const flow = await maybeAutoExpireScheduledFlow(existing);
    const lead = await getPartnerLeadByFlowId(flow.id);
    if (!lead) return res.json(success({ found: false, lead: null }));
    res.json(success({
      found: true,
      lead: {
        id: lead.id,
        status: lead.status,
        completedAt: lead.completedAt || null,
        cancelledAt: lead.cancelledAt || null,
        rejectionReason: lead.rejectionReason || null,
        completionEvent: lead.completionEvent || null,
        paymentProof: lead.paymentProof ? {
          amountCollected: lead.paymentProof.amountCollected,
          paymentMode: lead.paymentProof.paymentMode,
          submittedAt: lead.paymentProof.submittedAt,
          mediaUrl: lead.paymentProof.mediaUrl || null,
        } : null,
        paymentSubmittedAt: lead.paymentSubmittedAt || null,
        onsiteValidation: lead.onsiteValidation || null,
      },
    }));
  } catch (err) {
    next(err);
  }
});

userRouter.get("/sell-flows/:flowId/invoice", async (req, res, next) => {
  try {
    z.string().trim().min(1).parse(req.params.flowId);
    const flow = await requireFlow(req);
    const lead = await getPartnerLeadByFlowId(flow.id);
    if (!lead || lead.status !== "COMPLETED" || !lead.completionEvent?.invoice) {
      throw notFound("Invoice not found");
    }

    const user = flow.userId ? (await getUserById(flow.userId)) : null;
    const seller = lead.seller || {};
    const pickup = flow.pickupSchedule || lead.pickupSchedule || {};
    const invoice = {
      ...lead.completionEvent.invoice,
      company: { name: "GadgetPe", website: "www.gadgetpe.com" },
      purchaser: {
        name: user?.name || seller.name || pickup.sellerName || "Customer",
        addressLine: seller.addressLine || pickup.addressLine || null,
        landmark: seller.landmark || pickup.landmark || null,
        city: seller.city || pickup.city || null,
        pincode: seller.pincode || pickup.pincode || flow.servicePincode || null,
      },
      serviceNumber: lead.id,
      orderCreatedAt: flow.createdAt || null,
    };

    res.json(success({ invoice }));
  } catch (err) {
    next(err);
  }
});

userRouter.post("/sell-flows/:flowId/cancel", async (req, res, next) => {
  try {
    const updatedAt = nowIso();
    const flow = await cancelUserSellFlow({ id: req.params.flowId, userId: req.auth.sub, updatedAt });
    if (!flow) throw notFound("Sell flow not found");
    const existingLead = await getPartnerLeadByFlowId(flow.id);
    const cancelledLead = await markPartnerLeadCancelledForFlow({ userSellFlowId: flow.id, updatedAt });
    if (cancelledLead) {
      const eventId = crypto.randomUUID();
      await appendPartnerLeadDispositionEvent({
        id: eventId,
        leadId: cancelledLead.id,
        userSellFlowId: cancelledLead.userSellFlowId,
        partnerId: cancelledLead.partnerId,
        fromStatus: existingLead?.status || null,
        toStatus: "CANCELLED",
        dispositionKey: "CANCELLED",
        note: "User cancelled sell flow",
        actorRole: "user",
        actorId: req.auth.sub,
        createdAt: updatedAt,
      });

      await enqueueLeadEventOutbox({
        id: crypto.randomUUID(),
        eventType: "lead.cancelled",
        leadId: cancelledLead.id,
        payloadJson: JSON.stringify({
          leadId: cancelledLead.id,
          userSellFlowId: cancelledLead.userSellFlowId,
          leadType: cancelledLead.leadType,
          fromStatus: existingLead?.status || null,
          toStatus: "CANCELLED",
          dispositionKey: "CANCELLED",
          partnerId: cancelledLead.partnerId,
          pincode: cancelledLead.pincode,
          actorRole: "user",
          actorId: req.auth.sub,
        }),
        occurredAt: updatedAt,
      });
    }
    res.json(success({ flow }));
  } catch (err) {
    next(err);
  }
});