import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Clock, Download, Eye, History } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { InvoiceModal } from "../components/InvoiceModal";
import {
  ApiClientError,
  getUserSellFlowInvoice,
  getUserSellFlowLeadStatus,
  type UserDealInvoice,
  type UserSellFlow,
} from "../lib/api/gadgetpe-client";
import { downloadInvoicePdf } from "../lib/invoice-pdf";

export const Route = createFileRoute("/user/closed-orders")({
  component: UserClosedOrdersPage,
});

const USER_TOKEN_KEY = "gadgetpe_user_access_token";
const AUTO_EXPIRED_PICKUP_REASONS = new Set(["AUTO_EXPIRED_PICKUP_SLOT", "AUTO_EXPIRED_ALL_SLOTS"]);

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatInr(n: number) {
  return n.toLocaleString("en-IN");
}

type FlowSnapshot = { cancellationReason?: string | null };
type EnrichedFlow = UserSellFlow & { leadStatus?: "COMPLETED" | "CANCELLED" | "EXPIRED"; amountCollected?: number; paymentMode?: string };

function isAutoExpiredFlow(flow: UserSellFlow) {
  const snapshot = flow.flowJson && typeof flow.flowJson === "object" ? flow.flowJson as FlowSnapshot : null;
  return AUTO_EXPIRED_PICKUP_REASONS.has(String(snapshot?.cancellationReason || ""));
}

function UserClosedOrdersPage() {
  const [flows, setFlows] = useState<EnrichedFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<UserDealInvoice | null>(null);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? window.localStorage.getItem(USER_TOKEN_KEY) : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    void (async () => {
      try {
        const { listUserSellFlows } = await import("../lib/api/gadgetpe-client");

        // Fetch completed and cancelled flows
        const { rows: completedList } = await listUserSellFlows(token, { status: "COMPLETED", limit: 100 }).catch(() => ({ rows: [] }));
        const { rows: cancelled } = await listUserSellFlows(token, { status: "CANCELLED", limit: 100 });

        // Also fetch scheduled flows to check if any have lead completed
        const { rows: scheduled } = await listUserSellFlows(token, { status: "PICKUP_SCHEDULED", limit: 100 });
        const leadChecks = await Promise.allSettled(
          scheduled.map((f) => getUserSellFlowLeadStatus(token, f.id).then((s) => ({ flow: f, status: s })))
        );
        const completedFromScheduled: EnrichedFlow[] = [];
        for (const r of leadChecks) {
          if (r.status === "fulfilled" && r.value.status.found && r.value.status.lead?.status === "COMPLETED") {
            completedFromScheduled.push({
              ...r.value.flow,
              leadStatus: "COMPLETED",
              amountCollected: r.value.status.lead.paymentProof?.amountCollected,
              paymentMode: r.value.status.lead.paymentProof?.paymentMode,
            });
          }
        }

        const directCompleted: EnrichedFlow[] = completedList.map((f) => ({
          ...f,
          leadStatus: "COMPLETED",
        }));

        const completedMap = new Map<string, EnrichedFlow>();
        for (const f of [...completedFromScheduled, ...directCompleted]) {
          completedMap.set(f.id, f);
        }

        const allClosed: EnrichedFlow[] = [
          ...Array.from(completedMap.values()),
          ...cancelled.map((f) => ({ ...f, leadStatus: isAutoExpiredFlow(f) ? "EXPIRED" : "CANCELLED" } as EnrichedFlow)),
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        setFlows(allClosed);
      } catch (err) {
        setError(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleViewInvoice = async (flowId: string) => {
    if (!token) return;
    setLoadingInvoiceId(flowId);
    try {
      const res = await getUserSellFlowInvoice(token, flowId);
      setActiveInvoice(res.invoice);
    } catch {
      toast.error("Failed to load invoice for this device.");
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const handleDownloadInvoice = async (flowId: string) => {
    if (!token) return;
    setLoadingInvoiceId(flowId);
    try {
      const res = await getUserSellFlowInvoice(token, flowId);
      downloadInvoicePdf(res.invoice);
      toast.success("Invoice PDF downloaded successfully.");
    } catch {
      toast.error("Failed to download invoice PDF.");
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <History size={22} color="#16a387" />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f1f30" }}>Closed Orders & Invoices</h2>
        </div>

        <Link to="/user" style={{ fontSize: 13, color: "#16a387", textDecoration: "none", marginBottom: 20, display: "inline-block" }}>
          ← Back to Home
        </Link>

        {!token && (
          <div className="user-auth-error" style={{ marginTop: 20 }}>
            Please <Link to="/user/login" search={{ redirectTo: "/user/closed-orders" }} style={{ color: "#16a387" }}>login</Link> to view your closed orders.
          </div>
        )}

        {token && loading && (
          <p style={{ color: "#7a92a8", marginTop: 20 }}>Loading orders...</p>
        )}

        {token && !loading && error && (
          <div className="user-auth-error">{error}</div>
        )}

        {token && !loading && !error && flows.length === 0 && (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#7a92a8" }}>
            <History size={48} color="#d0dce8" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No closed orders yet</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Completed, cancelled and expired pickups will appear here.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
          {flows.map((flow) => {
            const isCompleted = flow.leadStatus === "COMPLETED";
            const isExpired = flow.leadStatus === "EXPIRED";
            const ps = flow.pickupSchedule;
            const badgeBackground = isCompleted ? "#f0fdf4" : isExpired ? "#fff7ed" : "#fff5f5";
            const badgeColor = isCompleted ? "#16a34a" : isExpired ? "#d97706" : "#dc2626";
            const badgeBorder = isCompleted ? "#bbf7d0" : isExpired ? "#fed7aa" : "#fecaca";
            const badgeLabel = isCompleted ? "Completed & Sold" : isExpired ? "Expired" : "Cancelled";
            const isBusy = loadingInvoiceId === flow.id;

            return (
              <div
                key={flow.id}
                className="user-question-card"
                style={{ display: "flex", flexDirection: "column", gap: 10 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f1f30" }}>
                      {flow.selectedModel?.modelName ?? "Device"}
                    </div>
                    {flow.quote?.sellingPrice && (
                      <div style={{ fontSize: 14, color: "#16a387", fontWeight: 600, marginTop: 2 }}>
                        ₹{formatInr(flow.quote.sellingPrice)}
                      </div>
                    )}
                  </div>
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 5,
                    fontSize: 12, fontWeight: 600, padding: "3px 10px",
                    borderRadius: 999,
                    background: badgeBackground,
                    color: badgeColor,
                    border: `1px solid ${badgeBorder}`,
                  }}>
                    {isCompleted ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {badgeLabel}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: "#7a92a8" }}>
                  {ps?.primaryDate && <span>Pickup: {formatDate(ps.primaryDate)} · {ps.primaryTime}</span>}
                  {!ps && <span>Updated: {formatDate(flow.updatedAt)}</span>}
                </div>

                {isCompleted && (
                  <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "10px 14px", border: "1px solid #bbf7d0" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div>
                        <strong style={{ color: "#16a34a" }}>Payment Settled: </strong>
                        <span style={{ color: "#526171", fontWeight: 600 }}>
                          {flow.amountCollected ? `₹${formatInr(flow.amountCollected)}` : ""} {flow.paymentMode ? `via ${flow.paymentMode}` : ""}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => void handleViewInvoice(flow.id)}
                          disabled={isBusy}
                          className="user-btn-view-invoice"
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          <Eye size={13} /> {isBusy ? "Loading..." : "View Invoice"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadInvoice(flow.id)}
                          disabled={isBusy}
                          className="user-btn-download-invoice"
                          style={{ padding: "6px 12px", fontSize: 12 }}
                        >
                          <Download size={13} /> {isBusy ? "..." : "Download PDF"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {isExpired && (
                  <div style={{ background: "#fff7ed", borderRadius: 7, padding: "8px 12px", fontSize: 13 }}>
                    <strong style={{ color: "#d97706" }}>Pickup expired: </strong>
                    <span style={{ color: "#526171" }}>No partner accepted this lead before both preferred and alternate pickup windows ended.</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Invoice Preview Modal */}
      <InvoiceModal
        invoice={activeInvoice}
        isOpen={Boolean(activeInvoice)}
        onClose={() => setActiveInvoice(null)}
      />
    </main>
  );
}

