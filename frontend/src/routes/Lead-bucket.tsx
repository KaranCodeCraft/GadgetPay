import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getActiveRole } from "../lib/auth/role-session";
import {
  claimPartnerLead,
  getPartnerCoinBalance,
  listPartnerLeadBucket,
  updatePartnerLeadStatus,
  type PartnerLead,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/Lead-bucket")({
  component: LeadBucketPage,
});

const PAGE_SIZE = 25;
const PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";

type PartnerScopeSnapshot = {
  serviceabilityStatus?: string;
  pincode?: string;
};

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatSlot(dateValue?: string | null, timeValue?: string | null) {
  if (!dateValue && !timeValue) return "-";
  if (!dateValue && timeValue) return timeValue;

  const parsed = dateValue ? new Date(dateValue) : null;
  const dateText =
    parsed && !Number.isNaN(parsed.getTime())
      ? parsed.toLocaleDateString("en-IN")
      : dateValue || "-";

  return timeValue ? `${dateText} ${timeValue}` : dateText;
}

function decodeJwtSub(token: string) {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    while (payload.length % 4 !== 0) {
      payload += "=";
    }

    const parsed = JSON.parse(window.atob(payload)) as { sub?: unknown };
    return typeof parsed.sub === "string" ? parsed.sub : null;
  } catch {
    return null;
  }
}

function LeadBucketPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [scopePincode, setScopePincode] = useState("");
  const [acceptingLeadId, setAcceptingLeadId] = useState<string | null>(null);
  const [currentPartnerId, setCurrentPartnerId] = useState("");

  const loadLeadBucket = useCallback(async (token: string, pincode: string) => {
    setLoading(true);
    try {
      const result = await listPartnerLeadBucket(token, { pincode, limit: 100 });
      setLeads(result.rows);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load lead bucket.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      void navigate({ to: "/user" });
      return;
    }

    if (activeRole === "admin") {
      void navigate({ to: "/admin" });
      return;
    }

    const raw = localStorage.getItem(PARTNER_SCOPE_KEY);
    const token = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (!raw) {
      toast.error("Select an ACTIVE pincode on Partner page first.");
      window.location.href = "/partner-page";
      return;
    }

    if (!token) {
      toast.error("Please login as partner first.");
      window.location.href = "/partner";
      return;
    }

    const sub = decodeJwtSub(token);
    if (sub) {
      setCurrentPartnerId(sub);
    }

    void (async () => {
      try {
        const scope = JSON.parse(raw) as PartnerScopeSnapshot;
        if (scope.serviceabilityStatus !== "ACTIVE") {
          toast.error("Current pincode is not ACTIVE. Lead Bucket is blocked.");
          window.location.href = "/partner-page";
          return;
        }

        const wallet = await getPartnerCoinBalance(token);
        if (wallet.balance <= 0) {
          toast.error("Wallet recharge is required to access Lead Bucket.");
          window.location.href = "/partner-page";
          return;
        }

        const pincode = scope.pincode || "";
        setScopePincode(pincode);
        await loadLeadBucket(token, pincode);
      } catch {
        toast.error("Invalid tenant scope. Please select pincode again.");
        window.location.href = "/partner-page";
      }
    })();

  }, [navigate, loadLeadBucket]);

  const canAcceptLead = useCallback(
    (lead: PartnerLead) => {
      if (lead.status === "AVAILABLE") return true;
      if (lead.status === "CLAIMED" && currentPartnerId && lead.partnerId === currentPartnerId) return true;
      return false;
    },
    [currentPartnerId],
  );

  const getAcceptLabel = useCallback(
    (lead: PartnerLead, isAccepting: boolean) => {
      if (isAccepting) return "Accepting...";
      if (lead.status === "AVAILABLE") return "Accept";
      if (lead.status === "CLAIMED") {
        if (currentPartnerId && lead.partnerId === currentPartnerId) return "Accept";
        return "Claimed";
      }
      if (lead.status === "ACCEPTED") return "Accepted";
      if (lead.status === "IN_PROGRESS") return "In Progress";
      if (lead.status === "COMPLETED") return "Completed";
      if (lead.status === "REJECTED") return "Rejected";
      if (lead.status === "CANCELLED") return "Cancelled";
      return "Accept";
    },
    [currentPartnerId],
  );

  const handleAccept = useCallback(
    async (lead: PartnerLead) => {
      const token = localStorage.getItem(PARTNER_TOKEN_KEY);
      if (!token) {
        toast.error("Please login as partner first.");
        window.location.href = "/partner";
        return;
      }

      if (!scopePincode) {
        toast.error("Select an ACTIVE pincode on Partner page first.");
        window.location.href = "/partner-page";
        return;
      }

      setAcceptingLeadId(lead.id);
      try {
        if (lead.status === "AVAILABLE") {
          await claimPartnerLead(token, lead.id);
          await updatePartnerLeadStatus(token, lead.id, { status: "ACCEPTED" });
        } else if (lead.status === "CLAIMED") {
          const partnerId = currentPartnerId || decodeJwtSub(token);
          if (!partnerId || lead.partnerId !== partnerId) {
            toast.error("Only the claiming partner can accept this lead.");
            return;
          }
          await updatePartnerLeadStatus(token, lead.id, { status: "ACCEPTED" });
        } else if (lead.status === "ACCEPTED") {
          toast.error("This lead is already accepted.");
          return;
        } else if (lead.status === "IN_PROGRESS") {
          toast.error("This lead is already in progress.");
          return;
        } else if (lead.status === "COMPLETED") {
          toast.error("This lead is already completed.");
          return;
        } else if (lead.status === "REJECTED") {
          toast.error("This lead has been rejected.");
          return;
        } else if (lead.status === "CANCELLED") {
          toast.error("This lead has been cancelled.");
          return;
        } else {
          toast.error("Only AVAILABLE or your CLAIMED leads can be accepted.");
          return;
        }

        toast.success("Lead accepted.");
        await loadLeadBucket(token, scopePincode);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to accept lead.");
      } finally {
        setAcceptingLeadId(null);
      }
    },
    [scopePincode, currentPartnerId, loadLeadBucket],
  );

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const safePage = useMemo(() => Math.min(page, totalPages), [page, totalPages]);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageRows = leads.slice(start, end);

  return (
    <main className="partner-simple-page lead-bucket-page">
      <section className="partner-simple-card partner-lead-card lead-bucket-card">
        <h1>Lead Bucket</h1>
        <p>Showing {leads.length === 0 ? 0 : start + 1} - {Math.min(end, leads.length)} of {leads.length} leads</p>
        <p className="lead-hint lead-bucket-hint">Quote-ready leads for pincode {scopePincode || "-"}.</p>

        <div className="lead-table-wrap lead-bucket-table-wrap">
          <table className="lead-table">
            <thead>
              <tr>
                <th>Model</th>
                <th>Seller</th>
                <th>Phone</th>
                <th>City</th>
                <th>Pincode</th>
                <th>Quote</th>
                <th>Primary Pickup</th>
                <th>Alternate Pickup</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length > 0 ? (
                pageRows.map((row, index) => {
                  const canAccept = canAcceptLead(row);
                  const isAccepting = acceptingLeadId === row.id;
                  const acceptLabel = getAcceptLabel(row, isAccepting);

                  return (
                    <tr key={`${row.id}-${index}`}>
                      <td data-label="Model">{row.selectedModel.modelName}</td>
                      <td data-label="Seller">{row.seller.name || "-"}</td>
                      <td data-label="Phone">{row.seller.phone || "-"}</td>
                      <td data-label="City">{row.seller.city || row.city || "-"}</td>
                      <td data-label="Pincode">{row.pincode}</td>
                      <td data-label="Quote">Rs. {formatInr(row.quote?.sellingPrice ?? row.selectedModel.listedPrice ?? 0)}</td>
                      <td data-label="Primary Pickup">{formatSlot(row.pickupSchedule?.primaryDate, row.pickupSchedule?.primaryTime)}</td>
                      <td data-label="Alternate Pickup">{formatSlot(row.pickupSchedule?.alternateDate, row.pickupSchedule?.alternateTime)}</td>
                      <td data-label="Status">{row.status}</td>
                      <td data-label="Actions" className="lead-bucket-action-cell">
                        <div className="lead-decision-row lead-bucket-action-row" style={{ marginTop: 0 }}>
                          <button
                            type="button"
                            className="lead-book-btn lead-bucket-accept-btn"
                            onClick={() => {
                              void handleAccept(row);
                            }}
                            disabled={isAccepting}
                            title={!canAccept && !isAccepting ? `Not actionable in ${row.status} state` : undefined}
                          >
                            {acceptLabel}
                          </button>
                          <Link to="/Lead-bucket-details" search={{ leadId: row.id }} className="lead-view-btn lead-view-link lead-bucket-details-btn">
                            View Details
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10}>{loading ? "Loading lead bucket..." : "No lead bucket data available."}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="lead-pagination lead-bucket-pagination" aria-label="Lead table pagination">
          <button type="button" onClick={() => setPage((prev) => Math.max(1, prev - 1))} disabled={safePage === 1}>
            Prev
          </button>
          <span>Page {safePage} of {totalPages}</span>
          <button type="button" onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))} disabled={safePage === totalPages}>
            Next
          </button>
        </div>

        <Link to="/partner-page" className="partner-simple-link">Back to Partner Page</Link>
      </section>
    </main>
  );
}
