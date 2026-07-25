import { n as clearRoleSession, r as getActiveRole } from "./role-session-C7kgx143.js";
import { C as getPincodeAvailability, t as ApiClientError } from "./gadgetpe-client-Cg3AtJY8.js";
import { t as getBrandLogoUrl } from "./brand-logos-DBEDvOjI.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Coins, History, IndianRupee, ListChecks, Mail, MapPin, Menu, PackageCheck, PhoneCall, Search, Send, ShieldCheck, Smartphone, Truck, UserRound } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/user.tsx?tsr-split=component
var topPhones = [];
var brands = [
	{
		name: "Apple",
		logoUrl: getBrandLogoUrl("Apple") ?? "https://logo.clearbit.com/apple.com"
	},
	{
		name: "Xiaomi",
		logoUrl: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/xiaomi-mi-logo-icon.png"
	},
	{
		name: "Samsung",
		logoUrl: getBrandLogoUrl("Samsung") ?? "https://logo.clearbit.com/samsung.com"
	},
	{
		name: "Vivo",
		logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/Vivo_Logo.svg"
	},
	{
		name: "OnePlus",
		logoUrl: getBrandLogoUrl("OnePlus") ?? "https://logo.clearbit.com/oneplus.com"
	},
	{
		name: "OPPO",
		logoUrl: getBrandLogoUrl("OPPO") ?? "https://logo.clearbit.com/oppo.com"
	},
	{
		name: "realme",
		logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Realme-realme-_logo_box-RGB-01.png"
	}
];
var faqs = [
	"Where can I learn the price of my old phone?",
	"What should I check before selling my device?",
	"Can I cancel my pickup after booking?",
	"How long does it take to receive payment?"
];
var userReviews = [
	{
		name: "Rohan",
		city: "Bengaluru",
		quote: "Booked pickup in less than 2 minutes. The partner arrived on time and payment was reflected the same evening.",
		device: "iPhone 13",
		amount: "Rs. 29,400"
	},
	{
		name: "Priya",
		city: "Pune",
		quote: "Condition check was transparent and exactly matched the app flow. No last-minute price drop during pickup.",
		device: "Samsung S22",
		amount: "Rs. 21,800"
	},
	{
		name: "Aditya",
		city: "Hyderabad",
		quote: "I sold my tablet and phone in one week. Dashboard updates were clear and I could track every stage.",
		device: "iPad Air",
		amount: "Rs. 24,100"
	},
	{
		name: "Sneha",
		city: "Mumbai",
		quote: "Best part was doorstep pickup slot flexibility. Rebooking was simple and support helped quickly.",
		device: "OnePlus 11R",
		amount: "Rs. 18,600"
	}
];
var searchableItems = [
	{
		id: "sell-now",
		label: "Sell Now",
		type: "Page",
		href: "/user/sell-phone",
		keywords: [
			"sell",
			"phone",
			"quote",
			"instant",
			"now"
		]
	},
	{
		id: "how-it-works",
		label: "How It Works",
		type: "Section",
		href: "#how",
		keywords: [
			"how",
			"works",
			"steps",
			"process",
			"pickup",
			"payment",
			"verify"
		]
	},
	{
		id: "become-partner",
		label: "Become Our Partner",
		type: "Page",
		href: "/partner",
		keywords: [
			"partner",
			"join",
			"business",
			"become"
		]
	},
	{
		id: "help-faq",
		label: "Help & FAQ",
		type: "Section",
		href: "#faq",
		keywords: [
			"help",
			"faq",
			"question",
			"support",
			"cancel",
			"price"
		]
	},
	{
		id: "top-brands",
		label: "Top Brands",
		type: "Section",
		href: "#top-brands",
		keywords: [
			"brands",
			"apple",
			"samsung",
			"xiaomi",
			"vivo",
			"oneplus",
			"oppo",
			"realme",
			"brand"
		]
	},
	{
		id: "hero-sell",
		label: "Get Instant Quote",
		type: "Action",
		href: "#sell",
		keywords: [
			"quote",
			"price",
			"instant",
			"value",
			"check"
		]
	},
	{
		id: "login",
		label: "Seller Login",
		type: "Action",
		href: "/user/login",
		keywords: [
			"login",
			"sign in",
			"account",
			"seller"
		]
	},
	{
		id: "brand-apple",
		label: "Apple",
		type: "Brand",
		href: "/user/sell-phone",
		keywords: [
			"apple",
			"iphone",
			"ipad",
			"ios"
		]
	},
	{
		id: "brand-samsung",
		label: "Samsung",
		type: "Brand",
		href: "/user/sell-phone",
		keywords: [
			"samsung",
			"galaxy",
			"android"
		]
	},
	{
		id: "brand-xiaomi",
		label: "Xiaomi / Mi",
		type: "Brand",
		href: "/user/sell-phone",
		keywords: [
			"xiaomi",
			"mi",
			"redmi",
			"poco"
		]
	},
	{
		id: "brand-oneplus",
		label: "OnePlus",
		type: "Brand",
		href: "/user/sell-phone",
		keywords: ["oneplus", "one plus"]
	},
	{
		id: "brand-vivo",
		label: "Vivo",
		type: "Brand",
		href: "/user/sell-phone",
		keywords: ["vivo"]
	},
	{
		id: "brand-oppo",
		label: "OPPO",
		type: "Brand",
		href: "/user/sell-phone",
		keywords: ["oppo"]
	},
	{
		id: "brand-realme",
		label: "realme",
		type: "Brand",
		href: "/user/sell-phone",
		keywords: ["realme"]
	},
	{
		id: "faq-1",
		label: "Where can I learn the price of my old phone?",
		type: "FAQ",
		href: "#faq",
		keywords: [
			"price",
			"old",
			"phone",
			"learn",
			"value"
		]
	},
	{
		id: "faq-2",
		label: "What should I check before selling my device?",
		type: "FAQ",
		href: "#faq",
		keywords: [
			"check",
			"before",
			"selling",
			"device",
			"condition"
		]
	},
	{
		id: "faq-3",
		label: "Can I cancel my pickup after booking?",
		type: "FAQ",
		href: "#faq",
		keywords: [
			"cancel",
			"pickup",
			"booking"
		]
	},
	{
		id: "faq-4",
		label: "How long does it take to receive payment?",
		type: "FAQ",
		href: "#faq",
		keywords: [
			"payment",
			"receive",
			"time",
			"how long",
			"payout"
		]
	},
	{
		id: "sell-tablet",
		label: "Sell Tablet",
		type: "Page",
		href: "/user/sell-tablet",
		keywords: [
			"tablet",
			"ipad",
			"sell",
			"tab"
		]
	},
	{
		id: "pickup-status",
		label: "Pickup Status",
		type: "Page",
		href: "/user/pickup-status",
		keywords: [
			"pickup",
			"status",
			"track",
			"schedule"
		]
	},
	{
		id: "my-listings",
		label: "My Listings",
		type: "Page",
		href: "/user/my-listings",
		keywords: [
			"listings",
			"my",
			"active",
			"sold"
		]
	},
	{
		id: "payments",
		label: "Payments",
		type: "Page",
		href: "/user/payments",
		keywords: [
			"payments",
			"payout",
			"upi",
			"settlement"
		]
	}
];
var footerQuickLinks = [
	{
		label: "Sell Phone",
		href: "#sell",
		icon: Smartphone
	},
	{
		label: "How It Works",
		href: "#how",
		icon: PackageCheck
	},
	{
		label: "Top Brands",
		href: "#top-brands",
		icon: ShieldCheck
	},
	{
		label: "FAQ",
		href: "#faq",
		icon: ListChecks
	}
];
var footerServiceLinks = [
	{
		label: "Free Pickup",
		href: "#how",
		icon: Truck
	},
	{
		label: "Instant Quote",
		href: "#sell",
		icon: IndianRupee
	},
	{
		label: "Seller Login",
		href: "/user/login",
		icon: UserRound
	},
	{
		label: "Partner Support",
		href: "#faq",
		icon: Coins
	}
];
var HERO_WORDS = [
	"Phones",
	"Tablets",
	"iPads"
];
var USER_TOKEN_KEY = "gadgetpe_user_access_token";
var USER_NAME_KEY = "gadgetpe_user_name";
var SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
var MEDAL_RIBBON_IMAGE_URL = "https://thumbs.dreamstime.com/b/champion-gold-silver-bronze-medal-blue-ribbon-icon-sign-first-second-third-place-isolated-transparent-background-151611665.jpg";
var USER_SCOPE_KEY = "gadgetpe_user_scope";
var USER_POST_LOGIN_SELL_MODAL_FLAG_KEY = "gadgetpe_user_post_login_sell_modal";
var sellerActions = [
	{
		title: "List Device",
		description: "Create a new device listing with expected price.",
		icon: Smartphone,
		to: "/user/list-device"
	},
	{
		title: "Pickup Status",
		description: "Watch pickup scheduling and partner movement live.",
		icon: Truck,
		to: "/user/pickup-status"
	},
	{
		title: "Payments",
		description: "Review payouts, pending settlements, and UPI status.",
		icon: IndianRupee,
		to: "/user/payments"
	}
];
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
function HeroIconShield() {
	return /* @__PURE__ */ jsx(ShieldCheck, { size: 16 });
}
function HeroIconTruck() {
	return /* @__PURE__ */ jsx(Truck, { size: 16 });
}
function HeroIconMoney() {
	return /* @__PURE__ */ jsx(IndianRupee, { size: 16 });
}
function UserFooter() {
	return /* @__PURE__ */ jsxs("footer", {
		className: "gp-user-footer",
		children: [/* @__PURE__ */ jsxs("div", {
			className: "gp-wrap gp-user-footer-grid",
			children: [
				/* @__PURE__ */ jsxs("div", {
					className: "gp-user-footer-brand",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "gp-user-footer-logo",
							children: "GadgetPe"
						}),
						/* @__PURE__ */ jsx("p", { children: "Sell phones and tablets with instant quotes, doorstep pickup, and fast payouts across supported pincodes." }),
						/* @__PURE__ */ jsxs("div", {
							className: "gp-user-footer-social",
							"aria-label": "Contact shortcuts",
							children: [
								/* @__PURE__ */ jsx("a", {
									href: "#sell",
									"aria-label": "Message GadgetPe",
									children: /* @__PURE__ */ jsx(Send, { size: 18 })
								}),
								/* @__PURE__ */ jsx("a", {
									href: "mailto:support@gadgetpe.com",
									"aria-label": "Email GadgetPe",
									children: /* @__PURE__ */ jsx(Mail, { size: 18 })
								}),
								/* @__PURE__ */ jsx("a", {
									href: "https://wa.me/919311125745",
									target: "_blank",
									rel: "noopener noreferrer",
									"aria-label": "WhatsApp GadgetPe",
									children: /* @__PURE__ */ jsx(PhoneCall, { size: 18 })
								})
							]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "gp-user-footer-column",
					children: [/* @__PURE__ */ jsx("h3", { children: "Quick Links" }), footerQuickLinks.map((item) => {
						const Icon = item.icon;
						return /* @__PURE__ */ jsxs("a", {
							href: item.href,
							children: [/* @__PURE__ */ jsx(Icon, { size: 16 }), /* @__PURE__ */ jsx("span", { children: item.label })]
						}, item.label);
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "gp-user-footer-column",
					children: [/* @__PURE__ */ jsx("h3", { children: "Services" }), footerServiceLinks.map((item) => {
						const Icon = item.icon;
						return /* @__PURE__ */ jsxs("a", {
							href: item.href,
							children: [/* @__PURE__ */ jsx(Icon, { size: 16 }), /* @__PURE__ */ jsx("span", { children: item.label })]
						}, item.label);
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "gp-user-footer-column gp-user-footer-contact",
					children: [
						/* @__PURE__ */ jsx("h3", { children: "Contact" }),
						/* @__PURE__ */ jsxs("a", {
							href: "https://wa.me/919311125745",
							target: "_blank",
							rel: "noopener noreferrer",
							children: [/* @__PURE__ */ jsx(PhoneCall, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "+91 93111 25745" })]
						}),
						/* @__PURE__ */ jsxs("a", {
							href: "mailto:support@gadgetpe.com",
							children: [/* @__PURE__ */ jsx(Mail, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "support@gadgetpe.com" })]
						}),
						/* @__PURE__ */ jsxs("a", {
							href: "#sell",
							children: [/* @__PURE__ */ jsx(MapPin, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Serviceable pincodes across India" })]
						})
					]
				})
			]
		}), /* @__PURE__ */ jsxs("div", {
			className: "gp-wrap gp-user-footer-bottom",
			children: [/* @__PURE__ */ jsx("span", { children: "© 2026 GadgetPe. All rights reserved." }), /* @__PURE__ */ jsx("span", { children: "Privacy Policy · Terms · Support" })]
		})]
	});
}
function UserPage() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (state) => state.location.pathname });
	const [isHydrated, setIsHydrated] = useState(false);
	const [blockedByRole, setBlockedByRole] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [showSellModal, setShowSellModal] = useState(false);
	const [showPincodeModal, setShowPincodeModal] = useState(false);
	const [hamburgerOpen, setHamburgerOpen] = useState(false);
	const [sellingHistory, setSellingHistory] = useState([]);
	const [pincodeInput, setPincodeInput] = useState("");
	const [isCheckingPincode, setIsCheckingPincode] = useState(false);
	const [selectedCityName, setSelectedCityName] = useState("");
	const [failedBrandLogos, setFailedBrandLogos] = useState({});
	const [sellerName, setSellerName] = useState("Seller");
	const [wordIndex, setWordIndex] = useState(0);
	const [typedText, setTypedText] = useState("");
	const [isDeleting, setIsDeleting] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [showSearchResults, setShowSearchResults] = useState(false);
	const [activeReviewIndex, setActiveReviewIndex] = useState(0);
	const searchRef = useRef(null);
	const searchResults = searchQuery.trim().length > 0 ? searchableItems.filter((item) => {
		const q = searchQuery.toLowerCase();
		return item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q));
	}).slice(0, 8) : [];
	const handleSearchFocus = useCallback(() => {
		if (searchQuery.trim()) setShowSearchResults(true);
	}, [searchQuery]);
	useEffect(() => {
		function handleClickOutside(e) {
			if (searchRef.current && !searchRef.current.contains(e.target)) setShowSearchResults(false);
		}
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);
	const [priceTickers, setPriceTickers] = useState(() => {
		const seeded = {};
		topPhones.forEach((phoneItem, index) => {
			const key = `${phoneItem.name}-${phoneItem.variant}`;
			seeded[key] = {
				value: phoneItem.basePrice,
				trend: index % 2 === 0 ? "up" : "down",
				changePercent: 0,
				pulse: 0
			};
		});
		return seeded;
	});
	useEffect(() => {
		const activeRole = getActiveRole();
		if (activeRole === "admin") {
			setBlockedByRole(true);
			navigate({ to: "/admin" });
			return;
		}
		if (activeRole === "partner") {
			setBlockedByRole(true);
			navigate({ to: "/partner-page" });
			return;
		}
		setBlockedByRole(false);
	}, [navigate]);
	useEffect(() => {
		if (typeof window === "undefined") return;
		const token = window.localStorage.getItem(USER_TOKEN_KEY);
		const storedName = window.localStorage.getItem(USER_NAME_KEY) || "Seller";
		setIsLoggedIn(Boolean(token));
		setSellerName(storedName);
		setSellingHistory(getSellingHistory());
		setIsHydrated(true);
	}, []);
	useEffect(() => {
		if (typeof window === "undefined") return;
		const token = window.localStorage.getItem(USER_TOKEN_KEY);
		const storedName = window.localStorage.getItem(USER_NAME_KEY) || "Seller";
		setIsLoggedIn(Boolean(token));
		setSellerName(storedName);
	}, [pathname]);
	useEffect(() => {
		const currentWord = HERO_WORDS[wordIndex];
		const isWordComplete = typedText === currentWord;
		const isWordCleared = typedText.length === 0;
		const timeout = setTimeout(() => {
			if (!isDeleting && !isWordComplete) {
				setTypedText(currentWord.slice(0, typedText.length + 1));
				return;
			}
			if (!isDeleting && isWordComplete) {
				setIsDeleting(true);
				return;
			}
			if (isDeleting && !isWordCleared) {
				setTypedText(currentWord.slice(0, typedText.length - 1));
				return;
			}
			setIsDeleting(false);
			setWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
		}, isDeleting ? 120 : isWordComplete ? 1200 : 180);
		return () => clearTimeout(timeout);
	}, [
		typedText,
		isDeleting,
		wordIndex
	]);
	useEffect(() => {
		const interval = setInterval(() => {
			setPriceTickers((prev) => {
				const next = { ...prev };
				topPhones.forEach((phoneItem, index) => {
					const key = `${phoneItem.name}-${phoneItem.variant}`;
					const current = next[key];
					const direction = (current.pulse + index) % 2 === 0 ? "up" : "down";
					const delta = 70 + (current.pulse + index) % 5 * 35;
					next[key] = {
						value: direction === "up" ? current.value + delta : Math.max(500, current.value - delta),
						trend: direction,
						changePercent: Number((delta / Math.max(1, current.value) * 100).toFixed(1)),
						pulse: current.pulse + 1
					};
				});
				return next;
			});
		}, 1800);
		return () => clearInterval(interval);
	}, []);
	useEffect(() => {
		const reviewInterval = setInterval(() => {
			setActiveReviewIndex((prev) => (prev + 1) % userReviews.length);
		}, 4500);
		return () => clearInterval(reviewInterval);
	}, []);
	useEffect(() => {
		if (!isLoggedIn || pathname !== "/user") return;
		setSellingHistory(getSellingHistory());
	}, [isLoggedIn, pathname]);
	useEffect(() => {
		if (!isLoggedIn || typeof window === "undefined") return;
		try {
			const rawScope = window.localStorage.getItem(USER_SCOPE_KEY);
			if (!rawScope) return;
			const parsed = JSON.parse(rawScope);
			const district = parsed.district || "";
			const state = parsed.state || "";
			const city = district && state ? `${district}, ${state}` : district || state || parsed.city || "";
			if (city) setSelectedCityName(city);
		} catch {}
	}, [isLoggedIn]);
	const handleLogout = () => {
		clearRoleSession("user");
		setIsLoggedIn(false);
		setShowSellModal(false);
		setShowPincodeModal(false);
		setPincodeInput("");
		setSelectedCityName("");
		setSellerName("Seller");
		toast.success("Logged out.");
	};
	const handlePincodeSelect = async (event) => {
		event.preventDefault();
		const pincode = pincodeInput.trim();
		if (!/^\d{6}$/.test(pincode)) {
			toast.error("Enter a valid 6-digit pincode.");
			return;
		}
		setIsCheckingPincode(true);
		try {
			const result = await getPincodeAvailability(pincode);
			const cityName = [result.location?.district || "", result.location?.state || ""].filter(Boolean).join(", ") || "your city";
			setSelectedCityName(cityName);
			localStorage.setItem(USER_SCOPE_KEY, JSON.stringify({
				pincode,
				status: result.status,
				city: cityName,
				state: result.location?.state || null,
				district: result.location?.district || null
			}));
			toast.success(`You have selected pincode ${pincode} (${cityName}).`);
			setShowPincodeModal(false);
		} catch (apiError) {
			const message = apiError instanceof ApiClientError ? apiError.message : "Failed to fetch pincode details.";
			toast.error(message);
		} finally {
			setIsCheckingPincode(false);
		}
	};
	useEffect(() => {
		if (!isLoggedIn || pathname !== "/user") return;
		if (typeof window === "undefined") return;
		if (window.localStorage.getItem(USER_POST_LOGIN_SELL_MODAL_FLAG_KEY) !== "1") return;
		setShowSellModal(true);
		window.localStorage.removeItem(USER_POST_LOGIN_SELL_MODAL_FLAG_KEY);
	}, [isLoggedIn, pathname]);
	if (blockedByRole) return null;
	if (!isHydrated && pathname === "/user") return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsx("section", {
			className: "user-dashboard-shell user-dashboard-shell-pro",
			children: /* @__PURE__ */ jsx("header", {
				className: "user-dashboard-hero",
				children: /* @__PURE__ */ jsxs("div", {
					className: "user-dashboard-hero-copy",
					children: [/* @__PURE__ */ jsx("div", {
						className: "user-auth-brand",
						children: "GadgetPe Seller"
					}), /* @__PURE__ */ jsx("h1", { children: "Loading dashboard..." })]
				})
			})
		})
	});
	if (isLoggedIn && pathname !== "/user") return /* @__PURE__ */ jsxs("div", {
		className: "user-page-outer",
		children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(UserFooter, {})]
	});
	if (pathname !== "/user") return /* @__PURE__ */ jsxs("div", {
		className: "user-page-outer",
		children: [/* @__PURE__ */ jsx(Outlet, {}), /* @__PURE__ */ jsx(UserFooter, {})]
	});
	return /* @__PURE__ */ jsxs("main", {
		className: "gp-page",
		children: [
			/* @__PURE__ */ jsxs("header", {
				className: "gp-header",
				children: [/* @__PURE__ */ jsxs("div", {
					className: "gp-wrap gp-head-row",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "gp-logo",
							children: "GadgetPe"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "gp-search-bar",
							ref: searchRef,
							children: [
								/* @__PURE__ */ jsx(Search, {
									size: 16,
									className: "gp-search-icon",
									"aria-hidden": "true"
								}),
								/* @__PURE__ */ jsx("input", {
									type: "search",
									className: "gp-search-input",
									placeholder: "Search phones, brands, FAQs, sections…",
									value: searchQuery,
									autoComplete: "off",
									onChange: (e) => {
										setSearchQuery(e.target.value);
										setShowSearchResults(e.target.value.trim().length > 0);
									},
									onFocus: handleSearchFocus,
									"aria-label": "Search page content"
								}),
								searchQuery && /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "gp-search-clear",
									"aria-label": "Clear search",
									onClick: () => {
										setSearchQuery("");
										setShowSearchResults(false);
									},
									children: "✕"
								}),
								showSearchResults && searchResults.length > 0 && /* @__PURE__ */ jsx("div", {
									className: "gp-search-results",
									role: "listbox",
									"aria-label": "Search results",
									children: searchResults.map((result) => /* @__PURE__ */ jsxs("a", {
										href: result.href,
										className: "gp-search-result-item",
										role: "option",
										"aria-selected": "false",
										onClick: () => {
											setSearchQuery("");
											setShowSearchResults(false);
										},
										children: [/* @__PURE__ */ jsx("span", {
											className: "gp-search-result-label",
											children: result.label
										}), /* @__PURE__ */ jsx("span", {
											className: "gp-search-result-type",
											children: result.type
										})]
									}, result.id))
								}),
								showSearchResults && searchQuery.trim().length > 0 && searchResults.length === 0 && /* @__PURE__ */ jsx("div", {
									className: "gp-search-results gp-search-empty",
									children: /* @__PURE__ */ jsxs("span", { children: [
										"No results for “",
										searchQuery,
										"”"
									] })
								})
							]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "gp-head-actions",
							children: isLoggedIn ? /* @__PURE__ */ jsxs("div", {
								className: "user-top-menu-wrap",
								style: {
									display: "flex",
									alignItems: "center",
									gap: 10,
									position: "relative"
								},
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "gp-hamburger",
									"aria-label": "Menu",
									"aria-expanded": hamburgerOpen,
									onClick: () => setHamburgerOpen((prev) => !prev),
									children: /* @__PURE__ */ jsx(Menu, {
										size: 20,
										color: "#3d4a5c"
									})
								}), hamburgerOpen && /* @__PURE__ */ jsxs("nav", {
									className: "gp-hamburger-menu",
									"aria-label": "Seller actions",
									children: [
										/* @__PURE__ */ jsxs("div", {
											className: "gp-hm-profile",
											children: [/* @__PURE__ */ jsx("div", {
												className: "gp-hm-avatar",
												children: sellerName.charAt(0).toUpperCase()
											}), /* @__PURE__ */ jsxs("div", {
												className: "gp-hm-profile-info",
												children: [/* @__PURE__ */ jsx("span", {
													className: "gp-hm-profile-name",
													children: sellerName
												}), /* @__PURE__ */ jsx("span", {
													className: "gp-hm-profile-role",
													children: "GadgetPe Seller"
												})]
											})]
										}),
										/* @__PURE__ */ jsx("div", { className: "gp-hm-divider" }),
										sellerActions.map((action) => {
											const Icon = action.icon;
											return /* @__PURE__ */ jsxs("button", {
												type: "button",
												className: "gp-hamburger-item",
												onClick: () => {
													setHamburgerOpen(false);
													navigate({ to: action.to });
												},
												children: [/* @__PURE__ */ jsx(Icon, { size: 16 }), /* @__PURE__ */ jsx("span", { children: action.title })]
											}, action.title);
										}),
										/* @__PURE__ */ jsxs("button", {
											type: "button",
											className: "gp-hamburger-item",
											onClick: () => {
												setHamburgerOpen(false);
												navigate({ to: "/user/selling-history" });
											},
											children: [/* @__PURE__ */ jsx(History, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Order History" })]
										}),
										/* @__PURE__ */ jsxs("button", {
											type: "button",
											className: "gp-hamburger-item",
											onClick: () => {
												setHamburgerOpen(false);
												navigate({ to: "/user/profile" });
											},
											children: [/* @__PURE__ */ jsx(UserRound, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Profile" })]
										}),
										/* @__PURE__ */ jsx("div", { className: "gp-hm-divider" }),
										/* @__PURE__ */ jsxs("button", {
											type: "button",
											className: "gp-hamburger-item gp-hm-logout",
											onClick: () => {
												setHamburgerOpen(false);
												handleLogout();
											},
											children: [/* @__PURE__ */ jsx("span", {
												className: "gp-hm-logout-icon",
												children: "↩"
											}), /* @__PURE__ */ jsx("span", { children: "Logout" })]
										})
									]
								})]
							}) : /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "gp-login",
								onClick: () => {
									navigate({ to: "/user/login" });
								},
								children: "Login"
							})
						})
					]
				}), /* @__PURE__ */ jsx("div", {
					className: "gp-wrap gp-nav-row",
					children: /* @__PURE__ */ jsxs("nav", {
						className: "gp-nav",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "gp-nav-item",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "gp-nav-trigger",
									children: ["All ", /* @__PURE__ */ jsx("span", {
										className: "gp-nav-chevron",
										children: "▾"
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "gp-dropdown",
									children: [
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone",
											children: "Sell Phones"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "Sell iPads"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "Sell Tablets"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "#how",
											children: "How It Works"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/partner",
											children: "Become Our Partner"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "#faq",
											children: "Help"
										})
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "gp-nav-item",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "gp-nav-trigger",
									children: ["Sell Phones ", /* @__PURE__ */ jsx("span", {
										className: "gp-nav-chevron",
										children: "▾"
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "gp-dropdown",
									children: [
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone",
											children: "All Phones"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone?brand=Apple",
											children: "Apple"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone?brand=Samsung",
											children: "Samsung"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone?brand=Xiaomi",
											children: "Xiaomi"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone?brand=OnePlus",
											children: "OnePlus"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone?brand=Vivo",
											children: "Vivo"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone?brand=OPPO",
											children: "OPPO"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-phone?brand=realme",
											children: "realme"
										})
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "gp-nav-item",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "gp-nav-trigger",
									children: ["Sell iPads ", /* @__PURE__ */ jsx("span", {
										className: "gp-nav-chevron",
										children: "▾"
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "gp-dropdown",
									children: [
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "iPad Air"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "iPad Pro"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "iPad mini"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "iPad (standard)"
										})
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "gp-nav-item",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "gp-nav-trigger",
									children: ["Sell Tablets ", /* @__PURE__ */ jsx("span", {
										className: "gp-nav-chevron",
										children: "▾"
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "gp-dropdown",
									children: [
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "All Tablets & iPads"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "Samsung Tabs"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "Xiaomi Tabs"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "/user/sell-tablet",
											children: "Other Tablets"
										})
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "gp-nav-item",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "gp-nav-trigger",
									children: ["How It Works ", /* @__PURE__ */ jsx("span", {
										className: "gp-nav-chevron",
										children: "▾"
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "gp-dropdown",
									children: [
										/* @__PURE__ */ jsx("a", {
											href: "#how",
											children: "Check Price"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "#how",
											children: "Schedule Pickup"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "#how",
											children: "Get Paid"
										})
									]
								})]
							}),
							/* @__PURE__ */ jsx("div", {
								className: "gp-nav-item gp-nav-item-partner",
								children: /* @__PURE__ */ jsx("a", {
									className: "gp-nav-link-partner",
									href: "/partner",
									children: "Become Our Partner"
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "gp-nav-item",
								children: [/* @__PURE__ */ jsxs("span", {
									className: "gp-nav-trigger",
									children: ["Help ", /* @__PURE__ */ jsx("span", {
										className: "gp-nav-chevron",
										children: "▾"
									})]
								}), /* @__PURE__ */ jsxs("div", {
									className: "gp-dropdown",
									children: [
										/* @__PURE__ */ jsx("a", {
											href: "#faq",
											children: "FAQ"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "#faq",
											children: "Pickup Issues"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "#faq",
											children: "Payment Issues"
										}),
										/* @__PURE__ */ jsx("a", {
											href: "mailto:support@gadgetpe.local",
											children: "Contact Us"
										})
									]
								})]
							})
						]
					})
				})]
			}),
			isLoggedIn && /* @__PURE__ */ jsxs("div", {
				style: {
					padding: "8px 24px",
					background: "#f0f4f8",
					borderBottom: "1px solid #e2e8f0",
					display: "flex",
					alignItems: "center",
					gap: 16,
					fontSize: 13,
					color: "#3d4a5c"
				},
				children: [/* @__PURE__ */ jsxs("span", { children: ["Hello, ", /* @__PURE__ */ jsx("strong", { children: sellerName })] }), selectedCityName ? /* @__PURE__ */ jsxs("span", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 4,
						color: "#64748b"
					},
					children: [/* @__PURE__ */ jsx(MapPin, { size: 13 }), selectedCityName]
				}) : /* @__PURE__ */ jsxs("button", {
					type: "button",
					style: {
						display: "flex",
						alignItems: "center",
						gap: 4,
						background: "none",
						border: "none",
						color: "#3b82f6",
						cursor: "pointer",
						fontSize: 13,
						padding: 0
					},
					onClick: () => setShowPincodeModal(true),
					children: [/* @__PURE__ */ jsx(MapPin, { size: 13 }), "Set your pincode"]
				})]
			}),
			/* @__PURE__ */ jsx("section", {
				className: "hero",
				id: "sell",
				children: /* @__PURE__ */ jsxs("div", { children: [
					/* @__PURE__ */ jsx("span", {
						className: "badge-pill",
						children: "🏆 #1 Rated Gadget Marketplace"
					}),
					/* @__PURE__ */ jsxs("h1", {
						className: "h1",
						children: [
							"Sell Your ",
							/* @__PURE__ */ jsx("span", {
								className: "hero-typeword",
								children: typedText
							}),
							".",
							/* @__PURE__ */ jsx("br", {}),
							"Get the Best Price."
						]
					}),
					/* @__PURE__ */ jsx("p", {
						className: "sub",
						children: "Instant valuations. Free pickup. Instant payment. Join 50,000+ happy sellers."
					}),
					/* @__PURE__ */ jsx("div", {
						className: "cta-row",
						children: /* @__PURE__ */ jsx("button", {
							type: "button",
							className: "cta-green",
							onClick: () => {
								if (isLoggedIn) navigate({ to: "/user/sell-phone" });
								else navigate({
									to: "/user/login",
									search: { redirectTo: "/user/sell-phone" }
								});
							},
							children: "Sell Now"
						})
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "trust-row",
						children: [
							/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx(HeroIconShield, {}), " Secure"] }),
							/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx(HeroIconTruck, {}), " Easy Pickup"] }),
							/* @__PURE__ */ jsxs("span", { children: [/* @__PURE__ */ jsx(HeroIconMoney, {}), " Fast Payment"] })
						]
					})
				] })
			}),
			/* @__PURE__ */ jsx("section", {
				className: "gp-section",
				id: "top-brands",
				children: /* @__PURE__ */ jsxs("div", {
					className: "gp-wrap",
					children: [/* @__PURE__ */ jsx("h2", { children: "Top Brands" }), /* @__PURE__ */ jsx("div", {
						className: "gp-brand-strip",
						children: brands.map((brand) => /* @__PURE__ */ jsxs("span", {
							className: "gp-brand-item",
							children: [/* @__PURE__ */ jsx("span", {
								className: "gp-brand-logo-wrap",
								children: failedBrandLogos[brand.name] ? /* @__PURE__ */ jsx("span", {
									className: "gp-brand-logo-fallback",
									"aria-hidden": "true",
									children: brand.name.charAt(0)
								}) : /* @__PURE__ */ jsx("img", {
									src: brand.logoUrl,
									alt: `${brand.name} logo`,
									className: "gp-brand-logo",
									loading: "lazy",
									onError: () => setFailedBrandLogos((prev) => ({
										...prev,
										[brand.name]: true
									}))
								})
							}), /* @__PURE__ */ jsx("span", { children: brand.name })]
						}, brand.name))
					})]
				})
			}),
			/* @__PURE__ */ jsx("section", {
				className: "gp-section gp-how-tone",
				id: "how",
				children: /* @__PURE__ */ jsxs("div", {
					className: "gp-wrap",
					children: [/* @__PURE__ */ jsx("h2", { children: "How GadgetPe Works" }), /* @__PURE__ */ jsxs("div", {
						className: "gp-steps",
						children: [
							/* @__PURE__ */ jsxs("article", { children: [
								/* @__PURE__ */ jsx("div", {
									className: "gp-icon",
									children: "1"
								}),
								/* @__PURE__ */ jsx("h3", { children: "Check Price" }),
								/* @__PURE__ */ jsx("p", { children: "Select your device and tell us about its condition for an instant quote." })
							] }),
							/* @__PURE__ */ jsxs("article", { children: [
								/* @__PURE__ */ jsx("div", {
									className: "gp-icon",
									children: "2"
								}),
								/* @__PURE__ */ jsx("h3", { children: "Schedule Pickup" }),
								/* @__PURE__ */ jsx("p", { children: "Choose a convenient slot and our pickup partner arrives at your doorstep." })
							] }),
							/* @__PURE__ */ jsxs("article", { children: [
								/* @__PURE__ */ jsx("div", {
									className: "gp-icon",
									children: "3"
								}),
								/* @__PURE__ */ jsx("h3", { children: "Get Paid" }),
								/* @__PURE__ */ jsx("p", { children: "After quick verification, payment is processed directly to your account." })
							] })
						]
					})]
				})
			}),
			/* @__PURE__ */ jsx("section", {
				className: "gp-section",
				id: "faq",
				children: /* @__PURE__ */ jsxs("div", {
					className: "gp-wrap",
					children: [/* @__PURE__ */ jsx("h2", { children: "FAQ" }), /* @__PURE__ */ jsx("div", {
						className: "gp-faq-list",
						children: faqs.map((item) => /* @__PURE__ */ jsxs("details", { children: [/* @__PURE__ */ jsx("summary", { children: item }), /* @__PURE__ */ jsx("p", { children: "Login or request a quote to manage your device sale, pickup scheduling, and payment updates." })] }, item))
					})]
				})
			}),
			isLoggedIn && showSellModal && /* @__PURE__ */ jsx("div", {
				className: "user-auth-overlay",
				role: "dialog",
				"aria-modal": "true",
				children: /* @__PURE__ */ jsxs("section", {
					className: "user-auth-card user-sell-modal",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "user-sell-badge-strip",
							"aria-hidden": "true",
							children: /* @__PURE__ */ jsxs("div", {
								className: "user-sell-badge-track",
								children: [
									/* @__PURE__ */ jsx("span", {
										className: "sell-badge sell-badge-gold",
										style: { backgroundImage: `url(${MEDAL_RIBBON_IMAGE_URL})` }
									}),
									/* @__PURE__ */ jsx("span", {
										className: "sell-badge sell-badge-silver",
										style: { backgroundImage: `url(${MEDAL_RIBBON_IMAGE_URL})` }
									}),
									/* @__PURE__ */ jsx("span", {
										className: "sell-badge sell-badge-bronze",
										style: { backgroundImage: `url(${MEDAL_RIBBON_IMAGE_URL})` }
									})
								]
							})
						}),
						/* @__PURE__ */ jsx("div", {
							className: "user-auth-brand",
							children: "GadgetPe Seller Boost"
						}),
						/* @__PURE__ */ jsx("h1", { children: "You are ready to win today." }),
						/* @__PURE__ */ jsx("p", { children: "List your gadgets now and climb from Bronze to Gold with every successful sale." }),
						/* @__PURE__ */ jsx("div", {
							className: "user-auth-actions",
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit user-sell-cta",
								onClick: () => {
									setShowSellModal(false);
									setShowPincodeModal(true);
								},
								children: "Sell"
							})
						})
					]
				})
			}),
			isLoggedIn && showPincodeModal && /* @__PURE__ */ jsx("div", {
				className: "user-auth-overlay",
				role: "dialog",
				"aria-modal": "true",
				children: /* @__PURE__ */ jsxs("section", {
					className: "user-auth-card user-pincode-modal",
					children: [
						/* @__PURE__ */ jsx("div", {
							className: "user-pincode-layer user-pincode-layer-a",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ jsx("div", {
							className: "user-pincode-layer user-pincode-layer-b",
							"aria-hidden": "true"
						}),
						/* @__PURE__ */ jsx("div", {
							className: "user-auth-brand",
							children: "Choose Service Area"
						}),
						/* @__PURE__ */ jsx("h1", { children: "Select Your Pincode" }),
						/* @__PURE__ */ jsx("p", { children: "Pick your local area to start selling gadgets faster and smarter." }),
						/* @__PURE__ */ jsxs("form", {
							className: "user-auth-form",
							onSubmit: (e) => void handlePincodeSelect(e),
							children: [
								/* @__PURE__ */ jsxs("label", { children: ["Pincode", /* @__PURE__ */ jsx("input", {
									type: "text",
									inputMode: "numeric",
									maxLength: 6,
									placeholder: "Enter 6-digit pincode",
									value: pincodeInput,
									onChange: (event) => setPincodeInput(event.target.value)
								})] }),
								selectedCityName ? /* @__PURE__ */ jsxs("div", {
									className: "user-auth-hint",
									children: ["Last selected city: ", selectedCityName]
								}) : null,
								/* @__PURE__ */ jsxs("div", {
									className: "user-auth-actions",
									children: [/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "user-auth-cancel",
										onClick: () => {
											setShowPincodeModal(false);
											setPincodeInput("");
										},
										children: "Skip"
									}), /* @__PURE__ */ jsx("button", {
										type: "submit",
										className: "user-auth-submit",
										disabled: isCheckingPincode,
										children: isCheckingPincode ? "Selecting..." : "Select Pincode"
									})]
								})
							]
						})
					]
				})
			}),
			/* @__PURE__ */ jsx(UserFooter, {})
		]
	});
}
//#endregion
export { UserPage as component };
