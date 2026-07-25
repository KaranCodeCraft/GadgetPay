import { t as Route } from "./user.sell-phone._brand-CTeC8MQU.js";
import { v as getCatalogModels } from "./gadgetpe-client-Cg3AtJY8.js";
import { t as getBrandLogoUrl } from "./brand-logos-DBEDvOjI.js";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/user.sell-phone.$brand.tsx?tsr-split=component
var DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_phone_selected_model";
var DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_phone_device_details";
var PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_phone_pickup_schedule";
var USER_FLOW_JSON_STORAGE_KEY = "gadgetpe_user_sell_phone_flow_json";
var USER_FLOW_ID_STORAGE_KEY = "gadgetpe_user_sell_phone_flow_id";
function toTitleCase(str) {
	return str.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(Math.round(value));
}
function UserSellPhoneBrandPage() {
	const { brand } = Route.useParams();
	const [seriesGroups, setSeriesGroups] = useState([]);
	const [selectedModel, setSelectedModel] = useState(null);
	const [loading, setLoading] = useState(true);
	const brandLabel = toTitleCase(brand);
	const brandLogoUrl = getBrandLogoUrl(brand);
	useEffect(() => {
		setLoading(true);
		setSelectedModel(null);
		getCatalogModels(brand).then(({ series }) => setSeriesGroups(series)).catch(() => setSeriesGroups([])).finally(() => setLoading(false));
	}, [brand]);
	const startFlow = (series, model, storage, cashifyPrice) => {
		if (typeof window === "undefined") return;
		window.localStorage.removeItem(DEVICE_DETAILS_STORAGE_KEY);
		window.localStorage.removeItem(PICKUP_SCHEDULE_STORAGE_KEY);
		window.localStorage.removeItem(USER_FLOW_JSON_STORAGE_KEY);
		window.localStorage.removeItem(USER_FLOW_ID_STORAGE_KEY);
		const payload = {
			brandSlug: brand,
			modelId: `${brand}__${series}__${model}__${storage}`,
			modelName: `${toTitleCase(model)} (${storage})`,
			listedPrice: cashifyPrice,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		window.localStorage.setItem(DEVICE_MODEL_STORAGE_KEY, JSON.stringify(payload));
		window.location.href = "/user/sell-phone/device-details";
	};
	if (!loading && seriesGroups.length === 0) return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell",
			children: [
				/* @__PURE__ */ jsx("h1", { children: "No Models Found" }),
				/* @__PURE__ */ jsx("p", { children: "No devices are available for this brand yet." }),
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-actions",
					style: { marginTop: 18 },
					children: /* @__PURE__ */ jsx(Link, {
						to: "/user/sell-phone",
						className: "user-auth-cancel",
						style: {
							textDecoration: "none",
							display: "inline-flex",
							alignItems: "center"
						},
						children: "Back to Brand Selection"
					})
				})
			]
		})
	});
	const selectedSeriesGroup = selectedModel ? seriesGroups.find((sg) => sg.series === selectedModel.series) : void 0;
	const selectedModelEntry = selectedModel ? selectedSeriesGroup?.models.find((m) => m.model === selectedModel.model) : void 0;
	if (!loading && selectedModel && selectedModelEntry) return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell",
			children: [
				/* @__PURE__ */ jsxs("h1", {
					className: "user-brand-heading",
					children: [brandLogoUrl ? /* @__PURE__ */ jsx("span", {
						className: "user-brand-heading-logo-wrap",
						children: /* @__PURE__ */ jsx("img", {
							src: brandLogoUrl,
							alt: `${brandLabel} logo`,
							className: "user-brand-heading-logo"
						})
					}) : null, /* @__PURE__ */ jsx("span", { children: toTitleCase(selectedModel.model) })]
				}),
				/* @__PURE__ */ jsx("p", { children: "Select the storage variant for this model." }),
				/* @__PURE__ */ jsxs("section", {
					className: "user-variant-panel",
					"aria-label": `${toTitleCase(selectedModel.model)} storage variants`,
					children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
						className: "user-variant-eyebrow",
						children: [
							brandLabel,
							" / ",
							toTitleCase(selectedModel.series)
						]
					}), /* @__PURE__ */ jsx("h2", { children: toTitleCase(selectedModel.model) })] }), /* @__PURE__ */ jsx("div", {
						className: "user-variant-grid",
						children: selectedModelEntry.storages.map((sv) => /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "user-storage-chip user-storage-option",
							onClick: () => startFlow(selectedModel.series, selectedModel.model, sv.storage, sv.cashifyPrice),
							children: [/* @__PURE__ */ jsx("span", { children: sv.storage }), /* @__PURE__ */ jsxs("span", {
								className: "user-storage-price",
								children: ["Rs. ", formatInr(sv.cashifyPrice)]
							})]
						}, sv.storage))
					})]
				}),
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-actions",
					style: { marginTop: 24 },
					children: /* @__PURE__ */ jsx("button", {
						type: "button",
						className: "user-auth-cancel",
						onClick: () => setSelectedModel(null),
						children: "Back to Models"
					})
				})
			]
		})
	});
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell",
			children: [
				/* @__PURE__ */ jsxs("h1", {
					className: "user-brand-heading",
					children: [brandLogoUrl ? /* @__PURE__ */ jsx("span", {
						className: "user-brand-heading-logo-wrap",
						children: /* @__PURE__ */ jsx("img", {
							src: brandLogoUrl,
							alt: `${brandLabel} logo`,
							className: "user-brand-heading-logo"
						})
					}) : null, /* @__PURE__ */ jsxs("span", { children: [brandLabel, " Models"] })]
				}),
				/* @__PURE__ */ jsx("p", { children: "Select your model to choose storage on the next step." }),
				loading ? /* @__PURE__ */ jsx("p", {
					style: {
						color: "#888",
						marginTop: 16
					},
					children: "Loading models..."
				}) : seriesGroups.map((sg) => /* @__PURE__ */ jsxs("section", {
					style: { marginTop: 24 },
					children: [/* @__PURE__ */ jsx("h2", {
						style: {
							fontSize: "1rem",
							fontWeight: 600,
							marginBottom: 12,
							color: "#555"
						},
						children: toTitleCase(sg.series)
					}), /* @__PURE__ */ jsx("div", {
						className: "user-model-grid",
						"aria-label": `${toTitleCase(sg.series)} models`,
						children: sg.models.map((m) => /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "user-model-card user-model-select-card",
							onClick: () => setSelectedModel({
								series: sg.series,
								model: m.model
							}),
							children: /* @__PURE__ */ jsxs("div", {
								className: "user-model-meta",
								children: [/* @__PURE__ */ jsx("h3", { children: toTitleCase(m.model) }), /* @__PURE__ */ jsxs("p", { children: [
									m.storages.length,
									" storage ",
									m.storages.length === 1 ? "variant" : "variants",
									" available"
								] })]
							})
						}, m.model))
					})]
				}, sg.series)),
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-actions",
					style: { marginTop: 24 },
					children: /* @__PURE__ */ jsx(Link, {
						to: "/user/sell-phone",
						className: "user-auth-cancel",
						style: {
							textDecoration: "none",
							display: "inline-flex",
							alignItems: "center"
						},
						children: "Back to Brand Selection"
					})
				})
			]
		})
	});
}
//#endregion
export { UserSellPhoneBrandPage as component };
