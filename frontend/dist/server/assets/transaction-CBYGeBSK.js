import { n as clearRoleSession, r as getActiveRole } from "./role-session-C7kgx143.js";
import { $ as submitPartnerOnsiteValidation, S as getPartnerLead, a as claimPartnerLead, it as updatePartnerLeadStatus, o as completePartnerLead, rt as updatePartnerLeadCallStatus } from "./gadgetpe-client-Cg3AtJY8.js";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { jsx, jsxs } from "react/jsx-runtime";
import { toast } from "sonner";
//#region src/routes/service-Leads/transaction/index.tsx?tsr-split=component
var PARTNER_TOKEN_KEY = "gadgetpe_partner_access_token";
var LEGACY_PARTNER_TOKEN_KEY = "gadgetpe_access_token";
var REQUIRED_VALIDATION_PHOTO_COUNT = 6;
function getPartnerToken() {
	if (typeof window === "undefined") return null;
	return window.localStorage.getItem(PARTNER_TOKEN_KEY) || window.localStorage.getItem(LEGACY_PARTNER_TOKEN_KEY);
}
function forcePartnerLoginRedirect() {
	if (typeof window === "undefined") return;
	clearRoleSession("partner");
	window.location.assign("/partner");
}
function formatInr(value) {
	return new Intl.NumberFormat("en-IN").format(value);
}
function formatFieldLabel(path) {
	return path.replace(/\./g, " / ").replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").replace(/\b\w/g, (ch) => ch.toUpperCase());
}
function toReadableValue(value) {
	if (value === null || value === void 0) return "-";
	if (typeof value === "boolean") return value ? "Yes" : "No";
	if (typeof value === "number") return String(value);
	if (typeof value === "string") return value;
	return JSON.stringify(value);
}
function flattenDeviceDetails(value, path = "") {
	if (value === null || value === void 0) return path ? [{
		key: path,
		label: formatFieldLabel(path),
		userValue: "-"
	}] : [];
	if (Array.isArray(value)) {
		if (value.length === 0) return path ? [{
			key: path,
			label: formatFieldLabel(path),
			userValue: "-"
		}] : [];
		if (value.every((item) => item === null || [
			"string",
			"number",
			"boolean"
		].includes(typeof item))) return [{
			key: path || "value",
			label: formatFieldLabel(path || "value"),
			userValue: value.map((item) => toReadableValue(item)).join(", ")
		}];
		return value.flatMap((item, index) => flattenDeviceDetails(item, path ? `${path}.${index + 1}` : String(index + 1)));
	}
	if (typeof value === "object") {
		const entries = Object.entries(value);
		if (!entries.length && path) return [{
			key: path,
			label: formatFieldLabel(path),
			userValue: "-"
		}];
		return entries.flatMap(([childKey, childValue]) => flattenDeviceDetails(childValue, path ? `${path}.${childKey}` : childKey));
	}
	return [{
		key: path || "value",
		label: formatFieldLabel(path || "value"),
		userValue: toReadableValue(value)
	}];
}
function ServiceLeadTransactionPage() {
	const navigate = useNavigate();
	const search = useSearch({ from: "/service-Leads/transaction/" });
	const [lead, setLead] = useState(null);
	const [callDone, setCallDone] = useState(false);
	const [validationResult, setValidationResult] = useState("PASS");
	const [observedIssues, setObservedIssues] = useState("");
	const [validationNotes, setValidationNotes] = useState("");
	const [revisedQuote, setRevisedQuote] = useState("");
	const [completionRemarks, setCompletionRemarks] = useState("");
	const [finishing, setFinishing] = useState(false);
	const [rejecting, setRejecting] = useState(false);
	const [showSuccess, setShowSuccess] = useState(false);
	const [elapsedLabel, setElapsedLabel] = useState("--");
	const [partnerChecks, setPartnerChecks] = useState({});
	const [validationPhotos, setValidationPhotos] = useState([]);
	const [showRejectConfirm, setShowRejectConfirm] = useState(false);
	const [rejectConfirmChecked, setRejectConfirmChecked] = useState(false);
	const loadLead = async () => {
		const activeRole = getActiveRole();
		if (activeRole === "user") {
			await navigate({ to: "/user" });
			return;
		}
		if (activeRole === "admin") {
			await navigate({ to: "/admin" });
			return;
		}
		const token = getPartnerToken();
		if (!token) {
			forcePartnerLoginRedirect();
			return;
		}
		if (!search.leadId) return;
		try {
			setLead((await getPartnerLead(token, search.leadId)).lead);
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to load service lead.");
		}
	};
	useEffect(() => {
		loadLead();
	}, [search.leadId]);
	useEffect(() => {
		if (!lead) return;
		setCallDone((lead.callAttemptCount ?? 0) > 0 || Boolean(lead.lastCalledAt));
	}, [lead]);
	useEffect(() => {
		const anchor = lead?.pickupStartedAt || lead?.claimedAt || lead?.updatedAt;
		if (lead?.status === "REJECTED" || lead?.status === "CANCELLED") {
			setElapsedLabel("--");
			return;
		}
		if (!anchor) {
			setElapsedLabel("--");
			return;
		}
		const updateElapsed = () => {
			const started = Date.parse(anchor);
			if (Number.isNaN(started)) {
				setElapsedLabel("--");
				return;
			}
			const diff = Math.max(0, Date.now() - started);
			const hours = Math.floor(diff / (1e3 * 60 * 60));
			const mins = Math.floor(diff % (1e3 * 60 * 60) / (1e3 * 60));
			const secs = Math.floor(diff % (1e3 * 60) / 1e3);
			setElapsedLabel(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
		};
		updateElapsed();
		const timer = setInterval(updateElapsed, 1e3);
		return () => clearInterval(timer);
	}, [
		lead?.status,
		lead?.pickupStartedAt,
		lead?.claimedAt,
		lead?.updatedAt
	]);
	const validationRows = useMemo(() => {
		if (!lead?.deviceDetails) return [];
		return flattenDeviceDetails(lead.deviceDetails);
	}, [lead?.deviceDetails]);
	useEffect(() => {
		if (!validationRows.length) {
			setPartnerChecks({});
			return;
		}
		setPartnerChecks((prev) => {
			const next = {};
			validationRows.forEach((row) => {
				next[row.key] = prev[row.key] ?? {
					decision: "yes",
					comment: ""
				};
			});
			return next;
		});
	}, [validationRows]);
	const ensureInProgress = async () => {
		if (!lead) return lead;
		if (lead.status === "IN_PROGRESS") return lead;
		if (lead.status !== "ACCEPTED") {
			toast.error("Lead must be ACCEPTED before pickup workflow can start.");
			return null;
		}
		const token = getPartnerToken();
		if (!token) {
			forcePartnerLoginRedirect();
			return null;
		}
		const claimedLead = await ensureClaimedLead(lead, token);
		if (!claimedLead) return null;
		const result = await updatePartnerLeadStatus(token, claimedLead.id, { status: "IN_PROGRESS" });
		setLead(result.lead);
		return result.lead;
	};
	const ensureClaimedLead = async (targetLead, token) => {
		if (targetLead.partnerId) return targetLead;
		try {
			const claimed = await claimPartnerLead(token, targetLead.id);
			setLead(claimed.lead);
			return claimed.lead;
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Claim this lead before updating workflow status.");
			return null;
		}
	};
	const handleSaveValidation = async () => {
		if (!lead) return;
		const token = getPartnerToken();
		if (!token) {
			forcePartnerLoginRedirect();
			return;
		}
		if (!await ensureInProgress()) return;
		const uploadedPhotos = validationPhotos;
		if (uploadedPhotos.length < REQUIRED_VALIDATION_PHOTO_COUNT) {
			toast.error(`Please upload all ${REQUIRED_VALIDATION_PHOTO_COUNT} device photos before saving validation.`);
			return;
		}
		const checklist = Object.fromEntries(validationRows.map((row) => {
			const partner = partnerChecks[row.key] ?? {
				decision: "na",
				comment: ""
			};
			return [row.key, JSON.stringify({
				field: row.label,
				userInput: row.userValue,
				partnerInput: partner.decision,
				comment: partner.comment.trim() || null
			})];
		}));
		checklist.__devicePhotos = JSON.stringify({
			required: REQUIRED_VALIDATION_PHOTO_COUNT,
			uploaded: uploadedPhotos.length,
			files: uploadedPhotos.map((photo, index) => ({
				slot: index + 1,
				name: photo.name,
				size: photo.size,
				type: photo.type
			}))
		});
		try {
			setLead((await submitPartnerOnsiteValidation(token, lead.id, {
				result: validationResult,
				checklist,
				observedIssues: observedIssues.split("\n").map((line) => line.trim()).filter(Boolean),
				revisedQuote: revisedQuote.trim() ? Number(revisedQuote) : void 0,
				notes: validationNotes.trim() || void 0,
				photos: uploadedPhotos.map((photo) => photo.file)
			})).lead);
			toast.success("Onsite validation saved.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to save onsite validation.");
		}
	};
	const handleFinish = async () => {
		if (!lead) return;
		const token = getPartnerToken();
		if (!token) {
			forcePartnerLoginRedirect();
			return;
		}
		setFinishing(true);
		try {
			setLead((await completePartnerLead(token, lead.id, {
				finalAmount: lead.paymentProof?.amountCollected ?? lead.quote?.sellingPrice ?? 0,
				handoverChecklist: {
					callDone,
					validationSaved: Boolean(lead.onsiteValidation),
					paymentProofSubmitted: Boolean(lead.paymentProof)
				},
				remarks: completionRemarks.trim() || void 0
			})).lead);
			setShowSuccess(true);
			toast.success("Lead completed successfully.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to finish transaction.");
		} finally {
			setFinishing(false);
		}
	};
	const handleRejectLead = async () => {
		if (!lead) return;
		const token = getPartnerToken();
		if (!token) {
			forcePartnerLoginRedirect();
			return;
		}
		setRejecting(true);
		try {
			const claimedLead = await ensureClaimedLead(lead, token);
			if (!claimedLead) return;
			await updatePartnerLeadStatus(token, claimedLead.id, {
				status: "REJECTED",
				reason: completionRemarks.trim() || "Lead rejected by partner"
			});
			toast.success("Lead rejected. Returning to partner homepage.");
			await navigate({ to: "/partner-page" });
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to reject lead.");
		} finally {
			setRejecting(false);
		}
	};
	const handleValidationPhotoSelect = (fileList) => {
		const files = Array.from(fileList ?? []).filter((file) => file.type.startsWith("image/"));
		if (!files.length) return;
		const selected = files.slice(0, REQUIRED_VALIDATION_PHOTO_COUNT).map((file) => ({
			file,
			name: file.name,
			size: file.size,
			type: file.type || "image/*",
			previewUrl: URL.createObjectURL(file)
		}));
		if (files.length > REQUIRED_VALIDATION_PHOTO_COUNT) toast.error(`Only ${REQUIRED_VALIDATION_PHOTO_COUNT} images are required. Using the first ${REQUIRED_VALIDATION_PHOTO_COUNT}.`);
		setValidationPhotos((prev) => {
			prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
			return selected;
		});
	};
	useEffect(() => {
		return () => {
			validationPhotos.forEach((photo) => {
				URL.revokeObjectURL(photo.previewUrl);
			});
		};
	}, [validationPhotos]);
	const uploadedPhotoCount = validationPhotos.length;
	const canSchedulePickup = lead?.status === "ACCEPTED" || lead?.status === "IN_PROGRESS";
	const canSaveValidation = (lead?.status === "ACCEPTED" || lead?.status === "IN_PROGRESS") && uploadedPhotoCount >= REQUIRED_VALIDATION_PHOTO_COUNT;
	const canPay = Boolean(lead?.onsiteValidation) && lead?.onsiteValidation?.result === "PASS";
	const canFinish = Boolean(lead?.paymentProof) && Boolean(lead?.onsiteValidation) && lead?.status === "IN_PROGRESS";
	useEffect(() => {
		if (lead?.completionEvent?.handoverChecklist && typeof lead.completionEvent.handoverChecklist === "object") {
			if (Boolean(lead.completionEvent.handoverChecklist.callDone)) setCallDone(true);
		}
	}, [lead?.completionEvent]);
	const handleMarkCalled = async () => {
		if (!lead) return;
		const token = getPartnerToken();
		if (!token) {
			forcePartnerLoginRedirect();
			return;
		}
		try {
			setLead((await updatePartnerLeadCallStatus(token, lead.id, { callStatus: "CALLED" })).lead);
			setCallDone(true);
			toast.success("Call status saved.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Unable to save call status.");
		}
	};
	return /* @__PURE__ */ jsx("main", {
		className: "partner-simple-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "partner-simple-card partner-lead-card",
			children: [
				/* @__PURE__ */ jsx("h1", { children: "Service Lead Transaction" }),
				/* @__PURE__ */ jsx("p", { children: "Manage pickup workflow for scheduled lead" }),
				/* @__PURE__ */ jsxs("div", {
					className: "lead-transaction-head",
					children: [/* @__PURE__ */ jsxs("div", { children: [
						/* @__PURE__ */ jsx("h2", { children: lead?.selectedModel.modelName || "No transaction selected" }),
						/* @__PURE__ */ jsx("p", { children: lead ? `${lead.seller.name || "Seller"} | ${lead.seller.phone || "-"} | ${lead.status}` : "Open this page from a live service lead to continue." }),
						/* @__PURE__ */ jsxs("section", {
							className: "lead-booking-box lead-inline-timebox",
							children: [
								/* @__PURE__ */ jsx("h3", { children: "Listed Pickup Time" }),
								/* @__PURE__ */ jsxs("p", { children: [
									lead?.pickupSchedule?.primaryDate?.slice(0, 10) || "-",
									" | ",
									lead?.pickupSchedule?.primaryTime || "-"
								] }),
								/* @__PURE__ */ jsxs("p", {
									className: "lead-hint",
									children: ["Elapsed since pickup start: ", elapsedLabel]
								})
							]
						})
					] }), /* @__PURE__ */ jsxs("div", {
						className: "lead-price-flash",
						children: ["Rs. ", formatInr(lead?.quote?.sellingPrice ?? 0)]
					})]
				}),
				/* @__PURE__ */ jsxs("section", {
					className: "lead-booking-box",
					children: [/* @__PURE__ */ jsx("h3", { children: "1. Schedule Pickup" }), /* @__PURE__ */ jsxs("div", {
						className: "lead-decision-row",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "lead-book-btn",
							onClick: () => {
								ensureInProgress();
							},
							disabled: !canSchedulePickup,
							children: "Start Pickup"
						}), /* @__PURE__ */ jsx("span", {
							className: "lead-hint",
							children: "Allowed for ACCEPTED leads only."
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("section", {
					className: "lead-booking-box",
					children: [/* @__PURE__ */ jsx("h3", { children: "2. Call Customer" }), /* @__PURE__ */ jsxs("div", {
						className: "lead-decision-row",
						children: [
							lead?.seller.phone ? /* @__PURE__ */ jsxs("a", {
								className: "lead-view-btn lead-view-link",
								href: `tel:${lead.seller.phone}`,
								children: ["Call ", lead.seller.phone]
							}) : /* @__PURE__ */ jsx("span", {
								className: "lead-view-disabled",
								children: "Customer number unavailable"
							}),
							/* @__PURE__ */ jsx("button", {
								type: "button",
								className: "lead-book-btn",
								onClick: () => {
									handleMarkCalled();
								},
								disabled: !lead?.seller.phone,
								children: "Mark Called"
							}),
							/* @__PURE__ */ jsxs("span", {
								className: "lead-hint",
								children: [
									"Attempts: ",
									lead?.callAttemptCount ?? 0,
									lead?.lastCalledAt ? ` | Last called: ${new Date(lead.lastCalledAt).toLocaleString("en-IN")}` : ""
								]
							})
						]
					})]
				}),
				/* @__PURE__ */ jsx("section", {
					className: "lead-demo-panel",
					children: /* @__PURE__ */ jsxs("div", {
						className: "lead-accordion-body",
						children: [
							/* @__PURE__ */ jsx("h3", { children: "3. Validate Gadget Information" }),
							/* @__PURE__ */ jsx("p", {
								className: "lead-hint",
								children: "User submitted details are prefilled. Verify and submit final onsite validation."
							}),
							/* @__PURE__ */ jsx("div", {
								className: "lead-device-table-wrap",
								children: /* @__PURE__ */ jsxs("table", {
									className: "lead-device-table lead-validation-table",
									children: [/* @__PURE__ */ jsx("thead", { children: /* @__PURE__ */ jsxs("tr", { children: [
										/* @__PURE__ */ jsx("th", { children: "Field" }),
										/* @__PURE__ */ jsx("th", { children: "User Input" }),
										/* @__PURE__ */ jsx("th", { children: "Partner Input" }),
										/* @__PURE__ */ jsx("th", { children: "Comments" })
									] }) }), /* @__PURE__ */ jsx("tbody", { children: validationRows.length > 0 ? validationRows.map((row) => {
										const partner = partnerChecks[row.key] ?? {
											decision: "yes",
											comment: ""
										};
										return /* @__PURE__ */ jsxs("tr", { children: [
											/* @__PURE__ */ jsx("td", { children: row.label }),
											/* @__PURE__ */ jsx("td", { children: row.userValue }),
											/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsxs("div", {
												className: "lead-radio-group",
												role: "radiogroup",
												"aria-label": `${row.label} partner input`,
												children: [/* @__PURE__ */ jsxs("label", {
													className: "lead-radio-pill",
													children: [/* @__PURE__ */ jsx("input", {
														type: "radio",
														name: `partner-${row.key}`,
														value: "yes",
														checked: partner.decision === "yes",
														onChange: () => {
															setPartnerChecks((prev) => ({
																...prev,
																[row.key]: {
																	...prev[row.key] ?? { comment: "" },
																	decision: "yes"
																}
															}));
														}
													}), "Yes"]
												}), /* @__PURE__ */ jsxs("label", {
													className: "lead-radio-pill",
													children: [/* @__PURE__ */ jsx("input", {
														type: "radio",
														name: `partner-${row.key}`,
														value: "no",
														checked: partner.decision === "no",
														onChange: () => {
															setPartnerChecks((prev) => ({
																...prev,
																[row.key]: {
																	...prev[row.key] ?? { comment: "" },
																	decision: "no"
																}
															}));
														}
													}), "No"]
												})]
											}) }),
											/* @__PURE__ */ jsx("td", { children: /* @__PURE__ */ jsx("input", {
												type: "text",
												className: "lead-inline-comment",
												placeholder: "Add note (optional)",
												value: partner.comment,
												onChange: (event) => {
													const comment = event.target.value;
													setPartnerChecks((prev) => ({
														...prev,
														[row.key]: {
															...prev[row.key] ?? { decision: "yes" },
															comment
														}
													}));
												}
											}) })
										] }, row.key);
									}) : /* @__PURE__ */ jsx("tr", { children: /* @__PURE__ */ jsx("td", {
										colSpan: 4,
										children: "No device details captured by user."
									}) }) })]
								})
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-photo-upload-section",
								children: [
									/* @__PURE__ */ jsxs("div", {
										className: "lead-photo-upload-head",
										children: [/* @__PURE__ */ jsx("strong", { children: "Device Photos" }), /* @__PURE__ */ jsxs("span", {
											className: "lead-hint",
											children: [
												uploadedPhotoCount,
												"/",
												REQUIRED_VALIDATION_PHOTO_COUNT,
												" uploaded (mandatory)"
											]
										})]
									}),
									/* @__PURE__ */ jsxs("div", {
										className: "lead-photo-upload-single",
										children: [/* @__PURE__ */ jsx("input", {
											id: "validation-photos",
											type: "file",
											accept: "image/*",
											multiple: true,
											className: "lead-photo-upload-input",
											onChange: (event) => handleValidationPhotoSelect(event.target.files)
										}), /* @__PURE__ */ jsxs("label", {
											htmlFor: "validation-photos",
											className: "lead-photo-upload-label lead-photo-upload-label-single",
											children: [
												/* @__PURE__ */ jsx("div", {
													className: "lead-photo-upload-placeholder",
													"aria-hidden": "true",
													children: "↑"
												}),
												/* @__PURE__ */ jsx("span", {
													className: "lead-photo-upload-title",
													children: "Upload Device Photos"
												}),
												/* @__PURE__ */ jsx("span", {
													className: "lead-photo-upload-subtitle",
													children: "Choose 6 images (single upload element)"
												})
											]
										})]
									}),
									validationPhotos.length > 0 ? /* @__PURE__ */ jsx("div", {
										className: "lead-photo-upload-preview-strip",
										children: validationPhotos.map((photo, index) => /* @__PURE__ */ jsxs("figure", {
											className: "lead-photo-chip",
											children: [/* @__PURE__ */ jsx("img", {
												src: photo.previewUrl,
												alt: `Uploaded device ${index + 1}`,
												className: "lead-photo-upload-preview"
											}), /* @__PURE__ */ jsxs("figcaption", { children: [
												"#",
												index + 1,
												" ",
												photo.name
											] })]
										}, `${photo.name}-${index}`))
									}) : null,
									validationPhotos.length > 0 ? /* @__PURE__ */ jsx("button", {
										type: "button",
										className: "lead-view-btn",
										onClick: () => {
											setValidationPhotos((prev) => {
												prev.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
												return [];
											});
										},
										children: "Clear Uploaded Photos"
									}) : null
								]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-booking-calendar lead-field-stack",
								children: [/* @__PURE__ */ jsx("label", {
									htmlFor: "validation-result",
									children: "Validation Result"
								}), /* @__PURE__ */ jsxs("select", {
									id: "validation-result",
									className: "lead-select",
									value: validationResult,
									onChange: (event) => setValidationResult(event.target.value),
									children: [
										/* @__PURE__ */ jsx("option", {
											value: "PASS",
											children: "PASS"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "FAIL",
											children: "FAIL"
										}),
										/* @__PURE__ */ jsx("option", {
											value: "NEEDS_REWORK",
											children: "NEEDS_REWORK"
										})
									]
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-booking-calendar lead-field-stack",
								children: [/* @__PURE__ */ jsx("label", {
									htmlFor: "revised-quote",
									children: "Final Assessed Price"
								}), /* @__PURE__ */ jsx("input", {
									id: "revised-quote",
									type: "number",
									value: revisedQuote,
									onChange: (event) => setRevisedQuote(event.target.value),
									placeholder: "Enter revised quote (optional)"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-booking-calendar lead-field-stack",
								children: [/* @__PURE__ */ jsx("label", {
									htmlFor: "observed-issues",
									children: "Observed Issues (one per line)"
								}), /* @__PURE__ */ jsx("textarea", {
									id: "observed-issues",
									value: observedIssues,
									onChange: (event) => setObservedIssues(event.target.value),
									className: "lead-textarea"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-booking-calendar lead-field-stack",
								children: [/* @__PURE__ */ jsx("label", {
									htmlFor: "validation-notes",
									children: "Validation Notes"
								}), /* @__PURE__ */ jsx("textarea", {
									id: "validation-notes",
									value: validationNotes,
									onChange: (event) => setValidationNotes(event.target.value),
									className: "lead-textarea"
								})]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-decision-row",
								children: [
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "lead-book-btn",
										onClick: () => {
											handleSaveValidation();
										},
										disabled: !canSaveValidation,
										children: "Save Validation"
									}),
									/* @__PURE__ */ jsx("button", {
										type: "button",
										className: "lead-reject-btn",
										onClick: () => {
											setRejectConfirmChecked(false);
											setShowRejectConfirm(true);
										},
										disabled: !lead || rejecting,
										children: rejecting ? "Rejecting..." : "Reject Lead"
									}),
									!canSaveValidation ? /* @__PURE__ */ jsxs("span", {
										className: "lead-hint",
										children: [
											"Upload ",
											REQUIRED_VALIDATION_PHOTO_COUNT,
											" photos to enable Save Validation."
										]
									}) : null
								]
							})
						]
					})
				}),
				/* @__PURE__ */ jsxs("section", {
					className: "lead-booking-box",
					children: [/* @__PURE__ */ jsx("h3", { children: "4. Pay To User" }), /* @__PURE__ */ jsxs("div", {
						className: "lead-decision-row",
						children: [/* @__PURE__ */ jsx("button", {
							type: "button",
							className: "lead-book-btn",
							disabled: !canPay,
							onClick: () => {
								if (!lead) return;
								navigate({
									to: "/service-Leads/transaction/payment",
									search: { leadId: lead.id }
								});
							},
							children: "Upload Payment Screenshot"
						}), lead?.paymentProof ? /* @__PURE__ */ jsx("span", {
							className: "lead-hint",
							children: "Payment proof metadata saved."
						}) : /* @__PURE__ */ jsx("span", {
							className: "lead-hint",
							children: "Submit validation first."
						})]
					})]
				}),
				/* @__PURE__ */ jsxs("section", {
					className: "lead-booking-box",
					children: [
						/* @__PURE__ */ jsx("h3", { children: "5. Finish" }),
						/* @__PURE__ */ jsxs("div", {
							className: "lead-booking-calendar lead-field-stack",
							children: [/* @__PURE__ */ jsx("label", {
								htmlFor: "completion-remarks",
								children: "Completion remarks"
							}), /* @__PURE__ */ jsx("textarea", {
								id: "completion-remarks",
								value: completionRemarks,
								onChange: (event) => setCompletionRemarks(event.target.value),
								className: "lead-textarea"
							})]
						}),
						/* @__PURE__ */ jsx("div", {
							className: "lead-decision-row",
							children: /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "lead-book-btn",
								onClick: () => {
									handleFinish();
								},
								disabled: !canFinish || finishing,
								children: finishing ? "Finishing..." : "Finish"
							})
						})
					]
				}),
				showSuccess && /* @__PURE__ */ jsx("div", {
					className: "lead-confirm-backdrop",
					role: "dialog",
					"aria-modal": "true",
					children: /* @__PURE__ */ jsxs("div", {
						className: "lead-confirm-card",
						children: [
							/* @__PURE__ */ jsxs("div", {
								className: "success-burst",
								"aria-hidden": "true",
								children: [
									/* @__PURE__ */ jsx("span", { className: "ring r1" }),
									/* @__PURE__ */ jsx("span", { className: "ring r2" }),
									/* @__PURE__ */ jsx("span", { className: "ring r3" })
								]
							}),
							/* @__PURE__ */ jsx("h3", { children: "Congratulations on your sale." }),
							/* @__PURE__ */ jsx("p", { children: "Lead workflow is completed successfully." }),
							/* @__PURE__ */ jsx("div", {
								className: "lead-decision-row lead-decision-row-modal",
								children: /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "lead-book-btn",
									onClick: () => {
										setShowSuccess(false);
										navigate({ to: "/service-Leads" });
									},
									children: "Back to Service Leads"
								})
							})
						]
					})
				}),
				showRejectConfirm && /* @__PURE__ */ jsx("div", {
					className: "lead-confirm-backdrop",
					role: "dialog",
					"aria-modal": "true",
					"aria-label": "Reject lead confirmation",
					children: /* @__PURE__ */ jsxs("div", {
						className: "lead-confirm-card lead-reject-confirm-card",
						children: [
							/* @__PURE__ */ jsx("h3", { children: "Are you sure you want to reject this lead?" }),
							/* @__PURE__ */ jsx("p", { children: "This action moves the lead out of active workflow." }),
							/* @__PURE__ */ jsxs("label", {
								className: "lead-reject-check",
								children: [/* @__PURE__ */ jsx("input", {
									type: "checkbox",
									checked: rejectConfirmChecked,
									onChange: (event) => setRejectConfirmChecked(event.target.checked)
								}), "I understood"]
							}),
							/* @__PURE__ */ jsxs("div", {
								className: "lead-decision-row lead-decision-row-modal",
								children: [/* @__PURE__ */ jsx("button", {
									type: "button",
									className: "lead-view-btn",
									onClick: () => setShowRejectConfirm(false),
									children: "Cancel"
								}), /* @__PURE__ */ jsx("button", {
									type: "button",
									className: "lead-reject-btn",
									disabled: !rejectConfirmChecked || rejecting,
									onClick: () => {
										setShowRejectConfirm(false);
										handleRejectLead();
									},
									children: rejecting ? "Rejecting..." : "OK"
								})]
							})
						]
					})
				}),
				/* @__PURE__ */ jsx(Link, {
					to: "/service-Leads",
					className: "partner-simple-link",
					children: "Back to Service Leads"
				})
			]
		})
	});
}
//#endregion
export { ServiceLeadTransactionPage as component };
