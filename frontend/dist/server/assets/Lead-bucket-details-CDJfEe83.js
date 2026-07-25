import { r as getActiveRole } from "./role-session-C7kgx143.js";
import { S as getPartnerLead, a as claimPartnerLead, it as updatePartnerLeadStatus } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/Lead-bucket-details.tsx?tsr-split=component
var PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function formatDate(value) {
	if (!value) return "-";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return value;
	return date.toLocaleDateString();
}
function toTitleCase(input) {
	return input.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_.-]+/g, " ").replace(/\s+/g, " ").trim().replace(/^./, (ch) => ch.toUpperCase());
}
function flattenDetails(value, prefix = "") {
	const rows = [];
	const renderPrimitive = (v) => {
		if (v === null || v === void 0 || v === "") return "-";
		if (typeof v === "boolean") return v ? "Yes" : "No";
		if (typeof v === "number") return String(v);
		return String(v);
	};
	if (Array.isArray(value)) {
		if (value.length === 0) {
			rows.push({
				key: prefix || "Value",
				value: "-"
			});
			return rows;
		}
		value.forEach((item, index) => {
			const nextPrefix = prefix ? `${prefix} / ${index + 1}` : String(index + 1);
			rows.push(...flattenDetails(item, nextPrefix));
		});
		return rows;
	}
	if (value && typeof value === "object") {
		const entries = Object.entries(value);
		if (entries.length === 0) {
			rows.push({
				key: prefix || "Value",
				value: "-"
			});
			return rows;
		}
		for (const [key, item] of entries) {
			const label = toTitleCase(key);
			const nextPrefix = prefix ? `${prefix} / ${label}` : label;
			if (item && typeof item === "object") rows.push(...flattenDetails(item, nextPrefix));
			else rows.push({
				key: nextPrefix,
				value: renderPrimitive(item)
			});
		}
		return rows;
	}
	rows.push({
		key: prefix || "Value",
		value: renderPrimitive(value)
	});
	return rows;
}
function LeadBucketDetailsPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/Lead-bucket-details" });
	const [lead, setLead] = useState(null);
	const [loading, setLoading] = useState(false);
	const [accepting, setAccepting] = useState(false);
	const leadId = search.leadId || "";
	const loadLead = async () => {
		const activeRole = getActiveRole();
		if (activeRole === "user") {
			await navigate({ to: "/user" });
			return;
		}
		if (activeRole === "admin") {
			await navigate({ to: "/admin" });
			return;
		}
		const token = localStorage.getItem(PARTNER_TOKEN_KEY);
		if (!token || !leadId) return;
		setLoading(true);
		try {
			setLead((await getPartnerLead(token, leadId)).lead);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to load lead details.");
		} finally {
			setLoading(false);
		}
	};
	useEffect(() => {
		loadLead();
	}, [leadId]);
	const acceptEnabled = useMemo(() => Boolean(lead && (lead.status === "AVAILABLE" || lead.status === "CLAIMED")), [lead]);
	const acceptButtonLabel = useMemo(() => {
		if (accepting) return "Accepting...";
		if (!lead) return "Accept Lead";
		if (lead.status === "ACCEPTED") return "Already Accepted";
		if (lead.status === "IN_PROGRESS") return "In Progress";
		if (lead.status === "COMPLETED") return "Completed";
		if (lead.status === "REJECTED") return "Rejected";
		if (lead.status === "CANCELLED") return "Cancelled";
		return "Accept Lead";
	}, [accepting, lead]);
	const deviceRows = useMemo(() => flattenDetails(lead?.deviceDetails || {}), [lead?.deviceDetails]);
	const handleAccept = async () => {
		const token = localStorage.getItem(PARTNER_TOKEN_KEY);
		if (!token || !lead || accepting) return;
		if (lead.status !== "AVAILABLE" && lead.status !== "CLAIMED") return;
		setAccepting(true);
		try {
			let currentLead = lead;
			if (currentLead.status === "AVAILABLE") currentLead = (await claimPartnerLead(token, currentLead.id)).lead;
			if (currentLead.status === "CLAIMED") currentLead = (await updatePartnerLeadStatus(token, currentLead.id, { status: "ACCEPTED" })).lead;
			setLead(currentLead);
			toast.success("Lead accepted.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to accept lead.");
		} finally {
			setAccepting(false);
		}
	};
	return /* @__PURE__ */ jsx("main", {
		className: "partner-simple-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "partner-simple-card partner-lead-card",
			children: [
				/* @__PURE__ */ jsx("h1", { children: "Lead Bucket Details" }),
				/* @__PURE__ */ jsx("p", { children: lead ? `${lead.selectedModel.modelName} | ${lead.pincode}` : loading ? "Loading lead details..." : "Open a lead from Lead Bucket." }),
				/* @__PURE__ */ jsxs("section", {
					className: "lead-demo-panel",
					children: [
						/* @__PURE__ */ jsx("h2", { children: lead?.selectedModel.modelName || "No lead selected" }),
						lead ? /* @__PURE__ */ jsxs(Fragment, { children: [
							/* @__PURE__ */ jsxs("p", {
								className: "lead-hint",
								children: [
									"Status: ",
									lead.status,
									" | Quote: Rs. ",
									formatInr(lead.quote?.sellingPrice ?? lead.selectedModel.listedPrice ?? 0)
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-demo-meta",
								children: [
									/* @__PURE__ */ jsxs("span", { children: ["Seller: ", lead.seller.name || "-"] }),
									/* @__PURE__ */ jsxs("span", { children: ["Phone: ", lead.seller.phone || "-"] }),
									/* @__PURE__ */ jsxs("span", { children: ["Pincode: ", lead.pincode] }),
									/* @__PURE__ */ jsxs("span", { children: ["City: ", lead.seller.city || "-"] }),
									/* @__PURE__ */ jsxs("span", { children: ["Address: ", lead.seller.addressLine || "-"] }),
									/* @__PURE__ */ jsxs("span", { children: ["Landmark: ", lead.seller.landmark || "-"] })
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-demo-meta",
								children: [
									/* @__PURE__ */ jsxs("span", { children: [
										"Primary Slot: ",
										formatDate(lead.pickupSchedule?.primaryDate),
										" ",
										lead.pickupSchedule?.primaryTime || ""
									] }),
									/* @__PURE__ */ jsxs("span", { children: [
										"Alternate Slot: ",
										formatDate(lead.pickupSchedule?.alternateDate),
										" ",
										lead.pickupSchedule?.alternateTime || ""
									] }),
									/* @__PURE__ */ jsxs("span", { children: ["Pickup Contact: ", lead.pickupSchedule?.sellerName || lead.seller.name || "-"] }),
									/* @__PURE__ */ jsxs("span", { children: ["Pickup Number: ", lead.pickupSchedule?.callingPhoneNumber || lead.seller.phone || "-"] }),
									/* @__PURE__ */ jsxs("span", { children: ["Pickup Address: ", lead.pickupSchedule?.addressLine || lead.seller.addressLine || "-"] })
								]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "lead-demo-meta",
								children: (lead.quote?.deductions || []).map((deduction) => /* @__PURE__ */ jsxs("span", { children: [
									deduction.label,
									": -Rs. ",
									formatInr(Math.round(deduction.deductionAmount))
								] }, deduction.ruleId))
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-booking-box",
								children: [/* @__PURE__ */ jsx("h3", { children: "Full Device Details" }), /* @__PURE__ */ jsx("div", {
									className: "lead-device-table-wrap",
									children: /* @__PURE__ */ jsxs("table", {
										className: "lead-device-table",
										"aria-label": "Full device details",
										children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("th", { children: "Field" }), /* @__PURE__ */ jsx("th", { children: "Value" })] }) }), /* @__PURE__ */ jsx("tbody", { children: deviceRows.map((row, index) => /* @__PURE__ */ jsxs("tr", { children: [/* @__PURE__ */ jsx("td", { children: row.key }), /* @__PURE__ */ jsx("td", { children: row.value })] }, `${row.key}-${index}`)) })]
									})
								})]
							})
						] }) : /* @__PURE__ */ jsx("p", {
							className: "lead-hint",
							children: "Please open a lead from Lead Bucket."
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-booking-box",
							children: [
								/* @__PURE__ */ jsx("h3", { children: "Partner Actions" }),
								/* @__PURE__ */ jsx("p", {
									className: "lead-hint",
									children: "Pickup schedule is set by user and read-only for partners."
								}),
								!acceptEnabled && lead ? /* @__PURE__ */ jsxs("p", {
									className: "lead-hint",
									children: ["This lead cannot be accepted in current status: ", lead.status]
								}) : null,
								/* @__PURE__ */ jsx("div", {
									className: "lead-decision-row",
									children: /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "lead-book-btn",
										onClick: handleAccept,
										disabled: !acceptEnabled || accepting,
										children: acceptButtonLabel
									})
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/Lead-bucket",
					className: "partner-simple-link",
					children: "Back to Lead Bucket"
				})
			]
		})
	});
}
//#endregion
export { LeadBucketDetailsPage as component };
