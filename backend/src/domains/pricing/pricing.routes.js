import { Router } from "express";
import { z } from "zod";
import { success } from "../../shared/http/response.js";
import { findDevicePriceByExactMatch, listDistinctBrands, listModelsForBrand } from "../../db/repository.js";
import { calculateUserQuote } from "./quote-deduction.service.js";

const deviceTypeSchema = z.enum(["MOBILE", "IPAD", "TABLET"]);

function normalizeKey(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toUpperCase();
}

const lookupSchema = z.object({
  deviceType: deviceTypeSchema,
  brand: z.string().min(1),
  series: z.string().min(1),
  model: z.string().min(1),
  storage: z.string().min(1),
  launchYear: z.coerce.number().int().min(1990).max(2100),
});

const selectedModelSchema = z.object({
  brandSlug: z.string().trim().min(1).max(80),
  modelId: z.string().trim().min(1).max(120),
  modelName: z.string().trim().min(1).max(160),
  listedPrice: z.number().int().nonnegative().max(1000000),
  thumbnailUrl: z.string().url().optional(),
});

const answerValueSchema = z.enum(["yes", "no", "na"]);
const answerMapSchema = z.record(answerValueSchema.optional());

const deviceDetailsSchema = z.object({
  basicFunctionality: answerMapSchema.optional().default({}),
  physicalIssues: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  nestedPhysicalIssueAnswers: z.record(z.union([
    z.string().trim().min(1).max(160),
    z.array(z.string().trim().min(1).max(160)).min(1),
  ])).optional().default({}),
  functionalProblems: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  accessories: z.array(z.string().trim().min(1).max(120)).optional().default([]),
  cameraAndBiometrics: answerMapSchema.optional().default({}),
  sensorsAndConnectivity: answerMapSchema.optional().default({}),
  batteryAndCharging: answerMapSchema.optional().default({}),
  accessoriesAndOwnership: answerMapSchema.optional().default({}),
  metadata: z.object({
    useCase: z.literal("device-details").optional(),
    questionnaireVersion: z.string().trim().min(1).max(80).optional(),
    flowType: z.enum(["sell-phone", "sell-tablet"]).optional(),
    selectedIssues: z.array(z.string().trim().min(1).max(160)).optional().default([]),
    selectedIssueGroups: z.array(z.string().trim().min(1).max(80)).optional().default([]),
    hasScreenDefectBranch: z.boolean().optional(),
    hasBodyDefectBranch: z.boolean().optional(),
    updatedAt: z.string().datetime().optional(),
  }).optional().default({}),
}).passthrough();

const quotePreviewSchema = z.object({
  selectedModel: selectedModelSchema,
  deviceDetails: deviceDetailsSchema.optional().nullable().default({}),
});

export const pricingRouter = Router();

pricingRouter.get("/catalog/brands", (req, res, next) => {
  try {
    const deviceType = deviceTypeSchema.parse(typeof req.query.deviceType === "string" ? req.query.deviceType.toUpperCase() : undefined);
    const brands = listDistinctBrands(deviceType);
    res.json(success({ deviceType, brands }));
  } catch (err) {
    next(err);
  }
});

pricingRouter.get("/catalog/models", (req, res, next) => {
  try {
    const deviceType = deviceTypeSchema.parse(typeof req.query.deviceType === "string" ? req.query.deviceType.toUpperCase() : undefined);
    const brandRaw = req.query.brand;
    if (!brandRaw || typeof brandRaw !== "string" || !brandRaw.trim()) {
      return res.status(400).json({ success: false, error: "brand query parameter is required" });
    }
    const brand = normalizeKey(brandRaw);
    const rows = listModelsForBrand(brand, deviceType);

    const seriesMap = new Map();
    for (const row of rows) {
      if (!seriesMap.has(row.series)) seriesMap.set(row.series, new Map());
      const modelsMap = seriesMap.get(row.series);
      if (!modelsMap.has(row.model)) modelsMap.set(row.model, []);
      modelsMap.get(row.model).push({
        storage: row.storage,
        launchYear: row.launchYear,
        cashifyPrice: row.cashifyPrice,
      });
    }

    const series = Array.from(seriesMap.entries()).map(([seriesName, modelsMap]) => ({
      series: seriesName,
      models: Array.from(modelsMap.entries()).map(([modelName, storages]) => ({
        model: modelName,
        storages,
      })),
    }));

    res.json(success({ deviceType, brand, series }));
  } catch (err) {
    next(err);
  }
});

pricingRouter.post("/quote-preview", (req, res, next) => {
  try {
    const input = quotePreviewSchema.parse(req.body);
    const quote = calculateUserQuote({
      selectedModel: input.selectedModel,
      deviceDetails: input.deviceDetails || null,
    });

    res.json(success({ quote }));
  } catch (err) {
    next(err);
  }
});

pricingRouter.post("/lookup", (req, res, next) => {
  try {
    const input = lookupSchema.parse(req.body);
    const row = findDevicePriceByExactMatch({
      deviceType: input.deviceType,
      brand: normalizeKey(input.brand),
      series: normalizeKey(input.series),
      model: normalizeKey(input.model),
      storage: normalizeKey(input.storage),
      launchYear: input.launchYear,
    });

    if (!row) {
      return res.json(
        success({
          found: false,
          listedPrice: null,
          message: "No listed price found for given device details",
        }),
      );
    }

    res.json(
      success({
        found: true,
        listedPrice: row.cashifyPrice,
        currency: "INR",
        sourceFileName: row.sourceFileName,
        matchedDevice: {
          deviceType: row.deviceType,
          brand: row.brand,
          series: row.series,
          model: row.model,
          storage: row.storage,
          launchYear: row.launchYear,
        },
        rowJson: row.row,
      }),
    );
  } catch (err) {
    next(err);
  }
});
