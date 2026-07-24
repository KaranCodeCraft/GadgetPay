import { Link, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getActiveRole } from "../../../lib/auth/role-session";
import { getPartnerLead, submitPartnerPaymentProofMetadata } from "../../../lib/api/gadgetpe-client";

export const Route = createFileRoute("/service-Leads/transaction/payment")({
  component: ServiceLeadPaymentPage,
});

function ServiceLeadPaymentPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/service-Leads/transaction/payment" }) as { leadId?: string };
  const [paymentDone, setPaymentDone] = useState(false);
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [amountCollected, setAmountCollected] = useState("");
  const [paymentMode, setPaymentMode] = useState<"UPI" | "BANK_TRANSFER" | "CASH" | "OTHER">("UPI");
  const [transactionRef, setTransactionRef] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [paymentProofUrl, setPaymentProofUrl] = useState<string | null>(null);

  const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      void navigate({ to: "/user" });
      return;
    }

    if (activeRole === "admin") {
      void navigate({ to: "/admin" });
    }

    const token = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (!token || !search.leadId) {
      toast.error("Open this page from transaction flow.");
      void navigate({ to: "/service-Leads" });
      return;
    }

    void (async () => {
      try {
        const result = await getPartnerLead(token, search.leadId || "");
        const defaultAmount = result.lead.onsiteValidation?.revisedQuote ?? result.lead.quote?.sellingPrice ?? 0;
        setAmountCollected(String(defaultAmount));
        setPaymentProofUrl(result.lead.paymentProof?.mediaUrl || null);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Unable to load lead for payment.");
      }
    })();
  }, [navigate, search.leadId]);

  const handleSubmit = async () => {
    const token = localStorage.getItem(PARTNER_TOKEN_KEY);
    if (!token || !search.leadId || !paymentFile) return;

    setSaving(true);
    try {
      const result = await submitPartnerPaymentProofMetadata(token, search.leadId, {
        file: paymentFile,
        amountCollected: Number(amountCollected),
        paymentMode,
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setPaymentProofUrl(result.lead.paymentProof?.mediaUrl || null);
      setPaymentDone(true);
      toast.success("Payment proof metadata submitted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to submit payment proof metadata.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="partner-simple-page">
      <section className="partner-simple-card partner-lead-card">
        <h1>UPI Payment</h1>
        <p>Complete UPI payment for the service lead transaction.</p>

        <div className="lead-upi-box lead-upi-box-page">
          <h3>UPI Gateway</h3>
          <p>Upload the actual payment proof for the selected lead transaction.</p>

          <div className="lead-booking-calendar lead-field-stack">
            <label htmlFor="payment-file">Payment proof file</label>
            <input
              id="payment-file"
              type="file"
              accept="image/*,.pdf"
              onChange={(event) => setPaymentFile(event.target.files?.[0] ?? null)}
            />
            {paymentFile ? <span className="lead-hint">{paymentFile.name} | {paymentFile.type || "application/octet-stream"} | {paymentFile.size} bytes</span> : null}
          </div>

          <div className="lead-booking-calendar lead-field-stack">
            <label htmlFor="payment-amount">Amount paid to user</label>
            <input id="payment-amount" type="number" value={amountCollected} onChange={(event) => setAmountCollected(event.target.value)} />
          </div>

          <div className="lead-booking-calendar lead-field-stack">
            <label htmlFor="payment-mode">Payment mode</label>
            <select id="payment-mode" className="lead-select" value={paymentMode} onChange={(event) => setPaymentMode(event.target.value as "UPI" | "BANK_TRANSFER" | "CASH" | "OTHER")}>
              <option value="UPI">UPI</option>
              <option value="BANK_TRANSFER">BANK_TRANSFER</option>
              <option value="CASH">CASH</option>
              <option value="OTHER">OTHER</option>
            </select>
          </div>

          <div className="lead-booking-calendar lead-field-stack">
            <label htmlFor="payment-ref">Transaction reference</label>
            <input id="payment-ref" type="text" value={transactionRef} onChange={(event) => setTransactionRef(event.target.value)} />
          </div>

          <div className="lead-booking-calendar lead-field-stack">
            <label htmlFor="payment-notes">Notes</label>
            <textarea id="payment-notes" value={notes} onChange={(event) => setNotes(event.target.value)} className="lead-textarea" />
          </div>

          <button type="button" className="lead-book-btn" onClick={() => { void handleSubmit(); }} disabled={saving || !paymentFile}>{saving ? "Submitting..." : "Submit Payment Proof"}</button>
          {paymentDone && <p className="lead-booking-message">Payment successful.</p>}
          {paymentProofUrl ? (
            <p className="lead-booking-message">
              <a href={paymentProofUrl} target="_blank" rel="noreferrer" className="user-inline-link">Open uploaded payment proof</a>
            </p>
          ) : null}
        </div>

        <Link to="/service-Leads/transaction" search={{ leadId: search.leadId || "" }} className="partner-simple-link">Back to Transaction</Link>
      </section>
    </main>
  );
}
