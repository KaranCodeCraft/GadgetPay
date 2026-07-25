import { _ as getCatalogBrands, v as getCatalogModels } from "./gadgetpe-client-Cg3AtJY8.js";
import { t as getBrandLogoUrl } from "./brand-logos-DBEDvOjI.js";
import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/user.sell-phone.tsx?tsr-split=component
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
function UserSellPhonePage() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [brands, setBrands] = useState([]);
	const [brandsLoading, setBrandsLoading] = useState(true);
	const [seriesGroups, setSeriesGroups] = useState([]);
	const [modelsLoading, setModelsLoading] = useState(false);
	const [modelSearch, setModelSearch] = useState("");
	const [loadedLogos, setLoadedLogos] = useState({});
	const [failedLogos, setFailedLogos] = useState({});
	const searchString = typeof window !== "undefined" ? window.location.search : "";
	const queryParams = new URLSearchParams(searchString);
	const selectedBrandSlug = queryParams.get("brand");
	const selectedSeries = queryParams.get("series");
	const selectedModel = queryParams.get("model");
	const selectedStorageParam = queryParams.get("storage");
	useEffect(() => {
		setBrandsLoading(true);
		getCatalogBrands().then(({ brands: b }) => setBrands(b)).catch(() => setBrands([])).finally(() => setBrandsLoading(false));
	}, []);
	useEffect(() => {
		if (!selectedBrandSlug) {
			if (!selectedBrandSlug) {
				setSeriesGroups([]);
				setModelSearch("");
			}
			return;
		}
		setModelsLoading(true);
		getCatalogModels(selectedBrandSlug).then(({ series }) => setSeriesGroups(series)).catch(() => setSeriesGroups([])).finally(() => setModelsLoading(false));
	}, [selectedBrandSlug]);
	if (pathname !== "/user/sell-phone") return /* @__PURE__ */ jsx(Outlet, {});
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
		navigate({ to: "/user/sell-phone/device-details" });
	};
	const openVariantSelection = (brand, series, model) => {
		navigate({ to: `/user/sell-phone?${new URLSearchParams({
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
		const modelSearchQuery = modelSearch.trim().toLowerCase();
		const filteredSeriesGroups = modelSearchQuery ? seriesGroups.map((sg) => {
			const seriesMatches = toTitleCase(sg.series).toLowerCase().includes(modelSearchQuery) || sg.series.toLowerCase().includes(modelSearchQuery);
			const brandMatches = brandLabel.toLowerCase().includes(modelSearchQuery) || selectedBrandSlug.toLowerCase().includes(modelSearchQuery);
			const models = sg.models.filter((m) => {
				const searchableText = [
					brandLabel,
					selectedBrandSlug,
					sg.series,
					toTitleCase(sg.series),
					m.model,
					toTitleCase(m.model),
					`${m.storages.length} storage`,
					`${m.storages.length} variant`,
					...m.storages.map((sv) => sv.storage)
				].join(" ").toLowerCase();
				return brandMatches || seriesMatches || searchableText.includes(modelSearchQuery);
			});
			return {
				...sg,
				models
			};
		}).filter((sg) => sg.models.length > 0) : seriesGroups;
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
								children: [selectedBrandLogoUrl && /* @__PURE__ */ jsx("img", {
									src: selectedBrandLogoUrl,
									alt: `${brandLabel} logo`,
									className: "user-confirm-brand-logo"
								}), /* @__PURE__ */ jsxs("div", {
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
							storageEntry && /* @__PURE__ */ jsxs("div", {
								className: "user-confirm-price-block",
								children: [/* @__PURE__ */ jsx("span", {
									className: "user-confirm-price-label",
									children: "Get Upto"
								}), /* @__PURE__ */ jsxs("span", {
									className: "user-confirm-price",
									children: ["₹ ", formatInr(storageEntry.cashifyPrice)]
								})]
							}),
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
								onClick: () => void navigate({ to: `/user/sell-phone?brand=${encodeURIComponent(selectedBrandSlug)}&series=${encodeURIComponent(selectedSeries)}&model=${encodeURIComponent(selectedModel)}` }),
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
						/* @__PURE__ */ jsx("p", { children: "Select the storage size." }),
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
										navigate({ to: `/user/sell-phone?${new URLSearchParams({
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
								onClick: () => void navigate({ to: `/user/sell-phone?brand=${encodeURIComponent(selectedBrandSlug)}` }),
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
					/* @__PURE__ */ jsxs("div", {
						className: "user-brand-toolbar",
						children: [/* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsxs("h1", {
							className: "user-brand-heading",
							children: [selectedBrandLogoUrl ? /* @__PURE__ */ jsx("span", {
								className: "user-brand-heading-logo-wrap",
								children: /* @__PURE__ */ jsx("img", {
									src: selectedBrandLogoUrl,
									alt: `${brandLabel} logo`,
									className: "user-brand-heading-logo"
								})
							}) : null, /* @__PURE__ */ jsxs("span", { children: [brandLabel, " Models"] })]
						}), /* @__PURE__ */ jsx("p", { children: "Select your model to choose storage on the next step." })] }), /* @__PURE__ */ jsxs("label", {
							className: "user-model-search",
							children: [/* @__PURE__ */ jsx("span", { children: "Search models" }), /* @__PURE__ */ jsx("input", {
								type: "search",
								value: modelSearch,
								onChange: (event) => setModelSearch(event.target.value),
								placeholder: "Search iPhone, Pro, 128GB"
							})]
						})]
					}),
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
					}) : filteredSeriesGroups.length === 0 ? /* @__PURE__ */ jsx("p", {
						style: {
							color: "#888",
							marginTop: 16
						},
						children: "No models match your search."
					}) : filteredSeriesGroups.map((sg) => /* @__PURE__ */ jsxs("section", {
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
								children: /* @__PURE__ */ jsx("div", {
									className: "user-model-meta",
									children: /* @__PURE__ */ jsx("h3", { children: toTitleCase(m.model) })
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
							onClick: () => void navigate({ to: "/user/sell-phone" }),
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
				/* @__PURE__ */ jsx("h1", { children: "Choose a Phone Brand" }),
				/* @__PURE__ */ jsx("p", { children: "Tap any brand tile to start selling that phone category." }),
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
					"aria-label": "Phone brands",
					children: brands.map((brand) => {
						const displayName = toTitleCase(brand);
						const brandLogoUrl = getBrandLogoUrl(brand);
						return /* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "user-brand-tile",
							onClick: () => void navigate({ to: `/user/sell-phone?brand=${encodeURIComponent(brand)}` }),
							children: [/* @__PURE__ */ jsxs("span", {
								className: "user-brand-logo-wrap",
								children: [!loadedLogos[brand] ? /* @__PURE__ */ jsx("span", {
									className: "user-brand-fallback",
									"aria-hidden": "true",
									children: displayName.charAt(0)
								}) : null, brandLogoUrl && !failedLogos[brand] ? /* @__PURE__ */ jsx("img", {
									src: brandLogoUrl,
									alt: `${displayName} logo`,
									className: "user-brand-logo",
									loading: "lazy",
									onLoad: () => setLoadedLogos((prev) => ({
										...prev,
										[brand]: true
									})),
									onError: () => setFailedLogos((prev) => ({
										...prev,
										[brand]: true
									})),
									style: { opacity: loadedLogos[brand] ? 1 : 0 }
								}) : null]
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
export { UserSellPhonePage as component };
