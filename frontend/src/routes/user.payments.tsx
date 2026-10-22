import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, Download, Eye, FileText, IndianRupee, ShieldCheck, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InvoiceModal } from "../components/InvoiceModal";
import {
  getUserSellFlowInvoice,
  listUserInvoices,
  listUserSellFlows,
  type UserDealInvoice,
} from "../lib/api/gadgetpe-client";
import { downloadInvoicePdf } from "../lib/invoice-pdf";

export const Route = createFileRoute("/user/payments")({
  validateSearch: (search: Record<string, unknown>) => ({
    flowId: typeof search.flowId === "string" ? search.flowId : undefined,
  }),
  component: UserPaymentsPage,
});

const USER_TOKEN_KEY = "gadgetpe_user_access_token";

function getUserToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_TOKEN_KEY);
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

function getInvoiceDeductionAmount(invoice: UserDealInvoice) {
  const flatAmount = invoice.deductions?.totalDeductionAmount;
  if (Number.isFinite(flatAmount)) return Math.max(0, Math.round(flatAmount ?? 0));
  const legacyPercent = invoice.deductions?.totalDeductionPercent ?? 0;
  return Math.max(0, Math.round((invoice.listedPrice * legacyPercent) / 100));
}

function getIssueDeductionAmount(
  issue: { deductRupees?: number; deductionAmount?: number; deductionPercent?: number },
  listedPrice: number,
) {
  const flatAmount = issue.deductRupees ?? issue.deductionAmount;
  if (Number.isFinite(flatAmount)) return Math.max(0, Math.round(flatAmount ?? 0));
  return Math.max(0, Math.round((listedPrice * (issue.deductionPercent ?? 0)) / 100));
}

function UserPaymentsPage() {
  const { flowId } = Route.useSearch();
  const [invoices, setInvoices] = useState<UserDealInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeInvoice, setActiveInvoice] = useState<UserDealInvoice | null>(null);

  useEffect(() => {
    const loadInvoices = async () => {
      const token = getUserToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // First try the consolidated user invoices endpoint
        const { invoices: list } = await listUserInvoices(token);
        if (list && Array.isArray(list) && list.length > 0) {
          setInvoices(list);
          if (flowId) {
            const match = list.find((inv) => inv.userSellFlowId === flowId || inv.leadId === flowId);
            if (match) setActiveInvoice(match);
          }
          return;
        }

        // Fallback: Check flows
        const flows = await listUserSellFlows(token, { limit: 50 });
        const results = await Promise.allSettled(flows.rows.map((flow) => getUserSellFlowInvoice(token, flow.id)));
        const fetched = results.flatMap((result) => (result.status === "fulfilled" ? [result.value.invoice] : []));
        setInvoices(fetched);

        if (flowId) {
          const match = fetched.find((inv) => inv.userSellFlowId === flowId || inv.leadId === flowId);
          if (match) setActiveInvoice(match);
        }
      } catch {
        // In case of error, set empty
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    };

    void loadInvoices();
  }, [flowId]);

  const stats = useMemo(() => {
    const totalPayout = invoices.reduce((sum, inv) => sum + (inv.finalAmount || 0), 0);
    const count = invoices.length;
    const avg = count > 0 ? Math.round(totalPayout / count) : 0;
    return { totalPayout, count, avg };
  }, [invoices]);

  const handleDownload = (invoice: UserDealInvoice) => {
    try {
      downloadInvoicePdf(invoice);
      toast.success(`Invoice for ${invoice.modelName || "Device"} downloaded successfully.`);
    } catch {
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const handleView = (invoice: UserDealInvoice) => {
    setActiveInvoice(invoice);
  };

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-dashboard-shell-pro">
        <div className="user-auth-brand">Seller Action</div>
        <h1>Payments & Invoices</h1>

        <section className="user-action-route-card">
          <span className="user-action-icon">
            <IndianRupee size={18} />
          </span>
          <h2>Sold Device Invoices</h2>
          <p>Review closed deals, instant payout receipts, and download official invoices.</p>

          {/* Quick Metrics Header */}
          {!loading && invoices.length > 0 ? (
            <div className="user-payment-stats">
              <div className="user-payment-stat-card">
                <div className="user-payment-stat-icon">
                  <IndianRupee size={22} />
                </div>
                <div className="user-payment-stat-info">
                  <span className="user-payment-stat-val">₹{formatInr(stats.totalPayout)}</span>
                  <span className="user-payment-stat-label">Total Payout Received</span>
                </div>
              </div>

              <div className="user-payment-stat-card">
                <div className="user-payment-stat-icon">
                  <Smartphone size={22} />
                </div>
                <div className="user-payment-stat-info">
                  <span className="user-payment-stat-val">{stats.count}</span>
                  <span className="user-payment-stat-label">Devices Sold</span>
                </div>
              </div>

              <div className="user-payment-stat-card">
                <div className="user-payment-stat-icon">
                  <ShieldCheck size={22} />
                </div>
                <div className="user-payment-stat-info">
                  <span className="user-payment-stat-val">100% Settled</span>
                  <span className="user-payment-stat-label">Verified Payouts</span>
                </div>
              </div>
            </div>
          ) : null}

          {loading ? <div className="user-action-route-empty">Loading sold device invoices...</div> : null}

          {!loading && invoices.length === 0 ? (
            <div style={{ textAlign: "center", padding: "36px 0", color: "#64748b" }}>
              <FileText size={44} color="#cbd5e1" style={{ marginBottom: 12 }} />
              <p style={{ margin: 0, fontWeight: 600, color: "#1e293b", fontSize: 16 }}>
                No sold device invoices yet
              </p>
              <p style={{ fontSize: 13, marginTop: 6, color: "#64748b" }}>
                When your scheduled pickup is completed and payment is transferred, your official sale invoices will appear here.
              </p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 16 }}>
                <Link to="/user/sell-phone" className="user-btn-download-invoice">
                  Sell Phone
                </Link>
                <Link to="/user/sell-tablet" className="user-btn-view-invoice">
                  Sell Tablet
                </Link>
              </div>
            </div>
          ) : null}

          {invoices.length > 0 ? (
            <div className="user-payment-invoice-list">
              {invoices.map((invoice) => (
                <article className="user-payment-invoice-card" key={invoice.id}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <span className="invoice-modal-badge">
                          <CheckCircle2 size={12} /> {invoice.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "#0f1f30" }}>
                        {invoice.modelName || "Device"}
                      </h3>
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "#64748b" }}>
                        Invoice ID: {invoice.id}
                      </p>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div className="user-payment-invoice-amount" style={{ margin: 0 }}>
                        ₹{formatInr(invoice.finalAmount)}
                      </div>
                      <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 600 }}>
                        Paid via {invoice.payment?.paymentMode || "UPI"}
                      </span>
                    </div>
                  </div>

                  <dl className="user-payment-invoice-grid">
                    <div>
                      <dt>Listed Price</dt>
                      <dd>₹{formatInr(invoice.listedPrice)}</dd>
                    </div>
                    <div>
                      <dt>Final Quoted Payout</dt>
                      <dd>₹{formatInr(invoice.quotedAmount ?? invoice.finalAmount)}</dd>
                    </div>
                    <div>
                      <dt>Extra Adjustment</dt>
                      <dd>₹{formatInr(invoice.extraPaidAmount ?? Math.max(0, invoice.finalAmount - (invoice.quotedAmount ?? invoice.finalAmount)))}</dd>
                    </div>
                    <div>
                      <dt>Total Deduction</dt>
                      <dd style={{ color: getInvoiceDeductionAmount(invoice) > 0 ? "#dc2626" : "#0f1f30" }}>
                        ₹{formatInr(getInvoiceDeductionAmount(invoice))}
                      </dd>
                    </div>
                    <div>
                      <dt>Payment Mode</dt>
                      <dd>{invoice.payment?.paymentMode || "-"}</dd>
                    </div>
                    <div>
                      <dt>Verified Partner</dt>
                      <dd>{invoice.partner.name}{invoice.partner.phone ? ` | ${invoice.partner.phone}` : ""}</dd>
                    </div>
                    <div style={{ gridColumn: "span 2" }}>
                      <dt>Closed & Settled At</dt>
                      <dd>{new Date(invoice.completedAt).toLocaleString("en-IN")}</dd>
                    </div>
                  </dl>

                  {invoice.deductions?.issues?.length ? (
                    <div className="user-payment-deduction-list">
                      {invoice.deductions.issues.map((issue, index) => (
                        <span key={`${issue.description}-${index}`}>
                          {issue.description}: -₹{formatInr(getIssueDeductionAmount(issue, invoice.listedPrice))}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {/* Action Buttons for Invoice */}
                  <div className="user-payment-card-actions">
                    <button
                      type="button"
                      onClick={() => handleView(invoice)}
                      className="user-btn-view-invoice"
                    >
                      <Eye size={15} /> View Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownload(invoice)}
                      className="user-btn-download-invoice"
                    >
                      <Download size={15} /> Download PDF
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : null}

          <div className="user-auth-actions" style={{ marginTop: 22 }}>
            <Link to="/user" className="user-auth-cancel user-inline-link">
              ← Back to Dashboard
            </Link>
          </div>
        </section>
      </section>

      {/* Interactive Invoice Modal */}
      <InvoiceModal
        invoice={activeInvoice}
        isOpen={Boolean(activeInvoice)}
        onClose={() => setActiveInvoice(null)}
      />
    </main>
  );
}
