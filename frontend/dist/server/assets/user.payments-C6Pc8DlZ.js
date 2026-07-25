import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { IndianRupee } from "lucide-react";
//#region src/routes/user.payments.tsx?tsr-split=component
function UserPaymentsPage() {
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-dashboard-shell-pro",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Seller Action"
				}),
				/* @__PURE__ */ jsx("h1", { children: "Payments" }),
				/* @__PURE__ */ jsxs("section", {
					className: "user-action-route-card",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "user-action-icon",
							children: /* @__PURE__ */ jsx(IndianRupee, { size: 18 })
						}),
						/* @__PURE__ */ jsx("h2", { children: "Payout Overview" }),
						/* @__PURE__ */ jsx("p", { children: "Review payouts, pending settlements, and payment state from a focused screen." }),
						/* @__PURE__ */ jsx("div", {
							className: "user-action-route-empty",
							children: "Payment cards and settlement timeline can live here cleanly once backed by API data."
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
export { UserPaymentsPage as component };
