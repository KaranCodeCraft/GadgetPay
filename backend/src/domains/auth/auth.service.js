import crypto from "crypto";
import jwt from "jsonwebtoken";
import twilio from "twilio";
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

function getOtpProvider() {
  return String(env.otpProvider || "DEV").toUpperCase();
}

function isTwilioProviderEnabled() {
  return getOtpProvider() === "TWILIO";
}

function assertTwilioConfig() {
  if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioVerifyServiceSid) {
    throw badRequest("Twilio OTP is not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_VERIFY_SERVICE_SID.");
  }
}

let _twilioClient;
let _providerBootLogged = false;

function logOtpProviderOnce() {
  if (_providerBootLogged) return;
  _providerBootLogged = true;
  const provider = getOtpProvider();
  if (provider === "TWILIO") {
    console.info(`[OTP] Provider=TWILIO service=${env.twilioVerifyServiceSid}`);
  } else {
    console.warn("[OTP] Provider=DEV using local OTP code flow");
  }
}

function getTwilioClient() {
  if (!_twilioClient) {
    _twilioClient = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }
  return _twilioClient;
}

function toIndianE164(phone) {
  return `+91${phone}`;
}

function getOtpStorageKey(role, phone) {
  return `${role}:${phone}`;
}

async function sendTwilioVerifyOtp(phone) {
  logOtpProviderOnce();
  assertTwilioConfig();
  const client = getTwilioClient();
  const verification = await client.verify.v2.services(env.twilioVerifyServiceSid).verifications.create({
    to: toIndianE164(phone),
    channel: "sms",
  });

  return {
    phone,
    otpTtlSeconds: env.otpExpiryMinutes * 60,
    resendAfterSeconds: env.otpResendSeconds,
    deliveryStatus: verification.status,
  };
}

async function verifyTwilioOtp(phone, otp) {
  assertTwilioConfig();
  const client = getTwilioClient();
  const check = await client.verify.v2.services(env.twilioVerifyServiceSid).verificationChecks.create({
    to: toIndianE164(phone),
    code: otp,
  });

  if (check.status !== "approved") {
    throw unauthorized("Invalid or expired OTP");
  }
}

export async function sendPartnerOtp(phone) {
  logOtpProviderOnce();
  if (isTwilioProviderEnabled()) {
    return sendTwilioVerifyOtp(phone);
  }

  const otpStorageKey = getOtpStorageKey("partner", phone);
  const existing = getOtpCode(otpStorageKey);
  const now = Date.now();

  if (existing && now - existing.sentAt < env.otpResendSeconds * 1000) {
    throw badRequest(`OTP resend allowed after ${env.otpResendSeconds} seconds`);
  }

  const otp = getOtpCodeForDev();
  const expiresAt = now + env.otpExpiryMinutes * 60 * 1000;

  upsertOtpCode({
    phone: otpStorageKey,
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

export async function verifyPartnerOtp({ phone, otp, name }) {
  const otpStorageKey = getOtpStorageKey("partner", phone);

  if (isTwilioProviderEnabled()) {
    await verifyTwilioOtp(phone, otp);
    deleteOtpCode(otpStorageKey);
  } else {
    const rec = getOtpCode(otpStorageKey);

    if (!rec) {
      throw unauthorized("OTP not requested for this phone");
    }

    if (Date.now() > rec.expiresAt) {
      deleteOtpCode(otpStorageKey);
      throw unauthorized("OTP expired");
    }

    if (rec.otp !== otp) {
      throw unauthorized("Invalid OTP");
    }

    deleteOtpCode(otpStorageKey);
  }

  const partnerId = `partner-${phone}`;
  const existingPartner = getPartnerById(partnerId);
  const partner = {
    id: partnerId,
    phone,
    name: name || existingPartner?.name || `Partner ${phone.slice(-4)}`,
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

export async function sendUserOtp(phone) {
  logOtpProviderOnce();
  if (isTwilioProviderEnabled()) {
    const twilioResult = await sendTwilioVerifyOtp(phone);
    const existingUser = getUserByPhone(phone);
    return {
      ...twilioResult,
      isNewUser: !existingUser,
      requiresName: !existingUser,
    };
  }

  const otpStorageKey = getOtpStorageKey("user", phone);
  const existing = getOtpCode(otpStorageKey);
  const now = Date.now();

  if (existing && now - existing.sentAt < env.otpResendSeconds * 1000) {
    throw badRequest(`OTP resend allowed after ${env.otpResendSeconds} seconds`);
  }

  const otp = getOtpCodeForDev();
  const expiresAt = now + env.otpExpiryMinutes * 60 * 1000;

  upsertOtpCode({ phone: otpStorageKey, otp, sentAt: now, expiresAt });
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

export async function verifyUserOtp({ phone, otp, name }) {
  const otpStorageKey = getOtpStorageKey("user", phone);

  if (isTwilioProviderEnabled()) {
    await verifyTwilioOtp(phone, otp);
    deleteOtpCode(otpStorageKey);
  } else {
    const rec = getOtpCode(otpStorageKey);

    if (!rec) throw unauthorized("OTP not requested for this phone");
    if (Date.now() > rec.expiresAt) {
      deleteOtpCode(otpStorageKey);
      throw unauthorized("OTP expired");
    }
    if (rec.otp !== otp) throw unauthorized("Invalid OTP");

    deleteOtpCode(otpStorageKey);
  }

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
