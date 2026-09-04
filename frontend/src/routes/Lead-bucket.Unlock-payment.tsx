import { Link, createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { activateRoleSession, getActiveRole } from "../lib/auth/role-session";
import {
  getLeadUnlockIntent,
  markLeadUnlockScreenshotSent,
  type PartnerLeadUnlockOrder,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/Lead-bucket/Unlock-payment")({
  component: LeadUnlockPaymentPage,
});

const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_PARTNER_TOKEN_KEY = "gadgetpe_access_token";
const QR_DISPLAY_MS = 5 * 60 * 1000;
const QR_DISPLAY_MINUTES = 5;

function getPartnerToken() {
  return localStorage.getItem(PARTNER_TOKEN_KEY) || localStorage.getItem(LEGACY_PARTNER_TOKEN_KEY);
}

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function LeadUnlockPaymentPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/Lead-bucket/Unlock-payment" }) as { intentId?: string; leadId?: string };
  const [intent, setIntent] = useState<PartnerLeadUnlockOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [remainingMs, setRemainingMs] = useState(QR_DISPLAY_MS);
  const [qrVisibleUntil, setQrVisibleUntil] = useState(() => Date.now() + QR_DISPLAY_MS);
  const [waitingForAdmin, setWaitingForAdmin] = useState(false);
  const [expiredNotified, setExpiredNotified] = useState(false);
  const [rejectedNotified, setRejectedNotified] = useState(false);

  const intentId = search.intentId || "";
  const leadId = search.leadId || "";
  const isBackendExpired = intent?.status === "EXPIRED";
  const isAwaitingAdmin = intent?.status === "SCREENSHOT_SENT";
  const isExpired = !isAwaitingAdmin && (isBackendExpired || remainingMs <= 0);
  const isApproved = intent?.status === "APPROVED" || intent?.status === "CLOSED";
  const isTerminal = isApproved || intent?.status === "REJECTED" || intent?.status === "EXPIRED";

  const statusText = useMemo(() => {
    if (!intent) return "Preparing payment intent";
    if (intent.status === "APPROVED" || intent.status === "CLOSED") return "Payment approved";
    if (intent.status === "REJECTED") return "Payment rejected";
    if (intent.status === "EXPIRED") return "Payment expired. Try again";
    if (waitingForAdmin || intent.status === "SCREENSHOT_SENT") return "Waiting for admin approval";
    if (isExpired) return "Payment window expired. Try again";
    return "Complete payment and confirm for admin approval (screenshot optional)";
  }, [intent, isExpired, waitingForAdmin]);

  const loadIntent = async (options: { redirectOnApprove?: boolean } = {}) => {
    const token = getPartnerToken();
    if (!token || !intentId) return;

    try {
      const result = await getLeadUnlockIntent(token, intentId);
      setIntent(result.intent);
      if (result.intent.expiresAt) {
        const expiresAtMs = new Date(result.intent.expiresAt).getTime();
        if (!Number.isNaN(expiresAtMs)) {
          setQrVisibleUntil(expiresAtMs);
          setRemainingMs(expiresAtMs - Date.now());
        }
      }
      if (result.intent.status === "SCREENSHOT_SENT") setWaitingForAdmin(true);
      if ((result.intent.status === "APPROVED" || result.intent.status === "CLOSED") && options.redirectOnApprove) {
        toast.success("Payment approved. Lead details unlocked.");
        await navigate({ to: "/Lead-bucket-details", search: { leadId: result.intent.leadId || leadId } });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to load payment intent.");
    }
  };

  useEffect(() => {
    const token = getPartnerToken();
    if (token) {
      activateRoleSession("partner");
    } else {
      const activeRole = getActiveRole();
      if (activeRole === "user") {
        void navigate({ to: "/user" });
        return;
      }
      if (activeRole === "admin") {
        void navigate({ to: "/admin" });
        return;
      }

      toast.error("Please login as partner first.");
      void navigate({ to: "/partner" });
      return;
    }
    if (!intentId || !leadId) {
      toast.error("Missing lead payment intent.");
      void navigate({ to: "/Lead-bucket" });
      return;
    }

    setLoading(true);
    void loadIntent().finally(() => setLoading(false));
  }, [intentId, leadId, navigate]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setRemainingMs(qrVisibleUntil - Date.now());
    }, 1000);
    return () => window.clearInterval(timer);
  }, [qrVisibleUntil]);

  useEffect(() => {
    if (!intentId || isTerminal) return;
    const poller = window.setInterval(() => {
      void loadIntent({ redirectOnApprove: true });
    }, 5000);
    return () => window.clearInterval(poller);
  }, [intentId, isTerminal]);

  useEffect(() => {
    if (intent?.status === "EXPIRED" && !expiredNotified) {
      toast.error("Payment expired. Please try again.");
      setExpiredNotified(true);
      return;
    }
    if (intent?.status && intent.status !== "EXPIRED") {
      setExpiredNotified(false);
    }
  }, [intent?.status, expiredNotified]);

  useEffect(() => {
    if (intent?.status === "REJECTED" && !rejectedNotified) {
      toast.error("Payment rejected. Please try again.");
      setRejectedNotified(true);
      return;
    }
    if (intent?.status && intent.status !== "REJECTED") {
      setRejectedNotified(false);
    }
  }, [intent?.status, rejectedNotified]);

  const handleConfirmPayment = async () => {
    const token = getPartnerToken();
    if (!token || !intentId) return;

    activateRoleSession("partner");

    if (isExpired) {
      toast.error("Payment window expired. Please unlock this lead again.");
      return;
    }

    setLoading(true);
    try {
      const result = await markLeadUnlockScreenshotSent(token, intentId);
      setIntent(result.intent);
      setWaitingForAdmin(true);
      toast.success("Payment confirmation sent. Screenshot is optional. Waiting for admin approval.");
      await navigate({ to: "/Lead-bucket" });
    } catch (err) {
      setWaitingForAdmin(false);
      toast.error(err instanceof Error ? err.message : "Unable to confirm payment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="partner-simple-page">
      <section className="partner-simple-card partner-lead-card" style={{ maxWidth: 680 }}>
        <h1>Unlock Lead Payment</h1>
        <p className="lead-hint">Order ID: {intent?.id ? intent.id.slice(0, 8) : intentId.slice(0, 8)} | Lead ID: {leadId.slice(0, 8)}</p>
        <p className="lead-hint">Amount: Rs. {intent?.unlockPrice || "-"} | {statusText}</p>

        <section className="lead-demo-panel" style={{ textAlign: "center" }}>
          <div style={{ position: "relative", display: "inline-block", maxWidth: 320, width: "100%" }}>
            <img
              src="/Leadpay.jpeg"
              alt="Lead payment QR"
              style={{ width: "100%", borderRadius: 8, filter: isExpired ? "blur(10px) grayscale(1)" : "none", opacity: isExpired ? 0.45 : 1 }}
            />
            {isExpired ? (
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontWeight: 700 }}>
                QR Expired
              </div>
            ) : null}
          </div>

          <h2 style={{ marginTop: 16 }}>{formatRemaining(remainingMs)}</h2>
          <p className="lead-hint">Payment window closes after {QR_DISPLAY_MINUTES} minutes.</p>

          <div className="lead-decision-row" style={{ justifyContent: "center" }}>
            {isExpired || intent?.status === "REJECTED" ? (
              <button
                type="button"
                className="lead-book-btn"
                onClick={() => {
                  void navigate({ to: "/Lead-bucket" });
                }}
                disabled={loading || isApproved}
              >
                Try Again
              </button>
            ) : null}
            <button type="button" className="lead-book-btn" onClick={handleConfirmPayment} disabled={loading || isApproved || intent?.status === "REJECTED" || isBackendExpired || isExpired || isAwaitingAdmin}>
              {loading ? "Confirming..." : "Confirm Payment (Screenshot Optional)"}
            </button>
          </div>

          {waitingForAdmin || intent?.status === "SCREENSHOT_SENT" ? (
            <p className="lead-hint">Waiting for admin approval.</p>
          ) : null}

          {isApproved ? (
            <Link to="/Lead-bucket-details" search={{ leadId: intent?.leadId || leadId }} className="lead-view-btn lead-view-link">
              View Details
            </Link>
          ) : null}
        </section>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
          <Link to="/Lead-bucket" className="partner-simple-link">Back to Lead Bucket</Link>
        </div>
      </section>
    </main>
  );
}