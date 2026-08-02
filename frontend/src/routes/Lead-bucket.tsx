import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { getActiveRole } from "../lib/auth/role-session";
import {
  createLeadUnlockIntent,
  getPartnerWorkingPincodes,
  listPartnerLeadBucket,
  updatePartnerLeadStatus,
  type PartnerLead,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/Lead-bucket")({
  component: LeadBucketPage,
});

const PAGE_SIZE = 25;
const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";

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

function getLeadPreviewPrice(lead: PartnerLead) {
  return lead.quote?.sellingPrice ?? lead.selectedModel.listedPrice ?? 0;
}

function getLeadUnlockPrice(lead: PartnerLead) {
  const quotePrice = getLeadPreviewPrice(lead);
  if (!Number.isFinite(quotePrice) || quotePrice < 300) return null;
  if (quotePrice <= 10000) return 500;
  if (quotePrice <= 24999) return 800;
  return 1200;
}

function isUnlockApproved(lead: PartnerLead, currentPartnerId: string) {
  if (lead.partnerId === currentPartnerId && ["ACCEPTED", "IN_PROGRESS", "COMPLETED"].includes(lead.status)) return true;
  return lead.unlockOrder?.partnerId === currentPartnerId && ["APPROVED", "CLOSED"].includes(lead.unlockOrder.status);
}

function isUnlockPending(lead: PartnerLead, currentPartnerId: string) {
  return lead.unlockOrder?.partnerId === currentPartnerId && ["PENDING_PAYMENT", "SCREENSHOT_SENT"].includes(lead.unlockOrder.status);
}

function lockedValue(value: string | null | undefined, isLocked: boolean) {
  if (isLocked) return "XX";
  return value || "-";
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
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname.startsWith("/Lead-bucket/Unlock-payment")) {
    return <Outlet />;
  }

  return <LeadBucketContent />;
}

function LeadBucketContent() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [leads, setLeads] = useState<PartnerLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingPincodes, setWorkingPincodes] = useState<string[]>([]);
  const [unlockingLeadId, setUnlockingLeadId] = useState<string | null>(null);
  const [cancellingLeadId, setCancellingLeadId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PartnerLead | null>(null);
  const [currentPartnerId, setCurrentPartnerId] = useState("");

  const loadLeadBucket = useCallback(async (token: string, pincodes: string[]) => {
    setLoading(true);
    try {
      const result = await listPartnerLeadBucket(token, { pincodes, limit: 100 });
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

    const token = localStorage.getItem(PARTNER_TOKEN_KEY);
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
        const result = await getPartnerWorkingPincodes(token);
        const pins = result.pincodes.map((p) => p.pincode);
        setWorkingPincodes(pins);
        if (pins.length === 0) {
          setLoading(false);
          return;
        }
        await loadLeadBucket(token, pins);
      } catch {
        toast.error("Unable to load working pincodes.");
        setLoading(false);
      }
    })();
  }, [navigate, loadLeadBucket]);

  const handleUnlockLead = useCallback(
    async (lead: PartnerLead) => {
      const token = localStorage.getItem(PARTNER_TOKEN_KEY);
      if (!token) {
        toast.error("Please login as partner first.");
        window.location.href = "/partner";
        return;
      }

      if (workingPincodes.length === 0) {
        toast.error("Add working pincodes first.");
        window.location.href = "/partner-page/working-pincodes";
        return;
      }

      setUnlockingLeadId(lead.id);
      try {
        const result = await createLeadUnlockIntent(token, lead.id);
        await navigate({ to: "/Lead-bucket/Unlock-payment", search: { intentId: result.intent.id, leadId: lead.id } });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to unlock lead.");
      } finally {
        setUnlockingLeadId(null);
      }
    },
    [workingPincodes, navigate],
  );

  const handleCancelAcceptedLead = useCallback(async () => {
    if (!cancelTarget) return;

    const token = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (!token) {
      toast.error("Please login as partner first.");
      window.location.href = "/partner";
      return;
    }

    if (workingPincodes.length === 0) {
      toast.error("Add working pincodes first.");
      window.location.href = "/partner-page/working-pincodes";
      return;
    }

    setCancellingLeadId(cancelTarget.id);
    try {
      await updatePartnerLeadStatus(token, cancelTarget.id, {
        status: "CANCELLED",
        reason: "Partner cancelled accepted lead",
      });
      toast.success("Lead cancelled and returned to Lead Bucket.");
      setCancelTarget(null);
      await loadLeadBucket(token, workingPincodes);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to cancel lead.");
    } finally {
      setCancellingLeadId(null);
    }
  }, [cancelTarget, workingPincodes, loadLeadBucket]);

  const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
  const safePage = useMemo(() => Math.min(page, totalPages), [page, totalPages]);
  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const pageRows = leads.slice(start, end);

  return (
    <main className="partner-simple-page lead-bucket-page">
      <div className="partner-subpage-topbar">
        <Link to="/partner-page" className="partner-subpage-hamburger" aria-label="Open partner navigation">
          ☰
        </Link>
        <Link to="/partner-page" className="partner-subpage-logo" aria-label="Go to partner dashboard">
          <img src="/logo.png" alt="GadgetPe" />
        </Link>
      </div>
      <section className="partner-simple-card partner-lead-card lead-bucket-card">
        <h1>Lead Bucket</h1>
        <p>Showing {leads.length === 0 ? 0 : start + 1} - {Math.min(end, leads.length)} of {leads.length} leads</p>
        <p className="lead-hint lead-bucket-hint">
          {workingPincodes.length === 0
            ? <>
                No working pincodes set up.{" "}
                <Link to="/partner-page/working-pincodes" className="partner-simple-link">Add pincodes</Link>
              </>
            : `Showing leads for pincode${workingPincodes.length > 1 ? "s" : ""}: ${workingPincodes.join(", ")}`
          }
        </p>

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
                  const isUnlocked = isUnlockApproved(row, currentPartnerId);
                  const isPending = isUnlockPending(row, currentPartnerId);
                  const isLocked = !isUnlocked;
                  const unlockPrice = getLeadUnlockPrice(row);
                  const isUnlocking = unlockingLeadId === row.id;
                  const isCancelling = cancellingLeadId === row.id;
                  const canCancel = isUnlocked && row.status === "ACCEPTED" && currentPartnerId && row.partnerId === currentPartnerId;
                  const canUnlock = row.status === "AVAILABLE" || (row.status === "CLAIMED" && row.partnerId === currentPartnerId);

                  return (
                    <tr key={`${row.id}-${index}`}>
                      <td data-label="Model">{row.selectedModel.modelName}</td>
                      <td data-label="Seller">{lockedValue(row.seller.name, isLocked)}</td>
                      <td data-label="Phone">{lockedValue(row.seller.phone, isLocked)}</td>
                      <td data-label="City">{row.seller.city || row.city || "-"}</td>
                      <td data-label="Pincode">{row.pincode}</td>
                      <td data-label="Quote">Rs. {formatInr(getLeadPreviewPrice(row))}</td>
                      <td data-label="Primary Pickup">{formatSlot(row.pickupSchedule?.primaryDate, row.pickupSchedule?.primaryTime)}</td>
                      <td data-label="Alternate Pickup">{isLocked ? "XX" : formatSlot(row.pickupSchedule?.alternateDate, row.pickupSchedule?.alternateTime)}</td>
                      <td data-label="Status">{isLocked ? "XX" : row.status}</td>
                      <td data-label="Actions" className="lead-bucket-action-cell">
                        <div className="lead-decision-row lead-bucket-action-row" style={{ marginTop: 0 }}>
                          {isPending ? (
                            <button type="button" className="lead-pending-btn lead-bucket-pending-btn" disabled>
                              Admin approval pending
                            </button>
                          ) : isLocked ? (
                            <>
                              <button
                                type="button"
                                className="lead-book-btn lead-bucket-unlock-btn"
                                onClick={() => {
                                  void handleUnlockLead(row);
                                }}
                                disabled={isUnlocking || !canUnlock || !unlockPrice}
                                title={!canUnlock ? `Not unlockable in ${row.status} state` : undefined}
                              >
                                {isUnlocking ? "Opening..." : "Unlock Lead"}
                              </button>
                              {unlockPrice ? (
                                <p className="lead-unlock-price-label">Pay Rs. {formatInr(unlockPrice)} to unlock lead</p>
                              ) : null}
                            </>
                          ) : null}
                          {canCancel ? (
                            <button
                              type="button"
                              className="lead-cancel-btn lead-bucket-cancel-btn"
                              onClick={() => setCancelTarget(row)}
                              disabled={isCancelling}
                            >
                              {isCancelling ? "Cancelling..." : "Cancel Lead"}
                            </button>
                          ) : null}
                          {isUnlocked ? (
                            <Link to="/Lead-bucket-details" search={{ leadId: row.id }} className="lead-view-btn lead-view-link lead-bucket-details-btn">
                              View Details
                            </Link>
                          ) : (
                            <span className="lead-view-btn lead-view-link lead-bucket-details-btn lead-bucket-details-disabled" aria-disabled="true">
                              View Details
                            </span>
                          )}
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
      {cancelTarget ? (
        <div className="lead-cancel-modal-overlay" role="presentation">
          <div className="lead-cancel-modal" role="dialog" aria-modal="true" aria-labelledby="cancel-lead-title">
            <h2 id="cancel-lead-title">Are you sure?</h2>
            <p>This accepted lead will be cancelled</p>
            <div className="lead-cancel-modal-actions">
              <button type="button" className="lead-cancel-modal-secondary" onClick={() => setCancelTarget(null)} disabled={cancellingLeadId === cancelTarget.id}>
                Cancel
              </button>
              <button type="button" className="lead-book-btn" onClick={() => { void handleCancelAcceptedLead(); }} disabled={cancellingLeadId === cancelTarget.id}>
                {cancellingLeadId === cancelTarget.id ? "Cancelling..." : "OK"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
