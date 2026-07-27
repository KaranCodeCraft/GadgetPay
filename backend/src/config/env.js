import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envFilePath = path.resolve(__dirname, "../../.env");

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
  sqlitePath: process.env.SQLITE_PATH || "",
  mediaRoot: process.env.MEDIA_ROOT || "backend/uploads",
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "5d",
  otpResendSeconds: Number(process.env.OTP_RESEND_SECONDS || 30),
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 5),
  otpProvider: otpEnv("OTP_PROVIDER", "DEV"),
  twilioAccountSid: otpEnv("TWILIO_ACCOUNT_SID"),
  twilioAuthToken: otpEnv("TWILIO_AUTH_TOKEN"),
  twilioVerifyServiceSid: otpEnv("TWILIO_VERIFY_SERVICE_SID"),
  twilioMessagingServiceSid: otpEnv("TWILIO_MESSAGING_SERVICE_SID"),
  twilioFromNumber: otpEnv("TWILIO_FROM_NUMBER"),
  pincodeCacheTtlSeconds: Number(process.env.PINCODE_CACHE_TTL_SECONDS || 300),
  adminDevKey: process.env.ADMIN_DEV_KEY || "admin-dev-key",
  leadEventProjectorIntervalMs: Number(process.env.LEAD_EVENT_PROJECTOR_INTERVAL_MS || 5000),
  leadEventProjectorBatchSize: Number(process.env.LEAD_EVENT_PROJECTOR_BATCH_SIZE || 200),
  mediaMaxImageBytes: Number(process.env.MEDIA_MAX_IMAGE_BYTES || 10 * 1024 * 1024),
  mediaMaxDocumentBytes: Number(process.env.MEDIA_MAX_DOCUMENT_BYTES || 15 * 1024 * 1024),
};

const otpProvider = String(env.otpProvider || "DEV").toUpperCase();
const validOtpProviders = new Set(["DEV", "TWILIO"]);

if (!validOtpProviders.has(otpProvider)) {
  throw new Error(`Invalid OTP_PROVIDER: ${env.otpProvider}. Allowed values are DEV or TWILIO.`);
}

if (otpProvider === "TWILIO") {
  const missing = [];
  if (!env.twilioAccountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!env.twilioAuthToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!env.twilioVerifyServiceSid) missing.push("TWILIO_VERIFY_SERVICE_SID");

  if (missing.length > 0) {
    throw new Error(`OTP_PROVIDER=TWILIO but missing required env vars: ${missing.join(", ")}`);
  }
}
