import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { badRequest, unauthorized } from "../../shared/http/errors.js";
import {
  deleteOtpCode,
  getOtpCode,
  getPartnerById,
  getUserByPhone,
  listPartnerActivePickups,
  getRefreshToken,
  revokeRefreshToken,
  saveRefreshToken,
  upsertOtpCode,
  upsertPartner,
  upsertUser,
} from "../../db/repository.js";

function nowIso() {
  return new Date().toISOString();
}

function issueAccessToken(payload) {
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

function issueRefreshToken(payload) {
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

function getOtpCodeForDev() {
  return "6767";
}

export function sendPartnerOtp(phone) {
  const existing = getOtpCode(phone);
  const now = Date.now();

  if (existing && now - existing.sentAt < env.otpResendSeconds * 1000) {
    throw badRequest(`OTP resend allowed after ${env.otpResendSeconds} seconds`);
  }

  const otp = getOtpCodeForDev();
  const expiresAt = now + env.otpExpiryMinutes * 60 * 1000;

  upsertOtpCode({
    phone,
    otp,
    sentAt: now,
    expiresAt,
  });

  return {
    phone,
    otpTtlSeconds: env.otpExpiryMinutes * 60,
    resendAfterSeconds: env.otpResendSeconds,
    devOtp: otp,
  };
}

export function verifyPartnerOtp({ phone, otp, name }) {
  const rec = getOtpCode(phone);

  if (!rec) {
    throw unauthorized("OTP not requested for this phone");
  }

  if (Date.now() > rec.expiresAt) {
    deleteOtpCode(phone);
    throw unauthorized("OTP expired");
  }

  if (rec.otp !== otp) {
    throw unauthorized("Invalid OTP");
  }

  deleteOtpCode(phone);

  const partnerId = `partner-${phone}`;
  const existingPartner = getPartnerById(partnerId);
  const partner = {
    id: partnerId,
    phone,
    name: name || `Partner ${phone.slice(-4)}`,
    createdAt: existingPartner?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  const persistedPartner = upsertPartner(partner);

  const accessToken = issueAccessToken({
    sub: partnerId,
    role: "partner",
    phone,
  });

  const refreshTokenId = crypto.randomUUID();
  const refreshToken = issueRefreshToken({
    sub: partnerId,
    role: "partner",
    tokenId: refreshTokenId,
  });

  saveRefreshToken({
    tokenId: refreshTokenId,
    subjectId: partnerId,
    role: "partner",
    createdAt: nowIso(),
  });

  return {
    partner: persistedPartner,
    accessToken,
    refreshToken,
  };
}

export function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw unauthorized("Invalid refresh token");
  }

  const rec = getRefreshToken(payload.tokenId);
  if (!rec) {
    throw unauthorized("Refresh token revoked");
  }

  const accessToken = issueAccessToken({
    sub: payload.sub,
    role: payload.role,
  });

  return {
    accessToken,
  };
}

export function logoutSession(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw unauthorized("Invalid refresh token");
  }

  const rec = getRefreshToken(payload.tokenId);
  if (!rec) {
    throw unauthorized("Refresh token revoked");
  }

  if (payload.role === "partner") {
    const activePickups = listPartnerActivePickups({ partnerId: payload.sub, limit: 50 });
    if (activePickups.length > 0) {
      throw badRequest("Complete active pickup and payment workflow before logout.");
    }
  }

  revokeRefreshToken(payload.tokenId);
  return { loggedOut: true };
}

export function adminDevLogin({ key, adminId }) {
  if (key !== env.adminDevKey) {
    throw unauthorized("Invalid admin dev key");
  }

  const accessToken = issueAccessToken({
    sub: adminId,
    role: "admin",
  });

  const refreshTokenId = crypto.randomUUID();
  const refreshToken = issueRefreshToken({
    sub: adminId,
    role: "admin",
    tokenId: refreshTokenId,
  });

  saveRefreshToken({
    tokenId: refreshTokenId,
    subjectId: adminId,
    role: "admin",
    createdAt: nowIso(),
  });

  return {
    admin: { id: adminId, role: "admin" },
    accessToken,
    refreshToken,
  };
}

export function sendUserOtp(phone) {
  const existing = getOtpCode(phone);
  const now = Date.now();

  if (existing && now - existing.sentAt < env.otpResendSeconds * 1000) {
    throw badRequest(`OTP resend allowed after ${env.otpResendSeconds} seconds`);
  }

  const otp = getOtpCodeForDev();
  const expiresAt = now + env.otpExpiryMinutes * 60 * 1000;

  upsertOtpCode({ phone, otp, sentAt: now, expiresAt });
  const existingUser = getUserByPhone(phone);

  return {
    phone,
    otpTtlSeconds: env.otpExpiryMinutes * 60,
    resendAfterSeconds: env.otpResendSeconds,
    devOtp: otp,
    isNewUser: !existingUser,
    requiresName: !existingUser,
  };
}

export function verifyUserOtp({ phone, otp, name }) {
  const rec = getOtpCode(phone);

  if (!rec) throw unauthorized("OTP not requested for this phone");
  if (Date.now() > rec.expiresAt) {
    deleteOtpCode(phone);
    throw unauthorized("OTP expired");
  }
  if (rec.otp !== otp) throw unauthorized("Invalid OTP");

  deleteOtpCode(phone);

  const userId = `user-${phone}`;
  const now = nowIso();
  const existingUser = getUserByPhone(phone);

  if (!existingUser && !name) {
    throw badRequest("Name is required for new user");
  }

  const user = {
    id: existingUser?.id || userId,
    phone,
    name: existingUser?.name || name,
    createdAt: existingUser?.createdAt || now,
    updatedAt: now,
  };

  const persistedUser = upsertUser(user);

  const accessToken = issueAccessToken({ sub: userId, role: "user", phone });

  const refreshTokenId = crypto.randomUUID();
  const refreshToken = issueRefreshToken({ sub: userId, role: "user", tokenId: refreshTokenId });

  saveRefreshToken({ tokenId: refreshTokenId, subjectId: userId, role: "user", createdAt: now });

  return { user: persistedUser, accessToken, refreshToken };
}
