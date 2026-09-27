import { Router } from "express";
import crypto from "crypto";
import multer from "multer";
import path from "path";
import { z } from "zod";
import { badRequest } from "../../shared/http/errors.js";
import { conflict } from "../../shared/http/errors.js";
import { forbidden } from "../../shared/http/errors.js";
import { notFound } from "../../shared/http/errors.js";
import { requireAuth, requireRole } from "../../shared/middleware/auth.js";
import { success } from "../../shared/http/response.js";
import { sendUserOtp, verifyUserOtp } from "../auth/auth.service.js";
import {
  appendPartnerLeadDispositionEvent,
  closePartnerLeadUnlockOrder,
  createMediaAsset,
  createPartnerCoinRechargeRequest,
  createPartnerLeadUnlockIntent,
  enqueueLeadEventOutbox,
  createKycSubmission,
  ensurePartnerCoinWallet,
  getPartnerLeadUnlockIntentById,
  getLatestKycForPartner,
  getPendingPartnerRechargeRequestByTxnRef,
  getPartnerCoinWallet,
  getPartnerDashboardMetrics,
  getPartnerCoinRechargeRequestById,
  getPartnerById,
  claimPartnerLead,
  getPartnerLeadById,
  listPartnerLeadsForPartner,
  listPartnerLeadsForScope,
  listPartnerCoinLedger,
  listPartnerCoinRechargeRequests,
  listPartnerLeadUnlockIntentsForAdmin,
  listPartnerLeadDispositionTimeline,
  listPartnerActivePickups,
  markPartnerLeadCallStatus,
  markPartnerLeadUnlockScreenshotSent,
  releasePartnerLeadToBucket,
  setPartnerLeadPickupStartedAt,
  savePartnerLeadCompletionEvent,
  savePartnerLeadOnsiteValidation,
  savePartnerLeadPaymentProofMetadata,
  updatePartnerLeadWorkflowStatus,
  updatePartnerLeadReschedule,
  verifyPartnerLeadUnlockIntent,
  verifyPartnerCoinRechargeRequest,
  listActivePartnerPincodes,
  listActiveQuoteDeductionRulesForModel,
  deactivatePartnerPincodeScope,
  upsertPartnerPincodeScope,
  getServiceabilityByPincode,
} from "../../db/repository.js";
import {
  assertAllowedMime,
  assertMaxBytes,
  buildMediaRelativePath,
  calculateChecksum,
  documentMimeTypes,
  imageMimeTypes,
  writeMediaBuffer,
} from "../../shared/store/local-media.js";
import { env } from "../../config/env.js";

const upload = multer({ storage: multer.memoryStorage() });
const REQUIRED_ONSITE_VALIDATION_PHOTOS = 6;
const LEAD_UNLOCK_TTL_MINUTES = 5;

const kycMetadataSchema = z.object({
  identityProof: z.enum(["Aadhar", "Voter ID", "Driving License", "PAN Card", "Passport"]),
  fileName: z.string().min(1).max(200),
  mimeType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
});

const dashboardQuerySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
});

const partnerLeadStatuses = ["AVAILABLE", "CLAIMED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED"];

const leadListQuerySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
  status: z.enum(partnerLeadStatuses).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timeSlot: z.string().trim().min(1).max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

const leadBucketQuerySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  pincodes: z.string().optional(),
  status: z.enum(partnerLeadStatuses).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
}).refine((data) => data.pincode || data.pincodes, {
  message: "Either pincode or pincodes query param is required",
});

const pincodeBodySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/, "Pincode must be exactly 6 digits"),
});

const workflowStatusSchema = z.object({
  status: z.enum(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "REJECTED", "CANCELLED"]),
  reason: z.string().trim().max(240).optional().default(""),
});

const partnerCheckSchema = z.object({
  key: z.string().trim().min(1).max(240),
  label: z.string().trim().min(1).max(240),
  userValue: z.string().trim().max(1000).default(""),
  partnerInput: z.enum(["yes", "no", "na"]),
  comment: z.string().trim().max(500).nullable().optional(),
}).strict();

const observedIssueDeductionSchema = z.object({
  description: z.string().trim().min(1).max(200),
  deductionAmount: z.number().min(0).max(1000000),
}).strict();

const onsiteValidationSchema = z.object({
  checklist: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  partnerChecks: z.array(partnerCheckSchema).max(100).default([]),
  observedIssues: z.array(z.string().trim().min(1).max(200)).max(30).default([]),
  observedIssueDeductions: z.array(observedIssueDeductionSchema).max(30).default([]),
  revisedQuote: z.number().min(0).max(1000000).optional(),
}).strict();

const paymentProofMetadataSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  mimeType: z.string().trim().min(3).max(120),
  sizeBytes: z.number().int().positive().max(10 * 1024 * 1024),
  extraPaidAmount: z.number().min(0).max(1000000).default(0),
  amountCollected: z.number().min(0).max(1000000),
  paymentMode: z.enum(["UPI", "BANK_TRANSFER", "CASH", "OTHER"]),
}).strict();

const completionSchema = z.object({
  completionCode: z.string().trim().max(80).optional(),
  handoverChecklist: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).default({}),
  finalAmount: z.number().min(0).max(1000000),
}).strict();

function rejectRemovedFields(source, fieldNames) {
  const rejected = fieldNames.filter((fieldName) => Object.hasOwn(source || {}, fieldName));
  if (rejected.length) {
    throw badRequest(`Unsupported field(s): ${rejected.join(", ")}`);
  }
}

const timelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).optional().default(100),
});

const callStatusSchema = z.object({
  callStatus: z.enum(["CALLED", "NO_ANSWER", "BUSY", "DECLINED", "RESCHEDULE_REQUESTED", "FOLLOW_UP_REQUIRED"]),
  note: z.string().trim().max(300).optional(),
});

const RESCHEDULE_REASONS = [
  "Bdcs reschedule",
  "Customer asked to reschedule",
  "Out of town now",
  "Reschedule for same day next slot",
  "Waiting for new phone",
  "Not available today",
  "Customer not responding/reachable",
  "Not having acessories today",
  "Data backup issue",
  "iCloud / country lock issue",
  "Dead Device",
  "Requote price not agreed",
  "Devices not available and store is asking for time",
];

const rescheduleLeadSchema = z.object({
  reason: z.enum(RESCHEDULE_REASONS),
  primaryDate: z.string().datetime(),
  primaryTime: z.string().trim().min(1).max(40).optional(),
  comment: z.string().trim().max(500).optional().default(""),
});

const customerOtpVerifySchema = z.object({
  otp: z.string().regex(/^\d{4,6}$/),
});

const activePickupQuerySchema = z.object({
  pincode: z.string().regex(/^\d{6}$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

function nowIso() {
  return new Date().toISOString();
}

function normalizeInvoiceDeductions(rawDeductions) {
  if (!rawDeductions) return null;

  let deductions = rawDeductions;
  if (typeof rawDeductions === "string") {
    try {
      deductions = JSON.parse(rawDeductions);
    } catch {
      return null;
    }
  }

  if (!deductions || typeof deductions !== "object") return null;

  const listedPrice = Number(deductions.listedPrice) || 0;
  if (Number.isFinite(Number(deductions.totalDeductionAmount))) {
    const issues = Array.isArray(deductions.issues)
      ? deductions.issues.map((issue) => ({
          ...issue,
          deductRupees: Math.max(0, Math.round(Number(issue?.deductRupees ?? issue?.deductionAmount ?? 0))),
        }))
      : [];
    return {
      ...deductions,
      deductionType: "RUPEES",
      totalDeductionAmount: Math.max(0, Math.round(Number(deductions.totalDeductionAmount))),
      issues,
    };
  }

  const legacyPercent = Number(deductions.totalDeductionPercent) || 0;
  const totalDeductionAmount = Math.max(0, Math.round((listedPrice * legacyPercent) / 100));
  const issues = Array.isArray(deductions.issues)
    ? deductions.issues.map((issue) => ({
        ...issue,
        deductRupees: Math.max(0, Math.round((listedPrice * (Number(issue?.deductionPercent) || 0)) / 100)),
      }))
    : [];

  return {
    ...deductions,
    deductionType: "RUPEES",
    totalDeductionAmount,
    issues,
  };
}

function normalizeOnsiteChecklist(checklist) {
  const normalizedChecklist = checklist && typeof checklist === "object" ? checklist : {};
  const hasLegacyGstKey = Object.prototype.hasOwnProperty.call(normalizedChecklist, "gstBill");
  const hasLegacyImeiKey = Object.prototype.hasOwnProperty.call(normalizedChecklist, "sameImei");

  if (hasLegacyGstKey || hasLegacyImeiKey) {
    throw badRequest("Use checklist.gstBillSameImei only. Legacy checklist keys gstBill and sameImei are no longer supported.");
  }

  return normalizedChecklist;
}

function assertPartnerCanAccessLead(lead, req) {
  if (!lead) throw notFound("Partner lead not found");
  if (lead.partnerId && lead.partnerId !== req.auth.sub) throw notFound("Partner lead not found");
}

function getLeadUnlockPrice(lead) {
  const quotePrice = Number(lead?.quote?.sellingPrice);
  if (!Number.isFinite(quotePrice) || quotePrice < 300) return null;
  if (quotePrice <= 10000) return 500;
  if (quotePrice <= 24999) return 800;
  return 1200;
}

function partnerHasUnlockedLead(lead, partnerId) {
  if (!lead || !partnerId) return false;
  if (lead.partnerId === partnerId && ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(lead.status)) return true;
  return lead.unlockOrder?.partnerId === partnerId && ["APPROVED", "CLOSED"].includes(lead.unlockOrder.status);
}

function normalizeRuleValue(value) {
  return value == null ? null : String(value).trim().toLowerCase();
}

function toRoundedDeductionAmount(basePrice, rule) {
  if (rule?.deductionType === "PERCENT") {
    const raw = (Number(basePrice) * Number(rule.deductionValue || 0)) / 100;
    const hasMaxCap = rule.maxDeductionAmount !== null
      && rule.maxDeductionAmount !== undefined
      && Number.isFinite(Number(rule.maxDeductionAmount));
    const capped = hasMaxCap ? Math.min(raw, Number(rule.maxDeductionAmount)) : raw;
    return Math.max(0, Math.round(capped));
  }

  return Math.max(0, Math.round(Number(rule?.deductionValue || 0)));
}

const ONSITE_DEDUCTION_FIELD_CONFIG = [
  { key: "makeReceiveCalls", triggerOn: "no", candidates: [{ answerGroup: "basicFunctionality", answerKey: "canMakeCalls", answerValues: ["no"] }] },
  { key: "touchScreenWorking", triggerOn: "no", candidates: [{ answerGroup: "basicFunctionality", answerKey: "touchWorking", answerValues: ["no"] }] },
  {
    key: "screenOriginal",
    triggerOn: "no",
    candidates: [
      { answerGroup: "basicFunctionality", answerKey: "screenReplaced", answerValues: ["no"] },
      { answerGroup: "basicFunctionality", answerKey: "originalDisplay", answerValues: ["no"] },
    ],
  },
  {
    key: "manufacturerWarranty",
    triggerOn: "no",
    candidates: [
      { answerGroup: "warrantyAndBill", answerKey: "underWarranty", answerValues: ["no"] },
      { answerGroup: "accessoriesAndOwnership", answerKey: "underWarranty", answerValues: ["no"] },
    ],
  },
  {
    key: "gstBillSameImei",
    triggerOn: "no",
    candidates: [
      { answerGroup: "warrantyAndBill", answerKey: "billInvoice", answerValues: ["no"] },
      { answerGroup: "accessoriesAndOwnership", answerKey: "billInvoice", answerValues: ["no"] },
    ],
  },
  { key: "originalBoxWithIMEI", triggerOn: "no", candidates: [{ answerGroup: "accessories", answerKey: "originalBoxWithIMEI" }] },
  { key: "screenDeadPixelsNoSpots", triggerOn: "no", candidates: [{ answerGroup: "nestedPhysicalIssueAnswers", answerKey: "screenDeadPixels", answerValues: ["noSpots"] }] },
  {
    key: "screenVisibleLinesNoLines",
    triggerOn: "no",
    candidates: [
      { answerGroup: "nestedPhysicalIssueAnswers", answerKey: "screenVisibleLines", answerValues: ["noLines"] },
      { answerGroup: "nestedPhysicalIssueAnswers", answerKey: "visibleLines", answerValues: ["line"] },
    ],
  },
  {
    key: "screenDiscolorationMajor",
    triggerOn: "no",
    candidates: [
      { answerGroup: "nestedPhysicalIssueAnswers", answerKey: "screenDiscoloration", answerValues: ["majorDiscoloration"] },
      { answerGroup: "nestedPhysicalIssueAnswers", answerKey: "discoloration", answerValues: ["major"] },
    ],
  },
  {
    key: "screenCracksChippedOutsideDisplay",
    triggerOn: "no",
    candidates: [
      { answerGroup: "nestedPhysicalIssueAnswers", answerKey: "screenCracks", answerValues: ["chippedOrCrackedOutsideDisplay"] },
      { answerGroup: "nestedPhysicalIssueAnswers", answerKey: "screenPhysical", answerValues: ["chippedOutside"] },
    ],
  },
  { key: "brokenScratchScreen", triggerOn: "yes", candidates: [{ answerGroup: "physicalIssues", answerKey: "Broken/scratch on device screen" }] },
  { key: "brokenScratchDeviceScreen", triggerOn: "yes", candidates: [{ answerGroup: "physicalIssues", answerKey: "Broken/scratch on device screen" }] },
  { key: "deadSpotLineDiscoloration", triggerOn: "yes", candidates: [{ answerGroup: "physicalIssues", answerKey: "Dead Spot/Visible line and Discoloration on screen" }] },
  { key: "scratchDentBody", triggerOn: "yes", candidates: [{ answerGroup: "physicalIssues", answerKey: "Scratch/Dent on device body" }] },
  { key: "panelMissingBroken", triggerOn: "yes", candidates: [{ answerGroup: "physicalIssues", answerKey: "Device panel missing/broken" }] },
  { key: "frontCamera", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "frontCameraNotWorking" }] },
  { key: "backCamera", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "backCameraNotWorking" }] },
  { key: "volumeButton", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "volumeButtonNotWorking" }] },
  { key: "fingerTouch", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "fingerTouchNotWorking" }] },
  { key: "wifi", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "wifiNotWorking" }] },
  { key: "speaker", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "speakerFaulty" }] },
  { key: "powerButton", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "powerButtonNotWorking" }] },
  { key: "chargingPort", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "chargingPortNotWorking" }] },
  { key: "faceSensor", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "faceSensorNotWorking" }] },
  { key: "silentButton", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "silentButtonNotWorking" }] },
  { key: "audioReceiver", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "audioReceiverNotWorking" }] },
  { key: "cameraGlass", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "cameraGlassBroken" }] },
  { key: "bluetooth", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "bluetoothNotWorking" }] },
  { key: "vibrator", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "vibratorNotWorking" }] },
  { key: "microphone", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "microphoneNotWorking" }] },
  { key: "proximitySensor", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "proximitySensorNotWorking" }] },
  { key: "batteryHealthBelow80", triggerOn: "yes", candidates: [{ answerGroup: "functionalProblems", answerKey: "batteryHealthBelow80Service" }] },
  { key: "mobileAge", triggerOn: "yes", candidates: [{ answerGroup: "mobileAge" }] },
];

function isRuleMatchForCandidate(rule, candidate) {
  if (!rule || !candidate) return false;
  if (candidate.answerGroup && normalizeRuleValue(rule.answerGroup) !== normalizeRuleValue(candidate.answerGroup)) return false;
  if (candidate.answerKey && toCanonicalLookupKey(rule.answerKey) !== toCanonicalLookupKey(candidate.answerKey)) return false;
  if (Array.isArray(candidate.answerValues) && candidate.answerValues.length > 0) {
    const value = toCanonicalAnswerValue(rule.answerValue);
    const allowed = candidate.answerValues.map((item) => toCanonicalAnswerValue(item));
    if (!allowed.includes(value)) return false;
  }
  return true;
}

function buildPartnerOnsiteDeductionCatalog(lead) {
  const basePrice = Number(lead?.quote?.basePrice || lead?.selectedModel?.listedPrice || lead?.quote?.sellingPrice || 0);
  const rules = listActiveQuoteDeductionRulesForModel({
    brandSlug: lead?.selectedModel?.brandSlug,
    modelId: lead?.selectedModel?.modelId,
  });

  const fields = {};
  for (const fieldConfig of ONSITE_DEDUCTION_FIELD_CONFIG) {
    const matched = [];
    const seen = new Set();

    for (const rule of rules) {
      const isMatch = fieldConfig.candidates.some((candidate) => isRuleMatchForCandidate(rule, candidate));
      if (!isMatch) continue;
      if (seen.has(rule.id)) continue;
      seen.add(rule.id);
      matched.push({
        ruleId: rule.id,
        label: rule.label,
        answerGroup: rule.answerGroup,
        answerKey: rule.answerKey,
        answerValue: rule.answerValue,
        amount: toRoundedDeductionAmount(basePrice, rule),
      });
    }

    fields[fieldConfig.key] = {
      triggerOn: fieldConfig.triggerOn,
      rules: matched,
    };
  }

  return {
    basePrice,
    fields,
    rules: rules.map((rule) => ({
      ruleId: rule.id,
      label: rule.label,
      answerGroup: rule.answerGroup,
      answerKey: rule.answerKey,
      answerValue: rule.answerValue,
      amount: toRoundedDeductionAmount(basePrice, rule),
    })),
  };
}

function toLookupKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const ANSWER_KEY_ALIASES = new Map([
  ["brokenscratchonscreen", "brokenscratchondevicescreen"],
  ["brokenorscreenscratches", "brokenscratchondevicescreen"],
  ["anydeadspots", "deadspotvisiblelineanddiscolorationonscreen"],
  ["deadspotline", "deadspotvisiblelineanddiscolorationonscreen"],
  ["dentormarksonbody", "scratchdentondevicebody"],
  ["devicepanelbrokenmissing", "devicepanelmissingbroken"],
  ["rearcamera", "backcameranotworking"],
  ["backcamera", "backcameranotworking"],
  ["volumebuttons", "volumebuttonnotworking"],
  ["speaker", "speakerfaulty"],
  ["faceunlock", "facesensornotworking"],
  ["alertslider", "silentbuttonnotworking"],
  ["earspeaker", "audioreceivernotworking"],
  ["vibration", "vibratornotworking"],
  ["originaldisplay", "screenreplaced"],
  ["originalbox", "originalboxwithimei"],
  ["deadpixels", "screendeadpixels"],
  ["visiblelines", "screenvisiblelines"],
  ["discoloration", "screendiscoloration"],
  ["screenphysical", "screencracks"],
]);

function toCanonicalLookupKey(value) {
  const key = toLookupKey(value);
  return ANSWER_KEY_ALIASES.get(key) || key;
}

const ANSWER_VALUE_ALIASES = new Map([
  ["major", "majordiscoloration"],
  ["minor", "minordiscoloration"],
  ["line", "nolines"],
  ["chippedoutside", "chippedorcrackedoutsidedisplay"],
]);

function toCanonicalAnswerValue(value) {
  const key = toLookupKey(value);
  return ANSWER_VALUE_ALIASES.get(key) || key;
}

const ARRAY_ANSWER_GROUP_LOOKUPS = new Set(["physicalissues", "functionalproblems", "accessories"]);

const ONSITE_ROW_FIELD_ALIASES = new Map([
  ["basicfunctionalitycanmakecalls", ["makeReceiveCalls"]],
  ["canmakecalls", ["makeReceiveCalls"]],
  ["makereceivecalls", ["makeReceiveCalls"]],
  ["basicfunctionalitytouchworking", ["touchScreenWorking"]],
  ["touchworking", ["touchScreenWorking"]],
  ["touchscreenworking", ["touchScreenWorking"]],
  ["basicfunctionalityscreenreplaced", ["screenOriginal"]],
  ["screenreplaced", ["screenOriginal"]],
  ["screenoriginal", ["screenOriginal"]],
  ["warrantyandbillunderwarranty", ["manufacturerWarranty"]],
  ["accessoriesandownershipunderwarranty", ["manufacturerWarranty"]],
  ["underwarranty", ["manufacturerWarranty"]],
  ["warrantyandbillbillinvoice", ["gstBillSameImei"]],
  ["accessoriesandownershipbillinvoice", ["gstBillSameImei"]],
  ["billinvoice", ["gstBillSameImei"]],
  ["accessoriesoriginalboxwithimei", ["originalBoxWithIMEI"]],
  ["accessoriesandownershiporiginalboxwithimei", ["originalBoxWithIMEI"]],
  ["originalboxwithimei", ["originalBoxWithIMEI"]],
  ["nestedphysicalissueanswersscreendeadpixels", ["screenDeadPixelsNoSpots"]],
  ["screendeadpixels", ["screenDeadPixelsNoSpots"]],
  ["nestedphysicalissueanswersscreenvisiblelines", ["screenVisibleLinesNoLines"]],
  ["screenvisiblelines", ["screenVisibleLinesNoLines"]],
  ["nestedphysicalissueanswersscreendiscoloration", ["screenDiscolorationMajor"]],
  ["screendiscoloration", ["screenDiscolorationMajor"]],
  ["nestedphysicalissueanswersscreencracks", ["screenCracksChippedOutsideDisplay"]],
  ["screencracks", ["screenCracksChippedOutsideDisplay"]],
  ["mobileage", ["mobileAge"]],
]);

function normalizeVerificationValue(value) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw || raw === "-" || raw === "n/a" || raw === "na") return "";
  if (["yes", "y", "true", "1"].includes(raw)) return "yes";
  if (["no", "n", "false", "0"].includes(raw)) return "no";
  return raw;
}

function parsePartnerChecksFromChecklist(checklist) {
  return Object.entries(checklist || {})
    .filter(([key]) => !key.startsWith("__"))
    .flatMap(([key, value]) => {
      if (typeof value !== "string") return [];
      try {
        const parsed = JSON.parse(value);
        if (!parsed || typeof parsed !== "object") return [];
        return [{
          key,
          label: String(parsed.field || key),
          userValue: String(parsed.userInput ?? ""),
          partnerInput: ["yes", "no", "na"].includes(String(parsed.partnerInput)) ? String(parsed.partnerInput) : "na",
          comment: parsed.comment ? String(parsed.comment) : null,
        }];
      } catch {
        return [];
      }
    });
}

function getCatalogFieldKeysForPartnerCheck(check) {
  const rowKey = toCanonicalLookupKey(check.key);
  const rowLabel = toCanonicalLookupKey(check.label);
  const rowValue = toCanonicalLookupKey(check.userValue);
  const direct = ONSITE_ROW_FIELD_ALIASES.get(rowKey) || ONSITE_ROW_FIELD_ALIASES.get(rowLabel);
  if (direct) return direct;

  const fieldKeys = [];
  for (const fieldConfig of ONSITE_DEDUCTION_FIELD_CONFIG) {
    const configKey = toLookupKey(fieldConfig.key);
    if (rowKey === configKey || rowLabel === configKey) {
      fieldKeys.push(fieldConfig.key);
      continue;
    }

    const matchedCandidate = fieldConfig.candidates.some((candidate) => {
      const group = toLookupKey(candidate.answerGroup);
      const answerKey = toCanonicalLookupKey(candidate.answerKey);
      const hasGroup = group && (rowKey.includes(group) || rowLabel.includes(group));
      const hasAnswerKey = answerKey && (rowKey.includes(answerKey) || rowLabel.includes(answerKey) || (ARRAY_ANSWER_GROUP_LOOKUPS.has(group) && rowValue.includes(answerKey)));
      return hasGroup && (!answerKey || hasAnswerKey);
    });

    if (matchedCandidate) fieldKeys.push(fieldConfig.key);
  }

  return [...new Set(fieldKeys)];
}

function ruleMatchesPartnerCheck(rule, check) {
  const rowKey = toCanonicalLookupKey(check.key);
  const rowLabel = toCanonicalLookupKey(check.label);
  const rowValue = toCanonicalLookupKey(check.userValue);
  const answerGroup = toLookupKey(rule.answerGroup);
  const answerKey = toCanonicalLookupKey(rule.answerKey);
  const hasGroup = answerGroup && (rowKey.includes(answerGroup) || rowLabel.includes(answerGroup));
  const hasAnswerKey = answerKey && (rowKey.includes(answerKey) || rowLabel.includes(answerKey) || (ARRAY_ANSWER_GROUP_LOOKUPS.has(answerGroup) && rowValue.includes(answerKey)));
  return Boolean(hasGroup && hasAnswerKey);
}

function shouldApplyRuleForPartnerCheck(check, rule) {
  const partnerInput = normalizeVerificationValue(check.partnerInput);
  const userValue = normalizeVerificationValue(check.userValue);
  if (!partnerInput || partnerInput === "na") return false;

  const normalizedRuleAnswer = normalizeRuleValue(rule.answerValue);
  if (!normalizedRuleAnswer) {
    return partnerInput === "no";
  }

  if (userValue === "yes" || userValue === "no") {
    const verifiedValue = partnerInput === "yes"
      ? userValue
      : userValue === "yes"
        ? "no"
        : "yes";
    return normalizedRuleAnswer === verifiedValue;
  }

  // For categorical answers, only apply the value-specific rule when partner disputes user input.
  return partnerInput === "no" && toCanonicalAnswerValue(normalizedRuleAnswer) === toCanonicalAnswerValue(userValue);
}

function getCatalogRulesForPartnerCheck(check, catalog) {
  return getCatalogCandidateRulesForPartnerCheck(check, catalog)
    .filter((rule) => shouldApplyRuleForPartnerCheck(check, rule));
}

function getCatalogCandidateRulesForPartnerCheck(check, catalog) {
  const rules = [];
  const seenRuleIds = new Set();

  for (const fieldKey of getCatalogFieldKeysForPartnerCheck(check)) {
    const field = catalog.fields[fieldKey];
    if (!field?.rules?.length) continue;
    for (const rule of field.rules) {
      if (seenRuleIds.has(rule.ruleId)) continue;
      seenRuleIds.add(rule.ruleId);
      rules.push(rule);
    }
  }

  for (const rule of catalog.rules || []) {
    if (seenRuleIds.has(rule.ruleId) || !ruleMatchesPartnerCheck(rule, check)) continue;
    seenRuleIds.add(rule.ruleId);
    rules.push(rule);
  }

  return rules;
}

function computeOnsiteRequote({ lead, checklist, partnerChecks, observedIssueDeductions }) {
  const listedPrice = Math.max(0, Math.round(Number(lead?.quote?.sellingPrice ?? lead?.selectedModel?.listedPrice ?? 0)));
  const catalog = buildPartnerOnsiteDeductionCatalog(lead);
  const checks = partnerChecks.length ? partnerChecks : parsePartnerChecksFromChecklist(checklist);
  const questionDeductions = [];
  const decisionTrace = [];
  const seenRuleIds = new Set();

  for (const check of checks) {
    const partnerInput = normalizeVerificationValue(check.partnerInput);
    const traceEntry = {
      key: check.key,
      field: check.label,
      userInput: check.userValue,
      partnerInput: check.partnerInput,
      appliedRules: [],
      skippedRules: [],
      skippedDuplicateRuleIds: [],
      skippedReason: null,
    };

    if (!partnerInput || partnerInput === "na") {
      traceEntry.skippedReason = "partner_input_empty_or_na";
      decisionTrace.push(traceEntry);
      continue;
    }

    const matchingRules = getCatalogCandidateRulesForPartnerCheck(check, catalog);
    if (!matchingRules.length) {
      traceEntry.skippedReason = "no_matching_applicable_rule";
      decisionTrace.push(traceEntry);
      continue;
    }

    for (const rule of matchingRules) {
      if (!shouldApplyRuleForPartnerCheck(check, rule)) {
        traceEntry.skippedRules.push({
          ruleId: rule.ruleId,
          label: rule.label,
          reason: "answer_value_or_partner_input_mismatch",
        });
        continue;
      }
      if (seenRuleIds.has(rule.ruleId)) {
        traceEntry.skippedDuplicateRuleIds.push(rule.ruleId);
        continue;
      }
      seenRuleIds.add(rule.ruleId);
      const deductRupees = Math.max(0, Math.round(Number(rule.amount || 0)));
      traceEntry.appliedRules.push({
        ruleId: rule.ruleId,
        label: rule.label,
        deductRupees,
      });
      questionDeductions.push({
        key: check.key,
        field: check.label,
        userInput: check.userValue,
        partnerInput: check.partnerInput,
        ruleId: rule.ruleId,
        label: rule.label,
        answerGroup: rule.answerGroup,
        answerKey: rule.answerKey,
        deductRupees,
      });
    }

    if (!traceEntry.appliedRules.length && traceEntry.skippedDuplicateRuleIds.length) {
      traceEntry.skippedReason = "duplicate_rule_already_applied";
    }
    if (!traceEntry.appliedRules.length && traceEntry.skippedRules.length) {
      traceEntry.skippedReason = "no_rule_applied_after_answer_value_check";
    }
    decisionTrace.push(traceEntry);
  }

  const extraIssues = observedIssueDeductions.map((issue) => ({
    description: issue.description,
    deductRupees: Math.max(0, Math.round(Number(issue.deductionAmount || 0))),
  }));
  const ruleDeductionAmount = questionDeductions.reduce((sum, item) => sum + item.deductRupees, 0);
  const observedIssueDeductionAmount = extraIssues.reduce((sum, item) => sum + item.deductRupees, 0);
  const totalDeductionAmount = Math.max(0, Math.round(ruleDeductionAmount + observedIssueDeductionAmount));
  const reQuotedPrice = Math.max(0, listedPrice - totalDeductionAmount);

  return {
    listedPrice,
    ruleDeductionAmount,
    observedIssueDeductionAmount,
    totalDeductionAmount,
    reQuotedPrice,
    finalAssessedPrice: reQuotedPrice,
    questionDeductions,
    decisionTrace,
    issues: extraIssues,
    anyOtherIssues: extraIssues,
  };
}

function maskLeadForPartnerList(lead, partnerId) {
  if (partnerHasUnlockedLead(lead, partnerId)) return lead;
  return {
    ...lead,
    seller: {
      ...lead.seller,
      name: null,
      phone: null,
      addressLine: null,
      landmark: null,
    },
    pickupSchedule: lead.pickupSchedule
      ? {
          ...lead.pickupSchedule,
          sellerName: null,
          callingPhoneNumber: null,
          addressLine: null,
          landmark: null,
          alternateDate: null,
          alternateTime: null,
        }
      : null,
  };
}

function toDispositionKey(status) {
  switch (status) {
    case "AVAILABLE": return "CREATED";
    case "CLAIMED": return "CLAIMED";
    case "ACCEPTED": return "ACCEPTED";
    case "IN_PROGRESS": return "VISIT_STARTED";
    case "COMPLETED": return "COMPLETED";
    case "REJECTED": return "REJECTED";
    case "CANCELLED": return "CANCELLED";
    default: return "UPDATED";
  }
}

function hasPendingPaymentForCompletedLead(lead) {
  return lead.status === "COMPLETED" && (!lead.paymentProof || !lead.completionEvent);
}

function isAllowedTransition(fromStatus, toStatus) {
  const allowed = {
    CLAIMED: ["ACCEPTED"],
    ACCEPTED: ["AVAILABLE", "IN_PROGRESS", "REJECTED", "CANCELLED"],
    IN_PROGRESS: ["COMPLETED", "REJECTED", "CANCELLED"],
  };
  return Array.isArray(allowed[fromStatus]) && allowed[fromStatus].includes(toStatus);
}

const rechargeCoinsSchema = z.object({
  amount: z.number().int().positive().max(100000),
  upiTxnRef: z.string().trim().min(3).max(120),
  upiApp: z.string().trim().min(2).max(60).optional(),
});

const rechargeRequestListSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(30),
});

const adminRechargeRequestListSchema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  partnerId: z.string().trim().min(5).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

const verifyRechargeRequestSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(240).optional().default(""),
});

const leadUnlockIntentStatuses = ["PENDING_PAYMENT", "SCREENSHOT_SENT", "APPROVED", "REJECTED", "EXPIRED", "CLOSED"];

const leadUnlockIntentListSchema = z.object({
  status: z.enum(leadUnlockIntentStatuses).optional(),
  partnerId: z.string().trim().min(5).max(120).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
});

const verifyLeadUnlockIntentSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().trim().max(240).optional().default(""),
});

export const partnerRouter = Router();

partnerRouter.get("/me", requireAuth, requireRole("partner"), (req, res) => {
  const partner = getPartnerById(req.auth.sub);

  res.json(
    success({
      partner: partner || {
        id: req.auth.sub,
        phone: req.auth.phone || null,
        name: "Partner",
      },
      tenantScope: {
        scopeType: "PINCODE",
        selectedPincode: null,
      },
    }),
  );
});

partnerRouter.post("/kyc/metadata", requireAuth, requireRole("partner"), upload.single("file"), (req, res, next) => {
  try {
    const input = kycMetadataSchema.parse(
      req.file
        ? {
            identityProof: req.body.identityProof,
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
          }
        : req.body,
    );

    const kycId = crypto.randomUUID();
    const now = nowIso();

    const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `kyc/${req.auth.sub}/${kycId}-${safeFileName}`;
    let media = null;
    if (req.file) {
      assertAllowedMime(req.file, documentMimeTypes);
      assertMaxBytes(req.file, env.mediaMaxDocumentBytes);

      const mediaRelativePath = buildMediaRelativePath({
        tenantType: "partner",
        ownerId: req.auth.sub,
        entityType: "partner-kyc",
        entityId: kycId,
        mediaId: kycId,
        fileName: input.fileName,
      });
      writeMediaBuffer({ relativePath: mediaRelativePath, buffer: req.file.buffer });
      media = createMediaAsset({
        id: kycId,
        tenantType: "partner",
        tenantId: req.auth.sub,
        ownerRole: "partner",
        ownerId: req.auth.sub,
        entityType: "partner-kyc",
        entityId: kycId,
        slot: "identity-proof",
        originalFileName: input.fileName,
        storedFileName: path.basename(mediaRelativePath),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        relativePath: mediaRelativePath,
        storageProvider: "LOCAL_DISK",
        checksum: calculateChecksum(req.file.buffer),
        createdAt: now,
        updatedAt: now,
      });
    }

    const row = createKycSubmission({
      id: kycId,
      partnerId: req.auth.sub,
      identityProof: input.identityProof,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      storageStatus: "METADATA_STORED",
      storageProvider: "LOCAL_PLACEHOLDER",
      storageKey,
      verificationStatus: "PENDING_REVIEW",
      createdAt: now,
      updatedAt: now,
    });

    if (media) {
      row.mediaUrl = `/api/v1/media/${media.id}`;
    }

    res.json(
      success({
        kyc: row,
        storage: {
          strategy: media ? "LOCAL_FILE" : "METADATA_ONLY_PLACEHOLDER",
          provider: media ? "LOCAL_DISK" : "LOCAL_PLACEHOLDER",
          storageKey,
          uploadUrl: media ? `/api/v1/media/${media.id}` : null,
          note: media
            ? "File stored on local disk and available through authenticated media endpoint."
            : "File binary upload pipeline not used in this request; metadata stored for compatibility.",
        },
      }),
    );
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/kyc/status", requireAuth, requireRole("partner"), (req, res) => {
  const latest = getLatestKycForPartner(req.auth.sub);
  res.json(success({ latestSubmission: latest || null }));
});

partnerRouter.get("/coins/balance", requireAuth, requireRole("partner"), (req, res) => {
  const now = nowIso();
  ensurePartnerCoinWallet(req.auth.sub, now);
  const wallet = getPartnerCoinWallet(req.auth.sub);

  res.json(
    success({
      partnerId: req.auth.sub,
      balance: wallet?.balance || 0,
      updatedAt: wallet?.updatedAt || now,
    }),
  );
});

partnerRouter.get("/coins/ledger", requireAuth, requireRole("partner"), (req, res) => {
  const rows = listPartnerCoinLedger(req.auth.sub, 30);
  res.json(success({ rows, count: rows.length }));
});

partnerRouter.get("/pincodes", requireAuth, requireRole("partner"), (req, res) => {
  const pincodes = listActivePartnerPincodes(req.auth.sub);
  res.json(success({ pincodes }));
});

partnerRouter.post("/pincodes", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const { pincode } = pincodeBodySchema.parse(req.body);

    const existing = listActivePartnerPincodes(req.auth.sub);
    const alreadySaved = existing.some((p) => p.pincode === pincode);
    if (alreadySaved) {
      throw conflict(`Pincode ${pincode} is already configured for this partner.`);
    }

    const serviceability = getServiceabilityByPincode(pincode);
    if (!serviceability || serviceability.status !== "ACTIVE") {
      throw badRequest(`Pincode ${pincode} is not serviceable in this area.`);
    }

    const now = nowIso();
    upsertPartnerPincodeScope({
      id: crypto.randomUUID(),
      partnerId: req.auth.sub,
      pincode,
      isActive: true,
      updatedBy: req.auth.sub,
      createdAt: now,
      updatedAt: now,
    });

    const pincodes = listActivePartnerPincodes(req.auth.sub);
    res.json(success({ pincodes }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.delete("/pincodes/:pincode", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const { pincode } = z.object({ pincode: z.string().regex(/^\d{6}$/) }).parse(req.params);
    deactivatePartnerPincodeScope(req.auth.sub, pincode);
    const pincodes = listActivePartnerPincodes(req.auth.sub);
    res.json(success({ pincodes }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/lead-bucket", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const query = leadBucketQuerySchema.parse(req.query);

    let pincodeFilter;
    if (query.pincodes) {
      const arr = query.pincodes.split(",").map((p) => p.trim()).filter((p) => /^\d{6}$/.test(p));
      if (arr.length === 0) throw badRequest("No valid pincodes provided in pincodes param.");
      pincodeFilter = { pincodes: arr };
    } else {
      pincodeFilter = { pincode: query.pincode };
    }

    const bucketRows = listPartnerLeadsForScope({
      ...pincodeFilter,
      leadType: "LEAD_BUCKET",
      status: query.status,
      partnerId: req.auth.sub,
      viewerPartnerId: req.auth.sub,
      limit: query.limit,
    });

    const scheduledRows = listPartnerLeadsForScope({
      ...pincodeFilter,
      leadType: "SERVICE_LEAD",
      status: query.status,
      partnerId: req.auth.sub,
      viewerPartnerId: req.auth.sub,
      limit: query.limit,
    });

    const rows = [...bucketRows, ...scheduledRows]
      .map((lead) => maskLeadForPartnerList(lead, req.auth.sub))
      .sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")));

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/service-leads", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const query = leadListQuerySchema.parse(req.query);
    const rows = listPartnerLeadsForScope({
      pincode: query.pincode,
      leadType: "SERVICE_LEAD",
      status: "ACCEPTED",
      partnerId: req.auth.sub,
      viewerPartnerId: req.auth.sub,
      limit: query.limit,
    });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/my-leads", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const query = z.object({
      status: z.enum(["ACCEPTED", "IN_PROGRESS", "COMPLETED", "REJECTED"]).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    }).parse(req.query);

    const rows = listPartnerLeadsForPartner({
      partnerId: req.auth.sub,
      status: query.status,
      limit: query.limit,
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/leads/:leadId", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const lead = getPartnerLeadById(req.params.leadId, { viewerPartnerId: req.auth.sub });
    if (!lead) throw notFound("Partner lead not found");
    if (!partnerHasUnlockedLead(lead, req.auth.sub)) {
      throw forbidden("Pay to unlock this lead before viewing details.");
    }
    res.json(success({ lead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/leads/:leadId/onsite-deduction-catalog", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const lead = getPartnerLeadById(req.params.leadId, { viewerPartnerId: req.auth.sub });
    if (!lead) throw notFound("Partner lead not found");
    if (!partnerHasUnlockedLead(lead, req.auth.sub)) {
      throw forbidden("Pay to unlock this lead before viewing details.");
    }

    const catalog = buildPartnerOnsiteDeductionCatalog(lead);
    res.json(success({ catalog }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/leads/:leadId/unlock-intent", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const existing = getPartnerLeadById(req.params.leadId, { viewerPartnerId: req.auth.sub });
    if (!existing) throw notFound("Partner lead not found");

    const unlockPrice = getLeadUnlockPrice(existing);
    if (!unlockPrice) {
      throw badRequest("Lead quote is not eligible for paid unlock.");
    }

    const now = nowIso();
    const expiresAt = new Date(Date.now() + LEAD_UNLOCK_TTL_MINUTES * 60 * 1000).toISOString();
    const result = createPartnerLeadUnlockIntent({
      leadId: existing.id,
      partnerId: req.auth.sub,
      unlockPrice,
      intentId: crypto.randomUUID(),
      now,
      expiresAt,
    });

    if (result.result === "NOT_FOUND") throw notFound("Partner lead not found");
    if (result.result === "LOCKED_BY_OTHER") throw conflict("This lead is temporarily reserved by another partner. Please try again after a few minutes.");
    if (result.result === "OWNED_BY_OTHER") throw conflict("This lead is already owned by another partner.");
    if (result.result === "INVALID_STATUS") throw badRequest(`Lead cannot be unlocked in ${existing.status} status.`);

    res.json(success({
      lead: maskLeadForPartnerList(result.lead, req.auth.sub),
      intent: result.intent,
      unlockPrice,
      paymentQrUrl: "/Leadpay.jpeg",
      expiresAt: result.intent?.expiresAt || expiresAt,
    }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/lead-unlock-intents/:intentId([0-9a-fA-F-]{36})", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const now = nowIso();
    const intent = getPartnerLeadUnlockIntentById({ intentId: req.params.intentId, partnerId: req.auth.sub, now });
    if (!intent) throw notFound("Lead unlock payment intent not found");
    const lead = getPartnerLeadById(intent.leadId, { viewerPartnerId: req.auth.sub });
    res.json(success({ intent, lead: lead && partnerHasUnlockedLead(lead, req.auth.sub) ? lead : maskLeadForPartnerList(lead, req.auth.sub) }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/lead-unlock-intents/:intentId([0-9a-fA-F-]{36})/screenshot-sent", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const intent = markPartnerLeadUnlockScreenshotSent({
      intentId: req.params.intentId,
      partnerId: req.auth.sub,
      now: nowIso(),
    });
    if (!intent) throw notFound("Lead unlock payment intent not found");
    if (intent.status !== "SCREENSHOT_SENT") {
      throw badRequest(`Payment intent is ${intent.status}. Start a new unlock payment.`);
    }
    res.json(success({ intent, message: "Payment confirmation sent. Waiting for admin approval." }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/lead-unlock-intents/admin", requireAuth, requireRole("admin"), (req, res, next) => {
  try {
    const query = leadUnlockIntentListSchema.parse(req.query);
    const rows = listPartnerLeadUnlockIntentsForAdmin({
      status: query.status,
      partnerId: query.partnerId,
      limit: query.limit,
      now: nowIso(),
    });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch("/lead-unlock-intents/:intentId([0-9a-fA-F-]{36})/verify", requireAuth, requireRole("admin"), (req, res, next) => {
  try {
    const input = verifyLeadUnlockIntentSchema.parse(req.body);
    const now = nowIso();
    const result = verifyPartnerLeadUnlockIntent({
      intentId: req.params.intentId,
      action: input.action,
      verifiedBy: req.auth.sub,
      adminNote: input.note,
      verifiedAt: now,
    });

    if (result.result === "NOT_FOUND") throw notFound("Lead unlock payment intent not found");
    if (result.result === "LEAD_NOT_FOUND") throw notFound("Partner lead not found");
    if (result.result === "OWNED_BY_OTHER") {
      const owner = result.lead?.partnerId ? getPartnerById(result.lead.partnerId) : null;
      const ownerName = owner?.name ? ` (${owner.name})` : "";
      throw conflict(`This lead is already owned by another partner${ownerName}.`);
    }
    if (result.result === "ALREADY_PROCESSED") throw badRequest(`Payment intent is already ${result.intent?.status || "processed"}.`);

    if (result.result === "APPROVED" && result.lead) {
      appendPartnerLeadDispositionEvent({
        id: crypto.randomUUID(),
        leadId: result.lead.id,
        userSellFlowId: result.lead.userSellFlowId,
        partnerId: result.lead.partnerId,
        fromStatus: result.fromStatus,
        toStatus: result.lead.status,
        dispositionKey: toDispositionKey(result.lead.status),
        note: `Lead payment intent approved for ${result.intent.unlockPrice}`,
        actorRole: "admin",
        actorId: req.auth.sub,
        createdAt: now,
      });

      enqueueLeadEventOutbox({
        id: crypto.randomUUID(),
        eventType: "lead.unlock-payment.approved",
        leadId: result.lead.id,
        payloadJson: JSON.stringify({
          leadId: result.lead.id,
          userSellFlowId: result.lead.userSellFlowId,
          leadType: result.lead.leadType,
          fromStatus: result.fromStatus,
          toStatus: result.lead.status,
          dispositionKey: "ACCEPTED",
          partnerId: result.lead.partnerId,
          pincode: result.lead.pincode,
          unlockOrderId: result.intent.id,
          unlockPrice: result.intent.unlockPrice,
          actorRole: "admin",
          actorId: req.auth.sub,
        }),
        occurredAt: now,
      });
    }

    res.json(success({ intent: result.intent, lead: result.lead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/leads/:leadId/claim", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const existing = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(existing, req);

    if (existing.status !== "AVAILABLE") {
      throw badRequest("Lead is not available for claim.");
    }

    const now = nowIso();
    const lead = claimPartnerLead({ id: existing.id, partnerId: req.auth.sub, updatedAt: now });
    if (!lead) throw badRequest("Lead is already claimed.");

    appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: lead.id,
      userSellFlowId: lead.userSellFlowId,
      partnerId: lead.partnerId,
      fromStatus: existing.status,
      toStatus: lead.status,
      dispositionKey: toDispositionKey(lead.status),
      note: "Lead claimed by partner",
      actorRole: "partner",
      actorId: req.auth.sub,
      createdAt: now,
    });

    enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.claimed",
      leadId: lead.id,
      payloadJson: JSON.stringify({
        leadId: lead.id,
        userSellFlowId: lead.userSellFlowId,
        leadType: lead.leadType,
        fromStatus: existing.status,
        toStatus: lead.status,
        dispositionKey: "CLAIMED",
        partnerId: req.auth.sub,
        pincode: lead.pincode,
        actorRole: "partner",
        actorId: req.auth.sub,
      }),
      occurredAt: now,
    });

    res.json(success({ lead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch("/leads/:leadId/status", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const input = workflowStatusSchema.parse(req.body);
    const existing = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(existing, req);

    if (existing.partnerId !== req.auth.sub) {
      throw badRequest("Claim this lead before updating workflow status.");
    }

    if (!isAllowedTransition(existing.status, input.status)) {
      throw badRequest(`Invalid status transition from ${existing.status} to ${input.status}.`);
    }

    if (input.status === "COMPLETED") {
      if (!existing.onsiteValidation) {
        throw badRequest("Onsite validation is required before completion.");
      }
      if (!existing.paymentProof) {
        throw badRequest("Payment proof metadata is required before completion.");
      }
    }

    const now = nowIso();
    const releasesLeadToBucket = (["ACCEPTED", "IN_PROGRESS"].includes(existing.status) && input.status === "CANCELLED") || input.status === "REJECTED";
    const lead = releasesLeadToBucket
      ? releasePartnerLeadToBucket({ id: existing.id, partnerId: req.auth.sub, updatedAt: now })
      : updatePartnerLeadWorkflowStatus({
          id: existing.id,
          partnerId: req.auth.sub,
          status: input.status,
          rejectionReason: input.reason,
          updatedAt: now,
        });

    let finalLead = lead;
    if (lead && input.status === "IN_PROGRESS") {
      finalLead = setPartnerLeadPickupStartedAt({
        id: existing.id,
        partnerId: req.auth.sub,
        pickupStartedAt: now,
        updatedAt: now,
      });
    }

    if (finalLead && input.status === "COMPLETED") {
      closePartnerLeadUnlockOrder({ leadId: existing.id, partnerId: req.auth.sub, closedAt: now });
    }

    if (finalLead) {
      const dispositionKey = input.status === "REJECTED" ? "REJECTED" : releasesLeadToBucket ? "CANCELLED" : toDispositionKey(finalLead.status);
      appendPartnerLeadDispositionEvent({
        id: crypto.randomUUID(),
        leadId: finalLead.id,
        userSellFlowId: finalLead.userSellFlowId,
        partnerId: releasesLeadToBucket ? req.auth.sub : finalLead.partnerId,
        fromStatus: existing.status,
        toStatus: finalLead.status,
        dispositionKey,
        note: input.reason || (input.status === "REJECTED" ? "Partner rejected and released lead" : releasesLeadToBucket ? "Partner cancelled accepted lead" : null),
        actorRole: "partner",
        actorId: req.auth.sub,
        createdAt: now,
      });

      enqueueLeadEventOutbox({
        id: crypto.randomUUID(),
        eventType: "lead.status.updated",
        leadId: finalLead.id,
        payloadJson: JSON.stringify({
          leadId: finalLead.id,
          userSellFlowId: finalLead.userSellFlowId,
          leadType: finalLead.leadType,
          fromStatus: existing.status,
          toStatus: finalLead.status,
          dispositionKey,
          partnerId: releasesLeadToBucket ? req.auth.sub : finalLead.partnerId,
          pincode: finalLead.pincode,
          actorRole: "partner",
          actorId: req.auth.sub,
          note: input.reason || (input.status === "REJECTED" ? "Partner rejected and released lead" : releasesLeadToBucket ? "Partner cancelled accepted lead" : null),
        }),
        occurredAt: now,
      });
    }

    res.json(success({ lead: finalLead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch("/leads/:leadId/reschedule", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const input = rescheduleLeadSchema.parse(req.body);
    const existing = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(existing, req);

    if (existing.partnerId !== req.auth.sub) {
      throw badRequest("Claim this lead before rescheduling.");
    }

    if (!["ACCEPTED", "IN_PROGRESS"].includes(existing.status)) {
      throw badRequest(`Lead cannot be rescheduled from ${existing.status}.`);
    }

    const now = nowIso();
    const pickupSchedule = {
      ...(existing.pickupSchedule || {}),
      primaryDate: input.primaryDate,
      primaryTime: input.primaryTime || existing.pickupSchedule?.primaryTime || "",
      rescheduledAt: now,
      rescheduleReason: input.reason,
    };

    const lead = updatePartnerLeadReschedule({
      id: existing.id,
      partnerId: req.auth.sub,
      pickupScheduleJson: JSON.stringify(pickupSchedule),
      updatedAt: now,
    });

    if (!lead) {
      throw badRequest("Unable to reschedule this lead.");
    }

    const note = input.comment ? `${input.reason} — ${input.comment}` : input.reason;
    appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: lead.id,
      userSellFlowId: lead.userSellFlowId,
      partnerId: lead.partnerId,
      fromStatus: existing.status,
      toStatus: lead.status,
      dispositionKey: "RESCHEDULE_REQUESTED",
      note,
      actorRole: "partner",
      actorId: req.auth.sub,
      createdAt: now,
    });

    enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.rescheduled",
      leadId: lead.id,
      payloadJson: JSON.stringify({
        leadId: lead.id,
        userSellFlowId: lead.userSellFlowId,
        leadType: lead.leadType,
        primaryDate: pickupSchedule.primaryDate,
        primaryTime: pickupSchedule.primaryTime,
        reason: input.reason,
        comment: input.comment || null,
        partnerId: lead.partnerId,
        pincode: lead.pincode,
        actorRole: "partner",
        actorId: req.auth.sub,
      }),
      occurredAt: now,
    });

    res.json(success({ lead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch("/leads/:leadId/call-status", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const input = callStatusSchema.parse(req.body);
    const existing = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(existing, req);

    if (existing.partnerId !== req.auth.sub) {
      throw badRequest("Only the owning partner can update call status.");
    }

    const activeStatuses = ["ACCEPTED", "IN_PROGRESS"];
    if (!activeStatuses.includes(existing.status) && !hasPendingPaymentForCompletedLead(existing)) {
      throw badRequest("Call status can only be updated for active pickups.");
    }

    const now = nowIso();
    const lead = markPartnerLeadCallStatus({
      id: existing.id,
      partnerId: req.auth.sub,
      callStatus: input.callStatus,
      note: input.note || "",
      calledAt: now,
      updatedAt: now,
    });
    appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: existing.id,
      userSellFlowId: existing.userSellFlowId,
      partnerId: existing.partnerId,
      fromStatus: existing.status,
      toStatus: existing.status,
      dispositionKey: "CALL_STATUS_UPDATED",
      note: `${input.callStatus}${input.note ? `: ${input.note}` : ""}`,
      actorRole: "partner",
      actorId: req.auth.sub,
      createdAt: now,
    });

    enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.call-status.updated",
      leadId: lead.id,
      payloadJson: JSON.stringify({
        leadId: lead.id,
        userSellFlowId: lead.userSellFlowId,
        leadType: lead.leadType,
        fromStatus: existing.status,
        toStatus: lead.status,
        dispositionKey: "CALL_STATUS_UPDATED",
        partnerId: lead.partnerId,
        pincode: lead.pincode,
        callStatus: input.callStatus,
        actorRole: "partner",
        actorId: req.auth.sub,
      }),
      occurredAt: now,
    });

    res.json(success({ lead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/leads/:leadId/customer-otp/send", requireAuth, requireRole("partner"), async (req, res, next) => {
  try {
    const lead = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(lead, req);

    if (!lead.partnerId || lead.partnerId !== req.auth.sub) {
      throw forbidden("Only the assigned partner can verify customer OTP for this lead.");
    }
    if (!["ACCEPTED", "IN_PROGRESS"].includes(lead.status)) {
      throw badRequest("Customer OTP is available only for active service leads.");
    }

    const phone = lead.seller?.phone || lead.pickupSchedule?.callingPhoneNumber;
    if (!phone || !/^\d{10}$/.test(phone)) {
      throw badRequest("Customer phone number is unavailable for this lead.");
    }

    const result = await sendUserOtp(phone, "amountForPhone");
    res.json(success({
      phone: result.phone,
      otpTtlSeconds: result.otpTtlSeconds,
      resendAfterSeconds: result.resendAfterSeconds,
    }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/leads/:leadId/customer-otp/verify", requireAuth, requireRole("partner"), async (req, res, next) => {
  try {
    const input = customerOtpVerifySchema.parse(req.body);
    const lead = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(lead, req);

    if (!lead.partnerId || lead.partnerId !== req.auth.sub) {
      throw forbidden("Only the assigned partner can verify customer OTP for this lead.");
    }
    if (!["ACCEPTED", "IN_PROGRESS"].includes(lead.status)) {
      throw badRequest("Customer OTP is available only for active service leads.");
    }

    const phone = lead.seller?.phone || lead.pickupSchedule?.callingPhoneNumber;
    if (!phone || !/^\d{10}$/.test(phone)) {
      throw badRequest("Customer phone number is unavailable for this lead.");
    }

    await verifyUserOtp({ phone, otp: input.otp });
    res.json(success({ phone, verified: true }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/active-pickups", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const query = activePickupQuerySchema.parse(req.query);
    const rows = listPartnerActivePickups({
      partnerId: req.auth.sub,
      pincode: query.pincode,
      limit: query.limit,
    });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/leads/:leadId/onsite-validation", requireAuth, requireRole("partner"), upload.array("photos", REQUIRED_ONSITE_VALIDATION_PHOTOS), (req, res, next) => {
  try {
    rejectRemovedFields(req.body, ["result", "notes"]);
    const rawChecklist = req.body.checklist;
    const rawObservedIssues = req.body.observedIssues;
    const rawPartnerChecks = req.body.partnerChecks;
    const rawObservedIssueDeductions = req.body.observedIssueDeductions;
    const input = onsiteValidationSchema.parse({
      checklist: typeof rawChecklist === "string" ? JSON.parse(rawChecklist) : rawChecklist || {},
      partnerChecks: typeof rawPartnerChecks === "string" ? JSON.parse(rawPartnerChecks) : rawPartnerChecks || [],
      observedIssues: typeof rawObservedIssues === "string" ? JSON.parse(rawObservedIssues) : rawObservedIssues || [],
      observedIssueDeductions: typeof rawObservedIssueDeductions === "string" ? JSON.parse(rawObservedIssueDeductions) : rawObservedIssueDeductions || [],
      revisedQuote: req.body.revisedQuote ? Number(req.body.revisedQuote) : undefined,
    });
    const checklist = normalizeOnsiteChecklist(input.checklist);
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length !== REQUIRED_ONSITE_VALIDATION_PHOTOS) {
      throw badRequest(`Exactly ${REQUIRED_ONSITE_VALIDATION_PHOTOS} validation photos are required.`);
    }

    files.forEach((file) => {
      assertAllowedMime(file, imageMimeTypes);
      assertMaxBytes(file, env.mediaMaxImageBytes);
    });

    const existing = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(existing, req);

    if (existing.partnerId !== req.auth.sub) {
      throw badRequest("Claim and accept this lead before onsite validation.");
    }

    if (!["ACCEPTED", "IN_PROGRESS"].includes(existing.status)) {
      throw badRequest("Onsite validation is allowed only for ACCEPTED or IN_PROGRESS leads.");
    }

    const now = nowIso();
    const photoAssets = files.map((file, index) => {
      const mediaId = crypto.randomUUID();
      const mediaRelativePath = buildMediaRelativePath({
        tenantType: "partner",
        ownerId: req.auth.sub,
        entityType: "onsite-validation",
        entityId: existing.id,
        mediaId,
        fileName: file.originalname,
      });
      writeMediaBuffer({ relativePath: mediaRelativePath, buffer: file.buffer });
      const media = createMediaAsset({
        id: mediaId,
        tenantType: "partner",
        tenantId: req.auth.sub,
        ownerRole: "partner",
        ownerId: req.auth.sub,
        entityType: "onsite-validation",
        entityId: existing.id,
        slot: `photo-${index + 1}`,
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
      return {
        mediaAssetId: media.id,
        fileName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        mediaUrl: `/api/v1/media/${media.id}`,
      };
    });

    const computedQuote = computeOnsiteRequote({
      lead: existing,
      checklist,
      partnerChecks: input.partnerChecks,
      observedIssueDeductions: input.observedIssueDeductions,
    });

    if (input.revisedQuote !== undefined && Math.round(input.revisedQuote) !== computedQuote.reQuotedPrice) {
      throw badRequest("Re quoted price must match backend computed amount.");
    }

    checklist.__partnerChecks = JSON.stringify(input.partnerChecks.length ? input.partnerChecks : parsePartnerChecksFromChecklist(checklist));
    checklist.__deductions = JSON.stringify(computedQuote);

    const payload = {
      checklist,
      observedIssues: input.observedIssues,
      revisedQuote: computedQuote.reQuotedPrice,
      photoAssets,
      updatedBy: req.auth.sub,
      updatedAt: now,
    };

    const lead = savePartnerLeadOnsiteValidation({
      id: existing.id,
      partnerId: req.auth.sub,
      onsiteValidationJson: JSON.stringify(payload),
      onsiteValidatedAt: now,
      onsiteValidatedBy: req.auth.sub,
      updatedAt: now,
    });

    appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: existing.id,
      userSellFlowId: existing.userSellFlowId,
      partnerId: existing.partnerId,
      fromStatus: existing.status,
      toStatus: existing.status,
      dispositionKey: "ONSITE_VALIDATED",
      note: null,
      actorRole: "partner",
      actorId: req.auth.sub,
      createdAt: now,
    });

    enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.onsite.validated",
      leadId: lead.id,
      payloadJson: JSON.stringify({
        leadId: lead.id,
        userSellFlowId: lead.userSellFlowId,
        leadType: lead.leadType,
        fromStatus: existing.status,
        toStatus: lead.status,
        dispositionKey: "ONSITE_VALIDATED",
        partnerId: lead.partnerId,
        pincode: lead.pincode,
        actorRole: "partner",
        actorId: req.auth.sub,
      }),
      occurredAt: now,
    });

    res.json(success({ lead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/leads/:leadId/payment-proof/metadata", requireAuth, requireRole("partner"), upload.single("file"), (req, res, next) => {
  try {
    rejectRemovedFields(req.body, ["transactionRef", "notes"]);
    const input = paymentProofMetadataSchema.parse(
      req.file
        ? {
            fileName: req.file.originalname,
            mimeType: req.file.mimetype,
            sizeBytes: req.file.size,
            extraPaidAmount: req.body.extraPaidAmount === undefined ? 0 : Number(req.body.extraPaidAmount),
            amountCollected: Number(req.body.amountCollected),
            paymentMode: req.body.paymentMode,
          }
        : {
            ...req.body,
            extraPaidAmount: req.body.extraPaidAmount === undefined ? 0 : Number(req.body.extraPaidAmount),
            amountCollected: Number(req.body.amountCollected),
            sizeBytes: Number(req.body.sizeBytes),
          },
    );

    const existing = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(existing, req);

    if (existing.partnerId !== req.auth.sub) {
      throw badRequest("Only the owning partner can submit payment proof metadata.");
    }

    if (!["ACCEPTED", "IN_PROGRESS"].includes(existing.status)) {
      throw badRequest("Payment proof metadata can be submitted only for active accepted leads.");
    }

    const quotedAmount = Math.round(Number(existing.onsiteValidation?.revisedQuote ?? 0));
    const totalPayout = quotedAmount + Math.round(input.extraPaidAmount);
    if (totalPayout > 1000000 || Math.round(input.amountCollected) !== totalPayout) {
      throw badRequest("Payment amount must equal the quoted amount plus the extra paid amount.", {
        quotedAmount,
        extraPaidAmount: Math.round(input.extraPaidAmount),
        totalPayout,
      });
    }

    const now = nowIso();
    const paymentProofId = crypto.randomUUID();
    const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storageKey = `payment-proof/${req.auth.sub}/${paymentProofId}-${safeFileName}`;
    let media = null;
    if (req.file) {
      assertAllowedMime(req.file, documentMimeTypes);
      assertMaxBytes(req.file, env.mediaMaxDocumentBytes);

      const mediaRelativePath = buildMediaRelativePath({
        tenantType: "partner",
        ownerId: req.auth.sub,
        entityType: "payment-proof",
        entityId: paymentProofId,
        mediaId: paymentProofId,
        fileName: input.fileName,
      });
      writeMediaBuffer({ relativePath: mediaRelativePath, buffer: req.file.buffer });
      media = createMediaAsset({
        id: paymentProofId,
        tenantType: "partner",
        tenantId: req.auth.sub,
        ownerRole: "partner",
        ownerId: req.auth.sub,
        entityType: "payment-proof",
        entityId: paymentProofId,
        slot: "payment-proof",
        originalFileName: input.fileName,
        storedFileName: path.basename(mediaRelativePath),
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        relativePath: mediaRelativePath,
        storageProvider: "LOCAL_DISK",
        checksum: calculateChecksum(req.file.buffer),
        createdAt: now,
        updatedAt: now,
      });
    }

    const payload = {
      id: paymentProofId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      quotedAmount,
      extraPaidAmount: Math.round(input.extraPaidAmount),
      amountCollected: input.amountCollected,
      paymentMode: input.paymentMode,
      storageProvider: media ? "LOCAL_DISK" : "LOCAL_PLACEHOLDER",
      storageKey,
      mediaAssetId: media?.id || null,
      mediaUrl: media ? `/api/v1/media/${media.id}` : null,
      submittedAt: now,
    };

    const lead = savePartnerLeadPaymentProofMetadata({
      id: existing.id,
      partnerId: req.auth.sub,
      paymentProofJson: JSON.stringify(payload),
      paymentSubmittedAt: now,
      updatedAt: now,
    });

    appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: existing.id,
      userSellFlowId: existing.userSellFlowId,
      partnerId: existing.partnerId,
      fromStatus: existing.status,
      toStatus: existing.status,
      dispositionKey: "PAYMENT_PROOF_SUBMITTED",
      note: null,
      actorRole: "partner",
      actorId: req.auth.sub,
      createdAt: now,
    });

    enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.payment-proof.submitted",
      leadId: lead.id,
      payloadJson: JSON.stringify({
        leadId: lead.id,
        userSellFlowId: lead.userSellFlowId,
        leadType: lead.leadType,
        fromStatus: existing.status,
        toStatus: lead.status,
        dispositionKey: "PAYMENT_PROOF_SUBMITTED",
        partnerId: lead.partnerId,
        pincode: lead.pincode,
        quotedAmount,
        extraPaidAmount: Math.round(input.extraPaidAmount),
        amountCollected: input.amountCollected,
        actorRole: "partner",
        actorId: req.auth.sub,
      }),
      occurredAt: now,
    });

    res.json(
      success({
        lead,
        storage: {
          strategy: media ? "LOCAL_FILE" : "METADATA_ONLY_PLACEHOLDER",
          provider: media ? "LOCAL_DISK" : "LOCAL_PLACEHOLDER",
          storageKey,
          uploadUrl: media ? `/api/v1/media/${media.id}` : null,
          note: media
            ? "File stored on local disk and available through authenticated media endpoint."
            : "File binary upload pipeline not used in this request; metadata stored for compatibility.",
        },
      }),
    );
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/leads/:leadId/completion", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    rejectRemovedFields(req.body, ["remarks"]);
    const input = completionSchema.parse(req.body);
    const existing = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(existing, req);

    if (existing.partnerId !== req.auth.sub) {
      throw badRequest("Only the owning partner can complete this lead.");
    }

    if (existing.status !== "IN_PROGRESS") {
      throw badRequest("Lead must be IN_PROGRESS before completion.");
    }

    if (!existing.onsiteValidation) {
      throw badRequest("Onsite validation is required before completion.");
    }

    if (!existing.paymentProof) {
      throw badRequest("Payment proof metadata is required before completion.");
    }

    const quotedAmount = Number(existing.onsiteValidation?.revisedQuote);
    const extraPaidAmount = Math.round(Number(existing.paymentProof?.extraPaidAmount ?? 0));
    const expectedFinalAmount = Number.isFinite(quotedAmount) ? Math.round(quotedAmount) + extraPaidAmount : input.finalAmount;
    if (Math.round(input.finalAmount) !== expectedFinalAmount) {
      throw badRequest("Final amount must match the quoted amount plus the extra paid amount.");
    }

    const now = nowIso();
    const partner = getPartnerById(req.auth.sub);
    const finalAmount = expectedFinalAmount;
    const invoice = {
      id: `invoice-${existing.id}`,
      leadId: existing.id,
      userSellFlowId: existing.userSellFlowId,
      status: "DEAL_CLOSED",
      modelName: existing.selectedModel?.modelName || null,
      listedPrice: existing.quote?.sellingPrice ?? existing.selectedModel?.listedPrice ?? 0,
      quotedAmount: Number.isFinite(quotedAmount) ? Math.round(quotedAmount) : finalAmount,
      extraPaidAmount,
      finalAmount,
      deductions: normalizeInvoiceDeductions(existing.onsiteValidation?.checklist?.__deductions),
      payment: existing.paymentProof ? {
        amountCollected: existing.paymentProof.amountCollected,
        paymentMode: existing.paymentProof.paymentMode,
        submittedAt: existing.paymentProof.submittedAt,
      } : null,
      partner: {
        id: req.auth.sub,
        name: partner?.name || "Partner",
        phone: partner?.phone || req.auth.phone || null,
      },
      completedAt: now,
    };
    const completionPayload = {
      completionCode: input.completionCode || null,
      handoverChecklist: input.handoverChecklist,
      finalAmount,
      invoice,
      completedBy: req.auth.sub,
      completedAt: now,
    };

    savePartnerLeadCompletionEvent({
      id: existing.id,
      partnerId: req.auth.sub,
      completionEventJson: JSON.stringify(completionPayload),
      completionEventAt: now,
      updatedAt: now,
    });

    const lead = updatePartnerLeadWorkflowStatus({
      id: existing.id,
      partnerId: req.auth.sub,
      status: "COMPLETED",
      rejectionReason: null,
      updatedAt: now,
    });
    closePartnerLeadUnlockOrder({ leadId: existing.id, partnerId: req.auth.sub, closedAt: now });

    appendPartnerLeadDispositionEvent({
      id: crypto.randomUUID(),
      leadId: existing.id,
      userSellFlowId: existing.userSellFlowId,
      partnerId: existing.partnerId,
      fromStatus: existing.status,
      toStatus: "COMPLETED",
      dispositionKey: "COMPLETED",
      note: null,
      actorRole: "partner",
      actorId: req.auth.sub,
      createdAt: now,
    });

    enqueueLeadEventOutbox({
      id: crypto.randomUUID(),
      eventType: "lead.completed",
      leadId: lead.id,
      payloadJson: JSON.stringify({
        leadId: lead.id,
        userSellFlowId: lead.userSellFlowId,
        leadType: lead.leadType,
        fromStatus: existing.status,
        toStatus: lead.status,
        dispositionKey: "COMPLETED",
        partnerId: lead.partnerId,
        pincode: lead.pincode,
        amount: input.finalAmount,
        actorRole: "partner",
        actorId: req.auth.sub,
      }),
      occurredAt: now,
    });

    res.json(success({ lead }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/leads/:leadId/disposition-events", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const query = timelineQuerySchema.parse(req.query);
    const lead = getPartnerLeadById(req.params.leadId);
    assertPartnerCanAccessLead(lead, req);

    const rows = listPartnerLeadDispositionTimeline({
      leadId: req.params.leadId,
      limit: query.limit,
    });

    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.post("/coins/recharge", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const input = rechargeCoinsSchema.parse(req.body);
    const latestKyc = getLatestKycForPartner(req.auth.sub);
    if (!latestKyc || latestKyc.verificationStatus !== "VERIFIED") {
      throw badRequest("KYC must be VERIFIED before recharging coins.");
    }

    const duplicatePending = getPendingPartnerRechargeRequestByTxnRef(req.auth.sub, input.upiTxnRef);
    if (duplicatePending) {
      throw badRequest("A recharge request with this UPI reference is already pending admin review.");
    }

    const now = nowIso();
    const requestRow = createPartnerCoinRechargeRequest({
      id: crypto.randomUUID(),
      partnerId: req.auth.sub,
      amount: input.amount,
      upiTxnRef: input.upiTxnRef,
      upiApp: input.upiApp || null,
      status: "PENDING",
      requestedAt: now,
      metadataJson: JSON.stringify({ source: "partner-recharge-ui", channel: "UPI_QR" }),
    });

    res.json(
      success({
        request: requestRow,
        message: "Payment submitted. Wallet credit will be applied after admin verification.",
      }),
    );
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/coins/recharge-requests", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const query = rechargeRequestListSchema.parse(req.query);
    const rows = listPartnerCoinRechargeRequests({
      partnerId: req.auth.sub,
      status: query.status,
      limit: query.limit,
    });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/coins/recharge-requests/admin", requireAuth, requireRole("admin"), (req, res, next) => {
  try {
    const query = adminRechargeRequestListSchema.parse(req.query);
    const rows = listPartnerCoinRechargeRequests({
      partnerId: query.partnerId || undefined,
      status: query.status,
      limit: query.limit,
    });
    res.json(success({ rows, count: rows.length }));
  } catch (err) {
    next(err);
  }
});

partnerRouter.patch("/coins/recharge-requests/:requestId/verify", requireAuth, requireRole("admin"), (req, res, next) => {
  try {
    const input = verifyRechargeRequestSchema.parse(req.body);
    const existing = getPartnerCoinRechargeRequestById(req.params.requestId);
    if (!existing) {
      throw notFound("Recharge request not found");
    }

    const result = verifyPartnerCoinRechargeRequest({
      requestId: req.params.requestId,
      action: input.action,
      verifiedBy: req.auth.sub,
      adminNote: input.note,
      verifiedAt: nowIso(),
      ledgerEntryId: crypto.randomUUID(),
    });

    if (result.result === "ALREADY_PROCESSED") {
      throw badRequest(`Recharge request is already ${result.request?.status || "processed"}.`);
    }

    if (result.result === "NOT_FOUND" || !result.request) {
      throw notFound("Recharge request not found");
    }

    res.json(
      success({
        request: result.request,
        wallet: result.wallet,
      }),
    );
  } catch (err) {
    next(err);
  }
});

partnerRouter.get("/dashboard", requireAuth, requireRole("partner"), (req, res, next) => {
  try {
    const query = dashboardQuerySchema.parse({
      pincode: req.query.pincode,
    });

    const partner = getPartnerById(req.auth.sub);
    const metrics = getPartnerDashboardMetrics({
      partnerId: req.auth.sub,
      pincode: query.pincode,
      now: new Date(),
    });
    const now = nowIso();
    ensurePartnerCoinWallet(req.auth.sub, now);
    const wallet = getPartnerCoinWallet(req.auth.sub);

    res.json(
      success({
        partner: partner || { id: req.auth.sub, name: "Partner", phone: null },
        scope: {
          scopeType: "PINCODE",
          selectedPincode: query.pincode,
        },
        metrics: {
          ...metrics,
          coins: wallet?.balance || 0,
        },
      }),
    );
  } catch (err) {
    next(err);
  }
});
