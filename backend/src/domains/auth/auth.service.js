import crypto from "crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { badRequest, forbidden, unauthorized } from "../../shared/http/errors.js";
import { sendFonadaSms } from "./fonada.js";
import { getOtpTemplate } from "./otp-templates.js";
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

let _providerBootLogged = false;

function logOtpProviderOnce() {
  if (_providerBootLogged) return;
  _providerBootLogged = true;
  console.info(`[OTP] Provider=FONADA sender=${env.fonadaFrom}`);
}

function getOtpStorageKey(role, phone) {
  return `${role}:${phone}`;
}

function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

async function sendProviderOtp({ phone, role, templateKey, templateVariables = {} }) {
  logOtpProviderOnce();
  const otpStorageKey = getOtpStorageKey(role, phone);
  const existing = await getOtpCode(otpStorageKey);
  const now = Date.now();

  if (existing && now - existing.sentAt < env.otpResendSeconds * 1000) {
    throw badRequest(`OTP resend allowed after ${env.otpResendSeconds} seconds`);
  }

  const otp = createOtp();
  const template = getOtpTemplate(templateKey);
  const contentId = env[template.contentIdConfig];
  const message = template.render({ ...templateVariables, otp });
  await sendFonadaSms({ phone, message, contentId });

  await upsertOtpCode({
    phone: otpStorageKey,
    otp,
    sentAt: now,
    expiresAt: now + env.otpExpiryMinutes * 60 * 1000,
  });

  return {
    phone,
    otpTtlSeconds: env.otpExpiryMinutes * 60,
    resendAfterSeconds: env.otpResendSeconds,
    deliveryStatus: "sent",
  };
}

export async function sendPartnerOtp(phone) {
  return sendProviderOtp({ phone, role: "partner", templateKey: "createPartner" });
}

export async function verifyPartnerOtp({ phone, otp, name }) {
  const otpStorageKey = getOtpStorageKey("partner", phone);

  const rec = await getOtpCode(otpStorageKey);

  if (!rec) {
    throw unauthorized("OTP not requested for this phone");
  }

  if (Date.now() > rec.expiresAt) {
    await deleteOtpCode(otpStorageKey);
    throw unauthorized("OTP expired");
  }

  if (rec.otp !== otp) {
    throw unauthorized("Invalid OTP");
  }

  await deleteOtpCode(otpStorageKey);

  const partnerId = `partner-${phone}`;
  const existingPartner = await getPartnerById(partnerId);
  if (existingPartner && existingPartner.status !== "ACTIVE") {
    throw forbidden("Partner account is suspended or deactivated");
  }
  const partner = {
    id: partnerId,
    phone,
    name: name || existingPartner?.name || `Partner ${phone.slice(-4)}`,
    createdAt: existingPartner?.createdAt || nowIso(),
    updatedAt: nowIso(),
  };

  const persistedPartner = await upsertPartner(partner);

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

  await saveRefreshToken({
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

export async function refreshAccessToken(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw unauthorized("Invalid refresh token");
  }

  const rec = await getRefreshToken(payload.tokenId);
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

export async function logoutSession(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, env.jwtRefreshSecret);
  } catch {
    throw unauthorized("Invalid refresh token");
  }

  const rec = await getRefreshToken(payload.tokenId);
  if (!rec) {
    throw unauthorized("Refresh token revoked");
  }

  if (payload.role === "partner") {
    const activePickups = await listPartnerActivePickups({ partnerId: payload.sub, limit: 50 });
    if (activePickups.length > 0) {
      throw badRequest("Complete active pickup and payment workflow before logout.");
    }
  }

  await revokeRefreshToken(payload.tokenId);
  return { loggedOut: true };
}

export async function adminDevLogin({ key, adminId }) {
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

  await saveRefreshToken({
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

export async function sendUserOtp(phone, templateKey = "loginAccount") {
  const fonadaResult = await sendProviderOtp({ phone, role: "user", templateKey });
  const existingUser = await getUserByPhone(phone);

  return {
    ...fonadaResult,
    isNewUser: !existingUser,
    requiresName: !existingUser,
  };
}

export async function verifyUserOtp({ phone, otp, name }) {
  const otpStorageKey = getOtpStorageKey("user", phone);

  const rec = await getOtpCode(otpStorageKey);

  if (!rec) throw unauthorized("OTP not requested for this phone");
  if (Date.now() > rec.expiresAt) {
    await deleteOtpCode(otpStorageKey);
    throw unauthorized("OTP expired");
  }
  if (rec.otp !== otp) throw unauthorized("Invalid OTP");

  await deleteOtpCode(otpStorageKey);

  const userId = `user-${phone}`;
  const now = nowIso();
  const existingUser = await getUserByPhone(phone);

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

  const persistedUser = await upsertUser(user);

  const accessToken = issueAccessToken({ sub: userId, role: "user", phone });

  const refreshTokenId = crypto.randomUUID();
  const refreshToken = issueRefreshToken({ sub: userId, role: "user", tokenId: refreshTokenId });

  await saveRefreshToken({ tokenId: refreshTokenId, subjectId: userId, role: "user", createdAt: now });

  return { user: persistedUser, accessToken, refreshToken };
}
