import { n as clearRoleSession, r as getActiveRole, t as activateRoleSession } from "./role-session-C7kgx143.js";
import { Q as submitPartnerKycMetadata, X as sendPartnerOtp, ht as verifyPartnerOtp, x as getPartnerKycStatus } from "./gadgetpe-client-Cg3AtJY8.js";
import { n as PartnerSharedFooter, r as SupportFab } from "./partner-footer-and-support-CLnV4WZn.js";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
//#region src/routes/partner.tsx?tsr-split=component
function PartnerAuthPage() {
	const navigate = useNavigate();
	const [blockedForUser, setBlockedForUser] = useState(false);
	const [tab, setTab] = useState("login");
	const [loginPhone, setLoginPhone] = useState("");
	const [loginPassword, setLoginPassword] = useState("");
	const [loginStep, setLoginStep] = useState("phone");
	const [signupPhone, setSignupPhone] = useState("");
	const [signupOtp, setSignupOtp] = useState("");
	const [signupStep, setSignupStep] = useState("phone");
	const [fullName, setFullName] = useState("");
	const [age, setAge] = useState("");
	const [address, setAddress] = useState("");
	const [aadharNumber, setAadharNumber] = useState("");
	const [gstNumber, setGstNumber] = useState("");
	const [identityProof, setIdentityProof] = useState("Aadhar");
	const [identityFile, setIdentityFile] = useState(null);
	const [error, setError] = useState(null);
	const [notice, setNotice] = useState(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSendingOtp, setIsSendingOtp] = useState(false);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [latestKycUrl, setLatestKycUrl] = useState(null);
	useEffect(() => {
		const activeRole = getActiveRole();
		if (activeRole === "user") {
			setBlockedForUser(true);
			navigate({ to: "/user" });
			return;
		}
		if (activeRole === "admin") {
			setBlockedForUser(true);
			navigate({ to: "/admin" });
		}
	}, [navigate]);
	if (blockedForUser) return null;
	const handleContinueToPassword = (event) => {
		event.preventDefault();
		if (loginPhone.trim().length < 10) {
			setError("Please enter a valid phone number.");
			return;
		}
		setError(null);
		setNotice(null);
		setLoginStep("password");
	};
	const handleLogin = async (event) => {
		event.preventDefault();
		if (loginPassword.trim().length < 4) {
			setError("Please enter password.");
			return;
		}
		setError(null);
		setNotice(null);
		setIsSubmitting(true);
		try {
			const result = await verifyPartnerOtp(loginPhone.trim(), loginPassword.trim());
			localStorage.setItem("gadgetpe_access_token", result.accessToken);
			localStorage.setItem("gadgetpe_partner_access_token", result.accessToken);
			localStorage.setItem("gadgetpe_refresh_token", result.refreshToken);
			localStorage.setItem("gadgetpe_partner_refresh_token", result.refreshToken);
			localStorage.setItem("gadgetpe_partner_name", result.partner.name);
			activateRoleSession("partner");
			const kyc = await getPartnerKycStatus(result.accessToken);
			setLatestKycUrl(kyc.latestSubmission?.mediaUrl || null);
			if (kyc.latestSubmission?.verificationStatus !== "VERIFIED") {
				clearRoleSession("partner");
				setNotice("KYC verification pending. Please login after Admin approval");
				return;
			}
			setNotice("Login successful.");
			await navigate({ to: "/partner-page" });
		} catch (apiError) {
			setError(apiError instanceof Error ? apiError.message : "Login failed.");
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleSendSignupOtp = async (event) => {
		event.preventDefault();
		if (signupPhone.trim().length < 10) {
			setError("Please enter a valid phone number.");
			return;
		}
		setError(null);
		setNotice(null);
		setIsSendingOtp(true);
		try {
			await sendPartnerOtp(signupPhone.trim());
			setSignupStep("otp");
			setNotice("OTP sent. Please enter OTP to complete signup.");
		} catch (apiError) {
			setError(apiError instanceof Error ? apiError.message : "Failed to send OTP.");
		} finally {
			setIsSendingOtp(false);
		}
	};
	const handleSignup = async (event) => {
		event.preventDefault();
		if (signupOtp.trim().length < 4) {
			setError("Please enter OTP.");
			return;
		}
		if (!fullName.trim()) {
			setError("Please enter full name as per Aadhar.");
			return;
		}
		if (!age.trim()) {
			setError("Please enter your age.");
			return;
		}
		if (!address.trim()) {
			setError("Please enter your address.");
			return;
		}
		if (!aadharNumber.trim() || aadharNumber.trim().length !== 12) {
			setError("Please enter a valid 12-digit Aadhar number.");
			return;
		}
		if (!identityFile) {
			setError("Please upload your proof of identity image.");
			return;
		}
		setError(null);
		setNotice(null);
		setIsSubmitting(true);
		try {
			const result = await verifyPartnerOtp(signupPhone.trim(), signupOtp.trim(), fullName.trim());
			localStorage.setItem("gadgetpe_access_token", result.accessToken);
			localStorage.setItem("gadgetpe_partner_access_token", result.accessToken);
			localStorage.setItem("gadgetpe_refresh_token", result.refreshToken);
			localStorage.setItem("gadgetpe_partner_refresh_token", result.refreshToken);
			localStorage.setItem("gadgetpe_partner_name", result.partner.name);
			activateRoleSession("partner");
			await submitPartnerKycMetadata(result.accessToken, {
				identityProof,
				file: identityFile,
				age,
				address,
				aadharNumber,
				gstNumber
			});
			setIsModalOpen(true);
		} catch (apiError) {
			setError(apiError instanceof Error ? apiError.message : "Sign up failed.");
		} finally {
			setIsSubmitting(false);
		}
	};
	const handleResendSignupOtp = async () => {
		if (signupPhone.trim().length < 10) {
			setError("Please enter a valid phone number.");
			setSignupStep("phone");
			return;
		}
		setError(null);
		setNotice(null);
		setIsSendingOtp(true);
		try {
			await sendPartnerOtp(signupPhone.trim());
			setNotice(`OTP sent again to ${signupPhone.trim()}.`);
		} catch (apiError) {
			setError(apiError instanceof Error ? apiError.message : "Failed to resend OTP.");
		} finally {
			setIsSendingOtp(false);
		}
	};
	return /* @__PURE__ */ jsxs(Fragment, { children: [
		/* @__PURE__ */ jsxs("main", {
			className: "partner-auth-page",
			children: [/* @__PURE__ */ jsxs("section", {
				className: "partner-auth-shell",
				children: [
					/* @__PURE__ */ jsx("div", {
						className: "partner-brand",
						children: "GadgetPe Partner"
					}),
					/* @__PURE__ */ jsx("h1", { children: "Welcome Partner" }),
					/* @__PURE__ */ jsx("p", {
						className: "partner-auth-subtitle",
						children: "Login with phone and password, or register to start your partner journey."
					}),
					/* @__PURE__ */ jsxs("div", {
						className: "partner-auth-tabs",
						role: "tablist",
						"aria-label": "Partner auth tabs",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "login",
							className: `partner-tab-btn${tab === "login" ? " active" : ""}`,
							onClick: () => {
								setTab("login");
								setLoginStep("phone");
								setLoginPassword("");
								setError(null);
								setNotice(null);
							},
							children: "Login"
						}), /* @__PURE__ */ jsx("button", {
							type: "button",
							role: "tab",
							"aria-selected": tab === "signup",
							className: `partner-tab-btn${tab === "signup" ? " active" : ""}`,
							onClick: () => {
								setTab("signup");
								setSignupStep("phone");
								setSignupOtp("");
								setError(null);
								setNotice(null);
							},
							children: "New Here? Register"
						})]
					}),
					tab === "login" ? loginStep === "phone" ? /* @__PURE__ */ jsxs("form", {
						className: "partner-auth-form",
						onSubmit: handleContinueToPassword,
						children: [
							/* @__PURE__ */ jsxs("label", { children: ["Phone Number", /* @__PURE__ */ jsx("input", {
								type: "tel",
								placeholder: "Enter your phone",
								value: loginPhone,
								maxLength: 10,
								onChange: (event) => setLoginPhone(event.target.value)
							})] }),
							error && /* @__PURE__ */ jsx("div", {
								className: "partner-auth-error",
								children: error
							}),
							notice && /* @__PURE__ */ jsx("div", {
								className: "partner-otp-hint",
								children: notice
							}),
							latestKycUrl ? /* @__PURE__ */ jsx("a", {
								href: latestKycUrl,
								target: "_blank",
								rel: "noreferrer",
								className: "user-inline-link",
								children: "View latest uploaded KYC"
							}) : null,
							/* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "partner-submit-btn",
								children: "Continue"
							})
						]
					}) : /* @__PURE__ */ jsxs("form", {
						className: "partner-auth-form",
						onSubmit: handleLogin,
						children: [
							/* @__PURE__ */ jsxs("label", { children: ["Password", /* @__PURE__ */ jsx("input", {
								type: "password",
								placeholder: "Enter password",
								value: loginPassword,
								onChange: (event) => setLoginPassword(event.target.value)
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "partner-otp-hint",
								children: [
									"Login for phone ",
									loginPhone,
									".",
									" ",
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "partner-inline-link-btn",
										onClick: () => {
											setLoginStep("phone");
											setLoginPassword("");
											setError(null);
											setNotice(null);
										},
										children: "Change number"
									})
								]
							}),
							error && /* @__PURE__ */ jsx("div", {
								className: "partner-auth-error",
								children: error
							}),
							notice && /* @__PURE__ */ jsx("div", {
								className: "partner-otp-hint",
								children: notice
							}),
							latestKycUrl ? /* @__PURE__ */ jsx("a", {
								href: latestKycUrl,
								target: "_blank",
								rel: "noreferrer",
								className: "user-inline-link",
								children: "View latest uploaded KYC"
							}) : null,
							/* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "partner-submit-btn",
								disabled: isSubmitting,
								children: isSubmitting ? "Please wait..." : "Login"
							})
						]
					}) : signupStep === "phone" ? /* @__PURE__ */ jsxs("form", {
						className: "partner-auth-form",
						onSubmit: handleSendSignupOtp,
						children: [
							/* @__PURE__ */ jsxs("label", { children: ["Full Name", /* @__PURE__ */ jsx("input", {
								type: "text",
								placeholder: "Enter your full name",
								value: fullName,
								onChange: (event) => setFullName(event.target.value),
								required: true
							})] }),
							/* @__PURE__ */ jsxs("label", { children: ["Age", /* @__PURE__ */ jsx("input", {
								type: "number",
								placeholder: "Enter your age",
								value: age,
								onChange: (event) => setAge(event.target.value),
								required: true
							})] }),
							/* @__PURE__ */ jsxs("label", { children: ["Address", /* @__PURE__ */ jsx("textarea", {
								placeholder: "Enter your address",
								value: address,
								onChange: (event) => setAddress(event.target.value),
								required: true,
								rows: 3
							})] }),
							/* @__PURE__ */ jsxs("label", { children: ["Aadhar Number", /* @__PURE__ */ jsx("input", {
								type: "text",
								placeholder: "Enter 12-digit Aadhar number",
								value: aadharNumber,
								maxLength: 12,
								onChange: (event) => setAadharNumber(event.target.value),
								required: true
							})] }),
							/* @__PURE__ */ jsxs("label", { children: ["GST Number (Optional)", /* @__PURE__ */ jsx("input", {
								type: "text",
								placeholder: "Enter GST number",
								value: gstNumber,
								onChange: (event) => setGstNumber(event.target.value)
							})] }),
							/* @__PURE__ */ jsxs("label", { children: ["Phone Number", /* @__PURE__ */ jsx("input", {
								type: "tel",
								placeholder: "Enter your phone",
								value: signupPhone,
								maxLength: 10,
								onChange: (event) => setSignupPhone(event.target.value),
								required: true
							})] }),
							error && /* @__PURE__ */ jsx("div", {
								className: "partner-auth-error",
								children: error
							}),
							notice && /* @__PURE__ */ jsx("div", {
								className: "partner-otp-hint",
								children: notice
							}),
							/* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "partner-submit-btn",
								disabled: isSendingOtp,
								children: isSendingOtp ? "Sending..." : "Send OTP"
							})
						]
					}) : /* @__PURE__ */ jsxs("form", {
						className: "partner-auth-form",
						onSubmit: handleSignup,
						children: [
							/* @__PURE__ */ jsxs("label", { children: ["Enter OTP", /* @__PURE__ */ jsx("input", {
								type: "text",
								inputMode: "numeric",
								maxLength: 4,
								placeholder: "Enter OTP",
								value: signupOtp,
								onChange: (event) => setSignupOtp(event.target.value)
							})] }),
							/* @__PURE__ */ jsxs("div", {
								className: "partner-otp-hint",
								children: [
									"OTP sent to ",
									signupPhone,
									".",
									" ",
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "partner-inline-link-btn",
										disabled: isSendingOtp,
										onClick: () => {
											handleResendSignupOtp();
										},
										children: isSendingOtp ? "Sending..." : "Send OTP again"
									}),
									" ",
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "partner-inline-link-btn",
										onClick: () => {
											setSignupStep("phone");
											setSignupOtp("");
											setError(null);
											setNotice(null);
										},
										children: "Change number"
									})
								]
							}),
							/* @__PURE__ */ jsxs("label", { children: ["Proof of Identity", /* @__PURE__ */ jsxs("select", {
								value: identityProof,
								onChange: (event) => setIdentityProof(event.target.value),
								children: [
									/* @__PURE__ */ jsx("option", {
										value: "Aadhar",
										children: "Aadhar"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "Voter ID",
										children: "Voter ID"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "Driving License",
										children: "Driving License"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "PAN Card",
										children: "PAN Card"
									}),
									/* @__PURE__ */ jsx("option", {
										value: "Passport",
										children: "Passport"
									})
								]
							})] }),
							/* @__PURE__ */ jsxs("label", {
								className: "partner-file-label",
								children: ["Upload Identity Image", /* @__PURE__ */ jsx("input", {
									type: "file",
									accept: "image/*",
									onChange: (event) => setIdentityFile(event.target.files?.[0] ?? null)
								})]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "partner-upload-btn",
								children: identityFile ? `Uploaded: ${identityFile.name}` : "Upload"
							}),
							error && /* @__PURE__ */ jsx("div", {
								className: "partner-auth-error",
								children: error
							}),
							notice && /* @__PURE__ */ jsx("div", {
								className: "partner-otp-hint",
								children: notice
							}),
							/* @__PURE__ */ jsx("button", {
								type: "submit",
								className: "partner-submit-btn",
								disabled: isSubmitting,
								children: isSubmitting ? "Please wait..." : "Submit"
							})
						]
					})
				]
			}), isModalOpen && /* @__PURE__ */ jsx("div", {
				className: "partner-modal-backdrop",
				role: "dialog",
				"aria-modal": "true",
				children: /* @__PURE__ */ jsxs("div", {
					className: "partner-modal-card",
					children: [
						/* @__PURE__ */ jsx("h2", { children: "Registration Submitted" }),
						/* @__PURE__ */ jsx("p", { children: "Thank you for registering. Aapka KYC admin review me gaya hai. Approval ke baad aap /partner se login karke /partner-page access kar paayenge." }),
						/* @__PURE__ */ jsx("div", {
							className: "partner-modal-actions",
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "partner-submit-btn",
								onClick: () => {
									setIsModalOpen(false);
									setTab("login");
									setLoginStep("phone");
									setSignupStep("phone");
									setSignupOtp("");
									setLoginPhone(signupPhone.trim());
									setLoginPassword("");
									setNotice("Signup complete. Please login after KYC is approved by admin.");
								},
								children: "Go To Login"
							})
						})
					]
				})
			})]
		}),
		/* @__PURE__ */ jsx(PartnerSharedFooter, {}),
		/* @__PURE__ */ jsx(SupportFab, {})
	] });
}
//#endregion
export { PartnerAuthPage as component };
