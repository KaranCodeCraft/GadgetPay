import { Router } from "express";
import { success } from "../../shared/http/response.js";
import {
  adminDevLogin,
  refreshAccessToken,
  sendPartnerOtp,
  sendUserOtp,
  verifyPartnerOtp,
  verifyUserOtp,
  logoutSession,
} from "./auth.service.js";
import {
  adminDevLoginSchema,
  refreshTokenSchema,
  sendOtpSchema,
  verifyOtpSchema,
  verifyUserOtpSchema,
  logoutSchema,
} from "./auth.schemas.js";

export const authRouter = Router();

authRouter.post("/partner/otp/send", async (req, res, next) => {
  try {
    const input = sendOtpSchema.parse(req.body);
    const result = await sendPartnerOtp(input.phone);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/partner/otp/verify", async (req, res, next) => {
  try {
    const input = verifyOtpSchema.parse(req.body);
    const result = await verifyPartnerOtp(input);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/refresh", (req, res, next) => {
  try {
    const input = refreshTokenSchema.parse(req.body);
    const result = refreshAccessToken(input.refreshToken);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/logout", (req, res, next) => {
  try {
    const input = logoutSchema.parse(req.body);
    const result = logoutSession(input.refreshToken);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/user/otp/send", async (req, res, next) => {
  try {
    const input = sendOtpSchema.parse(req.body);
    const result = await sendUserOtp(input.phone, "loginAccount");
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/user/otp/verify", async (req, res, next) => {
  try {
    const input = verifyUserOtpSchema.parse(req.body);
    const result = await verifyUserOtp(input);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});

// Dev-only helper so admin serviceability APIs can be tested from day one.
authRouter.post("/admin/dev-login", (req, res, next) => {
  try {
    const input = adminDevLoginSchema.parse(req.body);
    const result = adminDevLogin(input);
    res.json(success(result));
  } catch (err) {
    next(err);
  }
});
