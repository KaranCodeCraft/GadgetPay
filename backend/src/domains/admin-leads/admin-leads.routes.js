import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import {
  appendPartnerLeadDispositionEvent,
  assignAdminLead,
  assignAdminLeadsBulk,
  enqueueLeadEventOutbox,
  getAdminLeadAssignmentMetrics,
  getAdminLeadAssignmentMetricsFromSnapshot,
  getAdminLeadDispositionSummaryFromSnapshot,
  getAdminOverviewMetrics,
  getAdminOverviewMetricsFromSnapshot,
  getAdminPartnerActivityFeed,
  getPartnerById,
  listEligiblePartnersForPincode,
  listPartnerPincodeScopes,
  listPartnersForAdminSearch,
  partnerEligibleForPincode,
  getPartnerLeadById,
  listPartnerLeadDispositionSummary,
  listPartnerLeadDispositionTimeline,
  listPartnerLeadsForAdmin,
  upsertPartnerPincodeScope,
} from "../../db/repository.js";
import { badRequest, notFound } from "../../shared/http/errors.js";
import { success } from "../../shared/http/response.js";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";

const listLeadsQuerySchema = z.object({
  status: z.string().trim().min(1).max(40).optional(),
  leadType: z.enum(["LEAD_BUCKET", "SERVICE_LEAD"]).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  partnerId: z.string().trim().min(1).max(80).optional(),
  search: z.string().trim().min(1).max(120).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).max(100000).optional().default(0),
});

const dispositionSummaryQuerySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  partnerId: z.string().trim().min(1).max(80).optional(),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});

const timelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const metricsQuerySchema = z.object({
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  partnerId: z.string().trim().min(1).max(80).optional(),
  leadType: z.enum(["LEAD_BUCKET", "SERVICE_LEAD"]).optional(),
});

const assignLeadSchema = z.object({
  partnerId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(300).optional(),
  mode: z.enum(["MANUAL", "AUTO"]).optional().default("MANUAL"),
});

const assignBulkLeadSchema = z.object({
  leadIds: z.array(z.string().trim().min(1).max(120)).min(1).max(5),
  partnerId: z.string().trim().min(1).max(120),
  note: z.string().trim().max(300).optional(),
});

const partnerSearchQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  pincode: z.string().regex(/^\d{6}$/),
  includeUnmapped: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

const scopeListQuerySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  partnerId: z.string().trim().min(1).max(120).optional(),
  activeOnly: z.coerce.boolean().optional().default(false),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const upsertScopeSchema = z.object({
  partnerId: z.string().trim().min(1).max(120),
  pincode: z.string().regex(/^\d{6}$/),
  isActive: z.boolean().optional().default(true),
});

function nowIso() {
  return new Date().toISOString();
}

export const adminLeadsRouter = Router();

adminLeadsRouter.use(requireAuth, requireRole("admin"));

adminLeadsRouter.get("/", (req, res, next) => {
  try {
    const query = listLeadsQuerySchema.parse(req.query);
    const result = listPartnerLeadsForAdmin(query);
    res.json(success({ rows: result.rows, count: result.count }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/disposition-summary", (req, res, next) => {
  try {
    const query = dispositionSummaryQuerySchema.parse(req.query);
    const summary = listPartnerLeadDispositionSummary(query);
    res.json(success(summary));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/overview", (req, res, next) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const overview = getAdminOverviewMetricsFromSnapshot(query) || getAdminOverviewMetrics(query);
    const partnerActivity = getAdminPartnerActivityFeed({
      fromDate: query.fromDate,
      toDate: query.toDate,
      pincode: query.pincode,
      limit: 10,
    });
    res.json(success({ ...overview, partnerActivity }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/disposition-metrics", (req, res, next) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const summary = getAdminLeadDispositionSummaryFromSnapshot(query) || listPartnerLeadDispositionSummary(query);
    res.json(success(summary));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/assignment-metrics", (req, res, next) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const metrics = getAdminLeadAssignmentMetricsFromSnapshot(query) || getAdminLeadAssignmentMetrics(query);
    res.json(success(metrics));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/partners/search", (req, res, next) => {
  try {
    const query = partnerSearchQuerySchema.parse(req.query);
    const rows = listPartnersForAdminSearch({
      search: query.search,
      pincode: query.pincode,
      includeUnmapped: query.includeUnmapped,
      limit: query.limit,
    }).filter((row) => {
      if (query.includeUnmapped) return true;
      return row.scopePincode === query.pincode && row.scopeActive;
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/partner-scopes", (req, res, next) => {
  try {
    const query = scopeListQuerySchema.parse(req.query);
    const rows = listPartnerPincodeScopes(query);
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.post("/partner-scopes", (req, res, next) => {
  try {
    const input = upsertScopeSchema.parse(req.body);
    const partner = getPartnerById(input.partnerId);
    if (!partner) throw notFound("Partner not found");

    const now = nowIso();
    const scope = upsertPartnerPincodeScope({
      id: crypto.randomUUID(),
      partnerId: input.partnerId,
      pincode: input.pincode,
      isActive: input.isActive,
      updatedBy: req.auth.sub,
      createdAt: now,
      updatedAt: now,
    });

    res.json(success({ scope }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/eligible-partners", (req, res, next) => {
  try {
    const query = z.object({ pincode: z.string().regex(/^\d{6}$/) }).parse(req.query);
    const rows = listEligiblePartnersForPincode(query.pincode);
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.post("/:leadId/assign", (req, res, next) => {
  try {
    const input = assignLeadSchema.parse(req.body);
    const lead = getPartnerLeadById(req.params.leadId);
    if (!lead) throw notFound("Lead not found");
    const partner = getPartnerById(input.partnerId);
    if (!partner) throw notFound("Partner not found");
    if (!partnerEligibleForPincode({ partnerId: input.partnerId, pincode: lead.pincode })) {
      throw badRequest("Partner is not eligible for the lead pincode.", {
        partnerId: input.partnerId,
        pincode: lead.pincode,
      });
    }

    const now = nowIso();
    const result = assignAdminLead({
      leadId: req.params.leadId,
      partnerId: input.partnerId,
      adminId: req.auth.sub,
      assignmentMode: input.mode,
      note: input.note || null,
      createdAt: now,
    });

    if (result.result === "NOT_FOUND" || !result.lead) throw notFound("Lead not found");
    if (result.result === "TERMINAL") throw badRequest("Terminal lead cannot be reassigned.");

    const isAuto = input.mode === "AUTO";
    const dispositionKey = isAuto ? "ASSIGNED_AUTO" : "ASSIGNED_MANUAL";
    const eventType = isAuto ? "lead.assigned.auto" : "lead.assigned.manual";

    appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: result.lead.id,
      userSellFlowId: result.lead.userSellFlowId,
      partnerId: result.lead.partnerId,
      fromStatus: result.previousStatus || null,
      toStatus: result.lead.status,
      dispositionKey,
      note: input.note || "Admin assigned lead",
      actorRole: "admin",
      actorId: req.auth.sub,
      createdAt: now,
    });

    enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType,
      leadId: result.lead.id,
      payloadJson: JSON.stringify({
        leadId: result.lead.id,
        userSellFlowId: result.lead.userSellFlowId,
        leadType: result.lead.leadType,
        fromStatus: result.previousStatus || null,
        toStatus: result.lead.status,
        partnerId: result.lead.partnerId,
        pincode: result.lead.pincode,
        actorRole: "admin",
        actorId: req.auth.sub,
        note: input.note || null,
      }),
      occurredAt: now,
    });

    res.json(success({ lead: result.lead, assignment: result.assignment }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.post("/assign/bulk", (req, res, next) => {
  try {
    const input = assignBulkLeadSchema.parse(req.body);
    const partner = getPartnerById(input.partnerId);
    if (!partner) throw notFound("Partner not found");
    const now = nowIso();

    const rows = input.leadIds.map((leadId) => {
      const lead = getPartnerLeadById(leadId);
      if (!lead) {
        return {
          leadId,
          result: "NOT_FOUND",
          lead: null,
          assignment: null,
        };
      }

      if (!partnerEligibleForPincode({ partnerId: input.partnerId, pincode: lead.pincode })) {
        return {
          leadId,
          result: "INELIGIBLE_PINCODE",
          lead,
          assignment: null,
        };
      }

      const row = assignAdminLeadsBulk({
        leadIds: [leadId],
        partnerId: input.partnerId,
        adminId: req.auth.sub,
        assignmentMode: "MANUAL",
        note: input.note || null,
        createdAt: now,
      })[0];

      if (row.result === "UPDATED" && row.lead) {
        appendPartnerLeadDispositionEvent({
          id: crypto.randomUUID(),
          leadId: row.lead.id,
          userSellFlowId: row.lead.userSellFlowId,
          partnerId: row.lead.partnerId,
          fromStatus: row.previousStatus,
          toStatus: row.lead.status,
          dispositionKey: "ASSIGNED_MANUAL",
          note: input.note || "Admin bulk assigned lead",
          actorRole: "admin",
          actorId: req.auth.sub,
          createdAt: now,
        });

        enqueueLeadEventOutbox({
          id: crypto.randomUUID(),
          eventType: "lead.assigned.manual",
          leadId: row.lead.id,
          payloadJson: JSON.stringify({
            leadId: row.lead.id,
            userSellFlowId: row.lead.userSellFlowId,
            leadType: row.lead.leadType,
            fromStatus: row.previousStatus,
            toStatus: row.lead.status,
            partnerId: row.lead.partnerId,
            pincode: row.lead.pincode,
            actorRole: "admin",
            actorId: req.auth.sub,
            note: input.note || null,
            bulk: true,
          }),
          occurredAt: now,
        });
      }

      return row;
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/:leadId/disposition-events", (req, res, next) => {
  try {
    const query = timelineQuerySchema.parse(req.query);
    const lead = getPartnerLeadById(req.params.leadId);
    if (!lead) throw notFound("Lead not found");

    const rows = listPartnerLeadDispositionTimeline({
      leadId: req.params.leadId,
      limit: query.limit,
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});
