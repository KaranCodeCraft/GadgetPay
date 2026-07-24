import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, QrCode, Smartphone } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ApiClientError,
  getPartnerCoinBalance,
  listPartnerCoinRechargeRequests,
  listPartnerCoinLedger,
  rechargePartnerCoins,
  type PartnerCoinRechargeRequestRow,
  type PartnerCoinLedgerRow,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/partner-page/coins")({
  component: PartnerCoinsRechargePage,
});

const UPI_ID = "gadgetpe@upi";
const DEFAULT_RECHARGE_AMOUNT = 500;

function PartnerCoinsRechargePage() {
  const navigate = useNavigate();
  const [txnRef, setTxnRef] = useState(() => `GP${Date.now()}`);
  const [busy, setBusy] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [ledgerRows, setLedgerRows] = useState<PartnerCoinLedgerRow[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<PartnerCoinRechargeRequestRow[]>([]);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [showWaitingApprovalModal, setShowWaitingApprovalModal] = useState(false);

  const numericAmount = DEFAULT_RECHARGE_AMOUNT;

  const upiLink = useMemo(() => {
    if (!numericAmount) return "#";
    const params = new URLSearchParams({
      pa: UPI_ID,
      pn: "GadgetPe Coins",
      tr: txnRef,
      tn: "Partner Coins Recharge",
      am: String(numericAmount),
      cu: "INR",
    });
    return `upi://pay?${params.toString()}`;
  }, [numericAmount, txnRef]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  const resetTimer = () => setSecondsLeft(60);

  useEffect(() => {
    const loadCoinsState = async () => {
      const token = localStorage.getItem("gadgetpe_access_token");
      if (!token) {
        toast.error("Please login first.");
        await navigate({ to: "/partner" });
        return;
      }

      try {
        const [balance, ledger, requests] = await Promise.all([
          getPartnerCoinBalance(token),
          listPartnerCoinLedger(token),
          listPartnerCoinRechargeRequests(token, { limit: 10 }),
        ]);
        setWalletBalance(balance.balance);
        setLedgerRows(ledger.rows);
        setRechargeRequests(requests.rows);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load coin wallet.";
        toast.error(message);
      }
    };

    void loadCoinsState();
  }, [navigate]);

  const handleRecharge = () => {
    const token = localStorage.getItem("gadgetpe_access_token");
    if (!token) {
      toast.error("Please login first.");
      void navigate({ to: "/partner" });
      return;
    }

    setBusy(true);
    void (async () => {
      try {
        const result = await rechargePartnerCoins(token, {
          amount: numericAmount,
          upiTxnRef: txnRef,
          upiApp: "MOCK_UPI",
        });

        const [balance, ledger, requests] = await Promise.all([
          getPartnerCoinBalance(token),
          listPartnerCoinLedger(token),
          listPartnerCoinRechargeRequests(token, { limit: 10 }),
        ]);

        setWalletBalance(balance.balance);
        setLedgerRows(ledger.rows);
        setRechargeRequests(requests.rows);
        toast.success(result.message);
        setShowWaitingApprovalModal(true);
      } catch (err) {
        if (err instanceof ApiClientError) {
          toast.error(err.message);
        } else {
          toast.error("Recharge failed.");
        }
        return;
      }

      setTxnRef(`GP${Date.now()}`);
      resetTimer();
    })().finally(() => setBusy(false));
  };

  return (
    <main className="partner-simple-page partner-coin-page">
      <section className="partner-coin-page-card">
        <div className="partner-coin-page-head">
          <Link to="/partner-page" className="partner-coin-back-btn">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>
          <h1>Recharge Coins</h1>
          <p>Use UPI to recharge coins and unlock lead access instantly.</p>
          <p>Current Balance: {walletBalance} coins</p>
        </div>

        <div className="partner-coin-grid partner-coin-grid-single">
          <article className="partner-coin-panel partner-coin-upi-panel">
            <h2>
              <Smartphone size={16} />
              <span>UPI Checkout</span>
            </h2>
            <div className={`partner-coin-timer${secondsLeft <= 10 ? " low" : ""}`}>
              QR session expires in {secondsLeft}s
            </div>
            <div className="partner-coin-qr-wrap">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`}
                alt="Dummy UPI QR code"
                className="partner-coin-qr-image"
              />
            </div>
            <div className="partner-coin-upi-box">
              <p>UPI ID</p>
              <strong>{UPI_ID}</strong>
            </div>
            <div className="partner-coin-upi-box">
              <p>Amount to Pay</p>
              <strong>Rs. {numericAmount || 0}</strong>
            </div>

            <a href={upiLink} className="partner-coin-pay-btn">
              <QrCode size={16} />
              <span>Open UPI App</span>
            </a>

            <button type="button" className="partner-coin-confirm-btn" onClick={handleRecharge} disabled={busy}>
              {busy ? "Confirming..." : "Payment Complete"}
            </button>
            <p className="partner-coin-note">
              Dummy QR flow: after clicking Payment Complete, request moves to admin verification queue.
            </p>
            {secondsLeft === 0 ? (
              <button type="button" className="partner-coin-back-btn" onClick={resetTimer}>
                Regenerate 60s QR Session
              </button>
            ) : null}
          </article>
        </div>

        <div className="partner-coin-ledger-block">
          <h3>Recharge Request Status</h3>
          <div className="partner-coin-ledger-list">
            {rechargeRequests.length === 0 ? <p>No recharge requests yet.</p> : null}
            {rechargeRequests.map((row) => (
              <div key={row.id} className="partner-coin-ledger-item">
                <strong>Rs. {row.amount} | {row.status}</strong>
                <span>Ref: {row.upiTxnRef} · {row.upiApp || "UPI"}</span>
                <span>{new Date(row.requestedAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="partner-coin-ledger-block">
          <h3>Recent Coin Transactions</h3>
          <div className="partner-coin-ledger-list">
            {ledgerRows.length === 0 ? <p>No coin transactions yet.</p> : null}
            {ledgerRows.map((row) => (
              <div key={row.id} className="partner-coin-ledger-item">
                <strong>{row.txnType === "CREDIT" ? "+" : "-"}{row.amount} coins</strong>
                <span>{row.method} | Ref: {row.reference || "N/A"}</span>
                <span>{new Date(row.createdAt).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {showWaitingApprovalModal ? (
        <div className="partner-modal-backdrop" role="dialog" aria-modal="true" aria-label="Waiting for admin approval">
          <section className="partner-modal-card">
            <h2>Waiting for Admin Approval</h2>
            <p>
              Dear Partner, your wallet recharge request has been submitted successfully. Admin verification ke baad coins credit honge.
            </p>
            <div className="partner-modal-actions">
              <button
                type="button"
                className="partner-submit-btn"
                onClick={() => {
                  setShowWaitingApprovalModal(false);
                  void navigate({ to: "/partner-page" });
                }}
              >
                OK
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  );
}
