import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
//#region src/routes/user.sell-tablet.device-details.tsx?tsr-split=component
var DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_tablet_device_details";
var DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";
var MAX_SLIDE_ITEMS = 4;
var issueOptions = [
	"Any Dead spots",
	"Broken or Screen Scratches",
	"Dent or Marks on body",
	"Device Panel Broken / Missing",
	"Water Damage"
];
var basicFunctionalityQuestions = [
	{
		key: "canMakeCalls",
		label: "Are you able to make or receive calls?"
	},
	{
		key: "touchWorking",
		label: "Is touch screen working properly?"
	},
	{
		key: "displayWorking",
		label: "Is display brightness and color working properly?"
	},
	{
		key: "screenReplaced",
		label: "Has the screen been replaced?"
	}
];
var batteryAndChargingQuestions = [
	{
		key: "charging",
		label: "Is the tablet charging properly?"
	},
	{
		key: "batteryDrain",
		label: "Does battery drain quickly?"
	},
	{
		key: "heating",
		label: "Does tablet heat abnormally?"
	}
];
var accessoriesAndOwnershipQuestions = [
	{
		key: "billInvoice",
		label: "Do you have bill / invoice?"
	},
	{
		key: "originalBox",
		label: "Do you have original box?"
	},
	{
		key: "originalCharger",
		label: "Do you have original charger?"
	},
	{
		key: "underWarranty",
		label: "Is tablet under warranty?"
	},
	{
		key: "accountLocked",
		label: "Is tablet locked by password / iCloud / Google account?"
	}
];
function getStoredDeviceDetails() {
	if (typeof window === "undefined") return null;
	try {
		const raw = window.localStorage.getItem(DEVICE_DETAILS_STORAGE_KEY);
		if (!raw) return null;
		return JSON.parse(raw);
	} catch {
		return null;
	}
}
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
function normalizeSlideIndex(index, slideCount) {
	if (typeof index !== "number" || !Number.isFinite(index)) return 0;
	return Math.max(0, Math.min(Math.floor(index), Math.max(0, slideCount - 1)));
}
function toAnswerValue(value) {
	if (value === "yes" || value === "no" || value === "na") return value;
	if (typeof value === "boolean") return value ? "yes" : "no";
}
function toLegacyBoolean(value) {
	if (value === "yes") return true;
	if (value === "no") return false;
	return null;
}
function cleanNestedAnswers(selectedIssues, nestedAnswers) {
	return selectedIssues.reduce((cleanedAnswers, issue) => {
		const answer = nestedAnswers[issue];
		if (answer) cleanedAnswers[issue] = answer;
		return cleanedAnswers;
	}, {});
}
function createInitialBasicFunctionality(storedDetails) {
	return {
		canMakeCalls: toAnswerValue(storedDetails?.basicFunctionality?.canMakeCalls ?? storedDetails?.canMakeCalls),
		touchWorking: toAnswerValue(storedDetails?.basicFunctionality?.touchWorking ?? storedDetails?.touchWorking),
		screenReplaced: toAnswerValue(storedDetails?.basicFunctionality?.screenReplaced ?? storedDetails?.screenReplaced),
		displayWorking: toAnswerValue(storedDetails?.basicFunctionality?.displayWorking),
		originalDisplay: toAnswerValue(storedDetails?.basicFunctionality?.originalDisplay)
	};
}
function isAppleDevice(selectedModel) {
	return selectedModel?.brandSlug?.toLowerCase() === "apple";
}
function chunkSlideItems(items) {
	const slides = [];
	for (let index = 0; index < items.length; index += MAX_SLIDE_ITEMS) slides.push(items.slice(index, index + MAX_SLIDE_ITEMS));
	return slides;
}
function buildSlideItems(isApple) {
	return [
		...basicFunctionalityQuestions.map((question) => ({
			kind: "question",
			group: "basicFunctionality",
			question
		})),
		...issueOptions.map((issue) => ({
			kind: "issue",
			issue
		})),
		...isApple ? [{ kind: "appleBatteryHealth" }] : [],
		...batteryAndChargingQuestions.map((question) => ({
			kind: "question",
			group: "batteryAndCharging",
			question
		})),
		...accessoriesAndOwnershipQuestions.map((question) => ({
			kind: "question",
			group: "accessoriesAndOwnership",
			question
		}))
	];
}
function getSlideTitle(slide) {
	if (slide.some((item) => item.kind === "appleBatteryHealth" || item.kind === "question" && item.group !== "basicFunctionality")) return "Battery & ownership";
	if (slide.some((item) => item.kind === "issue")) return "Condition";
	return "Basics";
}
function getSlideDescription(slide) {
	const title = getSlideTitle(slide);
	if (title === "Battery & ownership") return "Battery, charging and documents.";
	if (title === "Condition") return "Select visible issues if any.";
	return "Calls, display and touch.";
}
function AnswerToggleGroup({ value, options = ["yes", "no"], onChange }) {
	const answerLabels = {
		yes: "Yes",
		no: "No",
		na: "Not applicable"
	};
	return /* @__PURE__ */ jsx("div", {
		className: "user-toggle-row",
		children: options.map((option) => /* @__PURE__ */ jsx("button", {
			type: "button",
			className: `user-toggle-btn${value === option ? " active" : ""}`,
			onClick: () => onChange(option),
			children: answerLabels[option]
		}, option))
	});
}
function AppleBatteryHealthGroup({ value, onChange }) {
	return /* @__PURE__ */ jsxs("fieldset", {
		className: "user-battery-health-group",
		children: [/* @__PURE__ */ jsx("legend", { children: "Battery health" }), /* @__PURE__ */ jsx("div", {
			className: "user-battery-health-options",
			children: [
				{
					value: "above95",
					label: "Above 95%"
				},
				{
					value: "above85",
					label: "Above 85%"
				},
				{
					value: "at80",
					label: "80%"
				}
			].map((option) => /* @__PURE__ */ jsxs("label", {
				className: `user-battery-health-option${value === option.value ? " selected" : ""}`,
				children: [/* @__PURE__ */ jsx("input", {
					type: "radio",
					name: "appleBatteryHealth",
					value: option.value,
					checked: value === option.value,
					onChange: () => onChange(option.value)
				}), /* @__PURE__ */ jsx("span", { children: option.label })]
			}, option.value))
		})]
	});
}
function UserSellTabletDeviceDetailsPage() {
	const [isHydrated, setIsHydrated] = useState(false);
	const [storedDetails, setStoredDetails] = useState(null);
	const [storedSelectedModel, setStoredSelectedModel] = useState(null);
	const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
	const [basicFunctionality, setBasicFunctionality] = useState({});
	const [selectedIssues, setSelectedIssues] = useState([]);
	const [nestedPhysicalIssueAnswers, setNestedPhysicalIssueAnswers] = useState({});
	const [batteryAndCharging, setBatteryAndCharging] = useState({});
	const [accessoriesAndOwnership, setAccessoriesAndOwnership] = useState({});
	const [appleBatteryHealth, setAppleBatteryHealth] = useState();
	useEffect(() => {
		const details = getStoredDeviceDetails();
		const selectedModel = getStoredSelectedModel();
		const initialSlides = chunkSlideItems(buildSlideItems(isAppleDevice(selectedModel)));
		const restoredSlide = details?.questionnaireSlide ?? (typeof details?.detailStep === "number" ? details.detailStep - 1 : 0);
		setStoredDetails(details);
		setStoredSelectedModel(selectedModel);
		setBasicFunctionality(createInitialBasicFunctionality(details));
		setSelectedIssues(details?.physicalIssues ?? details?.selectedIssues ?? []);
		setNestedPhysicalIssueAnswers(details?.nestedPhysicalIssueAnswers ?? {});
		setBatteryAndCharging(details?.batteryAndCharging ?? {});
		setAccessoriesAndOwnership(details?.accessoriesAndOwnership ?? {});
		setAppleBatteryHealth(details?.appleBatteryHealth);
		setCurrentSlideIndex(normalizeSlideIndex(restoredSlide, initialSlides.length));
		setIsHydrated(true);
	}, []);
	const isApple = isAppleDevice(storedSelectedModel);
	const slides = chunkSlideItems(buildSlideItems(isApple));
	const activeSlideIndex = normalizeSlideIndex(currentSlideIndex, slides.length);
	const activeSlide = slides[activeSlideIndex] ?? [];
	const isLastSlide = activeSlideIndex === slides.length - 1;
	if (!isHydrated) return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-device-details-shell",
			children: [/* @__PURE__ */ jsx("div", {
				className: "user-auth-brand",
				children: "Device Details"
			}), /* @__PURE__ */ jsx("h1", { children: "Loading questionnaire..." })]
		})
	});
	const answerMaps = {
		basicFunctionality,
		batteryAndCharging,
		accessoriesAndOwnership
	};
	const updateAnswerMap = (group, updater) => {
		if (group === "basicFunctionality") setBasicFunctionality(updater);
		if (group === "batteryAndCharging") setBatteryAndCharging(updater);
		if (group === "accessoriesAndOwnership") setAccessoriesAndOwnership(updater);
	};
	const persistDeviceDetails = (slideIndex = activeSlideIndex, issues = selectedIssues, nextBatteryAnswers = batteryAndCharging, nextAppleBatteryHealth = appleBatteryHealth) => {
		if (typeof window === "undefined") return null;
		const cleanIssueAnswers = cleanNestedAnswers(issues, nestedPhysicalIssueAnswers);
		const details = {
			canMakeCalls: toLegacyBoolean(basicFunctionality.canMakeCalls),
			touchWorking: toLegacyBoolean(basicFunctionality.touchWorking),
			screenReplaced: toLegacyBoolean(basicFunctionality.screenReplaced),
			selectedIssues: issues,
			detailStep: Math.min(slideIndex + 1, 3),
			questionnaireSlide: slideIndex,
			basicFunctionality,
			physicalIssues: issues,
			nestedPhysicalIssueAnswers: cleanIssueAnswers,
			cameraAndBiometrics: storedDetails?.cameraAndBiometrics ?? {},
			sensorsAndConnectivity: storedDetails?.sensorsAndConnectivity ?? {},
			batteryAndCharging: nextBatteryAnswers,
			accessoriesAndOwnership,
			appleBatteryHealth: isApple ? nextAppleBatteryHealth : void 0,
			updatedAt: (/* @__PURE__ */ new Date()).toISOString()
		};
		window.localStorage.setItem(DEVICE_DETAILS_STORAGE_KEY, JSON.stringify(details));
		return details;
	};
	const moveToSlide = (nextSlideIndex) => {
		const normalizedIndex = normalizeSlideIndex(nextSlideIndex, slides.length);
		persistDeviceDetails(normalizedIndex);
		setCurrentSlideIndex(normalizedIndex);
		if (typeof window !== "undefined") window.scrollTo({
			top: 0,
			behavior: "smooth"
		});
	};
	const toggleIssue = (issue) => {
		setSelectedIssues((previousIssues) => {
			const nextIssues = previousIssues.includes(issue) ? previousIssues.filter((selectedIssue) => selectedIssue !== issue) : [...previousIssues, issue];
			persistDeviceDetails(activeSlideIndex, nextIssues);
			return nextIssues;
		});
	};
	const updateAppleBatteryHealth = (value) => {
		const nextBatteryAnswers = {
			...batteryAndCharging,
			batteryServiceMode: value === "at80" ? "yes" : "no"
		};
		setAppleBatteryHealth(value);
		setBatteryAndCharging(nextBatteryAnswers);
		persistDeviceDetails(activeSlideIndex, selectedIssues, nextBatteryAnswers, value);
		if (value === "at80") toast.warning("Battery in service mode");
	};
	const completeFinalStep = () => {
		const details = persistDeviceDetails(activeSlideIndex);
		if (typeof window === "undefined" || !details) return;
		toast.success("Tablet details saved.");
		window.location.href = "/user/sell-tablet/quote";
	};
	const isSlideComplete = activeSlide.every((item) => {
		if (item.kind === "issue") return true;
		if (item.kind === "appleBatteryHealth") return Boolean(appleBatteryHealth);
		return Boolean(answerMaps[item.group][item.question.key]);
	});
	const progressItems = slides.flat().filter((item) => item.kind !== "issue");
	const answeredCount = progressItems.filter((item) => {
		if (item.kind === "appleBatteryHealth") return Boolean(appleBatteryHealth);
		return Boolean(answerMaps[item.group][item.question.key]);
	}).length;
	const totalRequiredCount = progressItems.length;
	const progressPercent = totalRequiredCount > 0 ? Math.round(answeredCount / totalRequiredCount * 100) : 0;
	const renderSlideItem = (item) => {
		if (item.kind === "issue") return /* @__PURE__ */ jsx("button", {
			type: "button",
			className: `user-issue-tile${selectedIssues.includes(item.issue) ? " selected" : ""}`,
			onClick: () => toggleIssue(item.issue),
			children: item.issue
		}, `issue-${item.issue}`);
		if (item.kind === "appleBatteryHealth") return /* @__PURE__ */ jsx(AppleBatteryHealthGroup, {
			value: appleBatteryHealth,
			onChange: updateAppleBatteryHealth
		}, "appleBatteryHealth");
		return /* @__PURE__ */ jsxs("article", {
			className: "user-question-card",
			children: [/* @__PURE__ */ jsx("h3", { children: item.question.label }), /* @__PURE__ */ jsx(AnswerToggleGroup, {
				value: answerMaps[item.group][item.question.key],
				options: item.question.options,
				onChange: (answer) => updateAnswerMap(item.group, (previousAnswers) => ({
					...previousAnswers,
					[item.question.key]: answer
				}))
			})]
		}, `${item.group}-${item.question.key}`);
	};
	return /* @__PURE__ */ jsx("main", {
		className: "user-seller-page",
		children: /* @__PURE__ */ jsxs("section", {
			className: "user-dashboard-shell user-device-details-shell",
			children: [
				/* @__PURE__ */ jsx("div", {
					className: "user-auth-brand",
					children: "Device Details"
				}),
				/* @__PURE__ */ jsxs("div", {
					className: "user-question-progress",
					"aria-label": "Device questionnaire progress",
					children: [/* @__PURE__ */ jsxs("div", {
						className: "user-question-progress-copy",
						children: [/* @__PURE__ */ jsxs("span", { children: [
							"Slide ",
							activeSlideIndex + 1,
							" of ",
							slides.length
						] }), /* @__PURE__ */ jsxs("span", { children: [
							answeredCount,
							" of ",
							totalRequiredCount,
							" answered"
						] })]
					}), /* @__PURE__ */ jsx("div", {
						className: "user-question-progress-bar",
						"aria-hidden": "true",
						children: /* @__PURE__ */ jsx("div", {
							className: "user-question-progress-fill",
							style: { width: `${progressPercent}%` }
						})
					})]
				}),
				/* @__PURE__ */ jsx("h1", { children: "Device Details" }),
				storedSelectedModel?.modelName ? /* @__PURE__ */ jsxs("p", { children: ["Selected Model: ", storedSelectedModel.modelName] }) : /* @__PURE__ */ jsx("p", { children: "Answer this questionnaire to continue." }),
				/* @__PURE__ */ jsxs("section", {
					className: "user-questionnaire-block user-question-slide",
					"aria-label": getSlideTitle(activeSlide),
					children: [
						/* @__PURE__ */ jsxs("div", {
							className: "user-questionnaire-heading",
							children: [/* @__PURE__ */ jsx("h2", { children: getSlideTitle(activeSlide) }), /* @__PURE__ */ jsx("p", { children: getSlideDescription(activeSlide) })]
						}),
						/* @__PURE__ */ jsx("div", {
							className: activeSlide.some((item) => item.kind === "issue") && activeSlide.every((item) => item.kind === "issue") ? "user-issue-tile-grid" : "user-slide-item-grid",
							children: activeSlide.map(renderSlideItem)
						}),
						/* @__PURE__ */ jsxs("div", {
							className: "user-auth-actions user-question-actions",
							children: [activeSlideIndex === 0 ? /* @__PURE__ */ jsx(Link, {
								to: "/user/sell-tablet",
								className: "user-auth-cancel user-inline-link",
								children: "Back"
							}) : /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-cancel",
								onClick: () => moveToSlide(activeSlideIndex - 1),
								children: "Back"
							}), /* @__PURE__ */ jsx("button", {
								type: "button",
								className: "user-auth-submit",
								style: {
									display: "inline-flex",
									alignItems: "center",
									gap: "6px"
								},
								disabled: !isSlideComplete,
								onClick: isLastSlide ? completeFinalStep : () => moveToSlide(activeSlideIndex + 1),
								children: isLastSlide ? "Continue to Quote" : /* @__PURE__ */ jsxs(Fragment, { children: ["Continue ", /* @__PURE__ */ jsx(ArrowRight, { size: 16 })] })
							})]
						})
					]
				})
			]
		})
	});
}
//#endregion
export { UserSellTabletDeviceDetailsPage as component };
