import { createFileRoute, Link } from "@tanstack/react-router";
import { IndianRupee } from "lucide-react";
import { useEffect, useState } from "react";
import { getUserSellFlowInvoice, listUserSellFlows, type UserDealInvoice } from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/user/payments")({
  component: UserPaymentsPage,
});

const USER_TOKEN_KEY = "gadgetpe_user_access_token";

function getUserToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_TOKEN_KEY);
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getInvoiceDeductionAmount(invoice: UserDealInvoice) {
  const flatAmount = invoice.deductions?.totalDeductionAmount;
  if (Number.isFinite(flatAmount)) return Math.max(0, Math.round(flatAmount ?? 0));
  const legacyPercent = invoice.deductions?.totalDeductionPercent ?? 0;
  return Math.max(0, Math.round((invoice.listedPrice * legacyPercent) / 100));
}

function getIssueDeductionAmount(issue: { deductRupees?: number; deductionAmount?: number; deductionPercent?: number }, listedPrice: number) {
  const flatAmount = issue.deductRupees ?? issue.deductionAmount;
  if (Number.isFinite(flatAmount)) return Math.max(0, Math.round(flatAmount ?? 0));
  return Math.max(0, Math.round((listedPrice * (issue.deductionPercent ?? 0)) / 100));
}

function UserPaymentsPage() {
  const [invoices, setInvoices] = useState<UserDealInvoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInvoices = async () => {
      const token = getUserToken();
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const flows = await listUserSellFlows(token, { limit: 25 });
        const results = await Promise.allSettled(flows.rows.map((flow) => getUserSellFlowInvoice(token, flow.id)));
        setInvoices(results.flatMap((result) => result.status === "fulfilled" ? [result.value.invoice] : []));
      } finally {
        setLoading(false);
      }
    };

    void loadInvoices();
  }, []);

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-dashboard-shell-pro">
        <div className="user-auth-brand">Seller Action</div>
        <h1>Payments</h1>
        <section className="user-action-route-card">
          <span className="user-action-icon"><IndianRupee size={18} /></span>
          <h2>Payout Overview</h2>
          <p>Review closed deal invoices and settlement details.</p>
          {loading ? <div className="user-action-route-empty">Loading invoices...</div> : null}
          {!loading && invoices.length === 0 ? <div className="user-action-route-empty">No closed deal invoice is available yet.</div> : null}
          {invoices.length > 0 ? (
            <div className="user-payment-invoice-list">
              {invoices.map((invoice) => (
                <article className="user-payment-invoice-card" key={invoice.id}>
                  <div>
                    <span className="user-action-route-empty">{invoice.status.replace(/_/g, " ")}</span>
                    <h3>{invoice.modelName || "Device"}</h3>
                    <p>Invoice ID: {invoice.id}</p>
                  </div>
                  <div className="user-payment-invoice-amount">Rs. {formatInr(invoice.finalAmount)}</div>
                  <dl className="user-payment-invoice-grid">
                    <div><dt>Listed Price</dt><dd>Rs. {formatInr(invoice.listedPrice)}</dd></div>
                    <div><dt>Deduction</dt><dd>Rs. {formatInr(getInvoiceDeductionAmount(invoice))}</dd></div>
                    <div><dt>Payment Mode</dt><dd>{invoice.payment?.paymentMode || "-"}</dd></div>
                    <div><dt>Partner</dt><dd>{invoice.partner.name}{invoice.partner.phone ? ` | ${invoice.partner.phone}` : ""}</dd></div>
                    <div><dt>Closed At</dt><dd>{new Date(invoice.completedAt).toLocaleString("en-IN")}</dd></div>
                  </dl>
                  {invoice.deductions?.issues?.length ? (
                    <div className="user-payment-deduction-list">
                      {invoice.deductions.issues.map((issue, index) => (
                        <span key={`${issue.description}-${index}`}>{issue.description}: Rs. {formatInr(getIssueDeductionAmount(issue, invoice.listedPrice))}</span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : null}
          <div className="user-auth-actions" style={{ marginTop: 18 }}>
            <Link to="/user" className="user-auth-cancel user-inline-link">Back to Dashboard</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
