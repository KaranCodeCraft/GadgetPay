import { Router } from "express";
import multer from "multer";
import path from "path";
import * as XLSX from "xlsx";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { success } from "../../shared/http/response.js";
import { badRequest, notFound } from "../../shared/http/errors.js";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import {
  createMediaAsset,
  createServiceabilityUploadHistory,
  deactivateServiceabilityUploadAndRows,
  deleteServiceabilityByPincode,
  deleteServiceabilityUploadPermanently,
  getServiceabilityByPincode,
  getServiceabilityUploadHistoryById,
  listServiceability,
  listServiceabilityUploadHistory,
  upsertServiceability,
} from "../../db/repository.js";
import {
  assertAllowedMime,
  assertMaxBytes,
  buildMediaRelativePath,
  calculateChecksum,
  spreadsheetMimeTypes,
  writeMediaBuffer,
} from "../../shared/store/local-media.js";
import { env } from "../../config/env.js";
import { pincodeProviderClient } from "../serviceability/pincode-provider.client.js";

function nowIso() {
  return new Date().toISOString();
}

const createSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  status: z.enum(["ACTIVE", "INACTIVE", "LIMITED"]),
  reason: z.string().min(2).max(200).optional(),
});

const updateSchema = z.object({
  status: z.enum(["ACTIVE", "INACTIVE", "LIMITED"]),
  reason: z.string().min(2).max(200).optional(),
});

const toggleSchema = z.object({
  enabled: z.boolean(),
  reason: z.string().min(2).max(200).optional(),
});

const EXPECTED_HEADERS = ["Pincode", "Status", "Reason"];
const HEADER_RULES = [
  { key: "Pincode", pattern: /^pincode$/i },
  { key: "Status", pattern: /^status$/i },
  { key: "Reason", pattern: /^reason$/i },
];
const MAX_SERVICEABILITY_UPLOAD_FILES = 10;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_SERVICEABILITY_UPLOAD_FILES, fileSize: env.mediaMaxDocumentBytes },
});

export const adminServiceabilityRouter = Router();

adminServiceabilityRouter.use(requireAuth, requireRole("admin"));

function normalizeStatus(value) {
  return String(value || "").trim().toUpperCase();
}

function resolveHeaderMap(receivedHeaders) {
  if (receivedHeaders.length !== HEADER_RULES.length) {
    throw badRequest("Invalid Excel column labels. Use required columns only.", {
      expectedHeaders: EXPECTED_HEADERS,
      receivedHeaders,
    });
  }

  const map = {};
  for (let index = 0; index < receivedHeaders.length; index += 1) {
    const rawHeader = String(receivedHeaders[index] || "").trim().replace(/\s+/g, " ");
    const matchedRules = HEADER_RULES.filter((rule) => rule.pattern.test(rawHeader));

    if (matchedRules.length !== 1) {
      throw badRequest("Invalid Excel column labels. Use required columns only.", {
        expectedHeaders: EXPECTED_HEADERS,
        receivedHeaders,
      });
    }

    const matched = matchedRules[0];
    if (map[matched.key] !== undefined) {
      throw badRequest("Duplicate Excel column labels are not allowed.", {
        expectedHeaders: EXPECTED_HEADERS,
        receivedHeaders,
      });
    }
    map[matched.key] = index;
  }

  for (const expected of EXPECTED_HEADERS) {
    if (map[expected] === undefined) {
      throw badRequest("Missing required Excel columns.", {
        expectedHeaders: EXPECTED_HEADERS,
        receivedHeaders,
      });
    }
  }

  return map;
}

function parseServiceabilityExcelRows(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw badRequest("Excel file is empty");

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  if (!Array.isArray(rows) || rows.length === 0) throw badRequest("Excel file is empty");

  const receivedHeaders = rows[0].map((value) => String(value).trim());
  const headerMap = resolveHeaderMap(receivedHeaders);
  const dataRows = rows
    .slice(1)
    .map((row, idx) => ({ rowNo: idx + 2, row }))
    .filter(({ row }) => row.some((cell) => String(cell || "").trim() !== ""));

  if (dataRows.length === 0) throw badRequest("Excel has no data rows after header");

  const parsedRows = [];
  const validationErrors = [];

  for (const { rowNo, row } of dataRows) {
    const pincode = String(row[headerMap.Pincode] || "").trim();
    const status = normalizeStatus(row[headerMap.Status]);
    const reason = String(row[headerMap.Reason] || "").trim();

    const errors = [];
    if (!/^\d{6}$/.test(pincode)) errors.push("Pincode: must be 6 digits");
    if (!["ACTIVE", "INACTIVE", "LIMITED"].includes(status)) errors.push("Status: must be ACTIVE, INACTIVE, or LIMITED");
    if (reason.length < 2 || reason.length > 200) errors.push("Reason: must be between 2 and 200 characters");

    if (errors.length > 0) {
      validationErrors.push({ rowNo, errors });
      continue;
    }

    parsedRows.push({ pincode, status, reason });
  }

  if (validationErrors.length > 0) {
    throw badRequest("Excel data validation failed", {
      expectedHeaders: EXPECTED_HEADERS,
      errors: validationErrors,
    });
  }

  return parsedRows;
}

function normalizeMulterError(err) {
  if (!(err instanceof multer.MulterError)) return err;
  if (err.code === "LIMIT_FILE_COUNT") {
    return badRequest(`Upload up to ${MAX_SERVICEABILITY_UPLOAD_FILES} Excel files at a time`);
  }
  if (err.code === "LIMIT_FILE_SIZE") {
    return badRequest(`Each Excel file must be ${env.mediaMaxDocumentBytes} bytes or smaller`);
  }
  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return badRequest("Unexpected upload field. Use files for multi Excel upload.");
  }
  return badRequest(err.message || "Invalid upload request");
}

function handleServiceabilityUploadMultipart(req, res, next) {
  upload.fields([
    { name: "files", maxCount: MAX_SERVICEABILITY_UPLOAD_FILES },
    { name: "file", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      next(normalizeMulterError(err));
      return;
    }

    next();
  });
}

function getServiceabilityUploadFiles(req) {
  const files = req.files || {};
  return [
    ...(Array.isArray(files.files) ? files.files : []),
    ...(Array.isArray(files.file) ? files.file : []),
  ];
}

function withFileValidationContext(file, callback) {
  try {
    return callback();
  } catch (err) {
    if (err?.statusCode !== 400) throw err;

    const details = err.details && typeof err.details === "object" && !Array.isArray(err.details)
      ? { ...err.details }
      : {};

    if (err.details !== undefined && Object.keys(details).length === 0) {
      details.details = err.details;
    }

    throw badRequest(err.message, { ...details, sourceFileName: file.originalname });
  }
}

function validateServiceabilityUploadFile(file) {
  return withFileValidationContext(file, () => {
    assertAllowedMime(file, spreadsheetMimeTypes);
    assertMaxBytes(file, env.mediaMaxDocumentBytes);
    return {
      file,
      parsed: parseServiceabilityExcelRows(file.buffer),
    };
  });
}

async function persistServiceabilityUpload({ file, parsed, uploadedBy }) {
  const uploadId = randomUUID();
  const mediaId = randomUUID();
  const now = nowIso();
  const mediaRelativePath = buildMediaRelativePath({
    tenantType: "admin",
    ownerId: uploadedBy,
    entityType: "serviceability-upload",
    entityId: uploadId,
    mediaId,
    fileName: file.originalname,
  });

  writeMediaBuffer({ relativePath: mediaRelativePath, buffer: file.buffer });
  createMediaAsset({
    id: mediaId,
    tenantType: "admin",
    tenantId: null,
    ownerRole: "admin",
    ownerId: uploadedBy,
    entityType: "serviceability-upload",
    entityId: uploadId,
    slot: "excel",
    originalFileName: file.originalname,
    storedFileName: path.basename(mediaRelativePath),
    mimeType: file.mimetype,
    sizeBytes: file.size,
    relativePath: mediaRelativePath,
    storageProvider: "LOCAL_FILE",
    status: "ACTIVE",
    checksum: calculateChecksum(file.buffer),
    createdAt: now,
    updatedAt: now,
  });

  let insertedCount = 0;
  let updatedCount = 0;
  for (const row of parsed) {
    const existing = getServiceabilityByPincode(row.pincode);
    if (existing) updatedCount += 1;
    else insertedCount += 1;

    const metadata = await resolvePincodeMetadata(row.pincode);
    upsertServiceability({
      pincode: row.pincode,
      status: row.status,
      reason: row.reason,
      state: metadata.state,
      district: metadata.district,
      officeCount: metadata.officeCount,
      deliveryOfficeCount: metadata.deliveryOfficeCount,
      metadataJson: metadata.metadataJson,
      sourceUploadId: uploadId,
      sourceFileName: file.originalname,
      updatedBy: uploadedBy,
      updatedAt: now,
    });
  }

  createServiceabilityUploadHistory({
    id: uploadId,
    fileName: file.originalname,
    uploadedBy,
    uploadedAt: now,
    status: "ACTIVE",
    mediaId,
    insertedCount,
    updatedCount,
    totalProcessed: parsed.length,
  });

  return {
    uploadId,
    sourceFileName: file.originalname,
    insertedCount,
    updatedCount,
    totalProcessed: parsed.length,
  };
}

async function resolvePincodeMetadata(pincode) {
  const provider = await pincodeProviderClient.getPincodeDetail(pincode);
  const offices = Array.isArray(provider?.offices) ? provider.offices : [];
  const deliveryOfficeCount = offices.filter((office) => office.deliveryStatus === "Delivery").length;

  return {
    pincode,
    state: provider?.state || null,
    district: provider?.district || null,
    officeCount: offices.length,
    deliveryOfficeCount,
    metadataJson: JSON.stringify({
      provider: "india-pincode-api",
      offices,
      state: provider?.state || null,
      district: provider?.district || null,
    }),
    preview: {
      state: provider?.state || null,
      district: provider?.district || null,
      officeCount: offices.length,
      deliveryOfficeCount,
      offices,
    },
  };
}

adminServiceabilityRouter.get("/validate/:pincode", async (req, res, next) => {
  try {
    const pincode = z.string().regex(/^\d{6}$/).parse(req.params.pincode);
    const metadata = await resolvePincodeMetadata(pincode);
    res.json(success(metadata.preview));
  } catch (err) {
    next(err);
  }
});

adminServiceabilityRouter.get("/pincodes", (req, res) => {
  const statusFilter = typeof req.query.status === "string" ? req.query.status : undefined;
  const search = (req.query.search || "").toString().trim();
  const rows = listServiceability({
    status: statusFilter,
    search,
  });

  res.json(success({ rows, count: rows.length }));
});

adminServiceabilityRouter.post("/upload", handleServiceabilityUploadMultipart, (req, res, next) => {
  (async () => {
    const files = getServiceabilityUploadFiles(req);
    if (files.length === 0) {
      throw badRequest("At least one Excel file is required");
    }

    const validatedFiles = files.map(validateServiceabilityUploadFile);
    const uploads = [];
    let insertedCount = 0;
    let updatedCount = 0;
    let totalProcessed = 0;

    for (const item of validatedFiles) {
      const result = await persistServiceabilityUpload({
        file: item.file,
        parsed: item.parsed,
        uploadedBy: req.auth.sub,
      });
      uploads.push(result);
      insertedCount += result.insertedCount;
      updatedCount += result.updatedCount;
      totalProcessed += result.totalProcessed;
    }

    res.json(success({
      insertedCount,
      updatedCount,
      totalProcessed,
      expectedHeaders: EXPECTED_HEADERS,
      uploads,
      uploadId: uploads[0]?.uploadId,
      sourceFileName: uploads[0]?.sourceFileName,
    }));
  })().catch((err) => next(err));
});

adminServiceabilityRouter.get("/uploads", (req, res) => {
  const rows = listServiceabilityUploadHistory();
  res.json(success({ rows, count: rows.length, expectedHeaders: EXPECTED_HEADERS }));
});

adminServiceabilityRouter.patch("/uploads/:uploadId/status", (req, res, next) => {
  try {
    const uploadId = z.string().uuid().parse(req.params.uploadId);
    const status = z.object({ status: z.enum(["ACTIVE", "DEACTIVATED"]) }).parse(req.body).status;
    const uploadRow = getServiceabilityUploadHistoryById(uploadId);
    if (!uploadRow) {
      throw notFound("Serviceability upload not found");
    }

    if (status === "ACTIVE") {
      throw badRequest("Re-activating deleted serviceability rows is not supported. Re-upload the file instead.");
    }

    const now = nowIso();
    const result = deactivateServiceabilityUploadAndRows({
      uploadId,
      deactivatedBy: req.auth.sub,
      deactivatedAt: now,
    });
    res.json(success({
      uploadId,
      fileName: uploadRow.fileName,
      status,
      updated: Boolean(result.updatedHistoryRows),
      deactivatedRowCount: result.deactivatedRowCount,
    }));
  } catch (err) {
    next(err);
  }
});

adminServiceabilityRouter.delete("/uploads/:uploadId", (req, res, next) => {
  try {
    const uploadId = z.string().uuid().parse(req.params.uploadId);
    const uploadRow = getServiceabilityUploadHistoryById(uploadId);
    if (!uploadRow) {
      throw notFound("Serviceability upload not found");
    }

    const result = deleteServiceabilityUploadPermanently({ uploadId });
    res.json(success({
      uploadId,
      fileName: uploadRow.fileName,
      deletedRows: result.deletedRows,
      deleted: Boolean(result.deletedHistoryRows),
    }));
  } catch (err) {
    next(err);
  }
});

adminServiceabilityRouter.post("/pincodes", (req, res, next) => {
  (async () => {
    const input = createSchema.parse(req.body);
    const metadata = await resolvePincodeMetadata(input.pincode);
    const row = {
      pincode: input.pincode,
      status: input.status,
      reason: input.reason || "Updated by admin",
      state: metadata.state,
      district: metadata.district,
      officeCount: metadata.officeCount,
      deliveryOfficeCount: metadata.deliveryOfficeCount,
      metadataJson: metadata.metadataJson,
      updatedBy: req.auth.sub,
      updatedAt: nowIso(),
    };

    const persisted = upsertServiceability(row);
    res.json(success(persisted));
  })().catch((err) => {
    next(err);
  });
});

adminServiceabilityRouter.put("/pincodes/:pincode", (req, res, next) => {
  (async () => {
    const pincode = z.string().regex(/^\d{6}$/).parse(req.params.pincode);
    const input = updateSchema.parse(req.body);
    const existing = getServiceabilityByPincode(pincode);
    if (!existing) {
      throw notFound("Serviceability pincode not found");
    }

    const metadata = await resolvePincodeMetadata(pincode);
    const row = {
      pincode,
      status: input.status,
      reason: input.reason || existing.reason || "Updated by admin",
      state: metadata.state,
      district: metadata.district,
      officeCount: metadata.officeCount,
      deliveryOfficeCount: metadata.deliveryOfficeCount,
      metadataJson: metadata.metadataJson,
      updatedBy: req.auth.sub,
      updatedAt: nowIso(),
    };

    const persisted = upsertServiceability(row);
    res.json(success(persisted));
  })().catch((err) => {
    next(err);
  });
});

adminServiceabilityRouter.delete("/pincodes/:pincode", (req, res, next) => {
  try {
    const pincode = z.string().regex(/^\d{6}$/).parse(req.params.pincode);
    const result = deleteServiceabilityByPincode(pincode);
    if (!result.changes) {
      throw notFound("Serviceability pincode not found");
    }
    res.json(success({ pincode, deleted: true }));
  } catch (err) {
    next(err);
  }
});

adminServiceabilityRouter.patch("/pincodes/:pincode/toggle", (req, res, next) => {
  try {
    const pincode = z.string().regex(/^\d{6}$/).parse(req.params.pincode);
    const input = toggleSchema.parse(req.body);
    const prev = getServiceabilityByPincode(pincode);

    const row = {
      pincode,
      status: input.enabled ? "ACTIVE" : "INACTIVE",
      reason: input.reason || (input.enabled ? "Enabled by admin" : "Disabled by admin"),
      state: prev?.state || null,
      district: prev?.district || null,
      officeCount: prev?.officeCount ?? null,
      deliveryOfficeCount: prev?.deliveryOfficeCount ?? null,
      metadataJson: prev?.metadata ? JSON.stringify(prev.metadata) : null,
      updatedBy: req.auth.sub,
      updatedAt: nowIso(),
      previousStatus: prev?.status || null,
    };

    const persisted = upsertServiceability(row);
    res.json(success({ ...persisted, previousStatus: prev?.status || null }));
  } catch (err) {
    next(err);
  }
});
