import { r as cn, t as Button } from "./button-CCQEfgNs.js";
import { n as clearRoleSession } from "./role-session-C7kgx143.js";
import { t as Route$26 } from "./user.login-CqavoGng.js";
import { t as Route$27 } from "./user.sell-phone._brand-CTeC8MQU.js";
import { useEffect, useRef, useState } from "react";
import { HeadContent, Link, Outlet, Scripts, createFileRoute, createRootRouteWithContext, createRouter, lazyRouteComponent, redirect, useNavigate, useRouter, useRouterState } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Download, History, Menu, UserRound, WifiOff, X } from "lucide-react";
import { Toaster, toast } from "sonner";
//#region src/components/app-shell.tsx
function AppShell({ className, children, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(29,158,117,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,201,0.16),_transparent_22%),linear-gradient(180deg,_#f8fbfd_0%,_#eef4f8_100%)] text-slate-900", className),
		...props,
		children
	});
}
function AppShellHeader({ className, children, ...props }) {
	return /* @__PURE__ */ jsx("header", {
		className: cn("sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/72", className),
		...props,
		children
	});
}
function AppShellContainer({ className, children, ...props }) {
	return /* @__PURE__ */ jsx("div", {
		className: cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className),
		...props,
		children
	});
}
function AppShellMain({ className, children, ...props }) {
	return /* @__PURE__ */ jsx("main", {
		className: cn("relative flex min-h-screen flex-col", className),
		...props,
		children
	});
}
//#endregion
//#region src/components/pwa-install-banner.tsx
var DISMISS_KEY = "gadgetpe_pwa_install_banner_dismissed";
function PwaInstallBanner() {
	const [deferredPrompt, setDeferredPrompt] = useState(null);
	const [isOnline, setIsOnline] = useState(true);
	const [dismissed, setDismissed] = useState(true);
	useEffect(() => {
		if (typeof window === "undefined") return;
		setIsOnline(window.navigator.onLine);
		setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "true");
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);
		const handleBeforeInstallPrompt = (event) => {
			event.preventDefault();
			setDeferredPrompt(event);
			setDismissed(false);
		};
		const handleInstalled = () => {
			setDeferredPrompt(null);
			setDismissed(true);
			window.sessionStorage.setItem(DISMISS_KEY, "true");
		};
		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);
		window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
		window.addEventListener("appinstalled", handleInstalled);
		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
			window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
			window.removeEventListener("appinstalled", handleInstalled);
		};
	}, []);
	const closeBanner = () => {
		setDismissed(true);
		if (typeof window !== "undefined") window.sessionStorage.setItem(DISMISS_KEY, "true");
	};
	const installApp = async () => {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		if ((await deferredPrompt.userChoice).outcome !== "accepted") {
			setDismissed(false);
			return;
		}
		setDeferredPrompt(null);
		setDismissed(true);
	};
	if (dismissed && isOnline) return null;
	if (!deferredPrompt && isOnline) return null;
	return /* @__PURE__ */ jsx("div", {
		className: "border-b border-emerald-200/60 bg-emerald-50/90 backdrop-blur-xl",
		children: /* @__PURE__ */ jsxs("div", {
			className: "mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8",
			children: [/* @__PURE__ */ jsxs("div", {
				className: "flex items-start gap-3",
				children: [/* @__PURE__ */ jsx("div", {
					className: cn("mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border", isOnline ? "border-emerald-200 bg-white text-emerald-700" : "border-amber-200 bg-white text-amber-700"),
					children: isOnline ? /* @__PURE__ */ jsx(Download, { className: "h-5 w-5" }) : /* @__PURE__ */ jsx(WifiOff, { className: "h-5 w-5" })
				}), /* @__PURE__ */ jsxs("div", {
					className: "space-y-1",
					children: [/* @__PURE__ */ jsx("p", {
						className: "text-sm font-semibold text-slate-900",
						children: isOnline ? "Install GadgetPe for a better mobile experience" : "You are offline right now"
					}), /* @__PURE__ */ jsx("p", {
						className: "text-sm leading-6 text-slate-600",
						children: isOnline ? "Add GadgetPe to the home screen for faster launch, app-style navigation, and offline app-shell access." : "Previously loaded screens can still open, but live quotes, payments, and dashboard updates need a connection."
					})]
				})]
			}), /* @__PURE__ */ jsxs("div", {
				className: "flex items-center gap-2 self-end md:self-auto",
				children: [isOnline ? /* @__PURE__ */ jsx(Button, {
					className: "rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700",
					onClick: () => void installApp(),
					children: "Install app"
				}) : /* @__PURE__ */ jsx(Button, {
					className: "rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700",
					onClick: () => window.location.reload(),
					children: "Retry connection"
				}), /* @__PURE__ */ jsx(Button, {
					"aria-label": "Dismiss banner",
					className: "rounded-full",
					size: "icon",
					variant: "ghost",
					onClick: closeBanner,
					children: /* @__PURE__ */ jsx(X, { className: "h-4 w-4" })
				})]
			})]
		})
	});
}
//#endregion
//#region src/components/ui/sonner.tsx
var Toaster$1 = ({ ...props }) => {
	return /* @__PURE__ */ jsx(Toaster, {
		className: "toaster group",
		toastOptions: { classNames: {
			toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
			description: "group-[.toast]:text-muted-foreground",
			actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
			cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground"
		} },
		...props
	});
};
//#endregion
//#region src/styles.css?url
var styles_default = "/assets/styles-D4HbgyaC.css";
//#endregion
//#region src/lib/lovable-error-reporting.ts
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
//#endregion
//#region src/routes/__root.tsx
var USER_TOKEN_KEY = "gadgetpe_user_access_token";
var USER_NAME_KEY = "gadgetpe_user_name";
/** Shows only the GadgetPe logo on sub-pages (sell-phone, login, etc.).
*  Hidden on /user (has its own full header) and on admin/partner dashboards. */
function GlobalHeader() {
	const navigate = useNavigate();
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const [hamburgerOpen, setHamburgerOpen] = useState(false);
	const [isLoggedIn, setIsLoggedIn] = useState(false);
	const [sellerName, setSellerName] = useState("Seller");
	const menuWrapRef = useRef(null);
	const hide = pathname === "/user" || pathname === "/" || pathname.startsWith("/admin") || pathname.startsWith("/partner-page") || pathname.startsWith("/Lead-bucket") || pathname.startsWith("/Lead-assignment");
	useEffect(() => {
		if (typeof window === "undefined") return;
		const token = window.localStorage.getItem(USER_TOKEN_KEY);
		const storedName = window.localStorage.getItem(USER_NAME_KEY) || "Seller";
		setIsLoggedIn(Boolean(token));
		setSellerName(storedName);
	}, [pathname]);
	useEffect(() => {
		if (!hamburgerOpen) return;
		const handleClickOutside = (event) => {
			if (menuWrapRef.current && !menuWrapRef.current.contains(event.target)) setHamburgerOpen(false);
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [hamburgerOpen]);
	const showSubpageHamburger = isLoggedIn && pathname.startsWith("/user") && pathname !== "/user" && pathname !== "/user/login";
	const handleLogout = () => {
		clearRoleSession("user");
		setIsLoggedIn(false);
		setHamburgerOpen(false);
		toast.success("Logged out.");
		navigate({ to: "/user" });
	};
	if (hide) return null;
	return /* @__PURE__ */ jsx(AppShellHeader, {
		className: "shadow-[0_10px_30px_rgba(15,23,42,0.06)]",
		children: /* @__PURE__ */ jsxs(AppShellContainer, {
			className: "flex items-center justify-between py-3",
			children: [/* @__PURE__ */ jsx("a", {
				href: "/user",
				className: "text-lg font-black tracking-[-0.04em] text-slate-900 transition-colors hover:text-emerald-600 sm:text-xl",
				children: "GadgetPe"
			}), showSubpageHamburger ? /* @__PURE__ */ jsxs("div", {
				className: "relative",
				ref: menuWrapRef,
				children: [/* @__PURE__ */ jsx("button", {
					type: "button",
					className: "inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600",
					"aria-label": "Menu",
					"aria-expanded": hamburgerOpen,
					onClick: () => setHamburgerOpen((prev) => !prev),
					children: /* @__PURE__ */ jsx(Menu, {
						size: 20,
						color: "#3d4a5c"
					})
				}), hamburgerOpen ? /* @__PURE__ */ jsxs("nav", {
					className: "absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_22px_60px_rgba(15,23,42,0.18)]",
					"aria-label": "Seller actions",
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "flex items-center gap-3 rounded-3xl bg-slate-50 px-3 py-3",
							children: [/* @__PURE__ */ jsx("div", {
								className: "flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 font-bold text-emerald-700",
								children: sellerName.charAt(0).toUpperCase()
							}), /* @__PURE__ */ jsxs("div", {
								className: "flex min-w-0 flex-col",
								children: [/* @__PURE__ */ jsx("span", {
									className: "truncate text-sm font-semibold text-slate-900",
									children: sellerName
								}), /* @__PURE__ */ jsx("span", {
									className: "text-xs text-slate-500",
									children: "GadgetPe Seller"
								})]
							})]
						}),
						/* @__PURE__ */ jsx("div", { className: "my-3 h-px bg-slate-200" }),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-emerald-700",
							onClick: () => {
								setHamburgerOpen(false);
								navigate({ to: "/user/selling-history" });
							},
							children: [/* @__PURE__ */ jsx(History, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Selling History" })]
						}),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-emerald-700",
							onClick: () => {
								setHamburgerOpen(false);
								navigate({ to: "/user/profile" });
							},
							children: [/* @__PURE__ */ jsx(UserRound, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Profile" })]
						}),
						/* @__PURE__ */ jsx("div", { className: "my-3 h-px bg-slate-200" }),
						/* @__PURE__ */ jsxs("button", {
							type: "button",
							className: "flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50",
							onClick: handleLogout,
							children: [/* @__PURE__ */ jsx("span", { children: "↩" }), /* @__PURE__ */ jsx("span", { children: "Logout" })]
						})
					]
				}) : null]
			}) : null]
		})
	});
}
function NotFoundComponent() {
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ jsx("h1", {
					className: "text-7xl font-bold",
					children: "404"
				}),
				/* @__PURE__ */ jsx("p", {
					className: "mt-2 text-sm",
					children: "Page not found"
				}),
				/* @__PURE__ */ jsx("div", {
					className: "mt-6",
					children: /* @__PURE__ */ jsx(Link, {
						to: "/",
						className: "underline",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	useEffect(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ jsx("div", {
		className: "flex min-h-screen items-center justify-center px-4",
		children: /* @__PURE__ */ jsxs("div", {
			className: "max-w-md text-center",
			children: [/* @__PURE__ */ jsx("h1", {
				className: "text-xl font-semibold",
				children: "This page didn't load"
			}), /* @__PURE__ */ jsxs("div", {
				className: "mt-6 flex justify-center gap-2",
				children: [/* @__PURE__ */ jsx("button", {
					onClick: () => {
						router.invalidate();
						reset();
					},
					children: "Try again"
				}), /* @__PURE__ */ jsx("a", {
					href: "/",
					children: "Go home"
				})]
			})]
		})
	});
}
var Route$25 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{
				name: "theme-color",
				content: "#1d9e75"
			},
			{
				name: "apple-mobile-web-app-capable",
				content: "yes"
			},
			{
				name: "apple-mobile-web-app-status-bar-style",
				content: "default"
			},
			{
				name: "apple-mobile-web-app-title",
				content: "GadgetPe"
			},
			{ title: "GadgetPe — Buy & Sell Phones at the Best Price" },
			{
				name: "description",
				content: "GadgetPe is the #1 rated phone marketplace. Get an instant quote, free pickup, and instant payment."
			},
			{
				property: "og:title",
				content: "GadgetPe — Buy & Sell Phones"
			},
			{
				property: "og:description",
				content: "Instant valuations. Free pickup. Instant payment."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary"
			}
		],
		links: [
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "icon",
				href: "/favicon.svg",
				type: "image/svg+xml"
			},
			{
				rel: "apple-touch-icon",
				href: "/icons/icon-192.svg"
			},
			{
				rel: "manifest",
				href: "/manifest.webmanifest"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
			},
			{
				rel: "stylesheet",
				href: styles_default
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ jsxs("html", {
		lang: "en",
		children: [/* @__PURE__ */ jsx("head", { children: /* @__PURE__ */ jsx(HeadContent, {}) }), /* @__PURE__ */ jsxs("body", { children: [/* @__PURE__ */ jsx(AppShell, { children: /* @__PURE__ */ jsx(AppShellMain, { children }) }), /* @__PURE__ */ jsx(Scripts, {})] })]
	});
}
function AppStartupLoader() {
	return /* @__PURE__ */ jsx("div", {
		className: "gp-app-startup-loader",
		role: "status",
		"aria-live": "polite",
		"aria-label": "Application loading",
		children: /* @__PURE__ */ jsxs("div", {
			className: "gp-app-startup-loader__inner",
			children: [/* @__PURE__ */ jsx("span", {
				className: "gp-app-startup-loader__spinner",
				"aria-hidden": "true"
			}), /* @__PURE__ */ jsx("p", { children: "Loading..." })]
		})
	});
}
function RootComponent() {
	const { queryClient } = Route$25.useRouteContext();
	const [isAppStarting, setIsAppStarting] = useState(true);
	useEffect(() => {
		const frameId = window.requestAnimationFrame(() => {
			setIsAppStarting(false);
		});
		return () => {
			window.cancelAnimationFrame(frameId);
		};
	}, []);
	if (isAppStarting) return /* @__PURE__ */ jsx(AppStartupLoader, {});
	return /* @__PURE__ */ jsxs(QueryClientProvider, {
		client: queryClient,
		children: [
			/* @__PURE__ */ jsx(GlobalHeader, {}),
			/* @__PURE__ */ jsx(PwaInstallBanner, {}),
			/* @__PURE__ */ jsx(Outlet, {}),
			/* @__PURE__ */ jsx(Toaster$1, {
				richColors: true,
				position: "top-right"
			})
		]
	});
}
//#endregion
//#region src/routes/user.tsx
var $$splitComponentImporter$24 = () => import("./user-DIEGUIVC.js");
var Route$24 = createFileRoute("/user")({ component: lazyRouteComponent($$splitComponentImporter$24, "component") });
//#endregion
//#region src/routes/partner-page.tsx
var $$splitComponentImporter$23 = () => import("./partner-page-BYOFI4yV.js");
var Route$23 = createFileRoute("/partner-page")({ component: lazyRouteComponent($$splitComponentImporter$23, "component") });
//#endregion
//#region src/routes/partner.tsx
var $$splitComponentImporter$22 = () => import("./partner-D_3iMBue.js");
var Route$22 = createFileRoute("/partner")({ component: lazyRouteComponent($$splitComponentImporter$22, "component") });
//#endregion
//#region src/routes/admin.tsx
var $$splitComponentImporter$21 = () => import("./admin-B6s26zUs.js");
var Route$21 = createFileRoute("/admin")({ component: lazyRouteComponent($$splitComponentImporter$21, "component") });
var _YN = ["yes", "no"];
var _YNA = [
	"yes",
	"no",
	"na"
];
[..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YNA], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN], [..._YN];
//#endregion
//#region src/routes/Lead-bucket-details.tsx
var $$splitComponentImporter$20 = () => import("./Lead-bucket-details-CDJfEe83.js");
var Route$20 = createFileRoute("/Lead-bucket-details")({ component: lazyRouteComponent($$splitComponentImporter$20, "component") });
//#endregion
//#region src/routes/Lead-bucket.tsx
var $$splitComponentImporter$19 = () => import("./Lead-bucket-BLuAH8_2.js");
var Route$19 = createFileRoute("/Lead-bucket")({ component: lazyRouteComponent($$splitComponentImporter$19, "component") });
//#endregion
//#region src/routes/Lead-assignment.tsx
var $$splitComponentImporter$18 = () => import("./Lead-assignment-DSyWlwYN.js");
var Route$18 = createFileRoute("/Lead-assignment")({ component: lazyRouteComponent($$splitComponentImporter$18, "component") });
//#endregion
//#region src/routes/index.tsx
var $$splitComponentImporter$17 = () => import("./routes-DTEZEvkE.js");
var Route$17 = createFileRoute("/")({
	beforeLoad: () => {
		throw redirect({ to: "/user" });
	},
	component: lazyRouteComponent($$splitComponentImporter$17, "component")
});
//#endregion
//#region src/routes/service-Leads/index.tsx
var $$splitComponentImporter$16 = () => import("./service-Leads-DbnC_vsA.js");
var Route$16 = createFileRoute("/service-Leads/")({ component: lazyRouteComponent($$splitComponentImporter$16, "component") });
//#endregion
//#region src/routes/user.selling-history.tsx
var $$splitComponentImporter$15 = () => import("./user.selling-history-C4n31aSw.js");
var Route$15 = createFileRoute("/user/selling-history")({ component: lazyRouteComponent($$splitComponentImporter$15, "component") });
//#endregion
//#region src/routes/user.sell-tablet.tsx
var $$splitComponentImporter$14 = () => import("./user.sell-tablet-BK1CSYCs.js");
var Route$14 = createFileRoute("/user/sell-tablet")({ component: lazyRouteComponent($$splitComponentImporter$14, "component") });
//#endregion
//#region src/routes/user.sell-phone.tsx
var $$splitComponentImporter$13 = () => import("./user.sell-phone-COv_ZntD.js");
var Route$13 = createFileRoute("/user/sell-phone")({ component: lazyRouteComponent($$splitComponentImporter$13, "component") });
//#endregion
//#region src/routes/user.profile.tsx
var $$splitComponentImporter$12 = () => import("./user.profile-Ddv6LFHu.js");
var Route$12 = createFileRoute("/user/profile")({ component: lazyRouteComponent($$splitComponentImporter$12, "component") });
//#endregion
//#region src/routes/user.pickup-status.tsx
var $$splitComponentImporter$11 = () => import("./user.pickup-status-cykp3p3l.js");
var Route$11 = createFileRoute("/user/pickup-status")({ component: lazyRouteComponent($$splitComponentImporter$11, "component") });
//#endregion
//#region src/routes/user.payments.tsx
var $$splitComponentImporter$10 = () => import("./user.payments-C6Pc8DlZ.js");
var Route$10 = createFileRoute("/user/payments")({ component: lazyRouteComponent($$splitComponentImporter$10, "component") });
//#endregion
//#region src/routes/user.my-listings.tsx
var $$splitComponentImporter$9 = () => import("./user.my-listings-BnU7icOQ.js");
var Route$9 = createFileRoute("/user/my-listings")({ component: lazyRouteComponent($$splitComponentImporter$9, "component") });
//#endregion
//#region src/routes/user.list-device.tsx
var $$splitComponentImporter$8 = () => import("./user.list-device-cB8pZ2IA.js");
var Route$8 = createFileRoute("/user/list-device")({ component: lazyRouteComponent($$splitComponentImporter$8, "component") });
//#endregion
//#region src/routes/service-Leads/transaction.tsx
var $$splitComponentImporter$7 = () => import("./transaction-D79gZFqJ.js");
var Route$7 = createFileRoute("/service-Leads/transaction")({ component: lazyRouteComponent($$splitComponentImporter$7, "component") });
//#endregion
//#region src/routes/partner-page.coins.tsx
var $$splitComponentImporter$6 = () => import("./partner-page.coins-DUjcrfuV.js");
var Route$6 = createFileRoute("/partner-page/coins")({ component: lazyRouteComponent($$splitComponentImporter$6, "component") });
//#endregion
//#region src/routes/service-Leads/transaction/index.tsx
var $$splitComponentImporter$5 = () => import("./transaction-CBYGeBSK.js");
var Route$5 = createFileRoute("/service-Leads/transaction/")({ component: lazyRouteComponent($$splitComponentImporter$5, "component") });
//#endregion
//#region src/routes/user.sell-tablet.quote.tsx
var $$splitComponentImporter$4 = () => import("./user.sell-tablet.quote-DNt811Mu.js");
var Route$4 = createFileRoute("/user/sell-tablet/quote")({ component: lazyRouteComponent($$splitComponentImporter$4, "component") });
//#endregion
//#region src/routes/user.sell-tablet.device-details.tsx
var $$splitComponentImporter$3 = () => import("./user.sell-tablet.device-details-BbjXGdXl.js");
var Route$3 = createFileRoute("/user/sell-tablet/device-details")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
//#endregion
//#region src/routes/user.sell-phone.quote.tsx
var $$splitComponentImporter$2 = () => import("./user.sell-phone.quote-BGwKEp2r.js");
var Route$2 = createFileRoute("/user/sell-phone/quote")({ component: lazyRouteComponent($$splitComponentImporter$2, "component") });
//#endregion
//#region src/routes/user.sell-phone.device-details.tsx
var $$splitComponentImporter$1 = () => import("./user.sell-phone.device-details-DX3KpaIE.js");
/** Build slides so each group lands on its own slide(s) — issues always isolated. */
var Route$1 = createFileRoute("/user/sell-phone/device-details")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
//#endregion
//#region src/routes/service-Leads/transaction/payment.tsx
var $$splitComponentImporter = () => import("./payment-BCXQnvnw.js");
var Route = createFileRoute("/service-Leads/transaction/payment")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
//#endregion
//#region src/routeTree.gen.ts
var UserRoute = Route$24.update({
	id: "/user",
	path: "/user",
	getParentRoute: () => Route$25
});
var PartnerPageRoute = Route$23.update({
	id: "/partner-page",
	path: "/partner-page",
	getParentRoute: () => Route$25
});
var PartnerRoute = Route$22.update({
	id: "/partner",
	path: "/partner",
	getParentRoute: () => Route$25
});
var AdminRoute = Route$21.update({
	id: "/admin",
	path: "/admin",
	getParentRoute: () => Route$25
});
var LeadBucketDetailsRoute = Route$20.update({
	id: "/Lead-bucket-details",
	path: "/Lead-bucket-details",
	getParentRoute: () => Route$25
});
var LeadBucketRoute = Route$19.update({
	id: "/Lead-bucket",
	path: "/Lead-bucket",
	getParentRoute: () => Route$25
});
var LeadAssignmentRoute = Route$18.update({
	id: "/Lead-assignment",
	path: "/Lead-assignment",
	getParentRoute: () => Route$25
});
var IndexRoute = Route$17.update({
	id: "/",
	path: "/",
	getParentRoute: () => Route$25
});
var ServiceLeadsIndexRoute = Route$16.update({
	id: "/service-Leads/",
	path: "/service-Leads/",
	getParentRoute: () => Route$25
});
var UserSellingHistoryRoute = Route$15.update({
	id: "/selling-history",
	path: "/selling-history",
	getParentRoute: () => UserRoute
});
var UserSellTabletRoute = Route$14.update({
	id: "/sell-tablet",
	path: "/sell-tablet",
	getParentRoute: () => UserRoute
});
var UserSellPhoneRoute = Route$13.update({
	id: "/sell-phone",
	path: "/sell-phone",
	getParentRoute: () => UserRoute
});
var UserProfileRoute = Route$12.update({
	id: "/profile",
	path: "/profile",
	getParentRoute: () => UserRoute
});
var UserPickupStatusRoute = Route$11.update({
	id: "/pickup-status",
	path: "/pickup-status",
	getParentRoute: () => UserRoute
});
var UserPaymentsRoute = Route$10.update({
	id: "/payments",
	path: "/payments",
	getParentRoute: () => UserRoute
});
var UserMyListingsRoute = Route$9.update({
	id: "/my-listings",
	path: "/my-listings",
	getParentRoute: () => UserRoute
});
var UserLoginRoute = Route$26.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => UserRoute
});
var UserListDeviceRoute = Route$8.update({
	id: "/list-device",
	path: "/list-device",
	getParentRoute: () => UserRoute
});
var ServiceLeadsTransactionRoute = Route$7.update({
	id: "/service-Leads/transaction",
	path: "/service-Leads/transaction",
	getParentRoute: () => Route$25
});
var PartnerPageCoinsRoute = Route$6.update({
	id: "/coins",
	path: "/coins",
	getParentRoute: () => PartnerPageRoute
});
var ServiceLeadsTransactionIndexRoute = Route$5.update({
	id: "/",
	path: "/",
	getParentRoute: () => ServiceLeadsTransactionRoute
});
var UserSellTabletQuoteRoute = Route$4.update({
	id: "/quote",
	path: "/quote",
	getParentRoute: () => UserSellTabletRoute
});
var UserSellTabletDeviceDetailsRoute = Route$3.update({
	id: "/device-details",
	path: "/device-details",
	getParentRoute: () => UserSellTabletRoute
});
var UserSellPhoneQuoteRoute = Route$2.update({
	id: "/quote",
	path: "/quote",
	getParentRoute: () => UserSellPhoneRoute
});
var UserSellPhoneDeviceDetailsRoute = Route$1.update({
	id: "/device-details",
	path: "/device-details",
	getParentRoute: () => UserSellPhoneRoute
});
var UserSellPhoneBrandRoute = Route$27.update({
	id: "/$brand",
	path: "/$brand",
	getParentRoute: () => UserSellPhoneRoute
});
var ServiceLeadsTransactionPaymentRoute = Route.update({
	id: "/payment",
	path: "/payment",
	getParentRoute: () => ServiceLeadsTransactionRoute
});
var PartnerPageRouteChildren = { PartnerPageCoinsRoute };
var PartnerPageRouteWithChildren = PartnerPageRoute._addFileChildren(PartnerPageRouteChildren);
var UserSellPhoneRouteChildren = {
	UserSellPhoneBrandRoute,
	UserSellPhoneDeviceDetailsRoute,
	UserSellPhoneQuoteRoute
};
var UserSellPhoneRouteWithChildren = UserSellPhoneRoute._addFileChildren(UserSellPhoneRouteChildren);
var UserSellTabletRouteChildren = {
	UserSellTabletDeviceDetailsRoute,
	UserSellTabletQuoteRoute
};
var UserRouteChildren = {
	UserListDeviceRoute,
	UserLoginRoute,
	UserMyListingsRoute,
	UserPaymentsRoute,
	UserPickupStatusRoute,
	UserProfileRoute,
	UserSellPhoneRoute: UserSellPhoneRouteWithChildren,
	UserSellTabletRoute: UserSellTabletRoute._addFileChildren(UserSellTabletRouteChildren),
	UserSellingHistoryRoute
};
var UserRouteWithChildren = UserRoute._addFileChildren(UserRouteChildren);
var ServiceLeadsTransactionRouteChildren = {
	ServiceLeadsTransactionPaymentRoute,
	ServiceLeadsTransactionIndexRoute
};
var rootRouteChildren = {
	IndexRoute,
	LeadAssignmentRoute,
	LeadBucketRoute,
	LeadBucketDetailsRoute,
	AdminRoute,
	PartnerRoute,
	PartnerPageRoute: PartnerPageRouteWithChildren,
	UserRoute: UserRouteWithChildren,
	ServiceLeadsTransactionRoute: ServiceLeadsTransactionRoute._addFileChildren(ServiceLeadsTransactionRouteChildren),
	ServiceLeadsIndexRoute
};
var routeTree = Route$25._addFileChildren(rootRouteChildren)._addFileTypes();
//#endregion
//#region src/router.tsx
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };
