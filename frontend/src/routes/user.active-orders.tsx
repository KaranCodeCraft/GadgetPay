import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarClock, PackageCheck, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ApiClientError,
  cancelUserSellFlow,
  getUserSellFlowLeadStatus,
  rescheduleUserSellFlow,
  type UserSellFlow,
  type UserSellFlowLeadStatus,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/user/active-orders")({
  component: UserActiveOrdersPage,
});

const USER_TOKEN_KEY = "gadgetpe_user_access_token";

const TIME_SLOTS = [
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
];

function canModify(primaryDate: string): boolean {
  const pickupMs = new Date(primaryDate).getTime();
  return (pickupMs - Date.now()) > 6 * 60 * 60 * 1000;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatInr(n: number) {
  return n.toLocaleString("en-IN");
}

function leadStatusLabel(status: string) {
  const map: Record<string, string> = {
    AVAILABLE: "Awaiting Partner",
    ASSIGNED: "Partner Assigned",
    COMPLETED: "Pickup Done",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

function leadStatusColor(status: string) {
  if (status === "COMPLETED") return "#16a34a";
  if (status === "ASSIGNED") return "#2563eb";
  if (status === "CANCELLED") return "#dc2626";
  return "#d97706";
}

type RescheduleForm = {
  primaryDate: string;
  primaryTime: string;
  alternateDate: string;
  alternateTime: string;
};

function UserActiveOrdersPage() {
  const [flows, setFlows] = useState<UserSellFlow[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<Record<string, UserSellFlowLeadStatus>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState<Record<string, RescheduleForm>>({});
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const token = typeof window !== "undefined" ? window.localStorage.getItem(USER_TOKEN_KEY) : null;

  useEffect(() => {
    if (!token) { setLoading(false); return; }
    void (async () => {
      try {
        const { listUserSellFlows } = await import("../lib/api/gadgetpe-client");
        const { rows } = await listUserSellFlows(token, { status: "PICKUP_SCHEDULED", limit: 50 });
        setFlows(rows);
        // Fetch lead status for each flow in parallel
        const statuses = await Promise.allSettled(
          rows.map((f) => getUserSellFlowLeadStatus(token, f.id).then((s) => [f.id, s] as const))
        );
        const map: Record<string, UserSellFlowLeadStatus> = {};
        for (const r of statuses) {
          if (r.status === "fulfilled") map[r.value[0]] = r.value[1];
        }
        setLeadStatuses(map);
      } catch (err) {
        setError(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to load orders");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const handleCancel = async (flowId: string) => {
    if (!token) return;
    setCancellingId(flowId);
    try {
      await cancelUserSellFlow(token, flowId);
      setFlows((prev) => prev.filter((f) => f.id !== flowId));
      setConfirmCancelId(null);
      toast.success("Order cancelled successfully.");
    } catch (err) {
      toast.error(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to cancel order.");
    } finally {
      setCancellingId(null);
    }
  };

  const handleReschedule = async (flowId: string) => {
    if (!token) return;
    const form = rescheduleForm[flowId];
    if (!form?.primaryDate || !form?.primaryTime || !form?.alternateDate || !form?.alternateTime) {
      toast.error("Please fill all reschedule fields.");
      return;
    }
    setReschedulingId(flowId);
    try {
      const { flow } = await rescheduleUserSellFlow(token, flowId, {
        primaryDate: new Date(form.primaryDate).toISOString(),
        primaryTime: form.primaryTime,
        alternateDate: new Date(form.alternateDate).toISOString(),
        alternateTime: form.alternateTime,
      });
      setFlows((prev) => prev.map((f) => (f.id === flowId ? flow : f)));
      setRescheduleForm((prev) => { const n = { ...prev }; delete n[flowId]; return n; });
      toast.success("Pickup rescheduled successfully.");
    } catch (err) {
      toast.error(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to reschedule.");
    } finally {
      setReschedulingId(null);
    }
  };

  const updateForm = (flowId: string, key: keyof RescheduleForm, value: string) => {
    setRescheduleForm((prev) => ({
      ...prev,
      [flowId]: { ...prev[flowId], [key]: value } as RescheduleForm,
    }));
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell" style={{ maxWidth: 760, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <PackageCheck size={22} color="#16a387" />
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#0f1f30" }}>Active Orders</h2>
        </div>

        <Link to="/user" style={{ fontSize: 13, color: "#16a387", textDecoration: "none", marginBottom: 20, display: "inline-block" }}>
          ← Back to Home
        </Link>

        {!token && (
          <div className="user-auth-error" style={{ marginTop: 20 }}>
            Please <Link to="/user/login" search={{ redirectTo: "/user/active-orders" }} style={{ color: "#16a387" }}>login</Link> to view your active orders.
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
            <PackageCheck size={48} color="#d0dce8" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No active orders</p>
            <p style={{ fontSize: 13, marginTop: 6 }}>Your scheduled pickups will appear here.</p>
            <Link to="/user/sell-phone" style={{ display: "inline-block", marginTop: 16, color: "#16a387", fontWeight: 600, textDecoration: "none" }}>
              Sell a Device →
            </Link>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 8 }}>
          {flows.map((flow) => {
            const ps = flow.pickupSchedule;
            const price = flow.quote?.sellingPrice ?? 0;
            const lead = leadStatuses[flow.id];
            const leadInfo = lead?.found ? lead.lead : null;
            const modifiable = ps ? canModify(ps.primaryDate) : false;
            const isRescheduling = rescheduleForm[flow.id] !== undefined;

            return (
              <div
                key={flow.id}
                className="user-question-card"
                style={{ display: "flex", flexDirection: "column", gap: 12 }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#0f1f30" }}>
                      {flow.selectedModel?.modelName ?? "Device"}
                    </div>
                    {price > 0 && (
                      <div style={{ fontSize: 14, color: "#16a387", fontWeight: 600, marginTop: 2 }}>
                        ₹{formatInr(price)}
                      </div>
                    )}
                  </div>
                  {leadInfo && (
                    <span style={{
                      fontSize: 12, fontWeight: 600, padding: "3px 10px",
                      borderRadius: 999, background: "#f0fdf4", color: leadStatusColor(leadInfo.status),
                      border: `1px solid ${leadStatusColor(leadInfo.status)}33`,
                    }}>
                      {leadStatusLabel(leadInfo.status)}
                    </span>
                  )}
                </div>

                {/* Pickup details */}
                {ps && (
                  <div style={{ fontSize: 13, color: "#526171", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <CalendarClock size={14} />
                      <span><strong>Primary:</strong> {formatDate(ps.primaryDate)} · {ps.primaryTime}</span>
                    </div>
                    <div style={{ color: "#8da0b0" }}>
                      <strong>Alt:</strong> {formatDate(ps.alternateDate)} · {ps.alternateTime}
                    </div>
                    {ps.addressLine && (
                      <div>{ps.addressLine}{ps.city ? `, ${ps.city}` : ""}</div>
                    )}
                  </div>
                )}

                {/* Payment proof */}
                {leadInfo?.paymentProof && (
                  <div style={{ background: "#f0fdf4", borderRadius: 8, padding: "8px 12px", fontSize: 13 }}>
                    <strong style={{ color: "#16a34a" }}>Payment Received</strong>
                    <span style={{ color: "#526171", marginLeft: 8 }}>
                      ₹{formatInr(leadInfo.paymentProof.amountCollected)} via {leadInfo.paymentProof.paymentMode}
                    </span>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                  <button
                    type="button"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: modifiable ? "pointer" : "not-allowed",
                      background: "none", border: "1.5px solid #e2e8f0", color: modifiable ? "#dc2626" : "#c0ccd8",
                    }}
                    disabled={!modifiable || cancellingId === flow.id}
                    title={modifiable ? "Cancel this order" : "Cannot cancel within 6 hours of pickup"}
                    onClick={() => setConfirmCancelId(flow.id)}
                  >
                    <X size={14} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "7px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: modifiable ? "pointer" : "not-allowed",
                      background: modifiable ? "#ecfaf5" : "#f5f7fa", border: "1.5px solid #e2e8f0",
                      color: modifiable ? "#16a387" : "#c0ccd8",
                    }}
                    disabled={!modifiable || reschedulingId === flow.id}
                    title={modifiable ? "Reschedule pickup" : "Cannot reschedule within 6 hours of pickup"}
                    onClick={() => setRescheduleForm((prev) =>
                      prev[flow.id]
                        ? (({ [flow.id]: _removed, ...rest }) => rest)(prev)
                        : { ...prev, [flow.id]: { primaryDate: todayStr, primaryTime: TIME_SLOTS[1], alternateDate: todayStr, alternateTime: TIME_SLOTS[2] } }
                    )}
                  >
                    <RotateCcw size={14} />
                    Reschedule
                  </button>
                  {!modifiable && ps && (
                    <span style={{ fontSize: 12, color: "#d97706", alignSelf: "center" }}>
                      ⏳ Within 6 hours of pickup — modifications locked
                    </span>
                  )}
                </div>

                {/* Confirm cancel dialog */}
                {confirmCancelId === flow.id && (
                  <div style={{ background: "#fff5f5", border: "1px solid #fecaca", borderRadius: 8, padding: "12px 16px" }}>
                    <p style={{ margin: "0 0 10px", fontSize: 14, color: "#dc2626", fontWeight: 600 }}>
                      Cancel this pickup order?
                    </p>
                    <p style={{ margin: "0 0 12px", fontSize: 13, color: "#7a92a8" }}>
                      This action cannot be undone. The order will be cancelled.
                    </p>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={{ padding: "6px 18px", borderRadius: 7, background: "#dc2626", color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                        disabled={cancellingId === flow.id}
                        onClick={() => void handleCancel(flow.id)}
                      >
                        {cancellingId === flow.id ? "Cancelling..." : "Yes, Cancel"}
                      </button>
                      <button
                        type="button"
                        style={{ padding: "6px 18px", borderRadius: 7, background: "#f1f5f9", color: "#526171", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                        onClick={() => setConfirmCancelId(null)}
                      >
                        Go Back
                      </button>
                    </div>
                  </div>
                )}

                {/* Reschedule form */}
                {isRescheduling && (
                  <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#0f1f30" }}>Reschedule Pickup</p>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                        Primary Date
                        <input
                          type="date"
                          min={todayStr}
                          value={rescheduleForm[flow.id]?.primaryDate ?? ""}
                          onChange={(e) => updateForm(flow.id, "primaryDate", e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13 }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                        Primary Time Slot
                        <select
                          value={rescheduleForm[flow.id]?.primaryTime ?? ""}
                          onChange={(e) => updateForm(flow.id, "primaryTime", e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13, background: "#fff" }}
                        >
                          {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                        Alternate Date
                        <input
                          type="date"
                          min={todayStr}
                          value={rescheduleForm[flow.id]?.alternateDate ?? ""}
                          onChange={(e) => updateForm(flow.id, "alternateDate", e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13 }}
                        />
                      </label>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 13 }}>
                        Alternate Time Slot
                        <select
                          value={rescheduleForm[flow.id]?.alternateTime ?? ""}
                          onChange={(e) => updateForm(flow.id, "alternateTime", e.target.value)}
                          style={{ padding: "7px 10px", borderRadius: 7, border: "1.5px solid #e2e8f0", fontSize: 13, background: "#fff" }}
                        >
                          {TIME_SLOTS.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        type="button"
                        style={{ padding: "7px 20px", borderRadius: 7, background: "#16a387", color: "#fff", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                        disabled={reschedulingId === flow.id}
                        onClick={() => void handleReschedule(flow.id)}
                      >
                        {reschedulingId === flow.id ? "Saving..." : "Confirm Reschedule"}
                      </button>
                      <button
                        type="button"
                        style={{ padding: "7px 16px", borderRadius: 7, background: "#f1f5f9", color: "#526171", border: "none", fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                        onClick={() => setRescheduleForm((prev) => { const n = { ...prev }; delete n[flow.id]; return n; })}
                      >
                        Cancel
                      </button>
                    </div>
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
