import { Router } from "express";
import multer from "multer";
import path from "path";
import * as XLSX from "xlsx";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { badRequest, notFound } from "../../shared/http/errors.js";
import { success } from "../../shared/http/response.js";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import {
  activateDevicePriceUploadAndRows,
  createDevicePriceUploadSnapshotRows,
  createMediaAsset,
  createDevicePriceUploadHistory,
  createQuoteDeductionRule,
  deactivateDevicePriceUploadAndRows,
  deleteDevicePriceUploadPermanently,
  getDevicePriceUploadHistoryById,
  getQuoteDeductionRuleById,
  listDevicePriceCatalog,
  listDevicePriceUploadHistory,
  listQuoteDeductionRules,
  setQuoteDeductionRuleActive,
  updateQuoteDeductionRule,
  upsertDevicePriceCatalogRows,
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
import { calculateUserQuote } from "../pricing/quote-deduction.service.js";

const EXPECTED_HEADERS = ["Brand", "Series", "Model", "Variant", "Launch Year", "GadgetPe Price"];
const MAX_PRICING_UPLOAD_FILES = 10;
const DEVICE_TYPES = ["MOBILE", "IPAD", "TABLET"];
const HEADER_RULES = [
  { key: "Brand", pattern: /^brand$/i },
  { key: "Series", pattern: /^series$/i },
  { key: "Model", pattern: /^model$/i },
  { key: "Variant", pattern: /^variant$/i },
  { key: "Launch Year", pattern: /^launch\s*year$/i },
  { key: "GadgetPe Price", pattern: /^(gadgetpe|gadgetpe\s*price)$/i },
];
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { files: MAX_PRICING_UPLOAD_FILES, fileSize: env.mediaMaxDocumentBytes },
});

const optionalTrimmedString = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return null;
    const trimmed = String(value).trim();
    return trimmed ? trimmed : null;
  },
  z.string().min(1).max(160).nullable(),
);

const answerGroupSchema = z.enum([
  "basicFunctionality",
  "warrantyAndBill",
  "physicalIssues",
  "nestedPhysicalIssueAnswers",
  "functionalProblems",
  "accessories",
  "mobileAge",
  "cameraAndBiometrics",
  "sensorsAndConnectivity",
  "batteryAndCharging",
  "accessoriesAndOwnership",
]);

const quoteDeductionRuleBodySchema = z.object({
  answerGroup: answerGroupSchema,
  answerKey: z.string().trim().min(1).max(160),
  answerValue: optionalTrimmedString.optional().default(null),
  label: z.string().trim().min(2).max(180),
  deductionType: z.enum(["RUPEES", "PERCENT"]),
  deductionValue: z.number().positive().max(1000000),
  maxDeductionAmount: z.number().positive().max(1000000).nullable().optional().default(null),
  priority: z.number().int().min(1).max(10000).optional().default(100),
  isActive: z.boolean().optional().default(true),
  appliesToBrand: optionalTrimmedString.optional().default(null),
  appliesToModelId: optionalTrimmedString.optional().default(null),
}).superRefine((value, ctx) => {
  if (value.deductionType === "PERCENT" && value.deductionValue > 100) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["deductionValue"], message: "Percent deduction cannot exceed 100" });
  }
});

const selectedModelSchema = z.object({
  brandSlug: z.string().trim().min(1).max(80),
  modelId: z.string().trim().min(1).max(120),
  modelName: z.string().trim().min(1).max(160),
  listedPrice: z.number().int().nonnegative().max(1000000),
  thumbnailUrl: z.string().url().optional(),
});

const previewSchema = z.object({
  selectedModel: selectedModelSchema,
  deviceDetails: z.record(z.any()).optional().default({}),
});

function parseOptionalBooleanQuery(value) {
  if (value === undefined) return undefined;
  if (value === "true") return true;
  if (value === "false") return false;
  throw badRequest("active must be true or false");
}

function parseLaunchYear(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;

  const direct = Number.parseInt(raw, 10);
  if (Number.isInteger(direct)) {
    return direct;
  }

  const match = raw.match(/\b(19\d{2}|20\d{2}|2100)\b/);
  if (match) {
    return Number.parseInt(match[1], 10);
  }

  return Number.NaN;
}

function parseCashifyPrice(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return Number.NaN;

  const cleaned = raw
    .replace(/,/g, "")
    .replace(/₹|rs\.?|inr/gi, "")
    .replace(/\/-/g, "")
    .replace(/\s+/g, "")
    .replace(/[^0-9.-]/g, "");

  return Number.parseFloat(cleaned);
}

const dataRowSchema = z.object({
  Brand: z.string().min(1),
  Series: z.string().min(1),
  Model: z.string().min(1),
  Variant: z.string().min(1),
  "Launch Year": z
    .string()
    .min(1)
    .transform((value) => parseLaunchYear(value))
    .refine((value) => Number.isInteger(value) && value >= 1990 && value <= 2100, "Launch Year must be between 1990 and 2100"),
  "GadgetPe Price": z
    .string()
    .min(1)
    .transform((value) => parseCashifyPrice(value))
    .refine((value) => Number.isFinite(value) && value > 0, "GadgetPe Price must be a positive number"),
});

function normalizeKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

function parseDeviceType(input) {
  const value = String(input || "").trim().toUpperCase();
  if (!DEVICE_TYPES.includes(value)) {
    throw badRequest("deviceType is required and must be one of MOBILE, IPAD, TABLET", {
      allowedDeviceTypes: DEVICE_TYPES,
    });
  }
  return value;
}

function resolveHeaderMap(receivedHeaders) {
  const normalizedReceived = receivedHeaders.map((value) => String(value || "").trim().replace(/\s+/g, " "));
  if (normalizedReceived.length !== EXPECTED_HEADERS.length) {
    throw badRequest("Invalid Excel column labels. Use required columns only in exact order.", {
      expectedHeaders: EXPECTED_HEADERS,
      receivedHeaders: normalizedReceived,
    });
  }

  for (let index = 0; index < EXPECTED_HEADERS.length; index += 1) {
    if (normalizedReceived[index] !== EXPECTED_HEADERS[index]) {
      throw badRequest("Invalid Excel column labels. Use required columns only in exact order.", {
        expectedHeaders: EXPECTED_HEADERS,
        receivedHeaders: normalizedReceived,
      });
    }
  }

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

function parseExcelRows(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw badRequest("Excel file is empty");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
  if (!Array.isArray(rows) || rows.length === 0) {
    throw badRequest("Excel file is empty");
  }

  const receivedHeaders = rows[0].map((value) => String(value).trim());
  const headerMap = resolveHeaderMap(receivedHeaders);

  const dataRows = rows
    .slice(1)
    .map((row, idx) => ({ rowNo: idx + 2, row }))
    .filter(({ row }) => row.some((cell) => String(cell || "").trim() !== ""));

  if (dataRows.length === 0) {
    throw badRequest("Excel has no data rows after header");
  }

  const parsedRows = [];
  const validationErrors = [];

  for (const { rowNo, row } of dataRows) {
    const rawObj = {
      Brand: String(row[headerMap.Brand] || "").trim(),
      Series: String(row[headerMap.Series] || "").trim(),
      Model: String(row[headerMap.Model] || "").trim(),
      Variant: String(row[headerMap.Variant] || "").trim(),
      "Launch Year": String(row[headerMap["Launch Year"]] || "").trim(),
      "GadgetPe Price": String(row[headerMap["GadgetPe Price"]] || "").trim(),
    };

    const validated = dataRowSchema.safeParse(rawObj);
    if (!validated.success) {
      validationErrors.push({
        rowNo,
        errors: validated.error.issues.map((issue) => {
          const field = issue.path?.[0] ? String(issue.path[0]) : "Row";
          return `${field}: ${issue.message}`;
        }),
      });
      continue;
    }

    parsedRows.push({
      source: rawObj,
      normalized: {
        brand: normalizeKey(rawObj.Brand),
        series: normalizeKey(rawObj.Series),
        model: normalizeKey(rawObj.Model),
        storage: normalizeKey(rawObj.Variant),
        launchYear: validated.data["Launch Year"],
        cashifyPrice: validated.data["GadgetPe Price"],
      },
    });
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
    return badRequest(`Upload up to ${MAX_PRICING_UPLOAD_FILES} Excel files at a time`);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    return badRequest(`Each Excel file must be ${env.mediaMaxDocumentBytes} bytes or smaller`);
  }

  if (err.code === "LIMIT_UNEXPECTED_FILE") {
    return badRequest("Unexpected upload field. Use files for multi Excel upload.");
  }

  return badRequest(err.message || "Invalid upload request");
}

function handlePricingUploadMultipart(req, res, next) {
  upload.fields([
    { name: "files", maxCount: MAX_PRICING_UPLOAD_FILES },
    { name: "file", maxCount: 1 },
  ])(req, res, (err) => {
    if (err) {
      next(normalizeMulterError(err));
      return;
    }

    next();
  });
}

function getPricingUploadFiles(req) {
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

function validatePricingUploadFile(file) {
  return withFileValidationContext(file, () => {
    assertAllowedMime(file, spreadsheetMimeTypes);
    assertMaxBytes(file, env.mediaMaxDocumentBytes);

    return {
      file,
      parsed: parseExcelRows(file.buffer),
    };
  });
}

async function persistPricingUpload({ file, parsed, uploadedBy, now, deviceType }) {
  const uploadId = randomUUID();
  const mediaRelativePath = buildMediaRelativePath({
    tenantType: "admin",
    ownerId: uploadedBy,
    entityType: "pricing-upload",
    entityId: uploadId,
    mediaId: uploadId,
    fileName: file.originalname,
  });
  writeMediaBuffer({ relativePath: mediaRelativePath, buffer: file.buffer });
  await createMediaAsset({
    id: uploadId,
    tenantType: "admin",
    tenantId: uploadedBy,
    ownerRole: "admin",
    ownerId: uploadedBy,
    entityType: "pricing-upload",
    entityId: uploadId,
    slot: "source-file",
    originalFileName: file.originalname,
    storedFileName: path.basename(mediaRelativePath),
    mimeType: file.mimetype,
    sizeBytes: file.size,
    relativePath: mediaRelativePath,
    storageProvider: "LOCAL_DISK",
    checksum: calculateChecksum(file.buffer),
    createdAt: now,
    updatedAt: now,
  });

  const upsertInput = parsed.map((item) => ({
    deviceType,
    brand: item.normalized.brand,
    series: item.normalized.series,
    model: item.normalized.model,
    storage: item.normalized.storage,
    launchYear: item.normalized.launchYear,
    cashifyPrice: item.normalized.cashifyPrice,
    rowJson: JSON.stringify(item.source),
    sourceUploadId: uploadId,
    sourceFileName: file.originalname,
    createdAt: now,
    updatedAt: now,
  }));

  const snapshotInput = parsed.map((item) => ({
    uploadId,
    deviceType,
    brand: item.normalized.brand,
    series: item.normalized.series,
    model: item.normalized.model,
    storage: item.normalized.storage,
    launchYear: item.normalized.launchYear,
    cashifyPrice: item.normalized.cashifyPrice,
    rowJson: JSON.stringify(item.source),
    createdAt: now,
    updatedAt: now,
  }));

  const summary = await upsertDevicePriceCatalogRows(upsertInput);
  await createDevicePriceUploadHistory({
    id: uploadId,
    deviceType,
    fileName: file.originalname,
    uploadedBy,
    uploadedAt: now,
    insertedCount: summary.insertedCount,
    updatedCount: summary.updatedCount,
    totalProcessed: summary.totalProcessed,
  });
  await createDevicePriceUploadSnapshotRows(snapshotInput);

  return {
    ...summary,
    uploadId,
    sourceFileName: file.originalname,
  };
}

async function processPricingUploadRequest({ req, deviceType }) {
  const files = getPricingUploadFiles(req);
  if (files.length === 0) {
    throw badRequest("Excel file is required");
  }

  const validatedFiles = files.map((file) => validatePricingUploadFile(file));
  const now = new Date().toISOString();
  const uploads = await Promise.all(
    validatedFiles.map((item) =>
      persistPricingUpload({ ...item, uploadedBy: req.auth.sub, now, deviceType }),
    ),
  );
  const aggregate = uploads.reduce(
    (total, item) => ({
      insertedCount: total.insertedCount + item.insertedCount,
      updatedCount: total.updatedCount + item.updatedCount,
      totalProcessed: total.totalProcessed + item.totalProcessed,
    }),
    { insertedCount: 0, updatedCount: 0, totalProcessed: 0 },
  );
  const singleUpload = uploads.length === 1 ? uploads[0] : null;

  return {
    ...aggregate,
    ...(singleUpload
      ? { uploadId: singleUpload.uploadId, sourceFileName: singleUpload.sourceFileName }
      : {}),
    deviceType,
    expectedHeaders: EXPECTED_HEADERS,
    uploads,
  };
}

function makePricingUploadHandler(fixedDeviceType, options = {}) {
  return async (req, res, next) => {
    try {
      const deviceType = fixedDeviceType || parseDeviceType(req.body?.deviceType);
      const payload = await processPricingUploadRequest({ req, deviceType });
      if (options.deprecatedEndpoint) {
        payload.deprecatedEndpoint = true;
      }
      res.json(success(payload));
    } catch (err) {
      next(err);
    }
  };
}

export const adminPricingRouter = Router();

adminPricingRouter.use(requireAuth, requireRole("admin"));

adminPricingRouter.get("/catalog", async (req, res, next) => {
  try {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const deviceType = parseDeviceType(req.query.deviceType || "MOBILE");
    const rows = await listDevicePriceCatalog({ search, deviceType });
    res.json(success({ rows, count: rows.length, expectedHeaders: EXPECTED_HEADERS }));
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.get("/uploads", async (req, res, next) => {
  try {
    const deviceType = parseDeviceType(req.query.deviceType || "MOBILE");
    const rows = await listDevicePriceUploadHistory({ deviceType });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.get("/deductions", async (req, res, next) => {
  try {
    const active = parseOptionalBooleanQuery(req.query.active);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const rows = await listQuoteDeductionRules({ active, search });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.post("/deductions", async (req, res, next) => {
  try {
    const input = quoteDeductionRuleBodySchema.parse(req.body);
    const now = new Date().toISOString();
    const rule = await createQuoteDeductionRule({
      id: `quote-rule-${randomUUID()}`,
      ...input,
      createdBy: req.auth.sub,
      createdAt: now,
      updatedAt: now,
    });
    res.json(success({ rule }));
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.put("/deductions/:ruleId", async (req, res, next) => {
  try {
    const existing = await getQuoteDeductionRuleById(req.params.ruleId);
    if (!existing) throw notFound("Quote deduction rule not found");

    const input = quoteDeductionRuleBodySchema.parse(req.body);
    const rule = await updateQuoteDeductionRule({
      ...existing,
      ...input,
      updatedAt: new Date().toISOString(),
    });
    res.json(success({ rule }));
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.patch("/deductions/:ruleId/toggle", async (req, res, next) => {
  try {
    const existing = await getQuoteDeductionRuleById(req.params.ruleId);
    if (!existing) throw notFound("Quote deduction rule not found");

    const input = z.object({ isActive: z.boolean() }).parse(req.body);
    const rule = await setQuoteDeductionRuleActive({
      id: existing.id,
      isActive: input.isActive,
      updatedAt: new Date().toISOString(),
    });
    res.json(success({ rule }));
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.post("/deductions/preview", (req, res, next) => {
  try {
    const input = previewSchema.parse(req.body);
    const quote = calculateUserQuote(input);
    res.json(success({ quote }));
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.post("/upload/mobile", handlePricingUploadMultipart, makePricingUploadHandler("MOBILE"));
adminPricingRouter.post("/upload/ipad", handlePricingUploadMultipart, makePricingUploadHandler("IPAD"));
adminPricingRouter.post("/upload/tablet", handlePricingUploadMultipart, makePricingUploadHandler("TABLET"));
adminPricingRouter.post("/upload", handlePricingUploadMultipart, makePricingUploadHandler(null, { deprecatedEndpoint: true }));

adminPricingRouter.patch("/uploads/:uploadId/status", async (req, res, next) => {
  try {
    const uploadId = z.string().uuid().parse(req.params.uploadId);
    const input = z.object({ status: z.enum(["ACTIVE", "DEACTIVATED"]) }).parse(req.body);

    const existing = await getDevicePriceUploadHistoryById(uploadId);
    if (!existing) {
      throw notFound("Upload history record not found");
    }

    if (existing.status === input.status) {
      throw badRequest(`Upload is already ${input.status.toLowerCase()}`);
    }

    if (input.status === "DEACTIVATED") {
      const result = await deactivateDevicePriceUploadAndRows({
        uploadId,
        deactivatedBy: req.auth.sub,
        deactivatedAt: new Date().toISOString(),
      });

      res.json(
        success({
          uploadId,
          fileName: existing.fileName,
          status: "DEACTIVATED",
          deactivatedCatalogRows: result.deactivatedCatalogRows,
          updated: result.deactivatedHistoryRows > 0,
        }),
      );
      return;
    }

    const result = await activateDevicePriceUploadAndRows({
      uploadId,
      sourceFileName: existing.fileName,
    });

    res.json(
      success({
        uploadId,
        fileName: existing.fileName,
        status: "ACTIVE",
        restoredCatalogRows: result.reactivatedCatalogRows,
        updated: result.reactivatedHistoryRows > 0,
      }),
    );
  } catch (err) {
    next(err);
  }
});

adminPricingRouter.delete("/uploads/:uploadId", async (req, res, next) => {
  try {
    const uploadId = z.string().uuid().parse(req.params.uploadId);
    const existing = await getDevicePriceUploadHistoryById(uploadId);
    if (!existing) {
      throw notFound("Upload history record not found");
    }

    if (existing.status !== "DEACTIVATED") {
      throw badRequest("Deactivate upload before permanent delete");
    }

    const result = await deleteDevicePriceUploadPermanently({ uploadId });

    res.json(
      success({
        uploadId,
        fileName: existing.fileName,
        deletedCatalogRows: result.deletedCatalogRows,
        deletedSnapshotRows: result.deletedSnapshotRows,
        deleted: result.deletedHistoryRows > 0,
      }),
    );
  } catch (err) {
    next(err);
  }
});
