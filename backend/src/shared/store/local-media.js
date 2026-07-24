import crypto from "crypto";
import fs from "fs";
import path from "path";
import { env } from "../../config/env.js";
import { badRequest } from "../http/errors.js";

const MEDIA_ROOT = path.resolve(process.cwd(), env.mediaRoot);

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildMediaRelativePath({ tenantType, ownerId, entityType, entityId, mediaId, fileName }) {
  const safeFileName = sanitizeFileName(fileName);
  return path.join(tenantType, ownerId, entityType, entityId, `${mediaId}-${safeFileName}`);
}

export function writeMediaBuffer({ relativePath, buffer }) {
  const absolutePath = path.join(MEDIA_ROOT, relativePath);
  const normalizedRoot = `${MEDIA_ROOT}${path.sep}`;
  const normalizedTarget = path.resolve(absolutePath);

  if (!normalizedTarget.startsWith(normalizedRoot) && normalizedTarget !== MEDIA_ROOT) {
    throw badRequest("Invalid media path");
  }

  ensureDir(path.dirname(normalizedTarget));
  fs.writeFileSync(normalizedTarget, buffer);
  return normalizedTarget;
}

export function readMediaBuffer(relativePath) {
  const absolutePath = path.join(MEDIA_ROOT, relativePath);
  return fs.readFileSync(absolutePath);
}

export function deleteMediaFile(relativePath) {
  const absolutePath = path.join(MEDIA_ROOT, relativePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
}

export function getMediaAbsolutePath(relativePath) {
  return path.join(MEDIA_ROOT, relativePath);
}

export function calculateChecksum(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

export function assertAllowedMime(file, allowedMimeSet) {
  if (!allowedMimeSet.has(file.mimetype)) {
    throw badRequest(`Unsupported file type: ${file.mimetype}`);
  }
}

export function assertMaxBytes(file, maxBytes) {
  if (file.size > maxBytes) {
    throw badRequest(`File exceeds maximum allowed size of ${maxBytes} bytes`);
  }
}

export const imageMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/heic"]);
export const documentMimeTypes = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"]);
export const spreadsheetMimeTypes = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
