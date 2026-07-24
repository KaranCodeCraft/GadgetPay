import { Link, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { clearRoleSession, getActiveRole } from "../../../lib/auth/role-session";
import {
  claimPartnerLead,
  completePartnerLead,
  getPartnerLead,
  submitPartnerOnsiteValidation,
  updatePartnerLeadCallStatus,
  updatePartnerLeadStatus,
  type PartnerLead,
} from "../../../lib/api/gadgetpe-client";

export const Route = createFileRoute("/service-Leads/transaction/")({
  component: ServiceLeadTransactionPage,
});

const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_PARTNER_TOKEN_KEY = "gadgetpe_access_token";
const REQUIRED_VALIDATION_PHOTO_COUNT = 6;

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

type ValidationPhotoSlot = {
  file: File;
  name: string;
  size: number;
  type: string;
  previewUrl: string;
};

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

function ServiceLeadTransactionPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/service-Leads/transaction/" }) as { leadId?: string };
  const [lead, setLead] = useState<PartnerLead | null>(null);
  const [callDone, setCallDone] = useState(false);
  const [validationResult, setValidationResult] = useState<"PASS" | "FAIL" | "NEEDS_REWORK">("PASS");
  const [observedIssues, setObservedIssues] = useState("");
  const [validationNotes, setValidationNotes] = useState("");
  const [revisedQuote, setRevisedQuote] = useState("");
  const [completionRemarks, setCompletionRemarks] = useState("");
  const [finishing, setFinishing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [elapsedLabel, setElapsedLabel] = useState("--");
  const [partnerChecks, setPartnerChecks] = useState<Record<string, PartnerFieldDecision>>({});
  const [validationPhotos, setValidationPhotos] = useState<ValidationPhotoSlot[]>([]);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectConfirmChecked, setRejectConfirmChecked] = useState(false);

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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load service lead.");
    }
  };

  useEffect(() => {
    void loadLead();
  }, [search.leadId]);

  const updateWorkflow = async (nextStatus: "IN_PROGRESS" | "COMPLETED" | "REJECTED") => {
    const token = getPartnerToken();
    if (!token) {
      forcePartnerLoginRedirect();
      return;
    }
    if (!lead) return;
    try {
      const result = await updatePartnerLeadStatus(token, lead.id, { status: nextStatus, reason: completionRemarks.trim() || undefined });
      setLead(result.lead);
      toast.success(`Lead marked ${nextStatus}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to update lead workflow.");
    }
  };

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

    try {
      const result = await submitPartnerOnsiteValidation(token, lead.id, {
        result: validationResult,
        checklist,
        observedIssues: observedIssues
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
        revisedQuote: revisedQuote.trim() ? Number(revisedQuote) : undefined,
        notes: validationNotes.trim() || undefined,
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
        finalAmount: lead.paymentProof?.amountCollected ?? lead.quote?.sellingPrice ?? 0,
        handoverChecklist: {
          callDone,
          validationSaved: Boolean(lead.onsiteValidation),
          paymentProofSubmitted: Boolean(lead.paymentProof),
        },
        remarks: completionRemarks.trim() || undefined,
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
        reason: completionRemarks.trim() || "Lead rejected by partner",
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

  const canSchedulePickup = lead?.status === "ACCEPTED" || lead?.status === "IN_PROGRESS";
  const canValidate = lead?.status === "ACCEPTED" || lead?.status === "IN_PROGRESS";
  const canSaveValidation = canValidate && uploadedPhotoCount >= REQUIRED_VALIDATION_PHOTO_COUNT;
  const canPay = Boolean(lead?.onsiteValidation) && lead?.onsiteValidation?.result === "PASS";
  const canFinish = Boolean(lead?.paymentProof) && Boolean(lead?.onsiteValidation) && lead?.status === "IN_PROGRESS";

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

  return (
    <main className="partner-simple-page">
      <section className="partner-simple-card partner-lead-card">
        <h1>Service Lead Transaction</h1>
        <p>Manage pickup workflow for scheduled lead</p>

        <div className="lead-transaction-head">
          <div>
            <h2>{lead?.selectedModel.modelName || "No transaction selected"}</h2>
            <p>{lead ? `${lead.seller.name || "Seller"} | ${lead.seller.phone || "-"} | ${lead.status}` : "Open this page from a live service lead to continue."}</p>
            <section className="lead-booking-box lead-inline-timebox">
              <h3>Listed Pickup Time</h3>
              <p>{lead?.pickupSchedule?.primaryDate?.slice(0, 10) || "-"} | {lead?.pickupSchedule?.primaryTime || "-"}</p>
              <p className="lead-hint">Elapsed since pickup start: {elapsedLabel}</p>
            </section>
          </div>
          <div className="lead-price-flash">Rs. {formatInr(lead?.quote?.sellingPrice ?? 0)}</div>
        </div>

        <section className="lead-booking-box">
          <h3>1. Schedule Pickup</h3>
          <div className="lead-decision-row">
            <button type="button" className="lead-book-btn" onClick={() => { void ensureInProgress(); }} disabled={!canSchedulePickup}>Start Pickup</button>
            <span className="lead-hint">Allowed for ACCEPTED leads only.</span>
          </div>
        </section>

        <section className="lead-booking-box">
          <h3>2. Call Customer</h3>
          <div className="lead-decision-row">
            {lead?.seller.phone ? <a className="lead-view-btn lead-view-link" href={`tel:${lead.seller.phone}`}>Call {lead.seller.phone}</a> : <span className="lead-view-disabled">Customer number unavailable</span>}
            <button type="button" className="lead-book-btn" onClick={() => { void handleMarkCalled(); }} disabled={!lead?.seller.phone}>Mark Called</button>
            <span className="lead-hint">Attempts: {lead?.callAttemptCount ?? 0}{lead?.lastCalledAt ? ` | Last called: ${new Date(lead.lastCalledAt).toLocaleString("en-IN")}` : ""}</span>
          </div>
        </section>

        <section className="lead-demo-panel">
          <div className="lead-accordion-body">
            <h3>3. Validate Gadget Information</h3>
            <p className="lead-hint">User submitted details are prefilled. Verify and submit final onsite validation.</p>

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
                      </td>
                    </tr>
                  );
                  }) : (
                    <tr><td colSpan={4}>No device details captured by user.</td></tr>
                  )}
                </tbody>
              </table>
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

            <div className="lead-booking-calendar lead-field-stack">
              <label htmlFor="validation-result">Validation Result</label>
              <select id="validation-result" className="lead-select" value={validationResult} onChange={(event) => setValidationResult(event.target.value as "PASS" | "FAIL" | "NEEDS_REWORK")}> 
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
                <option value="NEEDS_REWORK">NEEDS_REWORK</option>
              </select>
            </div>

            <div className="lead-booking-calendar lead-field-stack">
              <label htmlFor="revised-quote">Final Assessed Price</label>
              <input id="revised-quote" type="number" value={revisedQuote} onChange={(event) => setRevisedQuote(event.target.value)} placeholder="Enter revised quote (optional)" />
            </div>

            <div className="lead-booking-calendar lead-field-stack">
              <label htmlFor="observed-issues">Observed Issues (one per line)</label>
              <textarea id="observed-issues" value={observedIssues} onChange={(event) => setObservedIssues(event.target.value)} className="lead-textarea" />
            </div>

            <div className="lead-booking-calendar lead-field-stack">
              <label htmlFor="validation-notes">Validation Notes</label>
              <textarea id="validation-notes" value={validationNotes} onChange={(event) => setValidationNotes(event.target.value)} className="lead-textarea" />
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
          </div>
        </section>

        <section className="lead-booking-box">
          <h3>4. Pay To User</h3>
          <div className="lead-decision-row">
            <button
              type="button"
              className="lead-book-btn"
              disabled={!canPay}
              onClick={() => {
                if (!lead) return;
                void navigate({ to: "/service-Leads/transaction/payment", search: { leadId: lead.id } });
              }}
            >
              Upload Payment Screenshot
            </button>
            {lead?.paymentProof ? <span className="lead-hint">Payment proof metadata saved.</span> : <span className="lead-hint">Submit validation first.</span>}
          </div>
        </section>

        <section className="lead-booking-box">
          <h3>5. Finish</h3>
          <div className="lead-booking-calendar lead-field-stack">
            <label htmlFor="completion-remarks">Completion remarks</label>
            <textarea id="completion-remarks" value={completionRemarks} onChange={(event) => setCompletionRemarks(event.target.value)} className="lead-textarea" />
          </div>
          <div className="lead-decision-row">
            <button type="button" className="lead-book-btn" onClick={() => { void handleFinish(); }} disabled={!canFinish || finishing}>{finishing ? "Finishing..." : "Finish"}</button>
          </div>
        </section>

        {showSuccess && (
          <div className="lead-confirm-backdrop" role="dialog" aria-modal="true">
            <div className="lead-confirm-card">
              <div className="success-burst" aria-hidden="true">
                <span className="ring r1" />
                <span className="ring r2" />
                <span className="ring r3" />
              </div>
              <h3>Congratulations on your sale.</h3>
              <p>Lead workflow is completed successfully.</p>
              <div className="lead-decision-row lead-decision-row-modal">
                <button type="button" className="lead-book-btn" onClick={() => { setShowSuccess(false); void navigate({ to: "/service-Leads" }); }}>Back to Service Leads</button>
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
