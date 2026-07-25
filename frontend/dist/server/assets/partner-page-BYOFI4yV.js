import { n as clearRoleSession, r as getActiveRole } from "./role-session-C7kgx143.js";
import { M as listPartnerActivePickups, P as listPartnerCoinRechargeRequests, U as logoutSession, b as getPartnerDashboard, q as resolvePartnerScope, t as ApiClientError, x as getPartnerKycStatus, y as getPartnerCoinBalance } from "./gadgetpe-client-Cg3AtJY8.js";
import { r as SupportFab, t as PartnerDashboardCompactFooter } from "./partner-footer-and-support-CLnV4WZn.js";
import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { CircleHelp, Coins, LogOut, MapPin, PiggyBank, Settings, Sparkles, TrendingUp, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/partner-page.tsx?tsr-split=component
var sidebarItems = [
	"Profile",
	"Progress",
	"Refer",
	"Earnings",
	"Coins",
	"Settings",
	"FAQ",
	"Help"
];
var navIcons = {
	Profile: UserRound,
	Progress: TrendingUp,
	Refer: Users,
	Earnings: PiggyBank,
	Coins,
	Settings,
	FAQ: CircleHelp,
	Help: Sparkles
};
var defaultMetrics = {
	onboardingProgress: 0,
	coins: 0,
	weeklyLeads: 0,
	monthlyEarnings: 0,
	leadBucket: 0,
	serviceLeads: 0
};
var PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
var PARTNER_REFRESH_TOKEN_KEY = "gadgetpe_partner_refresh_token";
var PARTNER_ACCESS_TOKEN_KEY = "gadgetpe_partner_access_token";
var LEGACY_PARTNER_ACCESS_TOKEN_KEY = "gadgetpe_access_token";
var SERVICE_LEADS_DATE_KEY = "gadgetpe_service_leads_date";
function getPartnerAccessToken() {
	if (typeof window === "undefined") return null;
	return localStorage.getItem(PARTNER_ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_PARTNER_ACCESS_TOKEN_KEY);
}
function PartnerDashboardPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const [activeItem, setActiveItem] = useState("Profile");
	const [pincodeInput, setPincodeInput] = useState("");
	const [selectedPincode, setSelectedPincode] = useState("");
	const [showPincodeControls, setShowPincodeControls] = useState(false);
	const [refreshedAt, setRefreshedAt] = useState("Initial load");
	const [isSidebarOpen, setIsSidebarOpen] = useState(false);
	const [serviceabilityStatus, setServiceabilityStatus] = useState("INACTIVE");
	const [scopeError, setScopeError] = useState(null);
	const [scopeLocation, setScopeLocation] = useState(null);
	const [isApplyingScope, setIsApplyingScope] = useState(false);
	const [showWalletGuardModal, setShowWalletGuardModal] = useState(false);
	const [pendingRechargeCount, setPendingRechargeCount] = useState(0);
	const [kpi, setKpi] = useState(defaultMetrics);
	const [activePickup, setActivePickup] = useState(null);
	const [activePickupElapsed, setActivePickupElapsed] = useState("--");
	const [partnerName, setPartnerName] = useState("Partner");
	const effectiveCoins = kpi.coins;
	useEffect(() => {
		if (typeof window === "undefined") return;
		setPartnerName(localStorage.getItem("gadgetpe_partner_name") || "Partner");
	}, []);
	useEffect(() => {
		const activeRole = getActiveRole();
		if (activeRole === "user") {
			navigate({ to: "/user" });
			return;
		}
		if (activeRole === "admin") navigate({ to: "/admin" });
	}, [navigate]);
	const saveScope = (scope) => {
		localStorage.setItem(PARTNER_SCOPE_KEY, JSON.stringify(scope));
	};
	const clearScope = () => {
		localStorage.removeItem(PARTNER_SCOPE_KEY);
	};
	const applyPincode = async () => {
		const pincode = pincodeInput.trim();
		if (pincode.length !== 6) {
			setScopeError("Pincode must be 6 digits.");
			toast.error("Pincode must be 6 digits.");
			return;
		}
		const accessToken = getPartnerAccessToken();
		if (!accessToken) {
			setScopeError("Session expired. Please login again.");
			toast.error("Session expired. Please login again.");
			return;
		}
		setScopeError(null);
		setIsApplyingScope(true);
		try {
			const scope = await resolvePartnerScope(pincode, accessToken);
			setSelectedPincode(scope.selectedPincode);
			setServiceabilityStatus(scope.serviceabilityStatus);
			setScopeLocation({
				state: scope.location.state,
				district: scope.location.district
			});
			saveScope({
				pincode: scope.selectedPincode,
				serviceabilityStatus: scope.serviceabilityStatus,
				state: scope.location.state,
				district: scope.location.district
			});
			setKpi((await getPartnerDashboard(scope.selectedPincode, accessToken)).metrics);
			setRefreshedAt((/* @__PURE__ */ new Date()).toLocaleTimeString());
			toast.success(`Tenant scope set to ${scope.selectedPincode}.`);
		} catch (error) {
			if (error instanceof ApiClientError) {
				const statusFromDetails = error.details && typeof error.details === "object" && "status" in error.details ? String(error.details.status) : null;
				const normalizedStatus = statusFromDetails === "LIMITED" ? "LIMITED" : "INACTIVE";
				if (statusFromDetails === "INACTIVE" || statusFromDetails === "LIMITED") {
					setServiceabilityStatus(normalizedStatus);
					clearScope();
					toast.error(`Pincode ${pincode} is ${statusFromDetails}. Operations are blocked.`);
				}
			}
			setScopeError(error instanceof Error ? error.message : "Unable to resolve serviceability.");
		} finally {
			setIsApplyingScope(false);
		}
	};
	useEffect(() => {
		setPincodeInput(selectedPincode);
	}, [selectedPincode]);
	useEffect(() => {
		const scopeRaw = localStorage.getItem(PARTNER_SCOPE_KEY);
		if (!scopeRaw) return;
		try {
			const scope = JSON.parse(scopeRaw);
			setSelectedPincode(scope.pincode);
			setServiceabilityStatus(scope.serviceabilityStatus);
			setScopeLocation({
				state: scope.state,
				district: scope.district
			});
		} catch {
			clearScope();
		}
	}, []);
	useEffect(() => {
		const checkKycAccess = async () => {
			const accessToken = getPartnerAccessToken();
			if (!accessToken) {
				toast.error("Please login first.");
				await navigate({ to: "/partner" });
				return;
			}
			try {
				if ((await getPartnerKycStatus(accessToken)).latestSubmission?.verificationStatus !== "VERIFIED") {
					toast.error("KYC not approved yet. Please complete admin approval before accessing partner page.");
					await navigate({ to: "/partner" });
				}
			} catch {
				toast.error("Unable to verify KYC status. Please login again.");
				await navigate({ to: "/partner" });
			}
		};
		checkKycAccess();
	}, [navigate]);
	useEffect(() => {
		const loadWalletState = async () => {
			const accessToken = getPartnerAccessToken();
			if (!accessToken) return;
			try {
				const [coinBalance, rechargeRequests] = await Promise.all([getPartnerCoinBalance(accessToken), listPartnerCoinRechargeRequests(accessToken, {
					status: "PENDING",
					limit: 20
				})]);
				setKpi((current) => ({
					...current,
					coins: coinBalance.balance
				}));
				setPendingRechargeCount(rechargeRequests.count);
			} catch {}
		};
		loadWalletState();
		const handleFocus = () => void loadWalletState();
		const handleVisibilityChange = () => {
			if (document.visibilityState === "visible") loadWalletState();
		};
		window.addEventListener("focus", handleFocus);
		document.addEventListener("visibilitychange", handleVisibilityChange);
		return () => {
			window.removeEventListener("focus", handleFocus);
			document.removeEventListener("visibilitychange", handleVisibilityChange);
		};
	}, [location.pathname]);
	useEffect(() => {
		const bootstrapDashboard = async () => {
			const accessToken = getPartnerAccessToken();
			if (!accessToken || !selectedPincode || serviceabilityStatus !== "ACTIVE") return;
			try {
				const [dashboard, coinBalance, rechargeRequests] = await Promise.all([
					getPartnerDashboard(selectedPincode, accessToken),
					getPartnerCoinBalance(accessToken),
					listPartnerCoinRechargeRequests(accessToken, {
						status: "PENDING",
						limit: 20
					})
				]);
				setKpi({
					...dashboard.metrics,
					coins: coinBalance.balance
				});
				setPartnerName(dashboard.partner.name || "Partner");
				setPendingRechargeCount(rechargeRequests.count);
			} catch {}
		};
		bootstrapDashboard();
	}, [selectedPincode, serviceabilityStatus]);
	const handleRestrictedNavigation = (event) => {
		if (serviceabilityStatus === "ACTIVE") {
			if (effectiveCoins > 0) return;
			event.preventDefault();
			setShowWalletGuardModal(true);
			return;
		}
		event.preventDefault();
		toast.error("Selected pincode is not ACTIVE. Operations are blocked.");
	};
	const handleServiceLeadsNavigation = (event) => {
		handleRestrictedNavigation(event);
		if (event.defaultPrevented || typeof window === "undefined") return;
		const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
		window.localStorage.setItem(SERVICE_LEADS_DATE_KEY, today);
	};
	const handleLogout = async () => {
		const refreshToken = localStorage.getItem(PARTNER_REFRESH_TOKEN_KEY) || localStorage.getItem("gadgetpe_refresh_token");
		if (!refreshToken) {
			toast.error("Session expired. Please login again.");
			return;
		}
		try {
			await logoutSession(refreshToken);
			clearScope();
			clearRoleSession("partner");
			setIsSidebarOpen(false);
			toast.success("Logged out successfully.");
			await navigate({ to: "/partner" });
		} catch (error) {
			toast.error(error instanceof Error ? error.message : "Complete active pickup before logout.");
		}
	};
	useEffect(() => {
		const token = getPartnerAccessToken();
		if (!token || serviceabilityStatus !== "ACTIVE") return;
		const loadActivePickup = async () => {
			try {
				setActivePickup((await listPartnerActivePickups(token, {
					pincode: selectedPincode || void 0,
					limit: 1
				})).rows[0] || null);
			} catch {}
		};
		loadActivePickup();
		const poller = setInterval(() => {
			loadActivePickup();
		}, 3e4);
		return () => clearInterval(poller);
	}, [selectedPincode, serviceabilityStatus]);
	useEffect(() => {
		const anchor = activePickup?.pickupStartedAt || activePickup?.claimedAt || activePickup?.updatedAt;
		if (!anchor) {
			setActivePickupElapsed("--");
			return;
		}
		const updateElapsed = () => {
			const started = Date.parse(anchor);
			if (Number.isNaN(started)) {
				setActivePickupElapsed("--");
				return;
			}
			const diff = Math.max(0, Date.now() - started);
			const hours = Math.floor(diff / (1e3 * 60 * 60));
			const mins = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
			const secs = Math.floor(diff % (1e3 * 60) / 1e3);
			setActivePickupElapsed(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
		};
		updateElapsed();
		const timer = setInterval(updateElapsed, 1e3);
		return () => clearInterval(timer);
	}, [
		activePickup?.pickupStartedAt,
		activePickup?.claimedAt,
		activePickup?.updatedAt
	]);
	if (location.pathname !== "/partner-page") return /* @__PURE__ */ jsx(Outlet, {});
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsxs("main", {
			className: "partner-dashboard-page",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "partner-mobile-topbar-bg",
					"aria-hidden": true
				}),
				/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "partner-hamburger",
					"aria-label": "Open navigation menu",
					"aria-expanded": isSidebarOpen,
					onClick: () => setIsSidebarOpen((prev) => !prev),
					children: "☰"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "partner-top-logo",
					children: "GadgetPe"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "partner-coin-badge",
					"aria-label": "Coin balance",
					children: [/* @__PURE__ */ jsx(Coins, { size: 13 }), /* @__PURE__ */ jsx("span", { children: effectiveCoins })]
				}),
				/* @__PURE__ */ jsx("div", {
					className: `partner-sidebar-backdrop${isSidebarOpen ? " open" : ""}`,
					onClick: () => setIsSidebarOpen(false),
					"aria-hidden": true
				}),
				/* @__PURE__ */ jsxs("aside", {
					className: `partner-sidebar${isSidebarOpen ? " open" : ""}`,
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "partner-sidebar-head",
							children: [/* @__PURE__ */ jsx("div", {
								className: "partner-sidebar-brand",
								children: "GadgetPe Partner"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "partner-close-menu",
								"aria-label": "Close navigation menu",
								onClick: () => setIsSidebarOpen(false),
								children: "×"
							})]
						}),
						/* @__PURE__ */ jsx("nav", {
							className: "partner-sidebar-nav",
							"aria-label": "Partner navigation",
							children: sidebarItems.map((item) => /* @__PURE__ */ jsx("button", {
								type: "button",
								className: item === activeItem ? "active" : "",
								onClick: () => {
									setActiveItem(item);
									setIsSidebarOpen(false);
								},
								children: (() => {
									const Icon = navIcons[item];
									return /* @__PURE__ */ jsxs(Fragment, { children: [/* @__PURE__ */ jsx(Icon, {
										size: 15,
										className: "partner-nav-icon"
									}), /* @__PURE__ */ jsx("span", { children: item })] });
								})()
							}, item))
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "partner-logout-btn",
							onClick: () => void handleLogout(),
							"aria-label": "Logout from partner dashboard",
							children: [/* @__PURE__ */ jsx(LogOut, { size: 14 }), " Logout"]
						})
					]
				}),
				/* @__PURE__ */ jsxs("section", {
					className: "partner-content-shell",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "partner-content-topbar",
							children: [/* @__PURE__ */ jsxs("header", {
								className: "partner-content-head",
								children: [
									/* @__PURE__ */ jsxs("h1", { children: ["Welcome ", partnerName] }),
									effectiveCoins === 0 ? /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "partner-recharge-alert",
										onClick: () => {
											navigate({ to: "/partner-page/coins" });
										},
										children: "Recharge Coins to Get Leads"
									}) : null,
									scopeError ? /* @__PURE__ */ jsx("p", {
										className: "partner-auth-error",
										children: scopeError
									}) : null,
									activePickup ? /* @__PURE__ */ jsxs("div", {
										className: "lead-booking-box partner-active-pickup-alert",
										style: { marginTop: 10 },
										children: [
											/* @__PURE__ */ jsx("h3", { children: "Active Pickup Alert" }),
											/* @__PURE__ */ jsxs("p", { children: [
												"You have scheduled pickup: ",
												activePickup.seller.name || "Customer",
												" | ",
												activePickup.selectedModel.modelName
											] }),
											/* @__PURE__ */ jsxs("p", { children: [
												"Elapsed: ",
												activePickupElapsed,
												" | Status: ",
												activePickup.status
											] }),
											/* @__PURE__ */ jsx("button", {
												type: "button",
												className: "lead-book-btn",
												onClick: () => {
													navigate({
														to: "/service-Leads/transaction",
														search: { leadId: activePickup.id }
													});
												},
												children: "Open Active Pickup"
											})
										]
									}) : null
								]
							}), /* @__PURE__ */ jsxs("div", {
								className: `partner-pincode-block partner-pincode-top-right${!showPincodeControls ? " partner-pincode-collapsed" : ""}`,
								onClick: () => {
									if (!showPincodeControls) setShowPincodeControls(true);
								},
								role: "button",
								tabIndex: 0,
								onKeyDown: (event) => {
									if (!showPincodeControls && (event.key === "Enter" || event.key === " ")) {
										event.preventDefault();
										setShowPincodeControls(true);
									}
								},
								"aria-label": "Reveal pincode input",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "partner-pincode-title",
										children: [/* @__PURE__ */ jsx(MapPin, { size: 12 }), /* @__PURE__ */ jsx("span", { children: "Pincode" })]
									}),
									showPincodeControls ? /* @__PURE__ */ jsxs("div", {
										className: "partner-pincode-controls",
										children: [/* @__PURE__ */ jsx("input", {
											type: "text",
											inputMode: "numeric",
											maxLength: 6,
											placeholder: "Enter pincode",
											value: pincodeInput,
											onChange: (event) => setPincodeInput(event.target.value)
										}), /* @__PURE__ */ jsxs("button", {
											type: "button",
											onClick: applyPincode,
											children: [/* @__PURE__ */ jsx(MapPin, { size: 11 }), /* @__PURE__ */ jsx("span", { children: isApplyingScope ? "Applying..." : "Apply" })]
										})]
									}) : null,
									showPincodeControls && /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "partner-pincode-reveal partner-pincode-hide",
										onClick: (event) => {
											event.stopPropagation();
											setShowPincodeControls(false);
										},
										children: "Hide"
									}),
									/* @__PURE__ */ jsxs("p", { children: [
										"Current: ",
										selectedPincode,
										scopeLocation ? ` | ${scopeLocation.district}, ${scopeLocation.state}` : ""
									] })
								]
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "partner-lead-actions",
							children: /* @__PURE__ */ jsxs("aside", {
								className: "partner-right-tiles",
								"aria-label": "Lead summary",
								children: [/* @__PURE__ */ jsx(Link, {
									to: "/Lead-bucket",
									className: "partner-flash-tile partner-flash-button",
									onClick: handleRestrictedNavigation,
									"aria-disabled": serviceabilityStatus !== "ACTIVE",
									children: /* @__PURE__ */ jsx("h3", { children: "Click for Lead Bucket" })
								}), /* @__PURE__ */ jsx(Link, {
									to: "/service-Leads",
									className: "partner-flash-tile partner-flash-button",
									onClick: handleServiceLeadsNavigation,
									"aria-disabled": serviceabilityStatus !== "ACTIVE",
									children: /* @__PURE__ */ jsx("h3", { children: "Service Leads Today" })
								})]
							})
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "partner-kpi-grid partner-kpi-grid-vertical",
							children: [/* @__PURE__ */ jsxs("article", { children: [/* @__PURE__ */ jsxs("h2", { children: [/* @__PURE__ */ jsx(Users, { size: 14 }), /* @__PURE__ */ jsx("span", { children: "Weekly Leads" })] }), /* @__PURE__ */ jsx("p", { children: kpi.weeklyLeads })] }), /* @__PURE__ */ jsxs("article", { children: [/* @__PURE__ */ jsxs("h2", { children: [/* @__PURE__ */ jsx(Coins, { size: 14 }), /* @__PURE__ */ jsx("span", { children: "Coins" })] }), /* @__PURE__ */ jsx("p", { children: effectiveCoins })] })]
						}),
						/* @__PURE__ */ jsx("article", {
							className: "partner-detail-card",
							children: /* @__PURE__ */ jsxs("h2", { children: [activeItem, " Details"] })
						})
					]
				}),
				showWalletGuardModal ? /* @__PURE__ */ jsx("div", {
					className: "partner-modal-backdrop",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "Wallet recharge required",
					children: /* @__PURE__ */ jsxs("section", {
						className: "partner-modal-card",
						children: [
							/* @__PURE__ */ jsx("h2", { children: "Wallet Recharge Required" }),
							/* @__PURE__ */ jsx("p", { children: "Dear Partner, please wallet recharge to get leads and pickup devices." }),
							pendingRechargeCount > 0 ? /* @__PURE__ */ jsxs("p", { children: [
								"You already have ",
								pendingRechargeCount,
								" recharge request(s) pending admin approval."
							] }) : null,
							/* @__PURE__ */ jsxs("div", {
								className: "partner-modal-actions",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "partner-submit-btn",
									onClick: () => {
										setShowWalletGuardModal(false);
										navigate({ to: "/partner-page/coins" });
									},
									children: "Wallet Recharge"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "partner-upload-btn",
									onClick: () => setShowWalletGuardModal(false),
									children: "Cancel"
								})]
							})
						]
					})
				}) : null
			]
		}),
		/* @__PURE__ */ jsx(PartnerDashboardCompactFooter, {}),
		/* @__PURE__ */ jsx(SupportFab, {})
	] });
}
//#endregion
export { PartnerDashboardPage as component };
