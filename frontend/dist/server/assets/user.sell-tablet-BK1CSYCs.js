import { _ as getCatalogBrands, v as getCatalogModels } from "./gadgetpe-client-Cg3AtJY8.js";
import { t as getBrandLogoUrl } from "./brand-logos-DBEDvOjI.js";
import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/user.sell-tablet.tsx?tsr-split=component
var DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";
var DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_tablet_device_details";
var PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_tablet_pickup_schedule";
var USER_FLOW_JSON_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_json";
var USER_FLOW_ID_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_id";
function toTitleCase(str) {
	return str.toLowerCase().split(" ").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(Math.round(value));
}
function UserSellTabletPage() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const search = useRouterState({ select: (s) => s.location.search });
	const [brands, setBrands] = useState([]);
	const [brandsLoading, setBrandsLoading] = useState(true);
	const [seriesGroups, setSeriesGroups] = useState([]);
	const [modelsLoading, setModelsLoading] = useState(false);
	const [failedLogos, setFailedLogos] = useState({});
	const selectedBrandSlug = new URLSearchParams(search).get("brand");
	const selectedSeries = new URLSearchParams(search).get("series");
	const selectedModel = new URLSearchParams(search).get("model");
	const selectedStorageParam = new URLSearchParams(search).get("storage");
	useEffect(() => {
		setBrandsLoading(true);
		getCatalogBrands().then(({ brands: b }) => setBrands(b)).catch(() => setBrands([])).finally(() => setBrandsLoading(false));
	}, []);
	useEffect(() => {
		if (!selectedBrandSlug) {
			setSeriesGroups([]);
			return;
		}
		setModelsLoading(true);
		getCatalogModels(selectedBrandSlug).then(({ series }) => setSeriesGroups(series)).catch(() => setSeriesGroups([])).finally(() => setModelsLoading(false));
	}, [selectedBrandSlug]);
	if (pathname !== "/user/sell-tablet") return /* @__PURE__ */ jsx(Outlet, {});
	const startFlow = (brand, series, model, storage, cashifyPrice) => {
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
		navigate({ to: "/user/sell-tablet/device-details" });
	};
	const openVariantSelection = (brand, series, model) => {
		navigate({ to: `/user/sell-tablet?${new URLSearchParams({
			brand,
			series,
			model
		}).toString()}` });
	};
	if (selectedBrandSlug) {
		const brandLabel = toTitleCase(selectedBrandSlug);
		const selectedBrandLogoUrl = getBrandLogoUrl(selectedBrandSlug);
		const selectedSeriesGroup = selectedSeries ? seriesGroups.find((sg) => sg.series === selectedSeries) : void 0;
		const selectedModelEntry = selectedModel ? selectedSeriesGroup?.models.find((m) => m.model === selectedModel) : void 0;
		if (selectedSeries && selectedModel && selectedModelEntry) {
			if (selectedStorageParam) {
				const storageEntry = selectedModelEntry.storages.find((sv) => sv.storage === selectedStorageParam);
				return /* @__PURE__ */ jsx("main", {
					className: "user-seller-page",
					children: /* @__PURE__ */ jsxs("section", {
						className: "user-dashboard-shell user-confirm-shell",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "user-confirm-badge",
								children: "Your Selection"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "user-confirm-card",
								children: [selectedBrandLogoUrl ? /* @__PURE__ */ jsx("img", {
									src: selectedBrandLogoUrl,
									alt: `${brandLabel} logo`,
									className: "user-confirm-brand-logo"
								}) : null, /* @__PURE__ */ jsxs("div", {
									className: "user-confirm-details",
									children: [
										/* @__PURE__ */ jsx("p", {
											className: "user-confirm-brand",
											children: brandLabel
										}),
										/* @__PURE__ */ jsx("h2", {
											className: "user-confirm-model",
											children: toTitleCase(selectedModel)
										}),
										/* @__PURE__ */ jsx("span", {
											className: "user-confirm-storage",
											children: selectedStorageParam
										})
									]
								})]
							}),
							storageEntry ? /* @__PURE__ */ jsxs("div", {
								className: "user-confirm-price-block",
								children: [/* @__PURE__ */ jsx("span", {
									className: "user-confirm-price-label",
									children: "Get Upto"
								}), /* @__PURE__ */ jsxs("span", {
									className: "user-confirm-price",
									children: ["₹ ", formatInr(storageEntry.cashifyPrice)]
								})]
							}) : null,
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-confirm-cta",
								disabled: !storageEntry,
								onClick: () => {
									if (storageEntry) startFlow(selectedBrandSlug, selectedSeries, selectedModel, selectedStorageParam, storageEntry.cashifyPrice);
								},
								children: "Get Exact Value"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-cancel",
								style: { marginTop: 12 },
								onClick: () => void navigate({ to: `/user/sell-tablet?brand=${encodeURIComponent(selectedBrandSlug)}&series=${encodeURIComponent(selectedSeries)}&model=${encodeURIComponent(selectedModel)}` }),
								children: "← Change Storage"
							})
						]
					})
				});
			}
			return /* @__PURE__ */ jsx("main", {
				className: "user-seller-page",
				children: /* @__PURE__ */ jsxs("section", {
					className: "user-dashboard-shell",
					children: [
						/* @__PURE__ */ jsxs("h1", {
							className: "user-brand-heading",
							children: [selectedBrandLogoUrl ? /* @__PURE__ */ jsx("span", {
								className: "user-brand-heading-logo-wrap",
								children: /* @__PURE__ */ jsx("img", {
									src: selectedBrandLogoUrl,
									alt: `${brandLabel} logo`,
									className: "user-brand-heading-logo"
								})
							}) : null, /* @__PURE__ */ jsx("span", { children: toTitleCase(selectedModel) })]
						}),
						/* @__PURE__ */ jsx("p", { children: "Select the storage variant for this model." }),
						/* @__PURE__ */ jsxs("section", {
							className: "user-variant-panel",
							"aria-label": `${toTitleCase(selectedModel)} storage variants`,
							children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("div", {
								className: "user-variant-eyebrow",
								children: [
									brandLabel,
									" / ",
									toTitleCase(selectedSeries)
								]
							}), /* @__PURE__ */ jsx("h2", { children: toTitleCase(selectedModel) })] }), /* @__PURE__ */ jsx("div", {
								className: "user-variant-grid",
								children: selectedModelEntry.storages.map((sv) => /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "user-storage-chip user-storage-option",
									onClick: () => {
										navigate({ to: `/user/sell-tablet?${new URLSearchParams({
											brand: selectedBrandSlug,
											series: selectedSeries,
											model: selectedModel,
											storage: sv.storage
										}).toString()}` });
									},
									children: /* @__PURE__ */ jsx("span", { children: sv.storage })
								}, sv.storage))
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "user-auth-actions",
							style: { marginTop: 24 },
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-cancel",
								onClick: () => void navigate({ to: `/user/sell-tablet?brand=${encodeURIComponent(selectedBrandSlug)}` }),
								children: "Back to Models"
							})
						})
					]
				})
			});
		}
		return /* @__PURE__ */ jsx("main", {
			className: "user-seller-page",
			children: /* @__PURE__ */ jsxs("section", {
				className: "user-dashboard-shell",
				children: [
					/* @__PURE__ */ jsxs("h1", {
						className: "user-brand-heading",
						children: [selectedBrandLogoUrl ? /* @__PURE__ */ jsx("span", {
							className: "user-brand-heading-logo-wrap",
							children: /* @__PURE__ */ jsx("img", {
								src: selectedBrandLogoUrl,
								alt: `${brandLabel} logo`,
								className: "user-brand-heading-logo"
							})
						}) : null, /* @__PURE__ */ jsxs("span", { children: [brandLabel, " Models"] })]
					}),
					/* @__PURE__ */ jsx("p", { children: "Select your model to choose storage on the next step." }),
					modelsLoading ? /* @__PURE__ */ jsx("p", {
						style: {
							color: "#888",
							marginTop: 16
						},
						children: "Loading models..."
					}) : seriesGroups.length === 0 ? /* @__PURE__ */ jsx("p", {
						style: {
							color: "#888",
							marginTop: 16
						},
						children: "No models available for this brand yet."
					}) : seriesGroups.map((sg) => /* @__PURE__ */ jsxs("section", {
						style: { marginTop: 24 },
						children: [/* @__PURE__ */ jsx("h2", {
							style: {
								fontSize: "1rem",
								fontWeight: 600,
								marginBottom: 12,
								color: "#555",
								textTransform: "none"
							},
							children: toTitleCase(sg.series)
						}), /* @__PURE__ */ jsx("div", {
							className: "user-model-grid",
							"aria-label": `${toTitleCase(sg.series)} models`,
							children: sg.models.map((m) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-model-card user-model-select-card",
								onClick: () => openVariantSelection(selectedBrandSlug, sg.series, m.model),
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
						children: /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "user-auth-cancel",
							onClick: () => void navigate({ to: "/user/sell-tablet" }),
							children: "Back to Brand Selection"
						})
					})
				]
			})
		});
	}
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell",
			children: [
				/* @__PURE__ */ jsx("h1", { children: "Choose a Tablet or iPad Brand" }),
				/* @__PURE__ */ jsx("p", { children: "Tap any brand tile to start selling that tablet or iPad category." }),
				brandsLoading ? /* @__PURE__ */ jsx("p", {
					style: {
						color: "#888",
						marginTop: 16
					},
					children: "Loading brands..."
				}) : brands.length === 0 ? /* @__PURE__ */ jsx("p", {
					style: {
						color: "#888",
						marginTop: 16
					},
					children: "No brands available. Please check back later."
				}) : /* @__PURE__ */ jsx("section", {
					className: "user-brand-grid",
					"aria-label": "Tablet brands",
					children: brands.map((brand) => {
						const displayName = toTitleCase(brand);
						const logoSlug = brand.toLowerCase().replace(/\s+/g, "");
						const brandLogoUrl = getBrandLogoUrl(brand) ?? `https://logo.clearbit.com/${logoSlug}.com`;
						return /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "user-brand-tile",
							onClick: () => void navigate({ to: `/user/sell-tablet?brand=${encodeURIComponent(brand)}` }),
							children: [/* @__PURE__ */ jsx("span", {
								className: "user-brand-logo-wrap",
								children: failedLogos[brand] ? /* @__PURE__ */ jsx("span", {
									className: "user-brand-fallback",
									"aria-hidden": "true",
									children: displayName.charAt(0)
								}) : /* @__PURE__ */ jsx("img", {
									src: brandLogoUrl,
									alt: `${displayName} logo`,
									className: "user-brand-logo",
									loading: "lazy",
									onError: () => setFailedLogos((prev) => ({
										...prev,
										[brand]: true
									}))
								})
							}), /* @__PURE__ */ jsx("span", {
								className: "user-brand-name",
								children: displayName
							})]
						}, brand);
					})
				}),
				!brandsLoading ? /* @__PURE__ */ jsx("div", {
					className: "user-auth-actions",
					style: { marginTop: 18 },
					children: /* @__PURE__ */ jsx(Link, {
						to: "/user",
						className: "user-auth-cancel",
						style: {
							textDecoration: "none",
							display: "inline-flex",
							alignItems: "center"
						},
						children: "Back to User Dashboard"
					})
				}) : null
			]
		})
	});
}
//#endregion
export { UserSellTabletPage as component };
