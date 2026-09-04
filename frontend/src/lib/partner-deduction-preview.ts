import type { PartnerOnsiteDeductionCatalog } from "./api/gadgetpe-client";

export type ValidationRow = {
  key: string;
  label: string;
  userValue: string;
};

export type PartnerFieldDecision = {
  decision: "yes" | "no" | "na";
  comment: string;
};

export type RowDeductionPreview = {
  amount: number;
  labels: string[];
};

function toLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

const ANSWER_KEY_ALIASES: Record<string, string> = {
  brokenscratchonscreen: "brokenscratchondevicescreen",
  brokenorscreenscratches: "brokenscratchondevicescreen",
  anydeadspots: "deadspotvisiblelineanddiscolorationonscreen",
  deadspotline: "deadspotvisiblelineanddiscolorationonscreen",
  dentormarksonbody: "scratchdentondevicebody",
  devicepanelbrokenmissing: "devicepanelmissingbroken",
  rearcamera: "backcameranotworking",
  backcamera: "backcameranotworking",
  volumebuttons: "volumebuttonnotworking",
  speaker: "speakerfaulty",
  facesensor: "facesensornotworking",
  faceunlock: "facesensornotworking",
  alertslider: "silentbuttonnotworking",
  earspeaker: "audioreceivernotworking",
  vibration: "vibratornotworking",
  originaldisplay: "screenreplaced",
  originalbox: "originalboxwithimei",
};

function toCanonicalLookupKey(value: string) {
  const key = toLookupKey(value);
  return ANSWER_KEY_ALIASES[key] || key;
}

const ARRAY_ANSWER_GROUP_LOOKUPS = new Set(["physicalissues", "functionalproblems", "accessories"]);

const ONSITE_ROW_FIELD_ALIASES: Record<string, string[]> = {
  basicfunctionalitycanmakecalls: ["makeReceiveCalls"],
  canmakecalls: ["makeReceiveCalls"],
  makereceivecalls: ["makeReceiveCalls"],
  basicfunctionalitytouchworking: ["touchScreenWorking"],
  touchworking: ["touchScreenWorking"],
  touchscreenworking: ["touchScreenWorking"],
  basicfunctionalityscreenreplaced: ["screenOriginal"],
  screenreplaced: ["screenOriginal"],
  screenoriginal: ["screenOriginal"],
  warrantyandbillunderwarranty: ["manufacturerWarranty"],
  accessoriesandownershipunderwarranty: ["manufacturerWarranty"],
  underwarranty: ["manufacturerWarranty"],
  warrantyandbillbillinvoice: ["gstBillSameImei"],
  accessoriesandownershipbillinvoice: ["gstBillSameImei"],
  billinvoice: ["gstBillSameImei"],
  accessoriesandownershiporiginalboxwithimei: ["gstBillSameImei"],
  originalboxwithimei: ["gstBillSameImei"],
  mobileage: ["mobileAge"],
};

function normalizeVerificationValue(value: string) {
  const raw = value.trim().toLowerCase();
  if (!raw || raw === "-" || raw === "n/a" || raw === "na") return "";
  if (["yes", "y", "true", "1"].includes(raw)) return "yes";
  if (["no", "n", "false", "0"].includes(raw)) return "no";
  return raw;
}

function getCatalogFieldKeysForRow(row: ValidationRow, catalog: PartnerOnsiteDeductionCatalog | null) {
  if (!catalog) return [];
  const rowKey = toCanonicalLookupKey(row.key);
  const rowLabel = toCanonicalLookupKey(row.label);
  const rowValue = toCanonicalLookupKey(row.userValue);
  const direct = ONSITE_ROW_FIELD_ALIASES[rowKey] || ONSITE_ROW_FIELD_ALIASES[rowLabel];
  if (direct) return direct.filter((fieldKey) => catalog.fields[fieldKey]?.rules?.length);

  return Object.entries(catalog.fields)
    .filter(([fieldKey, field]) => {
      if (!field.rules.length) return false;
      const normalizedFieldKey = toCanonicalLookupKey(fieldKey);
      return rowKey === normalizedFieldKey || rowLabel === normalizedFieldKey;
    })
    .map(([fieldKey]) => fieldKey);
}

function ruleMatchesValidationRow(rule: { answerGroup?: string; answerKey?: string }, row: ValidationRow) {
  const rowKey = toCanonicalLookupKey(row.key);
  const rowLabel = toCanonicalLookupKey(row.label);
  const rowValue = toCanonicalLookupKey(row.userValue);
  const answerGroup = toLookupKey(rule.answerGroup || "");
  const answerKey = toCanonicalLookupKey(rule.answerKey || "");
  const hasGroup = Boolean(answerGroup && (rowKey.includes(answerGroup) || rowLabel.includes(answerGroup)));
  const hasAnswerKey = Boolean(answerKey && (rowKey.includes(answerKey) || rowLabel.includes(answerKey) || (ARRAY_ANSWER_GROUP_LOOKUPS.has(answerGroup) && rowValue.includes(answerKey))));
  return hasGroup && hasAnswerKey;
}

function shouldApplyRuleForRow(
  row: ValidationRow,
  partnerDecision: PartnerFieldDecision["decision"],
  rule: { answerValue?: string | null },
) {
  const partnerInput = normalizeVerificationValue(partnerDecision);
  if (!partnerInput || partnerInput === "na") return false;

  const rawRuleAnswer = String(rule.answerValue ?? "").trim();
  if (!rawRuleAnswer) {
    return partnerInput === "no";
  }

  const userValue = normalizeVerificationValue(row.userValue);
  const normalizedRuleAnswer = normalizeVerificationValue(rawRuleAnswer);
  if (userValue === "yes" || userValue === "no") {
    const verifiedValue = partnerInput === "yes"
      ? userValue
      : userValue === "yes"
        ? "no"
        : "yes";
    return normalizedRuleAnswer === verifiedValue;
  }

  return partnerInput === "no" && toLookupKey(rawRuleAnswer) === toLookupKey(row.userValue);
}

function getCatalogRulesForRow(row: ValidationRow, catalog: PartnerOnsiteDeductionCatalog | null) {
  if (!catalog) return [];
  const rules = [];
  const seenRuleIds = new Set<string>();

  getCatalogFieldKeysForRow(row, catalog).forEach((fieldKey) => {
    catalog.fields[fieldKey]?.rules.forEach((rule) => {
      if (seenRuleIds.has(rule.ruleId)) return;
      seenRuleIds.add(rule.ruleId);
      rules.push(rule);
    });
  });

  catalog.rules?.forEach((rule) => {
    if (seenRuleIds.has(rule.ruleId) || !ruleMatchesValidationRow(rule, row)) return;
    seenRuleIds.add(rule.ruleId);
    rules.push(rule);
  });

  return rules;
}

export function buildRowDeductionPreview(
  validationRows: ValidationRow[],
  partnerChecks: Record<string, PartnerFieldDecision>,
  onsiteDeductionCatalog: PartnerOnsiteDeductionCatalog | null,
) {
  const next: Record<string, RowDeductionPreview> = {};
  const seenRuleIds = new Set<string>();

  validationRows.forEach((row) => {
    const partner = partnerChecks[row.key] ?? { decision: "yes", comment: "" };
    const partnerValue = normalizeVerificationValue(partner.decision);
    if (!partnerValue || partnerValue === "na") return;

    const labels: string[] = [];
    let amount = 0;
    getCatalogRulesForRow(row, onsiteDeductionCatalog).forEach((rule) => {
      if (!shouldApplyRuleForRow(row, partner.decision, rule)) return;
      if (seenRuleIds.has(rule.ruleId)) return;
      seenRuleIds.add(rule.ruleId);
      amount += Math.max(0, Math.round(rule.amount || 0));
      labels.push(rule.label);
    });

    if (amount > 0) next[row.key] = { amount, labels };
  });

  return next;
}
