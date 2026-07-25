import { K as rechargePartnerCoins, N as listPartnerCoinLedger, P as listPartnerCoinRechargeRequests, t as ApiClientError, y as getPartnerCoinBalance } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, QrCode, Smartphone } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/partner-page.coins.tsx?tsr-split=component
var UPI_ID = "gadgetpe@upi";
var DEFAULT_RECHARGE_AMOUNT = 500;
function PartnerCoinsRechargePage() {
	const navigate = useNavigate();
	const [txnRef, setTxnRef] = useState(() => `GP${Date.now()}`);
	const [busy, setBusy] = useState(false);
	const [walletBalance, setWalletBalance] = useState(0);
	const [ledgerRows, setLedgerRows] = useState([]);
	const [rechargeRequests, setRechargeRequests] = useState([]);
	const [secondsLeft, setSecondsLeft] = useState(60);
	const [showWaitingApprovalModal, setShowWaitingApprovalModal] = useState(false);
	const numericAmount = DEFAULT_RECHARGE_AMOUNT;
	const upiLink = useMemo(() => {
		return `upi://pay?${new URLSearchParams({
			pa: UPI_ID,
			pn: "GadgetPe Coins",
			tr: txnRef,
			tn: "Partner Coins Recharge",
			am: String(numericAmount),
			cu: "INR"
		}).toString()}`;
	}, [numericAmount, txnRef]);
	useEffect(() => {
		if (secondsLeft <= 0) return;
		const timer = window.setInterval(() => {
			setSecondsLeft((prev) => prev <= 1 ? 0 : prev - 1);
		}, 1e3);
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
					listPartnerCoinRechargeRequests(token, { limit: 10 })
				]);
				setWalletBalance(balance.balance);
				setLedgerRows(ledger.rows);
				setRechargeRequests(requests.rows);
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unable to load coin wallet.";
				toast.error(message);
			}
		};
		loadCoinsState();
	}, [navigate]);
	const handleRecharge = () => {
		const token = localStorage.getItem("gadgetpe_access_token");
		if (!token) {
			toast.error("Please login first.");
			navigate({ to: "/partner" });
			return;
		}
		setBusy(true);
		(async () => {
			try {
				const result = await rechargePartnerCoins(token, {
					amount: numericAmount,
					upiTxnRef: txnRef,
					upiApp: "MOCK_UPI"
				});
				const [balance, ledger, requests] = await Promise.all([
					getPartnerCoinBalance(token),
					listPartnerCoinLedger(token),
					listPartnerCoinRechargeRequests(token, { limit: 10 })
				]);
				setWalletBalance(balance.balance);
				setLedgerRows(ledger.rows);
				setRechargeRequests(requests.rows);
				toast.success(result.message);
				setShowWaitingApprovalModal(true);
			} catch (err) {
				if (err instanceof ApiClientError) toast.error(err.message);
				else toast.error("Recharge failed.");
				return;
			}
			setTxnRef(`GP${Date.now()}`);
			resetTimer();
		})().finally(() => setBusy(false));
	};
	return /* @__PURE__ */ jsxs("main", {
		className: "partner-simple-page partner-coin-page",
		children: [/* @__PURE__ */ jsxs("section", {
			className: "partner-coin-page-card",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "partner-coin-page-head",
					children: [
						/* @__PURE__ */ jsxs(Link, {
							to: "/partner-page",
							className: "partner-coin-back-btn",
							children: [/* @__PURE__ */ jsx(ArrowLeft, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Back to Dashboard" })]
						}),
						/* @__PURE__ */ jsx("h1", { children: "Recharge Coins" }),
						/* @__PURE__ */ jsx("p", { children: "Use UPI to recharge coins and unlock lead access instantly." }),
						/* @__PURE__ */ jsxs("p", { children: [
							"Current Balance: ",
							walletBalance,
							" coins"
						] })
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "partner-coin-grid partner-coin-grid-single",
					children: /* @__PURE__ */ jsxs("article", {
						className: "partner-coin-panel partner-coin-upi-panel",
						children: [
							/* @__PURE__ */ jsxs("h2", { children: [/* @__PURE__ */ jsx(Smartphone, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "UPI Checkout" })] }),
							/* @__PURE__ */ jsxs("div", {
								className: `partner-coin-timer${secondsLeft <= 10 ? " low" : ""}`,
								children: [
									"QR session expires in ",
									secondsLeft,
									"s"
								]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "partner-coin-qr-wrap",
								children: /* @__PURE__ */ jsx("img", {
									src: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiLink)}`,
									alt: "Dummy UPI QR code",
									className: "partner-coin-qr-image"
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "partner-coin-upi-box",
								children: [/* @__PURE__ */ jsx("p", { children: "UPI ID" }), /* @__PURE__ */ jsx("strong", { children: UPI_ID })]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "partner-coin-upi-box",
								children: [/* @__PURE__ */ jsx("p", { children: "Amount to Pay" }), /* @__PURE__ */ jsxs("strong", { children: ["Rs. ", numericAmount] })]
							}),
							/* @__PURE__ */ jsxs("a", {
								href: upiLink,
								className: "partner-coin-pay-btn",
								children: [/* @__PURE__ */ jsx(QrCode, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Open UPI App" })]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "partner-coin-confirm-btn",
								onClick: handleRecharge,
								disabled: busy,
								children: busy ? "Confirming..." : "Payment Complete"
							}),
							/* @__PURE__ */ jsx("p", {
								className: "partner-coin-note",
								children: "Dummy QR flow: after clicking Payment Complete, request moves to admin verification queue."
							}),
							secondsLeft === 0 ? /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "partner-coin-back-btn",
								onClick: resetTimer,
								children: "Regenerate 60s QR Session"
							}) : null
						]
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "partner-coin-ledger-block",
					children: [/* @__PURE__ */ jsx("h3", { children: "Recharge Request Status" }), /* @__PURE__ */ jsxs("div", {
						className: "partner-coin-ledger-list",
						children: [rechargeRequests.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No recharge requests yet." }) : null, rechargeRequests.map((row) => /* @__PURE__ */ jsxs("div", {
							className: "partner-coin-ledger-item",
							children: [
								/* @__PURE__ */ jsxs("strong", { children: [
									"Rs. ",
									row.amount,
									" | ",
									row.status
								] }),
								/* @__PURE__ */ jsxs("span", { children: [
									"Ref: ",
									row.upiTxnRef,
									" · ",
									row.upiApp || "UPI"
								] }),
								/* @__PURE__ */ jsx("span", { children: new Date(row.requestedAt).toLocaleString() })
							]
						}, row.id))]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "partner-coin-ledger-block",
					children: [/* @__PURE__ */ jsx("h3", { children: "Recent Coin Transactions" }), /* @__PURE__ */ jsxs("div", {
						className: "partner-coin-ledger-list",
						children: [ledgerRows.length === 0 ? /* @__PURE__ */ jsx("p", { children: "No coin transactions yet." }) : null, ledgerRows.map((row) => /* @__PURE__ */ jsxs("div", {
							className: "partner-coin-ledger-item",
							children: [
								/* @__PURE__ */ jsxs("strong", { children: [
									row.txnType === "CREDIT" ? "+" : "-",
									row.amount,
									" coins"
								] }),
								/* @__PURE__ */ jsxs("span", { children: [
									row.method,
									" | Ref: ",
									row.reference || "N/A"
								] }),
								/* @__PURE__ */ jsx("span", { children: new Date(row.createdAt).toLocaleString() })
							]
						}, row.id))]
					})]
				})
			]
		}), showWaitingApprovalModal ? /* @__PURE__ */ jsx("div", {
			className: "partner-modal-backdrop",
			role: "dialog",
			"aria-modal": "true",
			"aria-label": "Waiting for admin approval",
			children: /* @__PURE__ */ jsxs("section", {
				className: "partner-modal-card",
				children: [
					/* @__PURE__ */ jsx("h2", { children: "Waiting for Admin Approval" }),
					/* @__PURE__ */ jsx("p", { children: "Dear Partner, your wallet recharge request has been submitted successfully. Admin verification ke baad coins credit honge." }),
					/* @__PURE__ */ jsx("div", {
						className: "partner-modal-actions",
						children: /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "partner-submit-btn",
							onClick: () => {
								setShowWaitingApprovalModal(false);
								navigate({ to: "/partner-page" });
							},
							children: "OK"
						})
					})
				]
			})
		}) : null]
	});
}
//#endregion
export { PartnerCoinsRechargePage as component };
