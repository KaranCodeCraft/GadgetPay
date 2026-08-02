import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle, Clock, History } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiClientError, getUserSellFlowLeadStatus, type UserSellFlow } from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/user/closed-orders")({
  component: UserClosedOrdersPage,
});

const USER_TOKEN_KEY = "gadgetpe_user_access_token";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatInr(n: number) {
  return n.toLocaleString("en-IN");
}

type EnrichedFlow = UserSellFlow & { leadStatus?: string; amountCollected?: number; paymentMode?: string };

function UserClosedOrdersPage() {
  const [flows, setFlows] = useState<EnrichedFlow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? window.localStorage.getItem(USER_TOKEN_KEY) : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    void (async () => {
      try {
        const { listUserSellFlows } = await import("../lib/api/gadgetpe-client");

        // Fetch cancelled flows
        const { rows: cancelled } = await listUserSellFlows(token, { status: "CANCELLED", limit: 100 });

        // Fetch all scheduled flows and check if their lead is COMPLETED
        const { rows: scheduled } = await listUserSellFlows(token, { status: "PICKUP_SCHEDULED", limit: 100 });
        const leadChecks = await Promise.allSettled(
          scheduled.map((f) => getUserSellFlowLeadStatus(token, f.id).then((s) => ({ flow: f, status: s })))
        );
        const completedFlows: EnrichedFlow[] = [];
        for (const r of leadChecks) {
          if (r.status === "fulfilled" && r.value.status.found && r.value.status.lead?.status === "COMPLETED") {
            completedFlows.push({
              ...r.value.flow,
              leadStatus: "COMPLETED",
              amountCollected: r.value.status.lead.paymentProof?.amountCollected,
              paymentMode: r.value.status.lead.paymentProof?.paymentMode,
            });
          }
        }

        const allClosed: EnrichedFlow[] = [
          ...completedFlows,
          ...cancelled.map((f) => ({ ...f, leadStatus: "CANCELLED" })),
        ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

        setFlows(allClosed);
      } catch (err) {
        setError(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <History size={22} color="#16a387" />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f1f30" }}>Closed Orders</h2>
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
            <p style={{ fontSize: 13, marginTop: 6 }}>Completed and cancelled pickups will appear here.</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 8 }}>
          {flows.map((flow) => {
            const isCompleted = flow.leadStatus === "COMPLETED";
            const ps = flow.pickupSchedule;

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
                    background: isCompleted ? "#f0fdf4" : "#fff5f5",
                    color: isCompleted ? "#16a34a" : "#dc2626",
                    border: `1px solid ${isCompleted ? "#bbf7d0" : "#fecaca"}`,
                  }}>
                    {isCompleted ? <CheckCircle size={12} /> : <Clock size={12} />}
                    {isCompleted ? "Completed" : "Cancelled"}
                  </span>
                </div>

                <div style={{ fontSize: 13, color: "#7a92a8" }}>
                  {ps?.primaryDate && <span>Pickup: {formatDate(ps.primaryDate)} · {ps.primaryTime}</span>}
                  {!ps && <span>Updated: {formatDate(flow.updatedAt)}</span>}
                </div>

                {isCompleted && flow.amountCollected && (
                  <div style={{ background: "#f0fdf4", borderRadius: 7, padding: "8px 12px", fontSize: 13 }}>
                    <strong style={{ color: "#16a34a" }}>Payment Received: </strong>
                    <span style={{ color: "#526171" }}>₹{formatInr(flow.amountCollected)} via {flow.paymentMode}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
