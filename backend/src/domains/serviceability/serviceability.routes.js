import { Router } from "express";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { success } from "../../shared/http/response.js";
import {
  getPincodeDetails,
  resolvePartnerTenantScope,
} from "./serviceability.service.js";

export const serviceabilityRouter = Router();

serviceabilityRouter.get("/availability/:pincode", async (req, res, next) => {
  try {
    const result = await getPincodeDetails(req.params.pincode);
    res.json(
      success({
        pincode: result.pincode,
        status: result.serviceability.status,
        reason: result.serviceability.reason,
        location: {
          state: result.provider.state,
          district: result.provider.district,
          officeCount: result.provider.offices.length,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
});

serviceabilityRouter.get("/pincodes/:pincode", requireAuth, async (req, res, next) => {
  try {
    const result = await getPincodeDetails(req.params.pincode);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

serviceabilityRouter.post(
  "/scope/resolve",
  requireAuth,
  requireRole("partner"),
  async (req, res, next) => {
    try {
      const result = await resolvePartnerTenantScope(req.body, req.auth.sub);
      res.json(success(result));
    } catch (err) {
      next(err);
    }
  },
);
