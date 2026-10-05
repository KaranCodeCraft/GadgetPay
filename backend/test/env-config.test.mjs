import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";

const envPath = path.resolve(process.cwd(), ".env");
const envFromFile = dotenv.parse(fs.readFileSync(envPath, "utf8"));

const requiredEnvKeys = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "OTP_PROVIDER",
  "FONADA_USERNAME",
  "FONADA_PASSWORD",
  "FONADA_FROM",
  "FONADA_DLT_CONTENT_ID_FINAL_OFFERED_PRICE",
  "FONADA_DLT_CONTENT_ID_LOGIN_ACCOUNT",
  "FONADA_DLT_CONTENT_ID_AMOUNT_FOR_PHONE",
  "FONADA_DLT_CONTENT_ID_CREATE_PARTNER",
  "FONADA_DLT_CONTENT_ID_VERIFICATION",
];

test("env config accepts secrets from backend/.env when process env is empty", async () => {
  const previous = { ...process.env };

  try {
    for (const key of requiredEnvKeys) delete process.env[key];
    delete process.env.NODE_ENV;
    delete process.env.PORT;

    const envModuleUrl = `${pathToFileURL(path.resolve(process.cwd(), "src/config/env.js")).href}?t=${Date.now()}`;
    const { env } = await import(envModuleUrl);

    assert.equal(env.jwtAccessSecret, envFromFile.JWT_ACCESS_SECRET);
    assert.equal(env.jwtRefreshSecret, envFromFile.JWT_REFRESH_SECRET);
    assert.equal(env.otpProvider, envFromFile.OTP_PROVIDER);
    assert.equal(env.mediaRoot, path.resolve(process.cwd(), "uploads"));
    assert.equal(env.sqlitePath, path.resolve(process.cwd(), "data/gadgetpe.sqlite"));
  } finally {
    for (const key of Object.keys(process.env)) {
      if (!(key in previous)) delete process.env[key];
    }
    for (const [key, value] of Object.entries(previous)) {
      process.env[key] = value;
    }
  }
});
