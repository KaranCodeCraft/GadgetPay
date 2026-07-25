import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/user.selling-history.tsx?tsr-split=component
var SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
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
	if (!value) return "Pickup scheduled";
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	}).format(new Date(value));
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function UserSellingHistoryPage() {
	const [sellingHistory, setSellingHistory] = useState([]);
	useEffect(() => {
		setSellingHistory(getSellingHistory());
	}, []);
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-dashboard-shell-pro",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Seller Action"
				}),
				/* @__PURE__ */ jsx("h1", { children: "Selling History" }),
				/* @__PURE__ */ jsx("p", { children: "Completed pickup schedules saved locally are shown here so the root dashboard stays focused." }),
				sellingHistory.length > 0 ? /* @__PURE__ */ jsx("div", {
					className: "user-selling-history-list",
					children: sellingHistory.map((historyItem) => /* @__PURE__ */ jsxs("article", {
						className: "user-selling-history-card",
						children: [historyItem.selectedModel?.thumbnailUrl ? /* @__PURE__ */ jsx("img", {
							src: historyItem.selectedModel.thumbnailUrl,
							alt: `${historyItem.selectedModel.modelName || "Phone"} thumbnail`
						}) : null, /* @__PURE__ */ jsxs("div", { children: [
							/* @__PURE__ */ jsx("h3", { children: historyItem.selectedModel?.modelName || "Phone sale" }),
							/* @__PURE__ */ jsxs("p", { children: [
								"Pickup: ",
								formatPickupDate(historyItem.pickupSchedule?.primaryDate),
								historyItem.pickupSchedule?.primaryTime ? `, ${historyItem.pickupSchedule.primaryTime}` : ""
							] }),
							/* @__PURE__ */ jsxs("small", { children: [
								"Selling Price: Rs. ",
								formatInr(historyItem.selectedModel?.listedPrice || 0),
								historyItem.pickupSchedule?.callingPhoneNumber ? ` | Phone: ${historyItem.pickupSchedule.callingPhoneNumber}` : ""
							] })
						] })]
					}, historyItem.id || historyItem.updatedAt))
				}) : /* @__PURE__ */ jsx("div", {
					className: "user-action-route-empty",
					children: "No selling history yet. Complete a pickup schedule to see it here."
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
	});
}
//#endregion
export { UserSellingHistoryPage as component };
