import { t as activateRoleSession } from "./role-session-C7kgx143.js";
import { C as getPincodeAvailability, G as previewUserQuote, J as saveUserDeviceDetails, Y as saveUserPickupSchedule, Z as sendUserOtp, gt as verifyUserOtp, l as createUserQuote, t as ApiClientError, u as createUserSellFlow } from "./gadgetpe-client-Cg3AtJY8.js";
import { a as DialogFooter, c as Calendar, i as DialogDescription, n as Dialog, o as DialogHeader, r as DialogContent, s as DialogTitle, t as Input } from "./input-D2YsHpMi.js";
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import confetti from "canvas-confetti";
//#region src/routes/user.sell-tablet.quote.tsx?tsr-split=component
var DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";
var DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_tablet_device_details";
var PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_tablet_pickup_schedule";
var USER_FLOW_JSON_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_json";
var USER_FLOW_ID_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_id";
var QUOTE_STORAGE_KEY = "gadgetpe_user_sell_tablet_quote";
var SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
var USER_TOKEN_KEY = "gadgetpe_user_access_token";
var USER_REFRESH_KEY = "gadgetpe_user_refresh_token";
var USER_NAME_KEY = "gadgetpe_user_name";
var USER_ID_KEY = "gadgetpe_user_id";
var USER_SCOPE_KEY = "gadgetpe_user_scope";
var timeSlots = [
	"10:00 AM - 12:00 PM",
	"12:00 PM - 2:00 PM",
	"2:00 PM - 4:00 PM",
	"4:00 PM - 6:00 PM",
	"6:00 PM - 8:00 PM"
];
function getStoredSelectedModel() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DEVICE_MODEL_STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
function getStoredJson(key, fallback) {
	if (typeof window === "undefined") return fallback;
	try {
		const raw = window.localStorage.getItem(key);
		if (!raw) return fallback;
		return JSON.parse(raw);
	} catch {
		return fallback;
	}
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function getStoredUserPincode() {
	if (typeof window === "undefined") return void 0;
	try {
		const raw = window.localStorage.getItem(USER_SCOPE_KEY);
		if (!raw) return void 0;
		const scope = JSON.parse(raw);
		return scope.status === "ACTIVE" ? scope.pincode : void 0;
	} catch {
		return;
	}
}
function getToday() {
	const today = /* @__PURE__ */ new Date();
	today.setHours(0, 0, 0, 0);
	return today;
}
function formatPickupDate(date) {
	if (!date) return "";
	return new Intl.DateTimeFormat("en-IN", {
		weekday: "short",
		day: "2-digit",
		month: "short",
		year: "numeric"
	}).format(date);
}
function getApiSelectedModel(selectedModel) {
	if (!selectedModel?.brandSlug || !selectedModel.modelId || !selectedModel.modelName || typeof selectedModel.listedPrice !== "number") return null;
	return {
		brandSlug: selectedModel.brandSlug,
		modelId: selectedModel.modelId,
		modelName: selectedModel.modelName,
		listedPrice: selectedModel.listedPrice,
		thumbnailUrl: selectedModel.thumbnailUrl
	};
}
function UserSellTabletQuotePage() {
	const [selectedModel, setSelectedModel] = useState(null);
	const [quote, setQuote] = useState(null);
	const [quoteLoading, setQuoteLoading] = useState(false);
	const [quoteError, setQuoteError] = useState(null);
	const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
	const [modalStep, setModalStep] = useState("schedule");
	const [primaryDate, setPrimaryDate] = useState();
	const [primaryTime, setPrimaryTime] = useState("");
	const [alternateDate, setAlternateDate] = useState();
	const [alternateTime, setAlternateTime] = useState("");
	const [sellerName, setSellerName] = useState("");
	const [callingPhoneNumber, setCallingPhoneNumber] = useState("");
	const [addressLine, setAddressLine] = useState("");
	const [landmark, setLandmark] = useState("");
	const [pincode, setPincode] = useState("");
	const [validatedPincode, setValidatedPincode] = useState(null);
	const [validatedDistrict, setValidatedDistrict] = useState("");
	const [validatedState, setValidatedState] = useState("");
	const [isValidatingPincode, setIsValidatingPincode] = useState(false);
	const [schedulingPickup, setSchedulingPickup] = useState(false);
	const [quoteAccessPhone, setQuoteAccessPhone] = useState("");
	const [quoteAccessOtp, setQuoteAccessOtp] = useState("");
	const [quoteOtpSent, setQuoteOtpSent] = useState(false);
	const [isQuoteSendingOtp, setIsQuoteSendingOtp] = useState(false);
	const [isQuoteVerifyingOtp, setIsQuoteVerifyingOtp] = useState(false);
	const [isPhoneVerified, setIsPhoneVerified] = useState(false);
	const [verifiedToken, setVerifiedToken] = useState(null);
	const [verifiedUser, setVerifiedUser] = useState(null);
	const [authError, setAuthError] = useState(null);
	useEffect(() => {
		if (modalStep !== "success" || typeof window === "undefined") return;
		const fireConfetti = () => {
			confetti({
				particleCount: 120,
				spread: 72,
				origin: { y: .72 },
				colors: [
					"#20bf97",
					"#0ea5c9",
					"#facc15",
					"#ffffff"
				]
			});
			confetti({
				particleCount: 55,
				angle: 60,
				spread: 56,
				origin: {
					x: 0,
					y: .76
				},
				colors: [
					"#20bf97",
					"#0ea5c9",
					"#facc15"
				]
			});
			confetti({
				particleCount: 55,
				angle: 120,
				spread: 56,
				origin: {
					x: 1,
					y: .76
				},
				colors: [
					"#20bf97",
					"#0ea5c9",
					"#facc15"
				]
			});
		};
		fireConfetti();
		const timeout = window.setTimeout(fireConfetti, 450);
		return () => window.clearTimeout(timeout);
	}, [modalStep]);
	useEffect(() => {
		const storedModel = getStoredSelectedModel();
		setSelectedModel(storedModel);
		if (!storedModel) return;
		setQuote(getStoredJson(QUOTE_STORAGE_KEY, {
			basePrice: storedModel.listedPrice ?? 0,
			sellingPrice: storedModel.listedPrice ?? 0,
			totalDeduction: 0,
			currency: "INR",
			priceSource: "LOCAL_LISTED_PRICE",
			validUntil: new Date(Date.now() + 1440 * 60 * 1e3).toISOString(),
			deductions: []
		}));
		const apiSelectedModel = getApiSelectedModel(storedModel);
		if (!apiSelectedModel) return;
		const loadBackendQuotePreview = async () => {
			setQuoteLoading(true);
			setQuoteError(null);
			try {
				const result = await previewUserQuote({
					selectedModel: apiSelectedModel,
					deviceDetails: getStoredJson(DEVICE_DETAILS_STORAGE_KEY, null)
				});
				setQuote(result.quote);
				window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(result.quote));
			} catch (err) {
				setQuoteError(err instanceof Error ? err.message : "Unable to calculate backend quote preview.");
			} finally {
				setQuoteLoading(false);
			}
		};
		loadBackendQuotePreview();
	}, []);
	useEffect(() => {
		if (typeof window === "undefined") return;
		const storedName = window.localStorage.getItem(USER_NAME_KEY) || "";
		const storedPhone = window.localStorage.getItem("gadgetpe_user_phone") || "";
		const storedScope = getStoredJson(USER_SCOPE_KEY, null);
		if (storedName) setSellerName(storedName);
		if (storedPhone) setQuoteAccessPhone(storedPhone);
		if (storedScope?.pincode) {
			setPincode(storedScope.pincode);
			setValidatedPincode(storedScope.pincode);
		}
	}, []);
	const isPrimarySlotComplete = Boolean(primaryDate && primaryTime);
	const isScheduleComplete = Boolean(primaryDate && primaryTime && alternateDate && alternateTime);
	const isAddressComplete = Boolean(sellerName.trim() && callingPhoneNumber.trim().length >= 10 && addressLine.trim() && validatedPincode);
	const confirmedPickupText = `${formatPickupDate(primaryDate)} at ${primaryTime}`;
	const handleValidatePincode = async (rawPincode) => {
		const trimmedPincode = (rawPincode ?? pincode).trim();
		if (!/^\d{6}$/.test(trimmedPincode)) {
			setAuthError("Enter a valid 6-digit pincode.");
			return false;
		}
		setIsValidatingPincode(true);
		setAuthError(null);
		try {
			const result = await getPincodeAvailability(trimmedPincode);
			if (result.status !== "ACTIVE") {
				setValidatedPincode(null);
				setValidatedDistrict("");
				setValidatedState("");
				setAuthError(result.reason || "Selected pincode is currently not serviceable.");
				return false;
			}
			setValidatedPincode(result.pincode);
			setValidatedDistrict(result.location?.district || "");
			setValidatedState(result.location?.state || "");
			if (typeof window !== "undefined") window.localStorage.setItem(USER_SCOPE_KEY, JSON.stringify({
				pincode: result.pincode,
				status: result.status,
				city: result.location?.district || null,
				state: result.location?.state || null,
				district: result.location?.district || null
			}));
			return true;
		} catch (err) {
			setValidatedPincode(null);
			setValidatedDistrict("");
			setValidatedState("");
			setAuthError(err instanceof ApiClientError || err instanceof Error ? err.message : "Unable to validate pincode.");
			return false;
		} finally {
			setIsValidatingPincode(false);
		}
	};
	const openScheduleModal = () => {
		if (!isPhoneVerified) {
			setAuthError("Verify phone number first to unlock final quote and scheduling.");
			return;
		}
		setModalStep("schedule");
		setAuthError(null);
		setCallingPhoneNumber((prev) => prev || quoteAccessPhone);
		setSellerName((prev) => prev || verifiedUser?.name || "");
		setScheduleModalOpen(true);
	};
	const buildPickupSchedule = () => {
		if (!selectedModel || !primaryDate || !alternateDate) return;
		const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		return {
			pincode: validatedPincode || pincode.trim() || getStoredUserPincode(),
			modelName: selectedModel.modelName,
			listedPrice: selectedModel.listedPrice,
			primaryDate: primaryDate.toISOString(),
			primaryTime,
			alternateDate: alternateDate.toISOString(),
			alternateTime,
			sellerName: sellerName.trim(),
			callingPhoneNumber: callingPhoneNumber.trim(),
			addressLine: addressLine.trim(),
			landmark: landmark.trim(),
			city: validatedDistrict,
			updatedAt
		};
	};
	const commitPickup = async (token, user) => {
		const apiSelectedModel = getApiSelectedModel(selectedModel);
		const pickupSchedule = buildPickupSchedule();
		if (!apiSelectedModel || !pickupSchedule) throw new Error("Missing selected tablet or pickup details.");
		const updatedAt = (/* @__PURE__ */ new Date()).toISOString();
		const deviceDetails = getStoredJson(DEVICE_DETAILS_STORAGE_KEY, null) || {};
		let flowJsonToStore = {
			id: `sell-tablet-${Date.now()}`,
			flowType: "sell-tablet",
			status: "PICKUP_SCHEDULED",
			user: {
				id: user.id,
				name: user.name || sellerName.trim()
			},
			selectedModel: apiSelectedModel,
			deviceDetails,
			quote,
			pickupSchedule,
			createdAt: updatedAt,
			updatedAt
		};
		const created = await createUserSellFlow(token, apiSelectedModel, getStoredUserPincode(), "sell-tablet");
		window.localStorage.setItem(USER_FLOW_ID_STORAGE_KEY, created.flow.id);
		await saveUserDeviceDetails(token, created.flow.id, deviceDetails);
		const quoteResult = await createUserQuote(token, created.flow.id);
		const scheduleResult = await saveUserPickupSchedule(token, created.flow.id, pickupSchedule);
		setQuote(quoteResult.quote);
		flowJsonToStore = scheduleResult.flow.flowJson ?? scheduleResult.flow;
		const sellingHistory = getStoredJson(SELLING_HISTORY_STORAGE_KEY, []);
		window.localStorage.setItem(PICKUP_SCHEDULE_STORAGE_KEY, JSON.stringify(pickupSchedule));
		window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(quoteResult.quote));
		window.localStorage.setItem(USER_FLOW_JSON_STORAGE_KEY, JSON.stringify(flowJsonToStore));
		window.localStorage.setItem(SELLING_HISTORY_STORAGE_KEY, JSON.stringify([flowJsonToStore, ...sellingHistory].slice(0, 25)));
	};
	const handleSendOtp = async () => {
		const phone = quoteAccessPhone.trim();
		if (!/^\d{10}$/.test(phone)) {
			setAuthError("Enter a valid 10-digit phone number.");
			return;
		}
		setAuthError(null);
		setIsQuoteSendingOtp(true);
		try {
			await sendUserOtp(phone);
			setQuoteOtpSent(true);
		} catch (err) {
			setAuthError(err instanceof ApiClientError ? err.message : "Failed to send OTP.");
		} finally {
			setIsQuoteSendingOtp(false);
		}
	};
	const handleVerifyOtp = async () => {
		const phone = quoteAccessPhone.trim();
		const trimmedOtp = quoteAccessOtp.trim();
		if (!/^\d{10}$/.test(phone)) {
			setAuthError("Enter a valid 10-digit phone number.");
			return;
		}
		if (!/^\d{4,6}$/.test(trimmedOtp)) {
			setAuthError("Enter a valid OTP.");
			return;
		}
		setAuthError(null);
		setIsQuoteVerifyingOtp(true);
		try {
			const result = await verifyUserOtp(phone, trimmedOtp, sellerName.trim() || void 0);
			window.localStorage.setItem(USER_TOKEN_KEY, result.accessToken);
			window.localStorage.setItem(USER_REFRESH_KEY, result.refreshToken);
			window.localStorage.setItem(USER_NAME_KEY, result.user.name);
			window.localStorage.setItem(USER_ID_KEY, result.user.id);
			window.localStorage.setItem("gadgetpe_user_phone", result.user.phone);
			activateRoleSession("user");
			setVerifiedToken(result.accessToken);
			setVerifiedUser(result.user);
			setIsPhoneVerified(true);
			setCallingPhoneNumber(phone);
			if (!sellerName.trim()) setSellerName(result.user.name || "");
			setAuthError(null);
		} catch (err) {
			setAuthError(err instanceof ApiClientError || err instanceof Error ? err.message : "Unable to verify phone.");
		} finally {
			setIsQuoteVerifyingOtp(false);
		}
	};
	const handleSchedulePickup = async () => {
		const token = verifiedToken || window.localStorage.getItem(USER_TOKEN_KEY);
		const userId = verifiedUser?.id || window.localStorage.getItem(USER_ID_KEY) || "";
		const userName = verifiedUser?.name || window.localStorage.getItem(USER_NAME_KEY) || sellerName.trim();
		if (!token || !userId) {
			setAuthError("Phone verification required before scheduling pickup.");
			return;
		}
		setSchedulingPickup(true);
		setAuthError(null);
		try {
			await commitPickup(token, {
				id: userId,
				name: userName
			});
			setModalStep("success");
		} catch (err) {
			setAuthError(err instanceof ApiClientError || err instanceof Error ? err.message : "Unable to schedule pickup.");
		} finally {
			setSchedulingPickup(false);
		}
	};
	const displayedPrice = quote?.sellingPrice ?? selectedModel?.listedPrice ?? 0;
	return /* @__PURE__ */ jsxs("main", {
		className: "user-seller-page",
		children: [/* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-quote-shell",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Your Quote"
				}),
				/* @__PURE__ */ jsx("h1", { children: "Selling Price" }),
				selectedModel?.modelName ? !isPhoneVerified ? /* @__PURE__ */ jsxs("section", {
					className: "user-question-card",
					"aria-label": "Verify phone for final quote",
					children: [
						/* @__PURE__ */ jsx("h3", { children: "Verify your mobile to unlock final price" }),
						/* @__PURE__ */ jsxs("div", {
							className: "user-address-form",
							style: { marginTop: 12 },
							children: [
								/* @__PURE__ */ jsxs("label", { children: ["Phone number", /* @__PURE__ */ jsx(Input, {
									value: quoteAccessPhone,
									onChange: (event) => setQuoteAccessPhone(event.target.value.replace(/\D/g, "").slice(0, 10)),
									placeholder: "Enter 10-digit phone",
									inputMode: "tel",
									maxLength: 10
								})] }),
								quoteOtpSent ? /* @__PURE__ */ jsxs("label", { children: ["OTP", /* @__PURE__ */ jsx(Input, {
									value: quoteAccessOtp,
									onChange: (event) => setQuoteAccessOtp(event.target.value.replace(/\D/g, "").slice(0, 6)),
									placeholder: "Enter OTP (dev: 6767)",
									inputMode: "numeric",
									maxLength: 6
								})] }) : null,
								authError ? /* @__PURE__ */ jsx("div", {
									className: "user-auth-error",
									children: authError
								}) : null
							]
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "user-auth-actions user-quote-actions",
							children: [/* @__PURE__ */ jsx(Link, {
								to: "/user/sell-tablet/device-details",
								className: "user-auth-cancel user-inline-link",
								children: "Back"
							}), !quoteOtpSent ? /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit",
								disabled: isQuoteSendingOtp,
								onClick: () => void handleSendOtp(),
								children: isQuoteSendingOtp ? "Sending..." : "Send OTP"
							}) : /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit",
								disabled: isQuoteVerifyingOtp,
								onClick: () => void handleVerifyOtp(),
								children: isQuoteVerifyingOtp ? "Verifying..." : "Verify OTP"
							})]
						})
					]
				}) : /* @__PURE__ */ jsxs("section", {
					className: "user-quote-card",
					"aria-label": "Selected phone quote",
					children: [/* @__PURE__ */ jsx("div", {
						className: "user-quote-media",
						children: selectedModel.thumbnailUrl ? /* @__PURE__ */ jsx("img", {
							src: selectedModel.thumbnailUrl,
							alt: `${selectedModel.modelName} thumbnail`,
							className: "user-quote-thumb"
						}) : /* @__PURE__ */ jsx("div", {
							className: "user-quote-thumb-fallback",
							children: selectedModel.modelName.charAt(0)
						})
					}), /* @__PURE__ */ jsxs("div", {
						className: "user-quote-details",
						children: [
							/* @__PURE__ */ jsx("span", {
								className: "user-step-progress",
								children: "Final quote"
							}),
							/* @__PURE__ */ jsx("h2", { children: selectedModel.modelName }),
							/* @__PURE__ */ jsx("p", { children: "Device verified. You can now schedule a pickup." }),
							/* @__PURE__ */ jsx("div", {
								className: "user-quote-price-label",
								children: "Selling Price"
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "user-quote-price",
								children: ["Rs. ", formatInr(displayedPrice)]
							}),
							quoteLoading ? /* @__PURE__ */ jsx("p", {
								className: "user-quote-muted",
								children: "Calculating latest quote..."
							}) : null,
							quoteError ? /* @__PURE__ */ jsx("p", {
								className: "user-quote-muted",
								style: { color: "#b91c1c" },
								children: quoteError
							}) : null,
							quote ? /* @__PURE__ */ jsxs("div", {
								className: "user-quote-breakdown",
								children: [
									/* @__PURE__ */ jsxs("span", { children: ["Base price: Rs. ", formatInr(Math.round(quote.basePrice ?? selectedModel.listedPrice ?? 0))] }),
									/* @__PURE__ */ jsxs("span", { children: ["Total deduction: Rs. ", formatInr(Math.round(quote.totalDeduction ?? 0))] }),
									(quote.deductions || []).map((item) => /* @__PURE__ */ jsxs("span", { children: [
										item.label,
										": -Rs. ",
										formatInr(Math.round(item.deductionAmount))
									] }, item.ruleId))
								]
							}) : null,
							/* @__PURE__ */ jsxs("div", {
								className: "user-auth-actions user-quote-actions",
								children: [/* @__PURE__ */ jsx(Link, {
									to: "/user/sell-tablet/device-details",
									className: "user-auth-cancel user-inline-link",
									children: "Back"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "user-auth-submit",
									onClick: openScheduleModal,
									children: "Sell Now"
								})]
							})
						]
					})]
				}) : /* @__PURE__ */ jsxs("section", {
					className: "user-question-card",
					children: [
						/* @__PURE__ */ jsx("h3", { children: "No tablet model selected." }),
						/* @__PURE__ */ jsx("p", {
							className: "user-quote-muted",
							children: "Choose your tablet model first to generate a quote."
						}),
						/* @__PURE__ */ jsx("div", {
							className: "user-auth-actions user-quote-actions",
							children: /* @__PURE__ */ jsx(Link, {
								to: "/user/sell-tablet",
								className: "user-auth-submit user-inline-link",
								children: "Choose Tablet"
							})
						})
					]
				})
			]
		}), /* @__PURE__ */ jsx(Dialog, {
			open: scheduleModalOpen,
			onOpenChange: setScheduleModalOpen,
			children: /* @__PURE__ */ jsxs(DialogContent, {
				className: "user-pickup-modal",
				children: [
					modalStep === "schedule" ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Schedule a home pickup" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Select your preferred slot first. Alternate slot will open after that." })] }),
						/* @__PURE__ */ jsxs("div", {
							className: "user-pickup-schedule-grid",
							children: [!isPrimarySlotComplete ? /* @__PURE__ */ jsxs("section", {
								className: "user-pickup-section",
								children: [
									/* @__PURE__ */ jsx("h3", { children: "Preferred pickup" }),
									/* @__PURE__ */ jsx(Calendar, {
										mode: "single",
										selected: primaryDate,
										onSelect: setPrimaryDate,
										disabled: { before: getToday() },
										className: "user-pickup-calendar"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "user-time-slot-grid",
										children: timeSlots.map((slot) => /* @__PURE__ */ jsx("button", {
											type: "button",
											className: `user-time-slot${primaryTime === slot ? " selected" : ""}`,
											onClick: () => setPrimaryTime(slot),
											children: slot
										}, slot))
									})
								]
							}) : /* @__PURE__ */ jsxs("section", {
								className: "user-pickup-summary",
								children: [
									/* @__PURE__ */ jsx("span", { children: "Preferred pickup selected" }),
									/* @__PURE__ */ jsxs("strong", { children: [
										formatPickupDate(primaryDate),
										" at ",
										primaryTime
									] }),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "user-pickup-change-btn",
										onClick: () => {
											setPrimaryTime("");
											setAlternateDate(void 0);
											setAlternateTime("");
										},
										children: "Change"
									})
								]
							}), isPrimarySlotComplete ? /* @__PURE__ */ jsxs("section", {
								className: "user-pickup-section",
								children: [
									/* @__PURE__ */ jsx("h3", { children: "Alternate pickup" }),
									/* @__PURE__ */ jsx(Calendar, {
										mode: "single",
										selected: alternateDate,
										onSelect: setAlternateDate,
										disabled: { before: getToday() },
										className: "user-pickup-calendar"
									}),
									/* @__PURE__ */ jsx("div", {
										className: "user-time-slot-grid",
										children: timeSlots.map((slot) => /* @__PURE__ */ jsx("button", {
											type: "button",
											className: `user-time-slot${alternateTime === slot ? " selected" : ""}`,
											onClick: () => setAlternateTime(slot),
											children: slot
										}, slot))
									})
								]
							}) : null]
						}),
						/* @__PURE__ */ jsxs(DialogFooter, {
							className: "user-modal-actions",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-cancel",
								onClick: () => setScheduleModalOpen(false),
								children: "Cancel"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit",
								disabled: !isScheduleComplete,
								onClick: () => setModalStep("address"),
								children: "Save and next"
							})]
						})
					] }) : null,
					modalStep === "address" ? /* @__PURE__ */ jsxs(Fragment, { children: [
						/* @__PURE__ */ jsxs(DialogHeader, { children: [/* @__PURE__ */ jsx(DialogTitle, { children: "Address details" }), /* @__PURE__ */ jsx(DialogDescription, { children: "Share the contact details our executive should use for pickup." })] }),
						/* @__PURE__ */ jsxs("div", {
							className: "user-address-form",
							children: [
								/* @__PURE__ */ jsxs("label", { children: ["Name", /* @__PURE__ */ jsx(Input, {
									value: sellerName,
									onChange: (event) => setSellerName(event.target.value),
									placeholder: "Enter full name"
								})] }),
								/* @__PURE__ */ jsxs("label", { children: ["Calling phone number", /* @__PURE__ */ jsx(Input, {
									value: callingPhoneNumber,
									onChange: (event) => setCallingPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10)),
									placeholder: "Enter calling phone number",
									inputMode: "tel",
									maxLength: 10
								})] }),
								/* @__PURE__ */ jsxs("label", { children: ["Address details", /* @__PURE__ */ jsx(Input, {
									value: addressLine,
									onChange: (event) => setAddressLine(event.target.value),
									placeholder: "House number, street, area"
								})] }),
								/* @__PURE__ */ jsxs("label", { children: ["Landmark", /* @__PURE__ */ jsx(Input, {
									value: landmark,
									onChange: (event) => setLandmark(event.target.value),
									placeholder: "Nearby landmark"
								})] }),
								/* @__PURE__ */ jsxs("label", { children: ["Pincode", /* @__PURE__ */ jsx(Input, {
									value: pincode,
									onChange: (event) => {
										const value = event.target.value.replace(/\D/g, "").slice(0, 6);
										setPincode(value);
										if (validatedPincode && validatedPincode !== value) {
											setValidatedPincode(null);
											setValidatedDistrict("");
											setValidatedState("");
										}
										if (value.length < 6) {
											setAuthError(null);
											return;
										}
										if (!isValidatingPincode && value !== validatedPincode) handleValidatePincode(value);
									},
									placeholder: "Enter 6-digit pincode",
									inputMode: "numeric",
									maxLength: 6
								})] }),
								isValidatingPincode ? /* @__PURE__ */ jsx("p", {
									className: "user-quote-muted",
									children: "Validating pincode..."
								}) : null,
								validatedPincode ? /* @__PURE__ */ jsxs("p", {
									className: "user-quote-muted",
									children: [
										"Selected: ",
										validatedPincode,
										validatedDistrict || validatedState ? ` · ${[validatedDistrict, validatedState].filter(Boolean).join(", ")}` : ""
									]
								}) : null,
								authError ? /* @__PURE__ */ jsx("div", {
									className: "user-auth-error",
									children: authError
								}) : null
							]
						}),
						/* @__PURE__ */ jsxs(DialogFooter, {
							className: "user-modal-actions",
							children: [/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-cancel",
								onClick: () => setModalStep("schedule"),
								children: "Back"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit",
								disabled: !isAddressComplete || schedulingPickup,
								onClick: () => void handleSchedulePickup(),
								children: schedulingPickup ? "Scheduling..." : "Schedule pickup"
							})]
						})
					] }) : null,
					modalStep === "success" ? /* @__PURE__ */ jsxs("section", {
						className: "user-pickup-success",
						"aria-label": "Pickup scheduled confirmation",
						children: [
							/* @__PURE__ */ jsx("div", {
								className: "user-pickup-success-badge",
								children: "Hooray!"
							}),
							/* @__PURE__ */ jsxs("h2", { children: [
								"Your pickup is scheduled for ",
								confirmedPickupText,
								"."
							] }),
							/* @__PURE__ */ jsx("p", { children: "Our executive will get in touch with you soon! Thank you for using GadgetPe." }),
							/* @__PURE__ */ jsxs("p", {
								className: "user-quote-muted",
								children: [
									"Alternate slot: ",
									formatPickupDate(alternateDate),
									" at ",
									alternateTime
								]
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit",
								onClick: () => {
									setScheduleModalOpen(false);
									if (typeof window !== "undefined") window.location.href = "/user";
								},
								children: "Done"
							})
						]
					}) : null
				]
			})
		})]
	});
}
//#endregion
export { UserSellTabletQuotePage as component };
