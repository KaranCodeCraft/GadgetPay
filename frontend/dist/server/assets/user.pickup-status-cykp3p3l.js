import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Truck } from "lucide-react";
//#region src/routes/user.pickup-status.tsx?tsr-split=component
var PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_phone_pickup_schedule";
var SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
function getStoredPickupSchedule() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(PICKUP_SCHEDULE_STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
function getSellingHistory() {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(SELLING_HISTORY_STORAGE_KEY);
		if (!raw) return [];
		return JSON.parse(raw);
	} catch {
		return [];
	}
}
function formatPickupDate(value) {
	if (!value) return "Date pending";
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	}).format(new Date(value));
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function UserPickupStatusPage() {
	const [pickupSchedule, setPickupSchedule] = useState(null);
	const [historyItems, setHistoryItems] = useState([]);
	useEffect(() => {
		setPickupSchedule(getStoredPickupSchedule());
		setHistoryItems(getSellingHistory());
	}, []);
	const pickupRows = useMemo(() => {
		const rowsFromHistory = historyItems.filter((item) => item.pickupSchedule).map((item, index) => ({
			id: item.id || `history-pickup-${item.updatedAt || index}`,
			modelName: item.selectedModel?.modelName || item.pickupSchedule?.modelName || "Phone listing",
			listedPrice: item.selectedModel?.listedPrice || item.pickupSchedule?.listedPrice || 0,
			primaryDate: item.pickupSchedule?.primaryDate,
			primaryTime: item.pickupSchedule?.primaryTime,
			city: item.pickupSchedule?.city,
			addressLine: item.pickupSchedule?.addressLine,
			phone: item.pickupSchedule?.callingPhoneNumber,
			updatedAt: item.updatedAt || item.pickupSchedule?.updatedAt,
			status: "Scheduled"
		}));
		if (!Boolean(pickupSchedule?.primaryDate && pickupSchedule.primaryTime && !rowsFromHistory.some((row) => row.primaryDate === pickupSchedule.primaryDate && row.primaryTime === pickupSchedule.primaryTime)) || !pickupSchedule) return rowsFromHistory;
		return [{
			id: `latest-${pickupSchedule.updatedAt || "pickup"}`,
			modelName: pickupSchedule.modelName || "Phone listing",
			listedPrice: pickupSchedule.listedPrice || 0,
			primaryDate: pickupSchedule.primaryDate,
			primaryTime: pickupSchedule.primaryTime,
			city: pickupSchedule.city,
			addressLine: pickupSchedule.addressLine,
			phone: pickupSchedule.callingPhoneNumber,
			updatedAt: pickupSchedule.updatedAt,
			status: "Awaiting Assignment"
		}, ...rowsFromHistory];
	}, [historyItems, pickupSchedule]);
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-dashboard-shell-pro",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Seller Action"
				}),
				/* @__PURE__ */ jsx("h1", { children: "Pickup Status" }),
				/* @__PURE__ */ jsxs("section", {
					className: "user-action-route-card",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "user-action-icon",
							children: /* @__PURE__ */ jsx(Truck, { size: 18 })
						}),
						/* @__PURE__ */ jsx("h2", { children: "Pickup Tracking" }),
						/* @__PURE__ */ jsx("p", { children: "Monitor all pickup requests and their current assignment status." }),
						pickupRows.length > 0 ? /* @__PURE__ */ jsx("div", {
							className: "user-selling-history-list",
							style: { marginTop: 10 },
							children: pickupRows.map((row) => /* @__PURE__ */ jsx("article", {
								className: "user-selling-history-card",
								children: /* @__PURE__ */ jsxs("div", { children: [
									/* @__PURE__ */ jsx("h3", { children: row.modelName }),
									/* @__PURE__ */ jsxs("p", { children: [
										"Status: ",
										row.status,
										row.primaryDate ? ` | Pickup: ${formatPickupDate(row.primaryDate)}` : "",
										row.primaryTime ? `, ${row.primaryTime}` : ""
									] }),
									/* @__PURE__ */ jsxs("small", { children: [
										"Price: Rs. ",
										formatInr(row.listedPrice),
										row.phone ? ` | Phone: ${row.phone}` : "",
										row.city ? ` | City: ${row.city}` : ""
									] }),
									row.addressLine || row.updatedAt ? /* @__PURE__ */ jsxs("small", {
										style: {
											display: "block",
											marginTop: 4
										},
										children: [row.addressLine ? `Address: ${row.addressLine}` : "", row.updatedAt ? ` ${row.addressLine ? "|" : ""} Updated: ${new Date(row.updatedAt).toLocaleString("en-IN")}` : ""]
									}) : null
								] })
							}, row.id))
						}) : /* @__PURE__ */ jsx("div", {
							className: "user-action-route-empty",
							children: "No pickup requests yet. Schedule a pickup after quote verification to see updates here."
						}),
						/* @__PURE__ */ jsx("div", {
							className: "user-auth-actions",
							style: { marginTop: 18 },
							children: /* @__PURE__ */ jsx(Link, {
								to: "/user",
								className: "user-auth-cancel user-inline-link",
								children: "Back to Dashboard"
							})
						})
					]
				})
			]
		})
	});
}
//#endregion
export { UserPickupStatusPage as component };
