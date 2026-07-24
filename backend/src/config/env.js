import dotenv from "dotenv";

dotenv.config();

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
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  otpResendSeconds: Number(process.env.OTP_RESEND_SECONDS || 30),
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 5),
  pincodeCacheTtlSeconds: Number(process.env.PINCODE_CACHE_TTL_SECONDS || 300),
  adminDevKey: process.env.ADMIN_DEV_KEY || "admin-dev-key",
  leadEventProjectorIntervalMs: Number(process.env.LEAD_EVENT_PROJECTOR_INTERVAL_MS || 5000),
  leadEventProjectorBatchSize: Number(process.env.LEAD_EVENT_PROJECTOR_BATCH_SIZE || 200),
  mediaMaxImageBytes: Number(process.env.MEDIA_MAX_IMAGE_BYTES || 10 * 1024 * 1024),
  mediaMaxDocumentBytes: Number(process.env.MEDIA_MAX_DOCUMENT_BYTES || 15 * 1024 * 1024),
};
