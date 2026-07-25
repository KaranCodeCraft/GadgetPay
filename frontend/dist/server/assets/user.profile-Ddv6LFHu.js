import { H as listUserSellFlows, w as getUserMe } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { ArrowLeft, BadgeCheck, Calendar, Phone, ShoppingBag, User } from "lucide-react";
//#region src/routes/user.profile.tsx?tsr-split=component
var USER_TOKEN_KEY = "gadgetpe_user_access_token";
var USER_NAME_KEY = "gadgetpe_user_name";
function formatInr(v) {
	return new Intl.NumberFormat("en-IN").format(v);
}
function formatDate(iso) {
	if (!iso) return "—";
	return new Intl.DateTimeFormat("en-IN", {
		day: "numeric",
		month: "short",
		year: "numeric"
	}).format(new Date(iso));
}
function UserProfilePage() {
	const [name, setName] = useState(() => typeof window !== "undefined" ? window.localStorage.getItem(USER_NAME_KEY) || "User" : "User");
	const [phone, setPhone] = useState(null);
	const [createdAt, setCreatedAt] = useState();
	const [salesCount, setSalesCount] = useState(0);
	const [totalValue, setTotalValue] = useState(0);
	useEffect(() => {
		const token = window.localStorage.getItem(USER_TOKEN_KEY);
		if (!token) return;
		Promise.allSettled([getUserMe(token), listUserSellFlows(token, { limit: 100 })]).then(([meResult, flowsResult]) => {
			if (meResult.status === "fulfilled") {
				const u = meResult.value.user;
				setName(u.name || name);
				setPhone(u.phone || null);
				setCreatedAt(u.createdAt);
			}
			if (flowsResult.status === "fulfilled") {
				const completed = (flowsResult.value.rows ?? []).filter((f) => f.status === "PICKUP_SCHEDULED" || f.status === "COMPLETED");
				setSalesCount(completed.length);
				setTotalValue(completed.reduce((s, f) => s + (f.selectedModel?.listedPrice ?? 0), 0));
			}
		}).catch(() => {});
	}, []);
	const initials = name.trim().split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "U";
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-profile-shell",
			children: [
				/* @__PURE__ */ jsxs(Link, {
					to: "/user",
					className: "user-profile-back",
					children: [/* @__PURE__ */ jsx(ArrowLeft, { size: 16 }), /* @__PURE__ */ jsx("span", { children: "Back" })]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "user-profile-hero",
					children: [/* @__PURE__ */ jsx("div", {
						className: "user-profile-avatar",
						children: initials
					}), /* @__PURE__ */ jsxs("div", {
						className: "user-profile-hero-info",
						children: [/* @__PURE__ */ jsx("h1", {
							className: "user-profile-name",
							children: name
						}), /* @__PURE__ */ jsxs("span", {
							className: "user-profile-badge",
							children: [/* @__PURE__ */ jsx(BadgeCheck, { size: 13 }), "GadgetPe Seller"]
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "user-profile-stats",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "user-profile-stat",
						children: [/* @__PURE__ */ jsx(ShoppingBag, {
							size: 20,
							strokeWidth: 1.5
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
							className: "user-profile-stat-value",
							children: salesCount
						}), /* @__PURE__ */ jsx("span", {
							className: "user-profile-stat-label",
							children: "Completed Sales"
						})] })]
					}), /* @__PURE__ */ jsxs("div", {
						className: "user-profile-stat",
						children: [/* @__PURE__ */ jsx("span", {
							className: "user-profile-stat-currency",
							children: "₹"
						}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
							className: "user-profile-stat-value",
							children: formatInr(totalValue)
						}), /* @__PURE__ */ jsx("span", {
							className: "user-profile-stat-label",
							children: "Total Quoted Value"
						})] })]
					})]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "user-profile-details-card",
					children: [
						/* @__PURE__ */ jsx("h2", {
							className: "user-profile-section-title",
							children: "Account Details"
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "user-profile-detail-row",
							children: [/* @__PURE__ */ jsx(User, {
								size: 16,
								strokeWidth: 1.5
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
								className: "user-profile-detail-label",
								children: "Full Name"
							}), /* @__PURE__ */ jsx("span", {
								className: "user-profile-detail-value",
								children: name
							})] })]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "user-profile-detail-row",
							children: [/* @__PURE__ */ jsx(Phone, {
								size: 16,
								strokeWidth: 1.5
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
								className: "user-profile-detail-label",
								children: "Phone"
							}), /* @__PURE__ */ jsx("span", {
								className: "user-profile-detail-value",
								children: phone ? `+91 ${phone}` : "—"
							})] })]
						}),
						createdAt && /* @__PURE__ */ jsxs("div", {
							className: "user-profile-detail-row",
							children: [/* @__PURE__ */ jsx(Calendar, {
								size: 16,
								strokeWidth: 1.5
							}), /* @__PURE__ */ jsxs("div", { children: [/* @__PURE__ */ jsx("span", {
								className: "user-profile-detail-label",
								children: "Member Since"
							}), /* @__PURE__ */ jsx("span", {
								className: "user-profile-detail-value",
								children: formatDate(createdAt)
							})] })]
						})
					]
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "user-profile-actions",
					children: [/* @__PURE__ */ jsx(Link, {
						to: "/user/sell-phone",
						className: "user-auth-submit user-inline-link",
						style: { textAlign: "center" },
						children: "Sell a Phone"
					}), /* @__PURE__ */ jsx(Link, {
						to: "/user/selling-history",
						className: "user-auth-cancel user-inline-link",
						style: { textAlign: "center" },
						children: "Selling History"
					})]
				})
			]
		})
	});
}
//#endregion
export { UserProfilePage as component };
