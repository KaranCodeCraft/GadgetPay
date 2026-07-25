import { r as getActiveRole } from "./role-session-C7kgx143.js";
import { S as getPartnerLead, et as submitPartnerPaymentProofMetadata } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/service-Leads/transaction/payment.tsx?tsr-split=component
function ServiceLeadPaymentPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/service-Leads/transaction/payment" });
	const [paymentDone, setPaymentDone] = useState(false);
	const [paymentFile, setPaymentFile] = useState(null);
	const [amountCollected, setAmountCollected] = useState("");
	const [paymentMode, setPaymentMode] = useState("UPI");
	const [transactionRef, setTransactionRef] = useState("");
	const [notes, setNotes] = useState("");
	const [saving, setSaving] = useState(false);
	const [paymentProofUrl, setPaymentProofUrl] = useState(null);
	const PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
	useEffect(() => {
		const activeRole = getActiveRole();
		if (activeRole === "user") {
			navigate({ to: "/user" });
			return;
		}
		if (activeRole === "admin") navigate({ to: "/admin" });
		const token = localStorage.getItem(PARTNER_TOKEN_KEY);
		if (!token || !search.leadId) {
			toast.error("Open this page from transaction flow.");
			navigate({ to: "/service-Leads" });
			return;
		}
		(async () => {
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
			setPaymentProofUrl((await submitPartnerPaymentProofMetadata(token, search.leadId, {
				file: paymentFile,
				amountCollected: Number(amountCollected),
				paymentMode,
				transactionRef: transactionRef.trim() || void 0,
				notes: notes.trim() || void 0
			})).lead.paymentProof?.mediaUrl || null);
			setPaymentDone(true);
			toast.success("Payment proof metadata submitted.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to submit payment proof metadata.");
		} finally {
			setSaving(false);
		}
	};
	return /* @__PURE__ */ jsx("main", {
		className: "partner-simple-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "partner-simple-card partner-lead-card",
			children: [
				/* @__PURE__ */ jsx("h1", { children: "UPI Payment" }),
				/* @__PURE__ */ jsx("p", { children: "Complete UPI payment for the service lead transaction." }),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-upi-box lead-upi-box-page",
					children: [
						/* @__PURE__ */ jsx("h3", { children: "UPI Gateway" }),
						/* @__PURE__ */ jsx("p", { children: "Upload the actual payment proof for the selected lead transaction." }),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-booking-calendar lead-field-stack",
							children: [
								/* @__PURE__ */ jsx("label", {
									htmlFor: "payment-file",
									children: "Payment proof file"
								}),
								/* @__PURE__ */ jsx("input", {
									id: "payment-file",
									type: "file",
									accept: "image/*,.pdf",
									onChange: (event) => setPaymentFile(event.target.files?.[0] ?? null)
								}),
								paymentFile ? /* @__PURE__ */ jsxs("span", {
									className: "lead-hint",
									children: [
										paymentFile.name,
										" | ",
										paymentFile.type || "application/octet-stream",
										" | ",
										paymentFile.size,
										" bytes"
									]
								}) : null
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-booking-calendar lead-field-stack",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "payment-amount",
								children: "Amount paid to user"
							}), /* @__PURE__ */ jsx("input", {
								id: "payment-amount",
								type: "number",
								value: amountCollected,
								onChange: (event) => setAmountCollected(event.target.value)
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-booking-calendar lead-field-stack",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "payment-mode",
								children: "Payment mode"
							}), /* @__PURE__ */ jsxs("select", {
								id: "payment-mode",
								className: "lead-select",
								value: paymentMode,
								onChange: (event) => setPaymentMode(event.target.value),
								children: [
									/* @__PURE__ */ jsx("option", {
										value: "UPI",
										children: "UPI"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "BANK_TRANSFER",
										children: "BANK_TRANSFER"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "CASH",
										children: "CASH"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "OTHER",
										children: "OTHER"
									})
								]
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-booking-calendar lead-field-stack",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "payment-ref",
								children: "Transaction reference"
							}), /* @__PURE__ */ jsx("input", {
								id: "payment-ref",
								type: "text",
								value: transactionRef,
								onChange: (event) => setTransactionRef(event.target.value)
							})]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-booking-calendar lead-field-stack",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "payment-notes",
								children: "Notes"
							}), /* @__PURE__ */ jsx("textarea", {
								id: "payment-notes",
								value: notes,
								onChange: (event) => setNotes(event.target.value),
								className: "lead-textarea"
							})]
						}),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "lead-book-btn",
							onClick: () => {
								handleSubmit();
							},
							disabled: saving || !paymentFile,
							children: saving ? "Submitting..." : "Submit Payment Proof"
						}),
						paymentDone && /* @__PURE__ */ jsx("p", {
							className: "lead-booking-message",
							children: "Payment successful."
						}),
						paymentProofUrl ? /* @__PURE__ */ jsx("p", {
							className: "lead-booking-message",
							children: /* @__PURE__ */ jsx("a", {
								href: paymentProofUrl,
								target: "_blank",
								rel: "noreferrer",
								className: "user-inline-link",
								children: "Open uploaded payment proof"
							})
						}) : null
					]
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/service-Leads/transaction",
					search: { leadId: search.leadId || "" },
					className: "partner-simple-link",
					children: "Back to Transaction"
				})
			]
		})
	});
}
//#endregion
export { ServiceLeadPaymentPage as component };
