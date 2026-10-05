import { Router } from "express";
import { authRouter } from "../../domains/auth/auth.routes.js";
import { partnerRouter } from "../../domains/partner/partner.routes.js";
import { serviceabilityRouter } from "../../domains/serviceability/serviceability.routes.js";
import { adminServiceabilityRouter } from "../../domains/admin-serviceability/admin-serviceability.routes.js";
import { adminKycRouter } from "../../domains/admin-kyc/admin-kyc.routes.js";
import { adminLeadsRouter } from "../../domains/admin-leads/admin-leads.routes.js";
import { adminPricingRouter } from "../../domains/admin-pricing/admin-pricing.routes.js";
import { pricingRouter } from "../../domains/pricing/pricing.routes.js";
import { userRouter } from "../../domains/user/user.routes.js";
import { success } from "../../shared/http/response.js";
import { getMediaAssetById } from "../../db/repository.js";
import { readMediaBuffer } from "../../shared/store/local-media.js";
import { requireAuth } from "../../shared/middleware/auth.js";
import { notFound, forbidden } from "../../shared/http/errors.js";

export const v1Router = Router();

v1Router.get("/health", (req, res) => {
  res.json(
    success({
      status: "ok",
      service: "gadgetpe-backend",
      ts: new Date().toISOString(),
    }),
  );
});

v1Router.use("/auth", authRouter);
v1Router.use("/user", userRouter);
v1Router.use("/partner", partnerRouter);
v1Router.use("/serviceability", serviceabilityRouter);
v1Router.use("/pricing", pricingRouter);
v1Router.use("/admin/serviceability", adminServiceabilityRouter);
v1Router.use("/admin/kyc", adminKycRouter);
v1Router.use("/admin/leads", adminLeadsRouter);
v1Router.use("/admin/pricing", adminPricingRouter);

v1Router.get("/media/:mediaId", requireAuth, async (req, res, next) => {
  try {
    const media = await getMediaAssetById(req.params.mediaId);
    if (!media || media.status !== "ACTIVE") {
      throw notFound("Media not found");
    }

    const isAdmin = req.auth?.role === "admin";
    const isOwner = media.ownerRole === req.auth?.role && media.ownerId === req.auth?.sub;
    if (!isAdmin && !isOwner) {
      throw forbidden("You do not have access to this media");
    }

    const buffer = readMediaBuffer(media.relativePath);
    res.setHeader("Content-Type", media.mimeType);
    res.setHeader("Content-Length", String(media.sizeBytes));
    res.setHeader("Content-Disposition", `inline; filename="${media.originalFileName}"`);
    res.send(buffer);
  } catch (err) {
    next(err);
  }
});
