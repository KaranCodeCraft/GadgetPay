import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import {
  autoAssignLeadByPincodeRoundRobin,
  appendPartnerLeadDispositionEvent,
  cancelUserSellFlow,
  createUserSellFlow,
  enqueueLeadEventOutbox,
  getUserById,
  getPartnerLeadByFlowId,
  getUserSellFlowById,
  listUserSellFlows,
  markPartnerLeadCancelledForFlow,
  updateUserSellFlow,
  upsertPartnerLeadFromUserFlow,
} from "../../db/repository.js";
import { badRequest, notFound } from "../../shared/http/errors.js";
import { success } from "../../shared/http/response.js";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { calculateUserQuote } from "../pricing/quote-deduction.service.js";
import { getPincodeDetails } from "../serviceability/serviceability.service.js";

const flowStatuses = ["DRAFT", "QUESTIONNAIRE_COMPLETED", "QUOTE_READY", "PICKUP_SCHEDULED", "CANCELLED"];

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
  physicalIssues: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  nestedPhysicalIssueAnswers: z.record(z.string().trim().min(1).max(160)).optional().default({}),
  functionalProblems: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  accessories: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  cameraAndBiometrics: answerMapSchema.optional().default({}),
  sensorsAndConnectivity: answerMapSchema.optional().default({}),
  batteryAndCharging: answerMapSchema.optional().default({}),
  accessoriesAndOwnership: answerMapSchema.optional().default({}),
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

const listQuerySchema = z.object({
  status: z.enum(flowStatuses).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
});

export const userRouter = Router();

userRouter.use(requireAuth, requireRole("user"));

function nowIso() {
  return new Date().toISOString();
}

function getUser(req) {
  return getUserById(req.auth.sub) || {
    id: req.auth.sub,
    phone: req.auth.phone || null,
    name: "User",
  };
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

function syncPartnerLead({ flow, user, leadType, pincode, status = "AVAILABLE", updatedAt }) {
  if (!pincode) return null;

  const pickupSchedule = flow.pickupSchedule || null;
  const existingLead = getPartnerLeadByFlowId(flow.id);
  const lead = upsertPartnerLeadFromUserFlow({
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
    appendPartnerLeadDispositionEvent({
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

    enqueueLeadEventOutbox({
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

function requireFlow(req) {
  const flow = getUserSellFlowById({ id: req.params.flowId, userId: req.auth.sub });
  if (!flow) throw notFound("Sell flow not found");
  return flow;
}

userRouter.get("/me", (req, res) => {
  res.json(success({ user: getUser(req) }));
});

userRouter.post("/sell-flows", (req, res, next) => {
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

    const flow = createUserSellFlow({
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

userRouter.get("/sell-flows", (req, res, next) => {
  try {
    const query = listQuerySchema.parse(req.query);
    const rows = listUserSellFlows({ userId: req.auth.sub, status: query.status, limit: query.limit });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

userRouter.get("/sell-flows/:flowId", (req, res, next) => {
  try {
    res.json(success({ flow: requireFlow(req) }));
  } catch (err) {
    next(err);
  }
});

userRouter.patch("/sell-flows/:flowId/device-details", (req, res, next) => {
  try {
    const input = deviceDetailsBodySchema.parse(req.body);
    const existing = requireFlow(req);
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

    const flow = updateUserSellFlow({
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

userRouter.post("/sell-flows/:flowId/quote", (req, res, next) => {
  try {
    const existing = requireFlow(req);
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
    const quote = calculateUserQuote({ selectedModel: existing.selectedModel, deviceDetails: existing.deviceDetails });
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

    const flow = updateUserSellFlow({
      id: existing.id,
      userId: req.auth.sub,
      status: "QUOTE_READY",
      quoteJson: JSON.stringify(quote),
      flowJson: JSON.stringify(flowJson),
      updatedAt,
    });

    syncPartnerLead({
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
    const existing = requireFlow(req);
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

    const flow = updateUserSellFlow({
      id: existing.id,
      userId: req.auth.sub,
      status: "PICKUP_SCHEDULED",
      pickupScheduleJson: JSON.stringify(pickupSchedule),
      quoteJson: JSON.stringify(quote),
      flowJson: JSON.stringify(flowJson),
      updatedAt,
    });

    const serviceLead = syncPartnerLead({
      flow,
      user,
      leadType: "SERVICE_LEAD",
      pincode: pickupSchedule.pincode,
      updatedAt,
    });

    if (serviceLead?.id && !serviceLead.partnerId) {
      const autoAssignment = autoAssignLeadByPincodeRoundRobin({
        leadId: serviceLead.id,
        adminId: "system-auto-allocator",
        note: "Automatic round-robin assignment by pincode",
        createdAt: updatedAt,
      });

      if (autoAssignment.result === "UPDATED" && autoAssignment.lead) {
        appendPartnerLeadDispositionEvent({
          id: crypto.randomUUID(),
          leadId: autoAssignment.lead.id,
          userSellFlowId: autoAssignment.lead.userSellFlowId,
          partnerId: autoAssignment.lead.partnerId,
          fromStatus: autoAssignment.previousStatus || null,
          toStatus: autoAssignment.lead.status,
          dispositionKey: "ASSIGNED_AUTO",
          note: "Automatic round-robin assignment by pincode",
          actorRole: "system",
          actorId: "system-auto-allocator",
          createdAt: updatedAt,
        });

        enqueueLeadEventOutbox({
          id: crypto.randomUUID(),
          eventType: "lead.assigned.auto",
          leadId: autoAssignment.lead.id,
          payloadJson: JSON.stringify({
            leadId: autoAssignment.lead.id,
            userSellFlowId: autoAssignment.lead.userSellFlowId,
            leadType: autoAssignment.lead.leadType,
            fromStatus: autoAssignment.previousStatus || null,
            toStatus: autoAssignment.lead.status,
            partnerId: autoAssignment.lead.partnerId,
            pincode: autoAssignment.lead.pincode,
            actorRole: "system",
            actorId: "system-auto-allocator",
            note: "Automatic round-robin assignment by pincode",
          }),
          occurredAt: updatedAt,
        });
      }
    }

    res.json(success({ flow }));
  } catch (err) {
    next(err);
  }
});

// User reschedule: update pickup dates/times only, preserve address, sync partner lead + disposition
userRouter.patch("/sell-flows/:flowId/reschedule", async (req, res, next) => {
  try {
    const input = rescheduleBodySchema.parse(req.body);
    const existing = requireFlow(req);
    if (existing.status === "CANCELLED") throw badRequest("Cancelled sell flow cannot be rescheduled");
    if (existing.status !== "PICKUP_SCHEDULED") throw badRequest("Only PICKUP_SCHEDULED flows can be rescheduled", { currentStatus: existing.status });
    if (!existing.pickupSchedule) throw badRequest("No existing pickup schedule found to base reschedule on");
    const existingLead = getPartnerLeadByFlowId(existing.id);
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
    const flow = updateUserSellFlow({
      id: existing.id, userId: req.auth.sub, status: "PICKUP_SCHEDULED",
      pickupScheduleJson: JSON.stringify(pickupSchedule),
      quoteJson: null, flowJson: JSON.stringify(flowJson), updatedAt,
    });
    const pincode = getFlowPincode(flow) || existingLead?.pincode;
    if (pincode) {
      upsertPartnerLeadFromUserFlow({
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
        appendPartnerLeadDispositionEvent({
          id: crypto.randomUUID(), leadId: existingLead.id,
          userSellFlowId: flow.id, partnerId: existingLead.partnerId || null,
          fromStatus: existingLead.status, toStatus: existingLead.status,
          dispositionKey: "RESCHEDULE_REQUESTED",
          note: `Pickup rescheduled by user to ${input.primaryDate.split("T")[0]} ${input.primaryTime}`,
          actorRole: "user", actorId: req.auth.sub, createdAt: updatedAt,
        });
        enqueueLeadEventOutbox({
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

// User reschedule: update pickup dates/times only, preserve address, sync partner lead + disposition event
userRouter.patch("/sell-flows/:flowId/reschedule", async (req, res, next) => {
  try {
    const input = rescheduleBodySchema.parse(req.body);
    const existing = requireFlow(req);
    if (existing.status === "CANCELLED") throw badRequest("Cancelled sell flow cannot be rescheduled");
    if (existing.status !== "PICKUP_SCHEDULED") throw badRequest("Only scheduled pickups can be rescheduled", { currentStatus: existing.status });
    if (!existing.pickupSchedule) throw badRequest("No existing pickup schedule found");
    const existingLead = getPartnerLeadByFlowId(existing.id);
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
    const flow = updateUserSellFlow({
      id: existing.id, userId: req.auth.sub, status: "PICKUP_SCHEDULED",
      pickupScheduleJson: JSON.stringify(pickupSchedule),
      quoteJson: null, flowJson: JSON.stringify(flowJson), updatedAt,
    });
    const pincode = getFlowPincode(flow) || existingLead?.pincode;
    if (pincode) {
      upsertPartnerLeadFromUserFlow({
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
        appendPartnerLeadDispositionEvent({
          id: crypto.randomUUID(), leadId: existingLead.id,
          userSellFlowId: flow.id, partnerId: existingLead.partnerId || null,
          fromStatus: existingLead.status, toStatus: existingLead.status,
          dispositionKey: "RESCHEDULE_REQUESTED",
          note: `Pickup rescheduled by user to ${input.primaryDate.split("T")[0]} ${input.primaryTime}`,
          actorRole: "user", actorId: req.auth.sub, createdAt: updatedAt,
        });
        enqueueLeadEventOutbox({
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
userRouter.get("/sell-flows/:flowId/lead-status", (req, res, next) => {
  try {
    const flow = requireFlow(req);
    const lead = getPartnerLeadByFlowId(flow.id);
    if (!lead) return res.json(success({ found: false, lead: null }));
    res.json(success({
      found: true,
      lead: {
        id: lead.id,
        status: lead.status,
        completedAt: lead.completedAt || null,
        completionEvent: lead.completionEvent || null,
        paymentProof: lead.paymentProof ? {
          amountCollected: lead.paymentProof.amountCollected,
          paymentMode: lead.paymentProof.paymentMode,
          transactionRef: lead.paymentProof.transactionRef || null,
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

userRouter.get("/sell-flows/:flowId/invoice", (req, res, next) => {
  try {
    const flow = requireFlow(req);
    const lead = getPartnerLeadByFlowId(flow.id);
    if (!lead || lead.status !== "COMPLETED" || !lead.completionEvent?.invoice) {
      throw notFound("Invoice not found");
    }

    res.json(success({ invoice: lead.completionEvent.invoice }));
  } catch (err) {
    next(err);
  }
});

userRouter.post("/sell-flows/:flowId/cancel", (req, res, next) => {
  try {
    const updatedAt = nowIso();
    const flow = cancelUserSellFlow({ id: req.params.flowId, userId: req.auth.sub, updatedAt });
    if (!flow) throw notFound("Sell flow not found");
    const existingLead = getPartnerLeadByFlowId(flow.id);
    const cancelledLead = markPartnerLeadCancelledForFlow({ userSellFlowId: flow.id, updatedAt });
    if (cancelledLead) {
      const eventId = crypto.randomUUID();
      appendPartnerLeadDispositionEvent({
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

      enqueueLeadEventOutbox({
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