import { Link, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getActiveRole } from "../lib/auth/role-session";
import { claimPartnerLead, getPartnerLead, updatePartnerLeadStatus, type PartnerLead } from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/Lead-bucket-details")({
  component: LeadBucketDetailsPage,
});

const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function toTitleCase(input: string) {
  return input
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (ch) => ch.toUpperCase());
}

function flattenDetails(value: unknown, prefix = "") {
  const rows: Array<{ key: string; value: string }> = [];

  const renderPrimitive = (v: unknown) => {
    if (v === null || v === undefined || v === "") return "-";
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "number") return String(v);
    return String(v);
  };

  if (Array.isArray(value)) {
    if (value.length === 0) {
      rows.push({ key: prefix || "Value", value: "-" });
      return rows;
    }

    value.forEach((item, index) => {
      const nextPrefix = prefix ? `${prefix} / ${index + 1}` : String(index + 1);
      rows.push(...flattenDetails(item, nextPrefix));
    });

    return rows;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      rows.push({ key: prefix || "Value", value: "-" });
      return rows;
    }

    for (const [key, item] of entries) {
      const label = toTitleCase(key);
      const nextPrefix = prefix ? `${prefix} / ${label}` : label;
      if (item && typeof item === "object") {
        rows.push(...flattenDetails(item, nextPrefix));
      } else {
        rows.push({ key: nextPrefix, value: renderPrimitive(item) });
      }
    }

    return rows;
  }

  rows.push({ key: prefix || "Value", value: renderPrimitive(value) });
  return rows;
}

function LeadBucketDetailsPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/Lead-bucket-details" }) as { leadId?: string };
  const [lead, setLead] = useState<PartnerLead | null>(null);
  const [loading, setLoading] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [deviceDetailsOpen, setDeviceDetailsOpen] = useState(false);

  const leadId = search.leadId || "";

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

    const token = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (!token || !leadId) return;
    setLoading(true);
    try {
      const result = await getPartnerLead(token, leadId);
      setLead(result.lead);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load lead details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLead();
  }, [leadId]);

  const acceptEnabled = useMemo(
    () => Boolean(lead && (lead.status === "AVAILABLE" || lead.status === "CLAIMED")),
    [lead],
  );

  const acceptButtonLabel = useMemo(() => {
    if (accepting) return "Accepting...";
    if (!lead) return "Accept Lead";
    if (lead.status === "IN_PROGRESS") return "In Progress";
    if (lead.status === "COMPLETED") return "Completed";
    if (lead.status === "REJECTED") return "Rejected";
    if (lead.status === "CANCELLED") return "Cancelled";
    return "Accept Lead";
  }, [accepting, lead]);

  const deviceRows = useMemo(() => flattenDetails(lead?.deviceDetails || {}), [lead?.deviceDetails]);

  const handleAccept = async () => {
    const token = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (!token || !lead || accepting) return;

    if (lead.status !== "AVAILABLE" && lead.status !== "CLAIMED") return;

    setAccepting(true);
    try {
      let currentLead = lead;

      if (currentLead.status === "AVAILABLE") {
        const claimed = await claimPartnerLead(token, currentLead.id);
        currentLead = claimed.lead;
      }

      if (currentLead.status === "CLAIMED") {
        const accepted = await updatePartnerLeadStatus(token, currentLead.id, {
          status: "ACCEPTED",
        });
        currentLead = accepted.lead;
      }

      setLead(currentLead);
      toast.success("Lead accepted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to accept lead.");
    } finally {
      setAccepting(false);
    }
  };

  return (
    <main className="partner-simple-page">
      <section className="partner-simple-card partner-lead-card">
        <h1>Lead Bucket Details</h1>
        <p>{lead ? `${lead.selectedModel.modelName} | ${lead.pincode}` : loading ? "Loading lead details..." : "Open a lead from Lead Bucket."}</p>

        <section className="lead-demo-panel">
          <h2>{lead?.selectedModel.modelName || "No lead selected"}</h2>
          {lead ? (
            <>
              <p className="lead-hint">Status: {lead.status} | Quote: Rs. {formatInr(lead.quote?.sellingPrice ?? lead.selectedModel.listedPrice ?? 0)}</p>
              <div className="lead-demo-meta">
                <span>Seller: {lead.seller.name || "-"}</span>
                <span>Phone: {lead.seller.phone || "-"}</span>
                <span>Pincode: {lead.pincode}</span>
                <span>City: {lead.seller.city || "-"}</span>
                <span>Address: {lead.seller.addressLine || "-"}</span>
                <span>Landmark: {lead.seller.landmark || "-"}</span>
              </div>
              <div className="lead-demo-meta">
                <span>Primary Slot: {formatDate(lead.pickupSchedule?.primaryDate)} {lead.pickupSchedule?.primaryTime || ""}</span>
                <span>Alternate Slot: {formatDate(lead.pickupSchedule?.alternateDate)} {lead.pickupSchedule?.alternateTime || ""}</span>
                <span>Pickup Contact: {lead.pickupSchedule?.sellerName || lead.seller.name || "-"}</span>
                <span>Pickup Number: {lead.pickupSchedule?.callingPhoneNumber || lead.seller.phone || "-"}</span>
                <span>Pickup Address: {lead.pickupSchedule?.addressLine || lead.seller.addressLine || "-"}</span>
              </div>
              <div className="lead-demo-meta">
                {(lead.quote?.deductions || []).map((deduction) => (
                  <span key={deduction.ruleId}>{deduction.label}: -Rs. {formatInr(Math.round(deduction.deductionAmount))}</span>
                ))}
              </div>

              <div className="lead-booking-box">
                <button
                  type="button"
                  className="lead-accordion-trigger"
                  aria-expanded={deviceDetailsOpen}
                  onClick={() => setDeviceDetailsOpen((open) => !open)}
                >
                  <span>Full Device Details</span>
                  <span>{deviceDetailsOpen ? "−" : "+"}</span>
                </button>
                {deviceDetailsOpen ? (
                  <div className="lead-accordion-body">
                    <div className="lead-device-table-wrap">
                      <table className="lead-device-table" aria-label="Full device details">
                        <thead>
                          <tr>
                            <th>Field</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {deviceRows.map((row, index) => (
                            <tr key={`${row.key}-${index}`}>
                              <td>{row.key}</td>
                              <td>{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <p className="lead-hint">Please open a lead from Lead Bucket.</p>
          )}

          <div className="lead-booking-box">
            <h3>Partner Actions</h3>

            <div className="lead-decision-row">
              {lead?.status === "ACCEPTED" ? (
                <button type="button" className="lead-book-btn" onClick={() => { void navigate({ to: "/service-Leads" }); }}>
                  Go to Assigned Leads
                </button>
              ) : (
                <button type="button" className="lead-book-btn" onClick={handleAccept} disabled={!acceptEnabled || accepting}>
                  {acceptButtonLabel}
                </button>
              )}
            </div>
          </div>
        </section>

        <Link to="/Lead-bucket" className="partner-simple-link">Back to Lead Bucket</Link>
      </section>
    </main>
  );
}
