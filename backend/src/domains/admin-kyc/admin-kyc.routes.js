import { Router } from "express";
import { z } from "zod";
import { success } from "../../shared/http/response.js";
import { notFound } from "../../shared/http/errors.js";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import {
  getKycById,
  listKycSubmissions,
  updateKycVerification,
} from "../../db/repository.js";

const listQuerySchema = z.object({
  status: z.enum(["PENDING_REVIEW", "VERIFIED", "REJECTED"]).optional(),
  partnerId: z.string().optional(),
});

const verifySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  notes: z.string().max(400).optional(),
});

function nowIso() {
  return new Date().toISOString();
}

export const adminKycRouter = Router();

adminKycRouter.use(requireAuth, requireRole("admin"));

adminKycRouter.get("/submissions", async (req, res, next) => {
  try {
    const query = listQuerySchema.parse({
      status: req.query.status,
      partnerId: req.query.partnerId,
    });

    const rows = await listKycSubmissions({
      status: query.status,
      partnerId: query.partnerId,
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminKycRouter.patch("/submissions/:kycId/verification", async (req, res, next) => {
  try {
    const kycId = z.string().uuid().parse(req.params.kycId);
    const input = verifySchema.parse(req.body);

    const existing = await getKycById(kycId);
    if (!existing) {
      throw notFound("KYC submission not found");
    }

    const updated = await updateKycVerification({
      kycId,
      verificationStatus: input.action === "APPROVE" ? "VERIFIED" : "REJECTED",
      verificationNotes: input.notes || (input.action === "APPROVE" ? "Approved by admin" : "Rejected by admin"),
      verifiedBy: req.auth.sub,
      verifiedAt: nowIso(),
      updatedAt: nowIso(),
    });

    res.json(success(updated));
  } catch (err) {
    next(err);
  }
});

