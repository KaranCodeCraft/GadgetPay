import { r as getActiveRole, t as activateRoleSession } from "./role-session-C7kgx143.js";
import { t as Route } from "./user.login-CqavoGng.js";
import { Z as sendUserOtp, gt as verifyUserOtp, t as ApiClientError } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/user.login.tsx?tsr-split=component
var USER_TOKEN_KEY = "gadgetpe_user_access_token";
var USER_REFRESH_KEY = "gadgetpe_user_refresh_token";
var USER_NAME_KEY = "gadgetpe_user_name";
var USER_ID_KEY = "gadgetpe_user_id";
var USER_POST_LOGIN_SELL_MODAL_FLAG_KEY = "gadgetpe_user_post_login_sell_modal";
function getSafeRedirectPath(redirectTo) {
	if (!redirectTo || !redirectTo.startsWith("/")) return null;
	if (redirectTo.startsWith("//")) return null;
	return redirectTo;
}
function UserLoginPage() {
	const navigate = useNavigate();
	const { redirectTo } = Route.useSearch();
	const safeRedirectTo = getSafeRedirectPath(redirectTo);
	const [phone, setPhone] = useState("");
	const [otp, setOtp] = useState("");
	const [nameInput, setNameInput] = useState("");
	const [loginStep, setLoginStep] = useState("phone");
	const [requiresName, setRequiresName] = useState(false);
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
	const [error, setError] = useState(null);
	useEffect(() => {
		const role = getActiveRole();
		if (role === "admin") {
			navigate({ to: "/admin" });
			return;
		}
		if (role === "partner") {
			navigate({ to: "/partner-page" });
			return;
		}
		if (typeof window !== "undefined" && window.localStorage.getItem(USER_TOKEN_KEY)) navigate({ to: safeRedirectTo ?? "/user" });
	}, [navigate, safeRedirectTo]);
	const handleSendOtp = async (event) => {
		event.preventDefault();
		if (!/^\d{10}$/.test(phone.trim())) {
			setError("Enter a valid 10-digit phone number.");
			return;
		}
		setError(null);
		setIsSendingOtp(true);
		try {
			const otpResult = await sendUserOtp(phone.trim());
			setRequiresName(otpResult.requiresName);
			if (!otpResult.requiresName) setNameInput("");
			setLoginStep("otp");
			toast.success("OTP sent! Use 6767 in dev.");
		} catch (apiError) {
			const message = apiError instanceof ApiClientError ? apiError.message : "Failed to send OTP.";
			setError(message);
			toast.error(message);
		} finally {
			setIsSendingOtp(false);
		}
	};
	const handleVerifyOtp = async (event) => {
		event.preventDefault();
		if (!/^\d{4,6}$/.test(otp.trim())) {
			setError("Enter a valid OTP.");
			return;
		}
		if (requiresName && nameInput.trim().length < 2) {
			setError("Enter your name to create a new account.");
			return;
		}
		setError(null);
		setIsVerifyingOtp(true);
		try {
			const result = await verifyUserOtp(phone.trim(), otp.trim(), requiresName ? nameInput.trim() : void 0);
			localStorage.setItem(USER_TOKEN_KEY, result.accessToken);
			localStorage.setItem(USER_REFRESH_KEY, result.refreshToken);
			localStorage.setItem(USER_NAME_KEY, result.user.name);
			localStorage.setItem(USER_ID_KEY, result.user.id);
			if (!safeRedirectTo) localStorage.setItem(USER_POST_LOGIN_SELL_MODAL_FLAG_KEY, "1");
			activateRoleSession("user");
			toast.success(`Welcome, ${result.user.name}!`);
			await navigate({ to: safeRedirectTo ?? "/user" });
		} catch (apiError) {
			const message = apiError instanceof ApiClientError ? apiError.message : "OTP verification failed.";
			setError(message);
			toast.error(message);
		} finally {
			setIsVerifyingOtp(false);
		}
	};
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsx("div", {
			className: "user-auth-overlay user-login-overlay user-login-route-overlay",
			role: "dialog",
			"aria-modal": "true",
			children: /* @__PURE__ */ jsxs("section", {
				className: "user-auth-card user-auth-dialog user-login-dialog user-login-route-dialog",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "user-auth-brand user-login-brand-center",
						children: "GadgetPe Seller"
					}),
					/* @__PURE__ */ jsx("p", { children: "Login to manage your listed devices, pickups, and payments." }),
					loginStep === "phone" && /* @__PURE__ */ jsxs("form", {
						className: "user-auth-form",
						onSubmit: (e) => void handleSendOtp(e),
						children: [
							/* @__PURE__ */ jsxs("label", { children: ["Phone Number", /* @__PURE__ */ jsx("input", {
								type: "tel",
								placeholder: "Enter your 10-digit phone",
								value: phone,
								onChange: (event) => setPhone(event.target.value),
								maxLength: 10
							})] }),
							/* @__PURE__ */ jsx("div", {
								className: "user-auth-hint",
								children: "An OTP will be sent to your phone."
							}),
							error && /* @__PURE__ */ jsx("div", {
								className: "user-auth-error",
								children: error
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "user-auth-actions",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "user-auth-cancel",
									onClick: () => {
										setError(null);
										setPhone("");
										setNameInput("");
										setRequiresName(false);
										navigate({ to: "/user" });
									},
									children: "Cancel"
								}), /* @__PURE__ */ jsx("button", {
									type: "submit",
									className: "user-auth-submit",
									disabled: isSendingOtp,
									children: isSendingOtp ? "Sending..." : "Send OTP"
								})]
							})
						]
					}),
					loginStep === "otp" && /* @__PURE__ */ jsxs("form", {
						className: "user-auth-form",
						onSubmit: (e) => void handleVerifyOtp(e),
						children: [
							/* @__PURE__ */ jsxs("label", { children: ["OTP", /* @__PURE__ */ jsx("input", {
								type: "text",
								inputMode: "numeric",
								maxLength: 6,
								placeholder: "Enter OTP (dev: 6767)",
								value: otp,
								onChange: (event) => setOtp(event.target.value)
							})] }),
							requiresName && /* @__PURE__ */ jsxs("label", { children: ["Your Name", /* @__PURE__ */ jsx("input", {
								type: "text",
								placeholder: "e.g. Rahul Sharma",
								value: nameInput,
								onChange: (event) => setNameInput(event.target.value),
								maxLength: 80
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "user-auth-hint",
								children: [
									"OTP sent to ",
									phone,
									".",
									" ",
									/* @__PURE__ */ jsx("button", {
										type: "button",
										style: {
											background: "none",
											border: "none",
											color: "inherit",
											textDecoration: "underline",
											cursor: "pointer",
											padding: 0
										},
										onClick: () => {
											setLoginStep("phone");
											setOtp("");
											setNameInput("");
											setRequiresName(false);
											setError(null);
										},
										children: "Change number"
									})
								]
							}),
							error && /* @__PURE__ */ jsx("div", {
								className: "user-auth-error",
								children: error
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "user-auth-actions",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "user-auth-cancel",
									onClick: () => {
										setLoginStep("phone");
										setPhone("");
										setOtp("");
										setNameInput("");
										setRequiresName(false);
										setError(null);
										navigate({ to: "/user" });
									},
									children: "Cancel"
								}), /* @__PURE__ */ jsx("button", {
									type: "submit",
									className: "user-auth-submit",
									disabled: isVerifyingOtp,
									children: isVerifyingOtp ? "Verifying..." : "Verify & Login"
								})]
							})
						]
					})
				]
			})
		})
	});
}
//#endregion
export { UserLoginPage as component };
