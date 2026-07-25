import { Link } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { Smartphone } from "lucide-react";
//#region src/routes/user.list-device.tsx?tsr-split=component
function UserListDevicePage() {
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-dashboard-shell-pro",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Seller Action"
				}),
				/* @__PURE__ */ jsx("h1", { children: "List Device" }),
				/* @__PURE__ */ jsx("p", { children: "Start a fresh selling journey from here. Choose what you want to sell and continue into the pricing flow." }),
				/* @__PURE__ */ jsxs("section", {
					className: "user-action-route-card",
					children: [
						/* @__PURE__ */ jsx("span", {
							className: "user-action-icon",
							children: /* @__PURE__ */ jsx(Smartphone, { size: 18 })
						}),
						/* @__PURE__ */ jsx("h2", { children: "Start New Listing" }),
						/* @__PURE__ */ jsx("p", { children: "Create a new device listing, choose category, and continue into the selling flow." }),
						/* @__PURE__ */ jsxs("div", {
							className: "user-auth-actions",
							style: { marginTop: 18 },
							children: [
								/* @__PURE__ */ jsx(Link, {
									to: "/user/sell-phone",
									className: "user-auth-submit user-inline-link",
									children: "Sell Mobile"
								}),
								/* @__PURE__ */ jsx(Link, {
									to: "/user/sell-tablet",
									className: "user-auth-submit user-inline-link",
									children: "Sell Tablet or iPad"
								}),
								/* @__PURE__ */ jsx(Link, {
									to: "/user",
									className: "user-auth-cancel user-inline-link",
									children: "Back to Dashboard"
								})
							]
						})
					]
				})
			]
		})
	});
}
//#endregion
export { UserListDevicePage as component };
