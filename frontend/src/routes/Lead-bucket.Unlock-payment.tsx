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
const WHATSAPP_SCREENSHOT_URL = "https://api.whatsapp.com/send/?phone=919311125745&text&type=phone";
const QR_DISPLAY_MS = 4 * 60 * 1000;

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

  const intentId = search.intentId || "";
  const leadId = search.leadId || "";
  const isExpired = remainingMs <= 0;
  const isApproved = intent?.status === "APPROVED" || intent?.status === "CLOSED";

  const statusText = useMemo(() => {
    if (!intent) return "Preparing payment intent";
    if (intent.status === "APPROVED" || intent.status === "CLOSED") return "Payment approved";
    if (intent.status === "REJECTED") return "Payment rejected";
    if (isExpired) return "QR expired";
    if (waitingForAdmin || intent.status === "SCREENSHOT_SENT") return "Waiting for admin approval";
    return "Complete payment and send screenshot to admin";
  }, [intent, isExpired, waitingForAdmin]);

  const loadIntent = async (options: { redirectOnApprove?: boolean } = {}) => {
    const token = getPartnerToken();
    if (!token || !intentId) return;

    try {
      const result = await getLeadUnlockIntent(token, intentId);
      setIntent(result.intent);
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
    if (!intentId || isApproved) return;
    const poller = window.setInterval(() => {
      void loadIntent({ redirectOnApprove: true });
    }, 5000);
    return () => window.clearInterval(poller);
  }, [intentId, isApproved]);

  const handleSendScreenshot = async () => {
    const token = getPartnerToken();
    if (!token || !intentId) return;

    activateRoleSession("partner");

    window.open(WHATSAPP_SCREENSHOT_URL, "_blank", "noopener,noreferrer");
    setWaitingForAdmin(true);
    try {
      const result = await markLeadUnlockScreenshotSent(token, intentId);
      setIntent(result.intent);
      toast.success("Screenshot marked as sent. Waiting for admin approval.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to mark screenshot as sent.");
    }
  };

  const handleReshowQr = () => {
    const nextVisibleUntil = Date.now() + QR_DISPLAY_MS;
    setQrVisibleUntil(nextVisibleUntil);
    setRemainingMs(QR_DISPLAY_MS);
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
          <p className="lead-hint">QR will be masked after 4 minutes.</p>

          <div className="lead-decision-row" style={{ justifyContent: "center" }}>
            {isExpired ? (
              <button type="button" className="lead-book-btn" onClick={handleReshowQr} disabled={isApproved || intent?.status === "REJECTED"}>
                Re-show QR
              </button>
            ) : null}
            <button type="button" className="lead-book-btn" onClick={handleSendScreenshot} disabled={loading || isApproved || intent?.status === "REJECTED"}>
              Send Screenshot to admin
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