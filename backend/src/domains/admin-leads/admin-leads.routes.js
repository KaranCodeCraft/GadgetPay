import crypto from "crypto";
import { Router } from "express";
import { z } from "zod";
import {
  appendPartnerLeadDispositionEvent,
  assignAdminLead,
  assignAdminLeadsBulk,
  closeAdminLead,
  enqueueLeadEventOutbox,
  getAdminLeadAssignmentMetrics,
  getAdminLeadAssignmentMetricsFromSnapshot,
  getAdminLeadDispositionSummaryFromSnapshot,
  getAdminOverviewMetrics,
  getAdminOverviewMetricsFromSnapshot,
  getAdminPartnerActivityFeed,
  getPartnerById,
  listEligiblePartnersForPincode,
  listPartnersForAdmin,
  listPartnerPincodeScopes,
  listPartnersForAdminSearch,
  partnerEligibleForPincode,
  getPartnerLeadById,
  listPartnerLeadDispositionSummary,
  listPartnerLeadDispositionTimeline,
  listPartnerLeadsForAdmin,
  upsertPartnerPincodeScope,
  updatePartnerAccountStatus,
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

const adminPartnerListQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
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

adminLeadsRouter.get("/", async (req, res, next) => {
  try {
    const query = listLeadsQuerySchema.parse(req.query);
    const result = await listPartnerLeadsForAdmin(query);
    res.json(success({ rows: result.rows, count: result.count }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/disposition-summary", async (req, res, next) => {
  try {
    const query = dispositionSummaryQuerySchema.parse(req.query);
    const summary = await listPartnerLeadDispositionSummary(query);
    res.json(success(summary));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/overview", async (req, res, next) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const overview = (await getAdminOverviewMetricsFromSnapshot(query)) || (await getAdminOverviewMetrics(query));
    const partnerActivity = await getAdminPartnerActivityFeed({
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

adminLeadsRouter.get("/disposition-metrics", async (req, res, next) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const summary = (await getAdminLeadDispositionSummaryFromSnapshot(query)) || (await listPartnerLeadDispositionSummary(query));
    res.json(success(summary));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/assignment-metrics", async (req, res, next) => {
  try {
    const query = metricsQuerySchema.parse(req.query);
    const metrics = (await getAdminLeadAssignmentMetricsFromSnapshot(query)) || (await getAdminLeadAssignmentMetrics(query));
    res.json(success(metrics));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/partners/search", async (req, res, next) => {
  try {
    const query = partnerSearchQuerySchema.parse(req.query);
    const rawRows = await listPartnersForAdminSearch({
      search: query.search,
      pincode: query.pincode,
      includeUnmapped: query.includeUnmapped,
      limit: query.limit,
    });
    const rows = rawRows.filter((row) => {
      if (query.includeUnmapped) return true;
      return row.scopePincode === query.pincode && row.scopeActive;
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/partners", async (req, res, next) => {
  try {
    const query = adminPartnerListQuerySchema.parse(req.query);
    const rows = await listPartnersForAdmin(query);
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.patch("/partners/:partnerId/status", async (req, res, next) => {
  try {
    const input = z.object({ status: z.enum(["ACTIVE", "SUSPENDED", "DEACTIVATED"]) }).parse(req.body);
    const partner = await updatePartnerAccountStatus({
      partnerId: req.params.partnerId,
      status: input.status,
      updatedBy: req.auth.sub,
      updatedAt: nowIso(),
    });
    if (!partner) throw notFound("Partner not found");
    res.json(success({ partner }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/partner-scopes", async (req, res, next) => {
  try {
    const query = scopeListQuerySchema.parse(req.query);
    const rows = await listPartnerPincodeScopes(query);
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.post("/partner-scopes", async (req, res, next) => {
  try {
    const input = upsertScopeSchema.parse(req.body);
    const partner = await getPartnerById(input.partnerId);
    if (!partner) throw notFound("Partner not found");

    const now = nowIso();
    const scope = await upsertPartnerPincodeScope({
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

adminLeadsRouter.get("/eligible-partners", async (req, res, next) => {
  try {
    const query = z.object({ pincode: z.string().regex(/^\d{6}$/) }).parse(req.query);
    const rows = await listEligiblePartnersForPincode(query.pincode);
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.post("/:leadId/assign", async (req, res, next) => {
  try {
    const input = assignLeadSchema.parse(req.body);
    const lead = await getPartnerLeadById(req.params.leadId);
    if (!lead) throw notFound("Lead not found");
    const partner = await getPartnerById(input.partnerId);
    if (!partner) throw notFound("Partner not found");
    const eligible = await partnerEligibleForPincode({ partnerId: input.partnerId, pincode: lead.pincode });
    if (!eligible) {
      throw badRequest("Partner is not eligible for the lead pincode.", {
        partnerId: input.partnerId,
        pincode: lead.pincode,
      });
    }

    const now = nowIso();
    const result = await assignAdminLead({
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

    await appendPartnerLeadDispositionEvent({
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

    await enqueueLeadEventOutbox({
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

adminLeadsRouter.post("/:leadId/close", async (req, res, next) => {
  try {
    const input = z.object({ note: z.string().trim().max(300).optional() }).parse(req.body || {});
    const now = nowIso();
    const result = await closeAdminLead({ leadId: req.params.leadId, closedBy: req.auth.sub, closedAt: now });
    if (result.result === "NOT_FOUND" || !result.lead) throw notFound("Lead not found");
    if (result.result === "TERMINAL") throw badRequest("Lead is already closed or completed.");

    await appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: result.lead.id,
      userSellFlowId: result.lead.userSellFlowId,
      partnerId: result.lead.partnerId,
      fromStatus: result.previousStatus,
      toStatus: result.lead.status,
      dispositionKey: "ADMIN_CLOSED",
      note: input.note || "Lead closed by admin",
      actorRole: "admin",
      actorId: req.auth.sub,
      createdAt: now,
    });

    await enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.closed.admin",
      leadId: result.lead.id,
      payloadJson: JSON.stringify({
        leadId: result.lead.id,
        userSellFlowId: result.lead.userSellFlowId,
        leadType: result.lead.leadType,
        fromStatus: result.previousStatus,
        toStatus: result.lead.status,
        dispositionKey: "ADMIN_CLOSED",
        partnerId: result.lead.partnerId,
        pincode: result.lead.pincode,
        actorRole: "admin",
        actorId: req.auth.sub,
        note: input.note || null,
      }),
      occurredAt: now,
    });

    res.json(success({ lead: result.lead }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.post("/assign/bulk", async (req, res, next) => {
  try {
    const input = assignBulkLeadSchema.parse(req.body);
    const partner = await getPartnerById(input.partnerId);
    if (!partner) throw notFound("Partner not found");
    const now = nowIso();

    const rows = [];
    for (const leadId of input.leadIds) {
      const lead = await getPartnerLeadById(leadId);
      if (!lead) {
        rows.push({
          leadId,
          result: "NOT_FOUND",
          lead: null,
          assignment: null,
        });
        continue;
      }

      const eligible = await partnerEligibleForPincode({ partnerId: input.partnerId, pincode: lead.pincode });
      if (!eligible) {
        rows.push({
          leadId,
          result: "INELIGIBLE_PINCODE",
          lead,
          assignment: null,
        });
        continue;
      }

      const bulkResults = await assignAdminLeadsBulk({
        leadIds: [leadId],
        partnerId: input.partnerId,
        adminId: req.auth.sub,
        assignmentMode: "MANUAL",
        note: input.note || null,
        createdAt: now,
      });
      const row = bulkResults[0];

      if (row.result === "UPDATED" && row.lead) {
        await appendPartnerLeadDispositionEvent({
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

        await enqueueLeadEventOutbox({
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

      rows.push(row);
    }

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminLeadsRouter.get("/:leadId/disposition-events", async (req, res, next) => {
  try {
    const query = timelineQuerySchema.parse(req.query);
    const lead = await getPartnerLeadById(req.params.leadId);
    if (!lead) throw notFound("Lead not found");

    const rows = await listPartnerLeadDispositionTimeline({
      leadId: req.params.leadId,
      limit: query.limit,
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});
