import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

const DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_tablet_device_details";
const DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";
const MAX_SLIDE_ITEMS = 4;

type AnswerValue = "yes" | "no" | "na";
type AnswerMap = Record<string, AnswerValue | undefined>;
type AppleBatteryHealth = "above95" | "above85" | "at80";
type QuestionGroupKey = "basicFunctionality" | "batteryAndCharging" | "accessoriesAndOwnership";

type QuestionnaireQuestion = {
  key: string;
  label: string;
  options?: AnswerValue[];
};

type SlideItem =
  | { kind: "question"; group: QuestionGroupKey; question: QuestionnaireQuestion }
  | { kind: "issue"; issue: string }
  | { kind: "appleBatteryHealth" };

const issueOptions = [
  "Any Dead spots",
  "Broken or Screen Scratches",
  "Dent or Marks on body",
  "Device Panel Broken / Missing",
  "Water Damage",
] as const;

const basicFunctionalityQuestions = [
  { key: "canMakeCalls", label: "Are you able to make or receive calls?" },
  { key: "touchWorking", label: "Is touch screen working properly?" },
  { key: "displayWorking", label: "Is display brightness and color working properly?" },
  { key: "screenReplaced", label: "Has the screen been replaced?" },
] satisfies QuestionnaireQuestion[];

const batteryAndChargingQuestions = [
  { key: "charging", label: "Is the tablet charging properly?" },
  { key: "batteryDrain", label: "Does battery drain quickly?" },
  { key: "heating", label: "Does tablet heat abnormally?" },
] satisfies QuestionnaireQuestion[];

const accessoriesAndOwnershipQuestions = [
  { key: "billInvoice", label: "Do you have bill / invoice?" },
  { key: "originalBox", label: "Do you have original box?" },
  { key: "originalCharger", label: "Do you have original charger?" },
  { key: "underWarranty", label: "Is tablet under warranty?" },
  { key: "accountLocked", label: "Is tablet locked by password / iCloud / Google account?" },
] satisfies QuestionnaireQuestion[];

type StoredDetails = {
  canMakeCalls?: boolean | null;
  touchWorking?: boolean | null;
  screenReplaced?: boolean | null;
  selectedIssues?: string[];
  detailStep?: number;
  questionnaireSlide?: number;
  basicFunctionality?: AnswerMap;
  physicalIssues?: string[];
  nestedPhysicalIssueAnswers?: Record<string, string>;
  cameraAndBiometrics?: AnswerMap;
  sensorsAndConnectivity?: AnswerMap;
  batteryAndCharging?: AnswerMap;
  accessoriesAndOwnership?: AnswerMap;
  appleBatteryHealth?: AppleBatteryHealth;
  updatedAt?: string;
};

type SelectedModel = {
  modelName?: string;
  listedPrice?: number;
  brandSlug?: string;
  thumbnailUrl?: string;
};

function getStoredDeviceDetails(): StoredDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEVICE_DETAILS_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredDetails;
  } catch {
    return null;
  }
}

function getStoredSelectedModel() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEVICE_MODEL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as SelectedModel;
  } catch {
    return null;
  }
}

function normalizeSlideIndex(index: unknown, slideCount: number) {
  if (typeof index !== "number" || !Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.floor(index), Math.max(0, slideCount - 1)));
}

function toAnswerValue(value: AnswerValue | boolean | null | undefined): AnswerValue | undefined {
  if (value === "yes" || value === "no" || value === "na") return value;
  if (typeof value === "boolean") return value ? "yes" : "no";
  return undefined;
}

function toLegacyBoolean(value: AnswerValue | undefined) {
  if (value === "yes") return true;
  if (value === "no") return false;
  return null;
}

function cleanNestedAnswers(selectedIssues: string[], nestedAnswers: Record<string, string>) {
  return selectedIssues.reduce<Record<string, string>>((cleanedAnswers, issue) => {
    const answer = nestedAnswers[issue];
    if (answer) cleanedAnswers[issue] = answer;
    return cleanedAnswers;
  }, {});
}

function createInitialBasicFunctionality(storedDetails: StoredDetails | null): AnswerMap {
  return {
    canMakeCalls: toAnswerValue(storedDetails?.basicFunctionality?.canMakeCalls ?? storedDetails?.canMakeCalls),
    touchWorking: toAnswerValue(storedDetails?.basicFunctionality?.touchWorking ?? storedDetails?.touchWorking),
    screenReplaced: toAnswerValue(storedDetails?.basicFunctionality?.screenReplaced ?? storedDetails?.screenReplaced),
    displayWorking: toAnswerValue(storedDetails?.basicFunctionality?.displayWorking),
    originalDisplay: toAnswerValue(storedDetails?.basicFunctionality?.originalDisplay),
  };
}

function isAppleDevice(selectedModel: SelectedModel | null) {
  return selectedModel?.brandSlug?.toLowerCase() === "apple";
}

function chunkSlideItems(items: SlideItem[]) {
  const slides: SlideItem[][] = [];
  for (let index = 0; index < items.length; index += MAX_SLIDE_ITEMS) {
    slides.push(items.slice(index, index + MAX_SLIDE_ITEMS));
  }
  return slides;
}

function buildSlideItems(isApple: boolean): SlideItem[] {
  return [
    ...basicFunctionalityQuestions.map((question) => ({ kind: "question" as const, group: "basicFunctionality" as const, question })),
    ...issueOptions.map((issue) => ({ kind: "issue" as const, issue })),
    ...(isApple ? [{ kind: "appleBatteryHealth" as const }] : []),
    ...batteryAndChargingQuestions.map((question) => ({ kind: "question" as const, group: "batteryAndCharging" as const, question })),
    ...accessoriesAndOwnershipQuestions.map((question) => ({ kind: "question" as const, group: "accessoriesAndOwnership" as const, question })),
  ];
}

function getSlideTitle(slide: SlideItem[]) {
  if (slide.some((item) => item.kind === "appleBatteryHealth" || (item.kind === "question" && item.group !== "basicFunctionality"))) {
    return "Battery & ownership";
  }
  if (slide.some((item) => item.kind === "issue")) {
    return "Condition";
  }
  return "Basics";
}

function getSlideDescription(slide: SlideItem[]) {
  const title = getSlideTitle(slide);
  if (title === "Battery & ownership") return "Battery, charging and documents.";
  if (title === "Condition") return "Select visible issues if any.";
  return "Calls, display and touch.";
}

function AnswerToggleGroup({ value, options = ["yes", "no"], onChange }: { value?: AnswerValue; options?: AnswerValue[]; onChange: (value: AnswerValue) => void }) {
  const answerLabels: Record<AnswerValue, string> = {
    yes: "Yes",
    no: "No",
    na: "Not applicable",
  };

  return (
    <div className="user-toggle-row">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`user-toggle-btn${value === option ? " active" : ""}`}
          onClick={() => onChange(option)}
        >
          {answerLabels[option]}
        </button>
      ))}
    </div>
  );
}

function AppleBatteryHealthGroup({ value, onChange }: { value?: AppleBatteryHealth; onChange: (value: AppleBatteryHealth) => void }) {
  const options: { value: AppleBatteryHealth; label: string }[] = [
    { value: "above95", label: "Above 95%" },
    { value: "above85", label: "Above 85%" },
    { value: "at80", label: "80%" },
  ];

  return (
    <fieldset className="user-battery-health-group">
      <legend>Battery health</legend>
      <div className="user-battery-health-options">
        {options.map((option) => (
          <label key={option.value} className={`user-battery-health-option${value === option.value ? " selected" : ""}`}>
            <input
              type="radio"
              name="appleBatteryHealth"
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export const Route = createFileRoute("/user/sell-tablet/device-details")({
  component: UserSellTabletDeviceDetailsPage,
});

function UserSellTabletDeviceDetailsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [storedDetails, setStoredDetails] = useState<StoredDetails | null>(null);
  const [storedSelectedModel, setStoredSelectedModel] = useState<SelectedModel | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [basicFunctionality, setBasicFunctionality] = useState<AnswerMap>({});
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [nestedPhysicalIssueAnswers, setNestedPhysicalIssueAnswers] = useState<Record<string, string>>({});
  const [batteryAndCharging, setBatteryAndCharging] = useState<AnswerMap>({});
  const [accessoriesAndOwnership, setAccessoriesAndOwnership] = useState<AnswerMap>({});
  const [appleBatteryHealth, setAppleBatteryHealth] = useState<AppleBatteryHealth | undefined>();

  useEffect(() => {
    const details = getStoredDeviceDetails();
    const selectedModel = getStoredSelectedModel();
    const isAppleModel = isAppleDevice(selectedModel);
    const initialSlides = chunkSlideItems(buildSlideItems(isAppleModel));
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

  if (!isHydrated) {
    return (
      <main className="user-seller-page">
        <section className="user-dashboard-shell user-device-details-shell">
          <div className="user-auth-brand">Device Details</div>
          <h1>Loading questionnaire...</h1>
        </section>
      </main>
    );
  }

  const answerMaps: Record<QuestionGroupKey, AnswerMap> = {
    basicFunctionality,
    batteryAndCharging,
    accessoriesAndOwnership,
  };

  const updateAnswerMap = (group: QuestionGroupKey, updater: (previousAnswers: AnswerMap) => AnswerMap) => {
    if (group === "basicFunctionality") setBasicFunctionality(updater);
    if (group === "batteryAndCharging") setBatteryAndCharging(updater);
    if (group === "accessoriesAndOwnership") setAccessoriesAndOwnership(updater);
  };

  const persistDeviceDetails = (slideIndex = activeSlideIndex, issues: string[] = selectedIssues, nextBatteryAnswers: AnswerMap = batteryAndCharging, nextAppleBatteryHealth = appleBatteryHealth) => {
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
      appleBatteryHealth: isApple ? nextAppleBatteryHealth : undefined,
      updatedAt: new Date().toISOString(),
    } satisfies StoredDetails;

    window.localStorage.setItem(DEVICE_DETAILS_STORAGE_KEY, JSON.stringify(details));
    return details;
  };

  const moveToSlide = (nextSlideIndex: number) => {
    const normalizedIndex = normalizeSlideIndex(nextSlideIndex, slides.length);
    persistDeviceDetails(normalizedIndex);
    setCurrentSlideIndex(normalizedIndex);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const toggleIssue = (issue: string) => {
    setSelectedIssues((previousIssues) => {
      const nextIssues = previousIssues.includes(issue)
        ? previousIssues.filter((selectedIssue) => selectedIssue !== issue)
        : [...previousIssues, issue];
      persistDeviceDetails(activeSlideIndex, nextIssues);
      return nextIssues;
    });
  };

  const updateAppleBatteryHealth = (value: AppleBatteryHealth) => {
    const nextBatteryAnswers = {
      ...batteryAndCharging,
      batteryServiceMode: value === "at80" ? "yes" : "no",
    } satisfies AnswerMap;

    setAppleBatteryHealth(value);
    setBatteryAndCharging(nextBatteryAnswers);
    persistDeviceDetails(activeSlideIndex, selectedIssues, nextBatteryAnswers, value);

    if (value === "at80") {
      toast.warning("Battery in service mode");
    }
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
  const progressPercent = totalRequiredCount > 0 ? Math.round((answeredCount / totalRequiredCount) * 100) : 0;

  const renderSlideItem = (item: SlideItem) => {
    if (item.kind === "issue") {
      const selected = selectedIssues.includes(item.issue);
      return (
        <button key={`issue-${item.issue}`} type="button" className={`user-issue-tile${selected ? " selected" : ""}`} onClick={() => toggleIssue(item.issue)}>
          {item.issue}
        </button>
      );
    }

    if (item.kind === "appleBatteryHealth") {
      return <AppleBatteryHealthGroup key="appleBatteryHealth" value={appleBatteryHealth} onChange={updateAppleBatteryHealth} />;
    }

    return (
      <article className="user-question-card" key={`${item.group}-${item.question.key}`}>
        <h3>{item.question.label}</h3>
        <AnswerToggleGroup
          value={answerMaps[item.group][item.question.key]}
          options={item.question.options}
          onChange={(answer) => updateAnswerMap(item.group, (previousAnswers) => ({ ...previousAnswers, [item.question.key]: answer }))}
        />
      </article>
    );
  };

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-device-details-shell">
        <div className="user-auth-brand">Device Details</div>
        <div className="user-question-progress" aria-label="Device questionnaire progress">
          <div className="user-question-progress-copy">
            <span>Slide {activeSlideIndex + 1} of {slides.length}</span>
            <span>{answeredCount} of {totalRequiredCount} answered</span>
          </div>
          <div className="user-question-progress-bar" aria-hidden="true">
            <div className="user-question-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>
        <h1>Device Details</h1>
        {storedSelectedModel?.modelName ? (
          <p>Selected Model: {storedSelectedModel.modelName}</p>
        ) : (
          <p>Answer this questionnaire to continue.</p>
        )}

        <section className="user-questionnaire-block user-question-slide" aria-label={getSlideTitle(activeSlide)}>
          <div className="user-questionnaire-heading">
            <h2>{getSlideTitle(activeSlide)}</h2>
            <p>{getSlideDescription(activeSlide)}</p>
          </div>
          <div className={activeSlide.some((item) => item.kind === "issue") && activeSlide.every((item) => item.kind === "issue") ? "user-issue-tile-grid" : "user-slide-item-grid"}>
            {activeSlide.map(renderSlideItem)}
          </div>
          <div className="user-auth-actions user-question-actions">
            {activeSlideIndex === 0 ? (
              <Link to="/user/sell-tablet" className="user-auth-cancel user-inline-link">
                Back
              </Link>
            ) : (
              <button type="button" className="user-auth-cancel" onClick={() => moveToSlide(activeSlideIndex - 1)}>
                Back
              </button>
            )}
            <button
              type="button"
              className="user-auth-submit"
              style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              disabled={!isSlideComplete}
              onClick={isLastSlide ? completeFinalStep : () => moveToSlide(activeSlideIndex + 1)}
            >
              {isLastSlide ? "Continue to Quote" : (<>Continue <ArrowRight size={16} /></>)}
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}

