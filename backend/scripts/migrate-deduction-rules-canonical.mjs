import { resolvedDbPath, sqlite } from "../src/db/sqlite.js";

const APPLY_FLAG = "--apply";
const DRY_RUN_FLAG = "--dry-run";

const LEGACY_KEY_ALIASES = new Map([
  ["brokenorscreenscratches", "Broken/scratch on device screen"],
  ["brokenscratchonscreen", "Broken/scratch on device screen"],
  ["anydeadspots", "Dead Spot/Visible line and Discoloration on screen"],
  ["deadspotline", "Dead Spot/Visible line and Discoloration on screen"],
  ["dentormarksonbody", "Scratch/Dent on device body"],
  ["devicepanelbrokenmissing", "Device panel missing/broken"],
  ["rearcamera", "backCameraNotWorking"],
  ["backcamera", "backCameraNotWorking"],
  ["frontcamera", "frontCameraNotWorking"],
  ["volumebuttons", "volumeButtonNotWorking"],
  ["speaker", "speakerFaulty"],
  ["faceunlock", "faceSensorNotWorking"],
  ["alertslider", "silentButtonNotWorking"],
  ["earspeaker", "audioReceiverNotWorking"],
  ["vibration", "vibratorNotWorking"],
  ["batterydrain", "batteryHealthBelow80Service"],
  ["originaldisplay", "screenReplaced"],
  ["originalbox", "originalBoxWithIMEI"],
]);

const FUNCTIONAL_PROBLEM_KEYS = new Set([
  "frontCameraNotWorking",
  "backCameraNotWorking",
  "volumeButtonNotWorking",
  "fingerTouchNotWorking",
  "wifiNotWorking",
  "speakerFaulty",
  "powerButtonNotWorking",
  "chargingPortNotWorking",
  "faceSensorNotWorking",
  "silentButtonNotWorking",
  "audioReceiverNotWorking",
  "cameraGlassBroken",
  "bluetoothNotWorking",
  "vibratorNotWorking",
  "microphoneNotWorking",
  "proximitySensorNotWorking",
  "batteryHealthBelow80Service",
]);

const PHYSICAL_ISSUE_KEYS = new Set([
  "Broken/scratch on device screen",
  "Dead Spot/Visible line and Discoloration on screen",
  "Scratch/Dent on device body",
  "Device panel missing/broken",
]);

const ACCESSORY_KEYS = new Set(["originalBoxWithIMEI", "originalCharger"]);

const MOBILE_AGE_LABEL_MAP = [
  { pattern: /below\s*3\s*months?/i, value: "below3Months" },
  { pattern: /3\s*months?\s*-\s*6\s*months?/i, value: "months3To6" },
  { pattern: /6\s*months?\s*-\s*11\s*months?/i, value: "months6To11" },
  { pattern: /above\s*11\s*months?/i, value: "above11Months" },
];

function toLookupKey(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function parseArgs(argv) {
  const args = new Set(argv);
  const apply = args.has(APPLY_FLAG) && !args.has(DRY_RUN_FLAG);
  return { apply };
}

function normalizeAnswerValue(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const lowered = trimmed.toLowerCase();
  if (lowered === "yes" || lowered === "no" || lowered === "na") return lowered;
  return trimmed;
}

function normalizeAnswerKey(answerKey) {
  const mapped = LEGACY_KEY_ALIASES.get(toLookupKey(answerKey));
  return mapped || String(answerKey || "").trim();
}

function resolveMobileAgeFromRule(rule) {
  const answerValue = normalizeAnswerValue(rule.answerValue);
  if (["below3Months", "months3To6", "months6To11", "above11Months"].includes(String(answerValue))) {
    return String(answerValue);
  }

  const sources = [rule.label, rule.answerValue, rule.answerKey].filter(Boolean);
  for (const source of sources) {
    for (const entry of MOBILE_AGE_LABEL_MAP) {
      if (entry.pattern.test(String(source))) {
        return entry.value;
      }
    }
  }

  return null;
}

function canonicalizeRule(rule) {
  const next = {
    answerGroup: String(rule.answerGroup || "").trim(),
    answerKey: normalizeAnswerKey(rule.answerKey),
    answerValue: normalizeAnswerValue(rule.answerValue),
  };

  const reasons = [];

  const mobileAgeValue = resolveMobileAgeFromRule(rule);
  if (mobileAgeValue) {
    if (next.answerGroup !== "mobileAge") reasons.push("group->mobileAge");
    if (next.answerKey !== "mobileAge") reasons.push("key->mobileAge");
    if (next.answerValue !== mobileAgeValue) reasons.push("value->mobileAge-enum");
    next.answerGroup = "mobileAge";
    next.answerKey = "mobileAge";
    next.answerValue = mobileAgeValue;
    return { next, reasons };
  }

  if (FUNCTIONAL_PROBLEM_KEYS.has(next.answerKey)) {
    if (next.answerGroup !== "functionalProblems") reasons.push("group->functionalProblems");
    if (next.answerValue !== null) reasons.push("value->null(array-group)");
    next.answerGroup = "functionalProblems";
    next.answerValue = null;
    return { next, reasons };
  }

  if (PHYSICAL_ISSUE_KEYS.has(next.answerKey)) {
    if (next.answerGroup !== "physicalIssues") reasons.push("group->physicalIssues");
    if (next.answerValue !== null) reasons.push("value->null(array-group)");
    next.answerGroup = "physicalIssues";
    next.answerValue = null;
    return { next, reasons };
  }

  if (ACCESSORY_KEYS.has(next.answerKey)) {
    if (next.answerGroup !== "accessories") reasons.push("group->accessories");
    if (next.answerValue !== null) reasons.push("value->null(array-group)");
    next.answerGroup = "accessories";
    next.answerValue = null;
    return { next, reasons };
  }

  if (next.answerKey === "underWarranty" || next.answerKey === "billInvoice") {
    if (next.answerGroup !== "warrantyAndBill") reasons.push("group->warrantyAndBill");
    next.answerGroup = "warrantyAndBill";
    return { next, reasons };
  }

  return { next, reasons };
}

function equalCanonical(current, next) {
  return current.answerGroup === next.answerGroup
    && current.answerKey === next.answerKey
    && (current.answerValue ?? null) === (next.answerValue ?? null);
}

function main() {
  const { apply } = parseArgs(process.argv.slice(2));
  const now = new Date().toISOString();

  const rows = sqlite
    .prepare(`
      SELECT id, answer_group as answerGroup, answer_key as answerKey, answer_value as answerValue,
             label, deduction_type as deductionType, deduction_value as deductionValue,
             applies_to_brand as appliesToBrand, applies_to_model_id as appliesToModelId,
             priority, is_active as isActive, updated_at as updatedAt
      FROM quote_deduction_rules
      ORDER BY priority ASC, updated_at DESC, id ASC
    `)
    .all();

  const changes = [];
  const unchanged = [];

  for (const row of rows) {
    const { next, reasons } = canonicalizeRule(row);
    const current = {
      answerGroup: row.answerGroup,
      answerKey: row.answerKey,
      answerValue: row.answerValue,
    };

    if (equalCanonical(current, next)) {
      unchanged.push({ id: row.id, answerGroup: row.answerGroup, answerKey: row.answerKey, answerValue: row.answerValue });
      continue;
    }

    changes.push({
      id: row.id,
      label: row.label,
      priority: row.priority,
      isActive: Boolean(row.isActive),
      appliesToBrand: row.appliesToBrand,
      appliesToModelId: row.appliesToModelId,
      from: current,
      to: next,
      reasons,
    });
  }

  if (apply && changes.length > 0) {
    const tx = sqlite.transaction(() => {
      const stmt = sqlite.prepare(`
        UPDATE quote_deduction_rules
        SET answer_group = ?, answer_key = ?, answer_value = ?, updated_at = ?
        WHERE id = ?
      `);

      for (const change of changes) {
        stmt.run(
          change.to.answerGroup,
          change.to.answerKey,
          change.to.answerValue,
          now,
          change.id,
        );
      }
    });

    tx();
  }

  const payload = {
    mode: apply ? "apply" : "dry-run",
    database: resolvedDbPath,
    scanned: rows.length,
    changed: changes.length,
    unchanged: unchanged.length,
    changedIds: changes.map((item) => item.id),
    changes,
  };

  console.log(JSON.stringify(payload, null, 2));
  sqlite.close();
}

main();
