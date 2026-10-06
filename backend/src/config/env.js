import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "../..");
const envFilePath = path.resolve(backendRoot, ".env");

function resolveBackendPath(value, fallbackRelative) {
  if (value && typeof value === "string" && value.trim() !== "") {
    const trimmed = value.trim();
    const normalized = trimmed.replace(/\\/g, "/");
    const withoutBackendPrefix = normalized.startsWith("backend/") ? normalized.slice("backend/".length) : normalized;
    return path.isAbsolute(trimmed) ? trimmed : path.resolve(backendRoot, withoutBackendPrefix);
  }
  return path.resolve(backendRoot, fallbackRelative);
}

// Always load backend/.env regardless of process CWD.
const dotenvResult = dotenv.config({ path: envFilePath });
const envFromFile = dotenvResult.parsed || {};

function otpEnv(key, fallback = "") {
  if (process.env.NODE_ENV === "test" && Object.prototype.hasOwnProperty.call(process.env, key)) {
    return process.env[key];
  }
  if (Object.prototype.hasOwnProperty.call(envFromFile, key)) {
    return envFromFile[key];
  }
  return process.env[key] || fallback;
}

const required = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  port: Number(process.env.PORT || 4000),
  nodeEnv: process.env.NODE_ENV || "development",
  databaseProvider: process.env.DATABASE_PROVIDER || "postgres",
  databaseUrl: process.env.DATABASE_URL || "",
  sqlitePath: resolveBackendPath(process.env.SQLITE_PATH || "", "data/gadgetpe.sqlite"),
  mediaRoot: resolveBackendPath(process.env.MEDIA_ROOT || "", "uploads"),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "5d",
  otpResendSeconds: Number(process.env.OTP_RESEND_SECONDS || 30),
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 5),
  otpProvider: otpEnv("OTP_PROVIDER", "FONADA"),
  fonadaApiUrl: otpEnv("FONADA_API_URL", "https://app3.flash49.com/fe/api/v1/send"),
  fonadaUsername: otpEnv("FONADA_USERNAME"),
  fonadaPassword: otpEnv("FONADA_PASSWORD"),
  fonadaFrom: otpEnv("FONADA_FROM", "GDGTPE"),
  fonadaUnicode: otpEnv("FONADA_UNICODE", "false"),
  fonadaDltContentIdFinalOfferedPrice: otpEnv("FONADA_DLT_CONTENT_ID_FINAL_OFFERED_PRICE"),
  fonadaDltContentIdLoginAccount: otpEnv("FONADA_DLT_CONTENT_ID_LOGIN_ACCOUNT"),
  fonadaDltContentIdCxLoginAccount: otpEnv("FONADA_DLT_CONTENT_ID_CX_LOGIN_ACCOUNT", otpEnv("FONADA_DLT_CONTENT_ID_LOGIN_ACCOUNT")),
  fonadaDltContentIdAmountForPhone: otpEnv("FONADA_DLT_CONTENT_ID_AMOUNT_FOR_PHONE"),
  fonadaDltContentIdCreatePartner: otpEnv("FONADA_DLT_CONTENT_ID_CREATE_PARTNER"),
  fonadaDltContentIdVerification: otpEnv("FONADA_DLT_CONTENT_ID_VERIFICATION"),
  pincodeCacheTtlSeconds: Number(process.env.PINCODE_CACHE_TTL_SECONDS || 300),
  adminDevKey: process.env.ADMIN_DEV_KEY || "admin-dev-key",
  leadEventProjectorIntervalMs: Number(process.env.LEAD_EVENT_PROJECTOR_INTERVAL_MS || 5000),
  leadEventProjectorBatchSize: Number(process.env.LEAD_EVENT_PROJECTOR_BATCH_SIZE || 200),
  mediaMaxImageBytes: Number(process.env.MEDIA_MAX_IMAGE_BYTES || 10 * 1024 * 1024),
  mediaMaxDocumentBytes: Number(process.env.MEDIA_MAX_DOCUMENT_BYTES || 15 * 1024 * 1024),
};

const otpProvider = String(env.otpProvider || "DEV").toUpperCase();
const validOtpProviders = new Set(["FONADA"]);

if (!validOtpProviders.has(otpProvider)) {
  throw new Error(`Invalid OTP_PROVIDER: ${env.otpProvider}. Only FONADA is supported.`);
}

const missing = [];
if (!env.fonadaUsername) missing.push("FONADA_USERNAME");
if (!env.fonadaPassword) missing.push("FONADA_PASSWORD");
if (!env.fonadaFrom) missing.push("FONADA_FROM");
if (!env.fonadaDltContentIdFinalOfferedPrice) missing.push("FONADA_DLT_CONTENT_ID_FINAL_OFFERED_PRICE");
if (!env.fonadaDltContentIdCxLoginAccount && !env.fonadaDltContentIdLoginAccount) missing.push("FONADA_DLT_CONTENT_ID_CX_LOGIN_ACCOUNT");
if (!env.fonadaDltContentIdAmountForPhone) missing.push("FONADA_DLT_CONTENT_ID_AMOUNT_FOR_PHONE");
if (!env.fonadaDltContentIdCreatePartner) missing.push("FONADA_DLT_CONTENT_ID_CREATE_PARTNER");
if (!env.fonadaDltContentIdVerification) missing.push("FONADA_DLT_CONTENT_ID_VERIFICATION");

if (missing.length > 0) {
  throw new Error(`Fonada OTP is not configured. Missing required env vars: ${missing.join(", ")}`);
}
