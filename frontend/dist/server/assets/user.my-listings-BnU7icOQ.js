import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ListChecks } from "lucide-react";
//#region src/routes/user.my-listings.tsx?tsr-split=component
var SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
var DEVICE_PHONE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_phone_selected_model";
var DEVICE_TABLET_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";
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
function getDraftModel() {
	if (typeof window === "undefined") return null;
	try {
		const tabletRaw = window.localStorage.getItem(DEVICE_TABLET_MODEL_STORAGE_KEY);
		if (tabletRaw) return JSON.parse(tabletRaw);
		const phoneRaw = window.localStorage.getItem(DEVICE_PHONE_MODEL_STORAGE_KEY);
		if (phoneRaw) return JSON.parse(phoneRaw);
		return null;
	} catch {
		return null;
	}
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function formatPickupDate(value) {
	if (!value) return "Date pending";
	return new Intl.DateTimeFormat("en-IN", {
		day: "2-digit",
		month: "short",
		year: "numeric"
	}).format(new Date(value));
}
function UserMyListingsPage() {
	const [historyItems, setHistoryItems] = useState([]);
	const [draftModel, setDraftModel] = useState(null);
	useEffect(() => {
		setHistoryItems(getSellingHistory());
		setDraftModel(getDraftModel());
	}, []);
	const listings = useMemo(() => {
		const scheduledRows = historyItems.map((item, index) => ({
			id: item.id || `history-${item.updatedAt || index}`,
			modelName: item.selectedModel?.modelName || "Device listing",
			listedPrice: item.selectedModel?.listedPrice || 0,
			thumbnailUrl: item.selectedModel?.thumbnailUrl,
			updatedAt: item.updatedAt,
			phone: item.pickupSchedule?.callingPhoneNumber,
			primaryDate: item.pickupSchedule?.primaryDate,
			primaryTime: item.pickupSchedule?.primaryTime,
			status: "Pickup Scheduled"
		}));
		if (!Boolean(draftModel?.modelName && !scheduledRows.some((row) => row.modelName === draftModel.modelName)) || !draftModel?.modelName) return scheduledRows;
		return [{
			id: `draft-${draftModel.updatedAt || "current"}`,
			modelName: draftModel.modelName,
			listedPrice: draftModel.listedPrice || 0,
			thumbnailUrl: draftModel.thumbnailUrl,
			updatedAt: draftModel.updatedAt,
			status: "Draft"
		}, ...scheduledRows];
	}, [draftModel, historyItems]);
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-dashboard-shell-pro",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Seller Action"
				}),
				/* @__PURE__ */ jsx("h1", { children: "My Listings" }),
				/* @__PURE__ */ jsxs("section", {
					className: "user-action-route-card",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "user-action-icon",
							children: /* @__PURE__ */ jsx(ListChecks, { size: 18 })
						}),
						/* @__PURE__ */ jsx("h2", { children: "Listing Workspace" }),
						/* @__PURE__ */ jsx("p", { children: "Track your drafted listings and pickup-scheduled listings in one place." }),
						listings.length > 0 ? /* @__PURE__ */ jsx("div", {
							className: "user-selling-history-list",
							style: { marginTop: 10 },
							children: listings.map((listing) => /* @__PURE__ */ jsxs("article", {
								className: "user-selling-history-card",
								children: [listing.thumbnailUrl ? /* @__PURE__ */ jsx("img", {
									src: listing.thumbnailUrl,
									alt: `${listing.modelName} thumbnail`
								}) : null, /* @__PURE__ */ jsxs("div", { children: [
									/* @__PURE__ */ jsx("h3", { children: listing.modelName }),
									/* @__PURE__ */ jsxs("p", { children: [
										"Status: ",
										listing.status,
										listing.primaryDate ? ` | Pickup: ${formatPickupDate(listing.primaryDate)}` : "",
										listing.primaryTime ? `, ${listing.primaryTime}` : ""
									] }),
									/* @__PURE__ */ jsxs("small", { children: [
										"Listed Price: Rs. ",
										formatInr(listing.listedPrice),
										listing.phone ? ` | Phone: ${listing.phone}` : ""
									] })
								] })]
							}, listing.id))
						}) : /* @__PURE__ */ jsx("div", {
							className: "user-action-route-empty",
							children: "No listings yet. Start with Sell Phone or Sell Tablet to create your first listing."
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
export { UserMyListingsPage as component };
