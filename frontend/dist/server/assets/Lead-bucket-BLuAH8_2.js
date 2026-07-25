import { r as getActiveRole } from "./role-session-C7kgx143.js";
import { F as listPartnerLeadBucket, a as claimPartnerLead, it as updatePartnerLeadStatus, y as getPartnerCoinBalance } from "./gadgetpe-client-Cg3AtJY8.js";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/Lead-bucket.tsx?tsr-split=component
var PAGE_SIZE = 25;
var PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
var PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function formatSlot(dateValue, timeValue) {
	if (!dateValue && !timeValue) return "-";
	if (!dateValue && timeValue) return timeValue;
	const parsed = dateValue ? new Date(dateValue) : null;
	const dateText = parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleDateString("en-IN") : dateValue || "-";
	return timeValue ? `${dateText} ${timeValue}` : dateText;
}
function decodeJwtSub(token) {
	try {
		const parts = token.split(".");
		if (parts.length < 2) return null;
		let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
		while (payload.length % 4 !== 0) payload += "=";
		const parsed = JSON.parse(window.atob(payload));
		return typeof parsed.sub === "string" ? parsed.sub : null;
	} catch {
		return null;
	}
}
function LeadBucketPage() {
	const navigate = useNavigate();
	const [page, setPage] = useState(1);
	const [leads, setLeads] = useState([]);
	const [loading, setLoading] = useState(false);
	const [scopePincode, setScopePincode] = useState("");
	const [acceptingLeadId, setAcceptingLeadId] = useState(null);
	const [currentPartnerId, setCurrentPartnerId] = useState("");
	const loadLeadBucket = useCallback(async (token, pincode) => {
		setLoading(true);
		try {
			setLeads((await listPartnerLeadBucket(token, {
				pincode,
				limit: 100
			})).rows);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to load lead bucket.");
		} finally {
			setLoading(false);
		}
	}, []);
	useEffect(() => {
		const activeRole = getActiveRole();
		if (activeRole === "user") {
			navigate({ to: "/user" });
			return;
		}
		if (activeRole === "admin") {
			navigate({ to: "/admin" });
			return;
		}
		const raw = localStorage.getItem(PARTNER_SCOPE_KEY);
		const token = localStorage.getItem(PARTNER_TOKEN_KEY);
		if (!raw) {
			toast.error("Select an ACTIVE pincode on Partner page first.");
			window.location.href = "/partner-page";
			return;
		}
		if (!token) {
			toast.error("Please login as partner first.");
			window.location.href = "/partner";
			return;
		}
		const sub = decodeJwtSub(token);
		if (sub) setCurrentPartnerId(sub);
		(async () => {
			try {
				const scope = JSON.parse(raw);
				if (scope.serviceabilityStatus !== "ACTIVE") {
					toast.error("Current pincode is not ACTIVE. Lead Bucket is blocked.");
					window.location.href = "/partner-page";
					return;
				}
				if ((await getPartnerCoinBalance(token)).balance <= 0) {
					toast.error("Wallet recharge is required to access Lead Bucket.");
					window.location.href = "/partner-page";
					return;
				}
				const pincode = scope.pincode || "";
				setScopePincode(pincode);
				await loadLeadBucket(token, pincode);
			} catch {
				toast.error("Invalid tenant scope. Please select pincode again.");
				window.location.href = "/partner-page";
			}
		})();
	}, [navigate, loadLeadBucket]);
	const canAcceptLead = useCallback((lead) => {
		if (lead.status === "AVAILABLE") return true;
		if (lead.status === "CLAIMED" && currentPartnerId && lead.partnerId === currentPartnerId) return true;
		return false;
	}, [currentPartnerId]);
	const getAcceptLabel = useCallback((lead, isAccepting) => {
		if (isAccepting) return "Accepting...";
		if (lead.status === "AVAILABLE") return "Accept";
		if (lead.status === "CLAIMED") {
			if (currentPartnerId && lead.partnerId === currentPartnerId) return "Accept";
			return "Claimed";
		}
		if (lead.status === "ACCEPTED") return "Accepted";
		if (lead.status === "IN_PROGRESS") return "In Progress";
		if (lead.status === "COMPLETED") return "Completed";
		if (lead.status === "REJECTED") return "Rejected";
		if (lead.status === "CANCELLED") return "Cancelled";
		return "Accept";
	}, [currentPartnerId]);
	const handleAccept = useCallback(async (lead) => {
		const token = localStorage.getItem(PARTNER_TOKEN_KEY);
		if (!token) {
			toast.error("Please login as partner first.");
			window.location.href = "/partner";
			return;
		}
		if (!scopePincode) {
			toast.error("Select an ACTIVE pincode on Partner page first.");
			window.location.href = "/partner-page";
			return;
		}
		setAcceptingLeadId(lead.id);
		try {
			if (lead.status === "AVAILABLE") {
				await claimPartnerLead(token, lead.id);
				await updatePartnerLeadStatus(token, lead.id, { status: "ACCEPTED" });
			} else if (lead.status === "CLAIMED") {
				const partnerId = currentPartnerId || decodeJwtSub(token);
				if (!partnerId || lead.partnerId !== partnerId) {
					toast.error("Only the claiming partner can accept this lead.");
					return;
				}
				await updatePartnerLeadStatus(token, lead.id, { status: "ACCEPTED" });
			} else if (lead.status === "ACCEPTED") {
				toast.error("This lead is already accepted.");
				return;
			} else if (lead.status === "IN_PROGRESS") {
				toast.error("This lead is already in progress.");
				return;
			} else if (lead.status === "COMPLETED") {
				toast.error("This lead is already completed.");
				return;
			} else if (lead.status === "REJECTED") {
				toast.error("This lead has been rejected.");
				return;
			} else if (lead.status === "CANCELLED") {
				toast.error("This lead has been cancelled.");
				return;
			} else {
				toast.error("Only AVAILABLE or your CLAIMED leads can be accepted.");
				return;
			}
			toast.success("Lead accepted.");
			await loadLeadBucket(token, scopePincode);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to accept lead.");
		} finally {
			setAcceptingLeadId(null);
		}
	}, [
		scopePincode,
		currentPartnerId,
		loadLeadBucket
	]);
	const totalPages = Math.max(1, Math.ceil(leads.length / PAGE_SIZE));
	const safePage = useMemo(() => Math.min(page, totalPages), [page, totalPages]);
	const start = (safePage - 1) * PAGE_SIZE;
	const end = start + PAGE_SIZE;
	const pageRows = leads.slice(start, end);
	return /* @__PURE__ */ jsx("main", {
		className: "partner-simple-page lead-bucket-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "partner-simple-card partner-lead-card lead-bucket-card",
			children: [
				/* @__PURE__ */ jsx("h1", { children: "Lead Bucket" }),
				/* @__PURE__ */ jsxs("p", { children: [
					"Showing ",
					leads.length === 0 ? 0 : start + 1,
					" - ",
					Math.min(end, leads.length),
					" of ",
					leads.length,
					" leads"
				] }),
				/* @__PURE__ */ jsxs("p", {
					className: "lead-hint lead-bucket-hint",
					children: [
						"Quote-ready leads for pincode ",
						scopePincode || "-",
						"."
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap lead-bucket-table-wrap",
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Model" }),
							/* @__PURE__ */ jsx("th", { children: "Seller" }),
							/* @__PURE__ */ jsx("th", { children: "Phone" }),
							/* @__PURE__ */ jsx("th", { children: "City" }),
							/* @__PURE__ */ jsx("th", { children: "Pincode" }),
							/* @__PURE__ */ jsx("th", { children: "Quote" }),
							/* @__PURE__ */ jsx("th", { children: "Primary Pickup" }),
							/* @__PURE__ */ jsx("th", { children: "Alternate Pickup" }),
							/* @__PURE__ */ jsx("th", { children: "Status" }),
							/* @__PURE__ */ jsx("th", { children: "Actions" })
						] }) }), /* @__PURE__ */ jsx("tbody", { children: pageRows.length > 0 ? pageRows.map((row, index) => {
							const canAccept = canAcceptLead(row);
							const isAccepting = acceptingLeadId === row.id;
							const acceptLabel = getAcceptLabel(row, isAccepting);
							return /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", {
									"data-label": "Model",
									children: row.selectedModel.modelName
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Seller",
									children: row.seller.name || "-"
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Phone",
									children: row.seller.phone || "-"
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "City",
									children: row.seller.city || row.city || "-"
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Pincode",
									children: row.pincode
								}),
								/* @__PURE__ */ jsxs("td", {
									"data-label": "Quote",
									children: ["Rs. ", formatInr(row.quote?.sellingPrice ?? row.selectedModel.listedPrice ?? 0)]
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Primary Pickup",
									children: formatSlot(row.pickupSchedule?.primaryDate, row.pickupSchedule?.primaryTime)
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Alternate Pickup",
									children: formatSlot(row.pickupSchedule?.alternateDate, row.pickupSchedule?.alternateTime)
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Status",
									children: row.status
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Actions",
									className: "lead-bucket-action-cell",
									children: /* @__PURE__ */ jsxs("div", {
										className: "lead-decision-row lead-bucket-action-row",
										style: { marginTop: 0 },
										children: [/* @__PURE__ */ jsx("button", {
											type: "button",
											className: "lead-book-btn lead-bucket-accept-btn",
											onClick: () => {
												handleAccept(row);
											},
											disabled: isAccepting,
											title: !canAccept && !isAccepting ? `Not actionable in ${row.status} state` : void 0,
											children: acceptLabel
										}), /* @__PURE__ */ jsx(Link, {
											to: "/Lead-bucket-details",
											search: { leadId: row.id },
											className: "lead-view-btn lead-view-link lead-bucket-details-btn",
											children: "View Details"
										})]
									})
								})
							] }, `${row.id}-${index}`);
						}) : /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 10,
							children: loading ? "Loading lead bucket..." : "No lead bucket data available."
						}) }) })]
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-pagination lead-bucket-pagination",
					"aria-label": "Lead table pagination",
					children: [
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setPage((prev) => Math.max(1, prev - 1)),
							disabled: safePage === 1,
							children: "Prev"
						}),
						/* @__PURE__ */ jsxs("span", { children: [
							"Page ",
							safePage,
							" of ",
							totalPages
						] }),
						/* @__PURE__ */ jsx("button", {
							type: "button",
							onClick: () => setPage((prev) => Math.min(totalPages, prev + 1)),
							disabled: safePage === totalPages,
							children: "Next"
						})
					]
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/partner-page",
					className: "partner-simple-link",
					children: "Back to Partner Page"
				})
			]
		})
	});
}
//#endregion
export { LeadBucketPage as component };
