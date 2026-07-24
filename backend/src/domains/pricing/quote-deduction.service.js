import { listActiveQuoteDeductionRulesForModel } from "../../db/repository.js";

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function getAnswerValue(deviceDetails, rule) {
  const groupValue = deviceDetails?.[rule.answerGroup];

  if (rule.answerGroup === "physicalIssues" || rule.answerGroup === "functionalProblems" || rule.answerGroup === "accessories") {
    return Array.isArray(groupValue) && groupValue.includes(rule.answerKey) ? rule.answerKey : undefined;
  }

  if (!groupValue || typeof groupValue !== "object") return undefined;
  return groupValue[rule.answerKey];
}

function ruleMatches(deviceDetails, rule) {
  const answerValue = getAnswerValue(deviceDetails, rule);
  if (answerValue === undefined || answerValue === null) return false;

  if (rule.answerGroup === "physicalIssues" && !rule.answerValue) return true;
  if (!rule.answerValue) return true;
  return String(answerValue) === String(rule.answerValue);
}

function calculateDeductionAmount(basePrice, rule) {
  if (rule.deductionType === "PERCENT") {
    const rawAmount = (basePrice * rule.deductionValue) / 100;
    const capped = typeof rule.maxDeductionAmount === "number" ? Math.min(rawAmount, rule.maxDeductionAmount) : rawAmount;
    return roundMoney(capped);
  }

  return roundMoney(rule.deductionValue);
}

export function calculateUserQuote({ selectedModel, deviceDetails = null, rules = null }) {
  const basePrice = Number(selectedModel?.listedPrice || 0);
  const activeRules = rules || listActiveQuoteDeductionRulesForModel({
    brandSlug: selectedModel?.brandSlug,
    modelId: selectedModel?.modelId,
  });

  const deductions = activeRules
    .filter((rule) => ruleMatches(deviceDetails || {}, rule))
    .map((rule) => ({
      ruleId: rule.id,
      label: rule.label,
      answerGroup: rule.answerGroup,
      answerKey: rule.answerKey,
      answerValue: rule.answerValue,
      deductionType: rule.deductionType,
      deductionValue: rule.deductionValue,
      deductionAmount: calculateDeductionAmount(basePrice, rule),
    }));

  const totalDeduction = roundMoney(deductions.reduce((sum, item) => sum + item.deductionAmount, 0));
  const sellingPrice = Math.max(0, Math.round(basePrice - totalDeduction));
  const validUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  return {
    basePrice,
    sellingPrice,
    totalDeduction,
    currency: "INR",
    priceSource: "ADMIN_DEDUCTION_RULES",
    validUntil,
    deductions,
  };
}
