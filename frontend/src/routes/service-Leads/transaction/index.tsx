import { Link, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { clearRoleSession, getActiveRole } from "../../../lib/auth/role-session";
import {
  claimPartnerLead,
  completePartnerLead,
  getPartnerLead,
  getPartnerOnsiteDeductionCatalog,
  sendPartnerLeadCustomerOtp,
  submitPartnerOnsiteValidation,
  submitPartnerPaymentProofMetadata,
  updatePartnerLeadCallStatus,
  updatePartnerLeadStatus,
  verifyPartnerLeadCustomerOtp,
  type PartnerLead,
  type PartnerOnsiteDeductionCatalog,
} from "../../../lib/api/gadgetpe-client";

export const Route = createFileRoute("/service-Leads/transaction/")({
  component: ServiceLeadTransactionPage,
});

const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_PARTNER_TOKEN_KEY = "gadgetpe_access_token";
const REQUIRED_VALIDATION_PHOTO_COUNT = 6;
const isCustomerOtpBypassEnabled = import.meta.env.DEV;

function getPartnerToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(PARTNER_TOKEN_KEY) || window.localStorage.getItem(LEGACY_PARTNER_TOKEN_KEY);
}

function forcePartnerLoginRedirect() {
  if (typeof window === "undefined") return;
  clearRoleSession("partner");
  window.location.assign("/partner");
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

type ValidationRow = {
  key: string;
  label: string;
  userValue: string;
};

type PartnerFieldDecision = {
  decision: "yes" | "no" | "na";
  comment: string;
};

type PartnerCheckPayload = {
  key: string;
  label: string;
  userValue: string;
  partnerInput: "yes" | "no" | "na";
  comment: string | null;
};

type RowDeductionPreview = {
  amount: number;
  labels: string[];
};

type ValidationPhotoSlot = {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
};

type ObservedIssueRow = {
  id: string;
  description: string;
  deductionAmount: number;
};

function createObservedIssueRow(): ObservedIssueRow {
  return {
    id: `issue-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    description: "",
    deductionAmount: 0,
  };
}

function formatFieldLabel(path: string) {
  return path
    .replace(/\./g, " / ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
}

function toReadableValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

function flattenDeviceDetails(value: unknown, path = ""): ValidationRow[] {
  if (value === null || value === undefined) {
    return path ? [{ key: path, label: formatFieldLabel(path), userValue: "-" }] : [];
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return path ? [{ key: path, label: formatFieldLabel(path), userValue: "-" }] : [];
    }

    const primitive = value.every((item) => item === null || ["string", "number", "boolean"].includes(typeof item));
    if (primitive) {
      return [{ key: path || "value", label: formatFieldLabel(path || "value"), userValue: value.map((item) => toReadableValue(item)).join(", ") }];
    }

    return value.flatMap((item, index) => flattenDeviceDetails(item, path ? `${path}.${index + 1}` : String(index + 1)));
  }

  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (!entries.length && path) {
      return [{ key: path, label: formatFieldLabel(path), userValue: "-" }];
    }
    return entries.flatMap(([childKey, childValue]) => flattenDeviceDetails(childValue, path ? `${path}.${childKey}` : childKey));
  }

  return [{ key: path || "value", label: formatFieldLabel(path || "value"), userValue: toReadableValue(value) }];
}

function toLookupKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

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
  const rowKey = toLookupKey(row.key);
  const rowLabel = toLookupKey(row.label);
  const rowValue = toLookupKey(row.userValue);
  const direct = ONSITE_ROW_FIELD_ALIASES[rowKey] || ONSITE_ROW_FIELD_ALIASES[rowLabel];
  if (direct) return direct.filter((fieldKey) => catalog.fields[fieldKey]?.rules?.length);

  return Object.entries(catalog.fields)
    .filter(([fieldKey, field]) => {
      if (!field.rules.length) return false;
      const normalizedFieldKey = toLookupKey(fieldKey);
      return rowKey === normalizedFieldKey || rowLabel === normalizedFieldKey || rowValue.includes(normalizedFieldKey);
    })
    .map(([fieldKey]) => fieldKey);
}

function ruleMatchesValidationRow(rule: { answerGroup?: string; answerKey?: string }, row: ValidationRow) {
  const rowKey = toLookupKey(row.key);
  const rowLabel = toLookupKey(row.label);
  const rowValue = toLookupKey(row.userValue);
  const answerGroup = toLookupKey(rule.answerGroup || "");
  const answerKey = toLookupKey(rule.answerKey || "");
  const hasGroup = Boolean(answerGroup && (rowKey.includes(answerGroup) || rowLabel.includes(answerGroup)));
  const hasAnswerKey = Boolean(answerKey && (rowKey.includes(answerKey) || rowLabel.includes(answerKey) || rowValue.includes(answerKey)));
  return hasGroup && hasAnswerKey;
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

function ServiceLeadTransactionPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/service-Leads/transaction/" }) as { leadId?: string };
  const [lead, setLead] = useState<PartnerLead | null>(null);
  const [onsiteDeductionCatalog, setOnsiteDeductionCatalog] = useState<PartnerOnsiteDeductionCatalog | null>(null);
  const [callDone, setCallDone] = useState(false);
  const [hasObservedIssues, setHasObservedIssues] = useState(false);
  const [observedIssueRows, setObservedIssueRows] = useState<ObservedIssueRow[]>(() => [createObservedIssueRow()]);
  const [finishing, setFinishing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState("--");
  const [partnerChecks, setPartnerChecks] = useState<Record<string, PartnerFieldDecision>>({});
  const [validationPhotos, setValidationPhotos] = useState<ValidationPhotoSlot[]>([]);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectConfirmChecked, setRejectConfirmChecked] = useState(false);
  const [customerOtp, setCustomerOtp] = useState("");
  const [customerOtpSent, setCustomerOtpSent] = useState(false);
  const [customerOtpVerified, setCustomerOtpVerified] = useState(false);
  const [customerOtpLoading, setCustomerOtpLoading] = useState(false);
  const [customerOtpDevCode, setCustomerOtpDevCode] = useState<string | null>(null);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [paymentMode, setPaymentMode] = useState<"UPI" | "BANK_TRANSFER" | "CASH" | "OTHER">("UPI");
  const [paymentSaving, setPaymentSaving] = useState(false);

  const loadLead = async () => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      await navigate({ to: "/user" });
      return;
    }

    if (activeRole === "admin") {
      await navigate({ to: "/admin" });
      return;
    }

    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }
    if (!search.leadId) return;
    try {
      const result = await getPartnerLead(token, search.leadId);
      setLead(result.lead);
      try {
        const catalogResult = await getPartnerOnsiteDeductionCatalog(token, search.leadId);
        setOnsiteDeductionCatalog(catalogResult.catalog);
      } catch {
        setOnsiteDeductionCatalog(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load service lead.");
    }
  };

  useEffect(() => {
    void loadLead();
  }, [search.leadId]);

  useEffect(() => {
    setCustomerOtp("");
    setCustomerOtpSent(false);
    setCustomerOtpVerified(false);
    setCustomerOtpLoading(false);
    setCustomerOtpDevCode(null);
    setPaymentFile(null);
    setPaymentMode("UPI");
    setPaymentSaving(false);
    setOnsiteDeductionCatalog(null);
  }, [search.leadId]);

  useEffect(() => {
    if (!lead) return;
    setCallDone((lead.callAttemptCount ?? 0) > 0 || Boolean(lead.lastCalledAt));
  }, [lead]);

  useEffect(() => {
    const anchor = lead?.pickupStartedAt || lead?.claimedAt || lead?.updatedAt;
    if (lead?.status === "REJECTED" || lead?.status === "CANCELLED") {
      setElapsedLabel("--");
      return;
    }
    if (!anchor) {
      setElapsedLabel("--");
      return;
    }

    const updateElapsed = () => {
      const started = Date.parse(anchor);
      if (Number.isNaN(started)) {
        setElapsedLabel("--");
        return;
      }
      const diff = Math.max(0, Date.now() - started);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setElapsedLabel(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [lead?.status, lead?.pickupStartedAt, lead?.claimedAt, lead?.updatedAt]);

  const validationRows = useMemo(() => {
    if (!lead?.deviceDetails) return [] as ValidationRow[];
    return flattenDeviceDetails(lead.deviceDetails);
  }, [lead?.deviceDetails]);

  const listedPrice = lead?.quote?.sellingPrice ?? lead?.selectedModel.listedPrice ?? 0;
  const activeObservedIssueRows = hasObservedIssues ? observedIssueRows : [];
  const observedIssueDeductionAmount = activeObservedIssueRows.reduce((sum, row) => sum + Math.max(0, Math.round(row.deductionAmount || 0)), 0);
  const rowDeductionPreview = useMemo(() => {
    const next: Record<string, RowDeductionPreview> = {};
    const seenRuleIds = new Set<string>();

    validationRows.forEach((row) => {
      const partner = partnerChecks[row.key] ?? { decision: "yes", comment: "" };
      const userValue = normalizeVerificationValue(row.userValue);
      const partnerValue = normalizeVerificationValue(partner.decision);
      if (!userValue || !partnerValue || partnerValue === "na" || userValue === partnerValue) return;

      const labels: string[] = [];
      let amount = 0;
      getCatalogRulesForRow(row, onsiteDeductionCatalog).forEach((rule) => {
        if (seenRuleIds.has(rule.ruleId)) return;
        seenRuleIds.add(rule.ruleId);
        amount += Math.max(0, Math.round(rule.amount || 0));
        labels.push(rule.label);
      });

      if (amount > 0) next[row.key] = { amount, labels };
    });

    return next;
  }, [validationRows, partnerChecks, onsiteDeductionCatalog]);
  const ruleDeductionAmount = Object.values(rowDeductionPreview).reduce((sum, row) => sum + row.amount, 0);
  const totalDeductionAmount = ruleDeductionAmount + observedIssueDeductionAmount;
  const reQuotedPrice = Math.max(0, listedPrice - totalDeductionAmount);
  const displayedReQuotedPrice = onsiteDeductionCatalog ? reQuotedPrice : lead?.onsiteValidation?.revisedQuote ?? reQuotedPrice;

  useEffect(() => {
    if (!validationRows.length) {
      setPartnerChecks({});
      return;
    }

    setPartnerChecks((prev) => {
      const next: Record<string, PartnerFieldDecision> = {};
      validationRows.forEach((row) => {
        next[row.key] = prev[row.key] ?? { decision: "yes", comment: "" };
      });
      return next;
    });
  }, [validationRows]);

  const ensureInProgress = async () => {
    if (!lead) return lead;
    if (lead.status === "IN_PROGRESS") return lead;
    if (lead.status !== "ACCEPTED") {
      toast.error("Lead must be ACCEPTED before pickup workflow can start.");
      return null;
    }
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return null;
    }
    const claimedLead = await ensureClaimedLead(lead, token);
    if (!claimedLead) return null;

    const result = await updatePartnerLeadStatus(token, claimedLead.id, { status: "IN_PROGRESS" });
    setLead(result.lead);
    return result.lead;
  };

  const ensureClaimedLead = async (targetLead: PartnerLead, token: string) => {
    if (targetLead.partnerId) return targetLead;
    try {
      const claimed = await claimPartnerLead(token, targetLead.id);
      setLead(claimed.lead);
      return claimed.lead;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Claim this lead before updating workflow status.");
      return null;
    }
  };

  const handleSaveValidation = async () => {
    if (!lead) return;
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }

    const progressed = await ensureInProgress();
    if (!progressed) return;

    const uploadedPhotos = validationPhotos;
    if (uploadedPhotos.length < REQUIRED_VALIDATION_PHOTO_COUNT) {
      toast.error(`Please upload all ${REQUIRED_VALIDATION_PHOTO_COUNT} device photos before saving validation.`);
      return;
    }

    const checklist = Object.fromEntries(
      validationRows.map((row) => {
        const partner = partnerChecks[row.key] ?? { decision: "na", comment: "" };
        return [
          row.key,
          JSON.stringify({
            field: row.label,
            userInput: row.userValue,
            partnerInput: partner.decision,
            comment: partner.comment.trim() || null,
          }),
        ];
      }),
    );

    checklist.__devicePhotos = JSON.stringify({
      required: REQUIRED_VALIDATION_PHOTO_COUNT,
      uploaded: uploadedPhotos.length,
      files: uploadedPhotos.map((photo, index) => ({
        slot: index + 1,
        name: photo.name,
        size: photo.size,
        type: photo.type,
      })),
    });

    const observedIssues = activeObservedIssueRows
      .map((row) => ({
        description: row.description.trim(),
        deductionAmount: Math.max(0, Math.round(row.deductionAmount || 0)),
      }))
      .filter((row) => row.description);
    const partnerCheckPayload: PartnerCheckPayload[] = validationRows.map((row) => {
      const partner = partnerChecks[row.key] ?? { decision: "na", comment: "" };
      return {
        key: row.key,
        label: row.label,
        userValue: row.userValue,
        partnerInput: partner.decision,
        comment: partner.comment.trim() || null,
      };
    });

    checklist.__deductions = JSON.stringify({
      listedPrice,
      totalDeductionAmount,
      ruleDeductionAmount,
      observedIssueDeductionAmount,
      reQuotedPrice,
      finalAssessedPrice: reQuotedPrice,
      issues: observedIssues,
    });

    try {
      const result = await submitPartnerOnsiteValidation(token, lead.id, {
        checklist,
        partnerChecks: partnerCheckPayload,
        observedIssues: observedIssues.map((row) => `${row.description} (Deduction: Rs. ${row.deductionAmount})`),
        observedIssueDeductions: observedIssues,
        photos: uploadedPhotos.map((photo) => photo.file),
      });
      setLead(result.lead);
      toast.success("Onsite validation saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save onsite validation.");
    }
  };

  const handleFinish = async () => {
    if (!lead) return;
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }

    setFinishing(true);
    try {
      const result = await completePartnerLead(token, lead.id, {
        finalAmount: lead.onsiteValidation?.revisedQuote ?? lead.paymentProof?.amountCollected ?? reQuotedPrice,
        handoverChecklist: {
          callDone,
          validationSaved: Boolean(lead.onsiteValidation),
          paymentProofSubmitted: Boolean(lead.paymentProof),
        },
      });
      setLead(result.lead);
      setShowSuccess(true);
      toast.success("Lead completed successfully.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to finish transaction.");
    } finally {
      setFinishing(false);
    }
  };

  const handleRejectLead = async () => {
    if (!lead) return;
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }

    setRejecting(true);
    try {
      const claimedLead = await ensureClaimedLead(lead, token);
      if (!claimedLead) return;

      await updatePartnerLeadStatus(token, claimedLead.id, {
        status: "REJECTED",
        reason: "Lead rejected by partner",
      });
      toast.success("Lead rejected. Returning to partner homepage.");
      await navigate({ to: "/partner-page" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to reject lead.");
    } finally {
      setRejecting(false);
    }
  };

  const handleValidationPhotoSelect = (fileList: FileList | null) => {
    const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
    if (!files.length) return;

    const selected = files.slice(0, REQUIRED_VALIDATION_PHOTO_COUNT).map((file) => ({
      file,
      name: file.name,
      size: file.size,
      type: file.type || "image/*",
      previewUrl: URL.createObjectURL(file),
    }));

    if (files.length > REQUIRED_VALIDATION_PHOTO_COUNT) {
      toast.error(`Only ${REQUIRED_VALIDATION_PHOTO_COUNT} images are required. Using the first ${REQUIRED_VALIDATION_PHOTO_COUNT}.`);
    }

    setValidationPhotos((prev) => {
      prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
      return selected;
    });
  };

  useEffect(() => {
    return () => {
      validationPhotos.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });
    };
  }, [validationPhotos]);

  const uploadedPhotoCount = validationPhotos.length;

  const canSchedulePickup = lead?.status === "ACCEPTED";
  const showActivePickupAlert = lead?.status === "IN_PROGRESS";
  const canValidate = lead?.status === "ACCEPTED" || lead?.status === "IN_PROGRESS";
  const customerPhone = lead?.seller.phone || lead?.pickupSchedule?.callingPhoneNumber || "";
  const canRequestCustomerOtp = Boolean(lead && canValidate && customerPhone);
  const canSaveValidation = customerOtpVerified && canValidate && uploadedPhotoCount >= REQUIRED_VALIDATION_PHOTO_COUNT;
  const canPay = customerOtpVerified && Boolean(lead?.onsiteValidation);
  const canFinish = customerOtpVerified && Boolean(lead?.paymentProof) && Boolean(lead?.onsiteValidation) && lead?.status === "IN_PROGRESS";

  useEffect(() => {
    if (lead?.completionEvent?.handoverChecklist && typeof lead.completionEvent.handoverChecklist === "object") {
      const done = Boolean(lead.completionEvent.handoverChecklist.callDone);
      if (done) setCallDone(true);
    }
  }, [lead?.completionEvent]);

  const handleMarkCalled = async () => {
    if (!lead) return;
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }
    try {
      const result = await updatePartnerLeadCallStatus(token, lead.id, { callStatus: "CALLED" });
      setLead(result.lead);
      setCallDone(true);
      toast.success("Call status saved.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to save call status.");
    }
  };

  const handleSendCustomerOtp = async () => {
    if (!lead) return;
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }

    setCustomerOtpLoading(true);
    try {
      const result = await sendPartnerLeadCustomerOtp(token, lead.id);
      setCustomerOtpSent(true);
      setCustomerOtpDevCode(result.devOtp || null);
      toast.success(`OTP sent to ${result.phone}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to send customer OTP.");
    } finally {
      setCustomerOtpLoading(false);
    }
  };

  const handleVerifyCustomerOtp = async () => {
    if (!lead) return;
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }

    setCustomerOtpLoading(true);
    try {
      await verifyPartnerLeadCustomerOtp(token, lead.id, customerOtp.trim());
      setCustomerOtpVerified(true);
      setCustomerOtpDevCode(null);
      toast.success("Customer OTP verified. Gadget information unlocked.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to verify customer OTP.");
    } finally {
      setCustomerOtpLoading(false);
    }
  };

  const handleBypassCustomerOtp = () => {
    if (!canRequestCustomerOtp) {
      toast.error("Customer OTP can be bypassed only after this lead is ready for validation.");
      return;
    }

    setCustomerOtp("6767");
    setCustomerOtpSent(true);
    setCustomerOtpVerified(true);
    setCustomerOtpDevCode(null);
    toast.success("Customer OTP bypassed. Gadget information unlocked.");
  };

  const handleSubmitPaymentProof = async () => {
    if (!lead || !paymentFile) return;
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }

    setPaymentSaving(true);
    try {
      const result = await submitPartnerPaymentProofMetadata(token, lead.id, {
        file: paymentFile,
        amountCollected: lead.onsiteValidation?.revisedQuote ?? reQuotedPrice,
        paymentMode,
      });
      setLead(result.lead);
      setPaymentFile(null);
      toast.success("Payment screenshot uploaded. You can finish this transaction now.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to upload payment screenshot.");
    } finally {
      setPaymentSaving(false);
    }
  };

  return (
    <main className="partner-simple-page service-lead-transaction-page">
      <div className="partner-subpage-topbar">
        <Link to="/partner-page" className="partner-subpage-hamburger" aria-label="Open partner navigation">
          ☰
        </Link>
        <Link to="/partner-page" className="partner-subpage-logo" aria-label="Go to partner dashboard">
          <img src="/logo.png" alt="GadgetPe" />
        </Link>
      </div>
      <section className="partner-simple-card partner-lead-card">
        <div className="lead-transaction-sticky-wrap">
          <h1>Service Lead Transaction</h1>

          <div className="lead-transaction-head">
            <div>
              <section className="lead-booking-box lead-inline-timebox">
                <h3>Listed Pickup Time</h3>
                <p>{lead?.pickupSchedule?.primaryDate?.slice(0, 10) || "-"} | {lead?.pickupSchedule?.primaryTime || "-"}</p>
                <p className="lead-hint">Elapsed since pickup start: {elapsedLabel}</p>
              </section>
            </div>
            <div className="lead-price-flash">Rs. {formatInr(lead?.quote?.sellingPrice ?? 0)}</div>
          </div>
        </div>

        {showActivePickupAlert ? (
          <section className="lead-booking-box partner-active-pickup-alert">
            <h3>Active Pickup Alert</h3>
            <p>You have scheduled pickup: {lead?.seller.name || "Customer"} | {lead?.selectedModel.modelName || "Selected device"}</p>
            <p>Elapsed: {elapsedLabel} | Status: {lead?.status}</p>
          </section>
        ) : (
          <section className="lead-booking-box">
            <h3>1. Schedule Pickup</h3>
            <div className="lead-decision-row">
              <button type="button" className="lead-book-btn" onClick={() => { void ensureInProgress(); }} disabled={!canSchedulePickup}>Start Pickup</button>
              <span className="lead-hint">Allowed for ACCEPTED leads only.</span>
            </div>
          </section>
        )}

        <section className="lead-booking-box">
          <h3>2. Call Customer</h3>
          <div className="lead-decision-row lead-call-action-row">
            {lead?.seller.phone ? <a className="lead-view-btn lead-view-link" href={`tel:${lead.seller.phone}`}>Call {lead.seller.phone}</a> : <span className="lead-view-disabled">Customer number unavailable</span>}
            <button type="button" className="lead-book-btn" onClick={() => { void handleMarkCalled(); }} disabled={!lead?.seller.phone}>Mark Called</button>
            <span className="lead-hint">Attempts: {lead?.callAttemptCount ?? 0}{lead?.lastCalledAt ? ` | Last called: ${new Date(lead.lastCalledAt).toLocaleString("en-IN")}` : ""}</span>
          </div>
        </section>

        <section className="lead-demo-panel">
          <div className="lead-accordion-body">
            <h3>3. Validate Gadget Information</h3>
            <p className="lead-hint">Verify customer OTP before opening submitted gadget details and final workflow actions.</p>

            <div className="lead-customer-otp-box">
              <div className="lead-booking-calendar lead-field-stack">
                <label htmlFor="customer-phone">Customer Number</label>
                <input id="customer-phone" type="tel" value={customerPhone} readOnly placeholder="Customer number unavailable" />
              </div>
              <div className="lead-decision-row lead-call-action-row">
                <button type="button" className="lead-view-btn" onClick={() => { void handleSendCustomerOtp(); }} disabled={!canRequestCustomerOtp || customerOtpLoading || customerOtpVerified}>
                  {customerOtpSent ? "Resend OTP" : "Send OTP"}
                </button>
                <input
                  type="text"
                  className="lead-otp-input"
                  value={customerOtp}
                  onChange={(event) => setCustomerOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="Enter OTP"
                  disabled={!customerOtpSent || customerOtpVerified}
                />
                <button type="button" className="lead-book-btn" onClick={() => { void handleVerifyCustomerOtp(); }} disabled={!customerOtpSent || customerOtpVerified || customerOtp.length < 4 || customerOtpLoading}>
                  {customerOtpVerified ? "Verified" : "Verify OTP"}
                </button>
                {isCustomerOtpBypassEnabled && !customerOtpVerified ? (
                  <button
                    type="button"
                    className="lead-otp-bypass-link"
                    onClick={handleBypassCustomerOtp}
                    disabled={!canRequestCustomerOtp || customerOtpLoading}
                  >
                    Bypass OTP
                  </button>
                ) : null}
                {customerOtpDevCode ? <span className="lead-hint">Dev OTP: {customerOtpDevCode}</span> : null}
              </div>
            </div>

            {customerOtpVerified ? (
              <>
            <div className="lead-device-table-wrap">
              <table className="lead-device-table lead-validation-table">
                <thead>
                  <tr>
                    <th>Field</th>
                    <th>User Input</th>
                    <th>Partner Input</th>
                    <th>Comments</th>
                  </tr>
                </thead>
                <tbody>
                  {validationRows.length > 0 ? validationRows.map((row) => {
                    const partner = partnerChecks[row.key] ?? { decision: "yes", comment: "" };
                    return (
                    <tr key={row.key}>
                      <td>{row.label}</td>
                      <td>{row.userValue}</td>
                      <td>
                        <div className="lead-radio-group" role="radiogroup" aria-label={`${row.label} partner input`}>
                          <label className="lead-radio-pill">
                            <input
                              type="radio"
                              name={`partner-${row.key}`}
                              value="yes"
                              checked={partner.decision === "yes"}
                              onChange={() => {
                                setPartnerChecks((prev) => ({
                                  ...prev,
                                  [row.key]: { ...(prev[row.key] ?? { comment: "" }), decision: "yes" },
                                }));
                              }}
                            />
                            Yes
                          </label>
                          <label className="lead-radio-pill">
                            <input
                              type="radio"
                              name={`partner-${row.key}`}
                              value="no"
                              checked={partner.decision === "no"}
                              onChange={() => {
                                setPartnerChecks((prev) => ({
                                  ...prev,
                                  [row.key]: { ...(prev[row.key] ?? { comment: "" }), decision: "no" },
                                }));
                              }}
                            />
                            No
                          </label>
                        </div>
                      </td>
                      <td>
                        <input
                          type="text"
                          className="lead-inline-comment"
                          placeholder="Add note (optional)"
                          value={partner.comment}
                          onChange={(event) => {
                            const comment = event.target.value;
                            setPartnerChecks((prev) => ({
                              ...prev,
                              [row.key]: { ...(prev[row.key] ?? { decision: "yes" }), comment },
                            }));
                          }}
                        />
                        {rowDeductionPreview[row.key] ? (
                          <span className="lead-hint lead-deduction-preview">
                            Deduction: Rs. {formatInr(rowDeductionPreview[row.key].amount)}
                            {rowDeductionPreview[row.key].labels.length ? ` (${rowDeductionPreview[row.key].labels.join(", ")})` : ""}
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                  }) : (
                    <tr><td colSpan={4}>No device details captured by user.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="lead-observed-issues-box">
              <div className="lead-photo-upload-head">
                <strong>Observed Issues</strong>
                <span className="lead-hint">Select Yes only when there are extra issues. Deductions are flat rupee amounts.</span>
              </div>
              <div className="lead-radio-group lead-observed-issues-toggle" role="radiogroup" aria-label="Observed issues found">
                <label className="lead-radio-pill">
                  <input type="radio" name="observed-issues-found" checked={!hasObservedIssues} onChange={() => setHasObservedIssues(false)} />
                  No
                </label>
                <label className="lead-radio-pill">
                  <input type="radio" name="observed-issues-found" checked={hasObservedIssues} onChange={() => setHasObservedIssues(true)} />
                  Yes
                </label>
              </div>
              {hasObservedIssues ? (
                <div className="lead-observed-issue-list">
                  {observedIssueRows.map((row, index) => (
                    <div className="lead-observed-issue-row" key={row.id}>
                      <div className="lead-booking-calendar lead-field-stack">
                        <label htmlFor={`observed-issue-${row.id}`}>Issue {index + 1}</label>
                        <input
                          id={`observed-issue-${row.id}`}
                          type="text"
                          value={row.description}
                          onChange={(event) => {
                            const description = event.target.value;
                            setObservedIssueRows((prev) => prev.map((item) => item.id === row.id ? { ...item, description } : item));
                          }}
                          placeholder="Enter observed issue"
                        />
                      </div>
                      <div className="lead-booking-calendar lead-field-stack lead-deduction-field">
                        <label htmlFor={`deduction-${row.id}`}>Deduction Amount</label>
                        <input
                          id={`deduction-${row.id}`}
                          type="number"
                          min="0"
                          max={listedPrice}
                          step="1"
                          value={row.deductionAmount}
                          onChange={(event) => {
                            const deductionAmount = Math.max(0, Math.round(Number(event.target.value) || 0));
                            setObservedIssueRows((prev) => prev.map((item) => item.id === row.id ? { ...item, deductionAmount } : item));
                          }}
                        />
                      </div>
                      {observedIssueRows.length > 1 ? (
                        <button
                          type="button"
                          className="lead-view-btn lead-remove-issue-btn"
                          onClick={() => setObservedIssueRows((prev) => prev.filter((item) => item.id !== row.id))}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="lead-decision-row">
                {hasObservedIssues ? <button type="button" className="lead-view-btn" onClick={() => setObservedIssueRows((prev) => [...prev, createObservedIssueRow()])}>Add More</button> : null}
                <span className="lead-hint">Admin mismatch deductions: Rs. {formatInr(ruleDeductionAmount)} | Extra issue deductions: Rs. {formatInr(observedIssueDeductionAmount)}</span>
              </div>
            </div>

            <div className="lead-booking-calendar lead-field-stack">
              <label htmlFor="re-quoted-price">Re Quoted Price</label>
              <input id="re-quoted-price" type="number" value={displayedReQuotedPrice} readOnly />
              <span className="lead-hint">Listed price Rs. {formatInr(listedPrice)} minus admin mismatch and extra issue deductions Rs. {formatInr(totalDeductionAmount)}.</span>
            </div>

            <div className="lead-photo-upload-section">
              <div className="lead-photo-upload-head">
                <strong>Device Photos</strong>
                <span className="lead-hint">{uploadedPhotoCount}/{REQUIRED_VALIDATION_PHOTO_COUNT} uploaded (mandatory)</span>
              </div>
              <div className="lead-photo-upload-single">
                <input
                  id="validation-photos"
                  type="file"
                  accept="image/*"
                  multiple
                  className="lead-photo-upload-input"
                  onChange={(event) => handleValidationPhotoSelect(event.target.files)}
                />
                <label htmlFor="validation-photos" className="lead-photo-upload-label lead-photo-upload-label-single">
                  <div className="lead-photo-upload-placeholder" aria-hidden="true">↑</div>
                  <span className="lead-photo-upload-title">Upload Device Photos</span>
                  <span className="lead-photo-upload-subtitle">Choose 6 images (single upload element)</span>
                </label>
              </div>
              {validationPhotos.length > 0 ? (
                <div className="lead-photo-upload-preview-strip">
                  {validationPhotos.map((photo, index) => (
                    <figure key={`${photo.name}-${index}`} className="lead-photo-chip">
                      <img src={photo.previewUrl} alt={`Uploaded device ${index + 1}`} className="lead-photo-upload-preview" />
                      <figcaption>#{index + 1} {photo.name}</figcaption>
                    </figure>
                  ))}
                </div>
              ) : null}
              {validationPhotos.length > 0 ? (
                <button
                  type="button"
                  className="lead-view-btn"
                  onClick={() => {
                    setValidationPhotos((prev) => {
                      prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
                      return [];
                    });
                  }}
                >
                  Clear Uploaded Photos
                </button>
              ) : null}
            </div>

            <div className="lead-decision-row">
              <button type="button" className="lead-book-btn" onClick={() => { void handleSaveValidation(); }} disabled={!canSaveValidation}>Save Validation</button>
              <button
                type="button"
                className="lead-reject-btn"
                onClick={() => {
                  setRejectConfirmChecked(false);
                  setShowRejectConfirm(true);
                }}
                disabled={!lead || rejecting}
              >
                {rejecting ? "Rejecting..." : "Reject Lead"}
              </button>
              {!canSaveValidation ? <span className="lead-hint">Upload {REQUIRED_VALIDATION_PHOTO_COUNT} photos to enable Save Validation.</span> : null}
            </div>
              </>
            ) : null}
          </div>
        </section>

        {customerOtpVerified ? (
          <>
            <section className="lead-booking-box">
              <h3>4. Pay To User</h3>
              <div className="lead-booking-calendar lead-field-stack">
                <label htmlFor="payment-proof-file">Payment Screenshot</label>
                <input
                  id="payment-proof-file"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(event) => setPaymentFile(event.target.files?.[0] ?? null)}
                  disabled={!canPay || paymentSaving}
                />
                {paymentFile ? <span className="lead-hint">Selected: {paymentFile.name}</span> : null}
              </div>

              <div className="lead-booking-calendar lead-field-stack">
                <label htmlFor="payment-mode">Payment Mode</label>
                <select
                  id="payment-mode"
                  className="lead-select"
                  value={paymentMode}
                  onChange={(event) => setPaymentMode(event.target.value as "UPI" | "BANK_TRANSFER" | "CASH" | "OTHER")}
                  disabled={!canPay || paymentSaving}
                >
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">BANK_TRANSFER</option>
                  <option value="CASH">CASH</option>
                  <option value="OTHER">OTHER</option>
                </select>
              </div>

              <div className="lead-decision-row">
                <button
                  type="button"
                  className="lead-book-btn"
                  disabled={!canPay || !paymentFile || paymentSaving}
                  onClick={() => { void handleSubmitPaymentProof(); }}
                >
                  {paymentSaving ? "Uploading..." : "Upload Payment Screenshot"}
                </button>
                {lead?.paymentProof ? <span className="lead-hint">Payment proof metadata saved.</span> : <span className="lead-hint">Submit validation first.</span>}
              </div>
            </section>

            <div className="lead-finish-action">
              <button type="button" className="lead-book-btn" onClick={() => { void handleFinish(); }} disabled={!canFinish || finishing}>{finishing ? "Finishing..." : "Finish"}</button>
            </div>
          </>
        ) : null}

        {showSuccess && (
          <div className="lead-confirm-backdrop" role="dialog" aria-modal="true">
            <div className="lead-confirm-card lead-deal-closed-card">
              <div className="success-burst" aria-hidden="true">
                <span className="ring r1" />
                <span className="ring r2" />
                <span className="ring r3" />
              </div>
              <div className="lead-confetti" aria-hidden="true"><span /><span /><span /><span /><span /></div>
              <h3>Deal Closed</h3>
              <p>Invoice details are now available to the user.</p>
              <div className="lead-decision-row lead-decision-row-modal">
                <button type="button" className="lead-book-btn" onClick={() => { setShowSuccess(false); void navigate({ to: "/partner-page" }); }}>OK</button>
              </div>
            </div>
          </div>
        )}

        {showRejectConfirm && (
          <div className="lead-confirm-backdrop" role="dialog" aria-modal="true" aria-label="Reject lead confirmation">
            <div className="lead-confirm-card lead-reject-confirm-card">
              <h3>Are you sure you want to reject this lead?</h3>
              <p>This action moves the lead out of active workflow.</p>
              <label className="lead-reject-check">
                <input
                  type="checkbox"
                  checked={rejectConfirmChecked}
                  onChange={(event) => setRejectConfirmChecked(event.target.checked)}
                />
                I understood
              </label>
              <div className="lead-decision-row lead-decision-row-modal">
                <button type="button" className="lead-view-btn" onClick={() => setShowRejectConfirm(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="lead-reject-btn"
                  disabled={!rejectConfirmChecked || rejecting}
                  onClick={() => {
                    setShowRejectConfirm(false);
                    void handleRejectLead();
                  }}
                >
                  {rejecting ? "Rejecting..." : "OK"}
                </button>
              </div>
            </div>
          </div>
        )}

        <Link to="/service-Leads" className="partner-simple-link">Back to Service Leads</Link>
      </section>
    </main>
  );
}
