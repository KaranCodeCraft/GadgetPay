import { jsx, jsxs } from "react/jsx-runtime";
import { Coins, IndianRupee, ListChecks, Mail, MapPin, PackageCheck, PhoneCall, Send, ShieldCheck, Smartphone, Truck, UserRound } from "lucide-react";
//#region src/components/partner-footer-and-support.tsx
var SUPPORT_WHATSAPP_URL = "https://wa.me/919311125745";
var footerQuickLinks = [
	{
		label: "Sell Phone",
		href: "/user#sell",
		icon: Smartphone
	},
	{
		label: "How It Works",
		href: "/user#how",
		icon: PackageCheck
	},
	{
		label: "Top Brands",
		href: "/user#top-brands",
		icon: ShieldCheck
	},
	{
		label: "FAQ",
		href: "/user#faq",
		icon: ListChecks
	}
];
var footerServiceLinks = [
	{
		label: "Free Pickup",
		href: "/user#how",
		icon: Truck
	},
	{
		label: "Instant Quote",
		href: "/user#sell",
		icon: IndianRupee
	},
	{
		label: "Seller Login",
		href: "/user/login",
		icon: UserRound
	},
	{
		label: "Partner Support",
		href: SUPPORT_WHATSAPP_URL,
		icon: Coins,
		external: true
	}
];
function PartnerSharedFooter() {
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
									href: "/user#sell",
									"aria-label": "Message GadgetPe",
									children: /* @__PURE__ */ jsx(Send, { size: 18 })
								}),
								/* @__PURE__ */ jsx("a", {
									href: "mailto:support@gadgetpe.com",
									"aria-label": "Email GadgetPe",
									children: /* @__PURE__ */ jsx(Mail, { size: 18 })
								}),
								/* @__PURE__ */ jsx("a", {
									href: SUPPORT_WHATSAPP_URL,
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
							...item.external ? {
								target: "_blank",
								rel: "noopener noreferrer"
							} : {},
							children: [/* @__PURE__ */ jsx(Icon, { size: 16 }), /* @__PURE__ */ jsx("span", { children: item.label })]
						}, item.label);
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "gp-user-footer-column gp-user-footer-contact",
					children: [
						/* @__PURE__ */ jsx("h3", { children: "Contact" }),
						/* @__PURE__ */ jsxs("a", {
							href: SUPPORT_WHATSAPP_URL,
							target: "_blank",
							rel: "noopener noreferrer",
							children: [/* @__PURE__ */ jsx(PhoneCall, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "+91 93111 25745" })]
						}),
						/* @__PURE__ */ jsxs("a", {
							href: "mailto:support@gadgetpe.com",
							children: [/* @__PURE__ */ jsx(Mail, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "support@gadgetpe.com" })]
						}),
						/* @__PURE__ */ jsxs("a", {
							href: "/user#sell",
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
function PartnerDashboardCompactFooter() {
	return /* @__PURE__ */ jsxs("footer", {
		className: "gp-user-footer",
		children: [/* @__PURE__ */ jsx("div", {
			className: "gp-wrap gp-user-footer-grid",
			children: /* @__PURE__ */ jsxs("div", {
				className: "gp-user-footer-column gp-user-footer-contact",
				children: [
					/* @__PURE__ */ jsx("h3", { children: "Contact" }),
					/* @__PURE__ */ jsxs("a", {
						href: SUPPORT_WHATSAPP_URL,
						target: "_blank",
						rel: "noopener noreferrer",
						children: [/* @__PURE__ */ jsx(PhoneCall, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "+91 93111 25745" })]
					}),
					/* @__PURE__ */ jsxs("a", {
						href: "mailto:support@gadgetpe.com",
						children: [/* @__PURE__ */ jsx(Mail, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "support@gadgetpe.com" })]
					})
				]
			})
		}), /* @__PURE__ */ jsx("div", {
			className: "gp-wrap gp-user-footer-bottom",
			children: /* @__PURE__ */ jsx("span", { children: "© 2026 GadgetPe. All rights reserved." })
		})]
	});
}
function SupportFab() {
	return /* @__PURE__ */ jsxs("a", {
		href: SUPPORT_WHATSAPP_URL,
		target: "_blank",
		rel: "noopener noreferrer",
		className: "gp-support-fab",
		"aria-label": "Support on WhatsApp",
		children: [/* @__PURE__ */ jsx(PhoneCall, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Support" })]
	});
}
//#endregion
export { PartnerSharedFooter as n, SupportFab as r, PartnerDashboardCompactFooter as t };
