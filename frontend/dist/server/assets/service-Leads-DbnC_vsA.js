import { n as clearRoleSession, r as getActiveRole } from "./role-session-C7kgx143.js";
import { I as listPartnerServiceLeads, y as getPartnerCoinBalance } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/service-Leads/index.tsx?tsr-split=component
var TIME_SLOTS = [
	"09:00 AM - 12:00 PM",
	"12:00 PM - 03:00 PM",
	"03:00 PM - 06:00 PM",
	"06:00 PM - 09:00 PM"
];
var PAGE_SIZE = 5;
var PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
var PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
var LEGACY_PARTNER_TOKEN_KEY = "gadgetpe_access_token";
var SERVICE_LEADS_DATE_KEY = "gadgetpe_service_leads_date";
var SERVICE_LEADS_TIME_KEY = "gadgetpe_service_leads_time";
function canUseStorage() {
	return typeof window !== "undefined";
}
function getStored(key) {
	if (!canUseStorage()) return null;
	return window.localStorage.getItem(key);
}
function getPartnerToken() {
	return getStored(PARTNER_TOKEN_KEY) || getStored(LEGACY_PARTNER_TOKEN_KEY);
}
function forcePartnerLoginRedirect() {
	if (!canUseStorage()) return;
	clearRoleSession("partner");
	window.localStorage.removeItem(PARTNER_SCOPE_KEY);
	window.location.assign("/partner");
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function isTodayPickup(lead, selectedDate) {
	const primary = lead.pickupSchedule?.primaryDate;
	return Boolean(primary && primary.slice(0, 10) === selectedDate);
}
function ServiceLeadsPage() {
	const navigate = useNavigate();
	const [selectedDate, setSelectedDate] = useState(() => getStored(SERVICE_LEADS_DATE_KEY) || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
	const [selectedTime, setSelectedTime] = useState(() => getStored(SERVICE_LEADS_TIME_KEY) || "All");
	const [page, setPage] = useState(1);
	const [leads, setLeads] = useState([]);
	const [loading, setLoading] = useState(false);
	const [scopePincode, setScopePincode] = useState("");
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
		const raw = getStored(PARTNER_SCOPE_KEY);
		const token = getPartnerToken();
		if (!raw) {
			toast.error("Select an ACTIVE pincode on Partner page first.");
			window.location.href = "/partner-page";
			return;
		}
		if (!token) {
			toast.error("Please login as partner first.");
			forcePartnerLoginRedirect();
			return;
		}
		(async () => {
			try {
				const scope = JSON.parse(raw);
				if (scope.serviceabilityStatus !== "ACTIVE") {
					toast.error("Current pincode is not ACTIVE. Service Leads are blocked.");
					window.location.href = "/partner-page";
					return;
				}
				if ((await getPartnerCoinBalance(token)).balance <= 0) {
					toast.error("Wallet recharge is required to access Service Leads.");
					window.location.href = "/partner-page";
					return;
				}
				setScopePincode(scope.pincode || "");
			} catch {
				toast.error("Invalid tenant scope. Please select pincode again.");
				window.location.href = "/partner-page";
			}
		})();
	}, [navigate]);
	useEffect(() => {
		const token = getPartnerToken();
		if (!token) {
			forcePartnerLoginRedirect();
			return;
		}
		if (!scopePincode) return;
		setLoading(true);
		listPartnerServiceLeads(token, {
			pincode: scopePincode,
			date: selectedDate,
			timeSlot: selectedTime,
			limit: 100
		}).then((result) => setLeads(result.rows)).catch((err) => toast.error(err instanceof Error ? err.message : "Unable to load service leads.")).finally(() => setLoading(false));
	}, [
		scopePincode,
		selectedDate,
		selectedTime
	]);
	useEffect(() => {
		if (!canUseStorage()) return;
		window.localStorage.setItem(SERVICE_LEADS_DATE_KEY, selectedDate);
	}, [selectedDate]);
	useEffect(() => {
		if (!canUseStorage()) return;
		window.localStorage.setItem(SERVICE_LEADS_TIME_KEY, selectedTime);
	}, [selectedTime]);
	const filtered = useMemo(() => leads, [leads]);
	const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
	const safePage = Math.min(page, totalPages);
	const start = (safePage - 1) * PAGE_SIZE;
	const rows = filtered.slice(start, start + PAGE_SIZE);
	return /* @__PURE__ */ jsx("main", {
		className: "partner-simple-page service-leads-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "partner-simple-card partner-lead-card service-leads-card",
			children: [
				/* @__PURE__ */ jsx("h1", { children: "Service Leads" }),
				/* @__PURE__ */ jsx("p", { children: "Start Today's Leads: only selected-date primary pickup leads are shown." }),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-booking-box service-leads-filter-box",
					children: [/* @__PURE__ */ jsx("h3", { children: "Filter" }), /* @__PURE__ */ jsxs("div", {
						className: "lead-booking-calendar service-leads-filter-row",
						children: [/* @__PURE__ */ jsxs("div", {
							className: "service-leads-filter-field",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "service-date",
								children: "Calendar"
							}), /* @__PURE__ */ jsx("input", {
								id: "service-date",
								type: "date",
								value: selectedDate,
								onChange: (e) => {
									setSelectedDate(e.target.value);
									setPage(1);
								}
							})]
						}), /* @__PURE__ */ jsxs("div", {
							className: "service-leads-filter-field",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "service-time",
								children: "Time"
							}), /* @__PURE__ */ jsxs("select", {
								id: "service-time",
								value: selectedTime,
								onChange: (e) => {
									setSelectedTime(e.target.value);
									setPage(1);
								},
								className: "lead-select",
								children: [/* @__PURE__ */ jsx("option", {
									value: "All",
									children: "All"
								}), TIME_SLOTS.map((slot) => /* @__PURE__ */ jsx("option", {
									value: slot,
									children: slot
								}, slot))]
							})]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("p", {
					className: "lead-hint service-leads-hint",
					children: [
						"Selected date: ",
						selectedDate,
						" | Pincode: ",
						scopePincode || "-",
						" | Total: ",
						filtered.length
					]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "lead-table-wrap service-leads-table-wrap",
					children: /* @__PURE__ */ jsxs("table", {
						className: "lead-table",
						children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
							/* @__PURE__ */ jsx("th", { children: "Phone Name" }),
							/* @__PURE__ */ jsx("th", { children: "Price Listed" }),
							/* @__PURE__ */ jsx("th", { children: "Area" }),
							/* @__PURE__ */ jsx("th", { children: "Pincode" }),
							/* @__PURE__ */ jsx("th", { children: "Pickup Time Zone" }),
							/* @__PURE__ */ jsx("th", { children: "Action" })
						] }) }), /* @__PURE__ */ jsx("tbody", { children: rows.length > 0 ? rows.map((row, idx) => {
							const scheduleEligible = row.status === "ACCEPTED" && isTodayPickup(row, selectedDate);
							const canCall = Boolean(row.seller.phone);
							return /* @__PURE__ */ jsxs("tr", { children: [
								/* @__PURE__ */ jsx("td", {
									"data-label": "Phone Name",
									children: row.selectedModel.modelName
								}),
								/* @__PURE__ */ jsxs("td", {
									"data-label": "Price Listed",
									children: ["Rs. ", formatInr(row.quote?.sellingPrice ?? row.selectedModel.listedPrice ?? 0)]
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Area",
									children: row.seller.city || row.city || "-"
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Pincode",
									children: row.pincode
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Pickup Time Zone",
									children: row.pickupSchedule?.primaryTime || "-"
								}),
								/* @__PURE__ */ jsx("td", {
									"data-label": "Action",
									className: "service-leads-action-cell",
									children: /* @__PURE__ */ jsxs("div", {
										className: "lead-decision-row service-leads-action-row",
										children: [
											scheduleEligible ? /* @__PURE__ */ jsx(Link, {
												to: "/service-Leads/transaction",
												search: { leadId: row.id },
												className: "lead-view-btn lead-view-link",
												children: "Schedule Pickup"
											}) : /* @__PURE__ */ jsx("span", {
												className: "lead-view-disabled",
												children: row.status === "ACCEPTED" ? "Not Today" : row.status
											}),
											/* @__PURE__ */ jsx(Link, {
												to: "/service-Leads/transaction",
												search: { leadId: row.id },
												className: "lead-view-btn lead-view-btn-details lead-view-link",
												children: "View Details"
											}),
											canCall ? /* @__PURE__ */ jsx("a", {
												className: "lead-view-btn lead-view-link",
												href: `tel:${row.seller.phone}`,
												children: "Call Customer"
											}) : /* @__PURE__ */ jsx("span", {
												className: "lead-view-disabled",
												children: "No Number"
											})
										]
									})
								})
							] }, `${row.id}-${idx}`);
						}) : /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
							colSpan: 6,
							children: loading ? "Loading service leads..." : "No service leads available."
						}) }) })]
					})
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-pagination service-leads-pagination",
					"aria-label": "Service leads pagination",
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
export { ServiceLeadsPage as component };
