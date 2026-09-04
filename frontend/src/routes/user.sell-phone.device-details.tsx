import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BatteryCharging,
  BellOff,
  Box,
  Camera,
  CircleAlert,
  CircuitBoard,
  Droplets,
  Fingerprint,
  Gauge,
  Globe,
  Grip,
  Headphones,
  Keyboard,
  Lightbulb,
  MessageCircleWarning,
  MinusCircle,
  Monitor,
  Network,
  Phone,
  ScanSearch,
  Shield,
  Smartphone,
  Speaker,
  SquareDashed,
  TriangleAlert,
  Usb,
  Volume2,
  Wifi,
} from "lucide-react";

const DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_phone_device_details";
const DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_phone_selected_model";
const MAX_SLIDE_ITEMS = 5;

type AnswerValue = "yes" | "no" | "na";
type AnswerMap = Record<string, AnswerValue | undefined>;
type AppleBatteryHealth = "above95" | "above85" | "at80";
type MobileAgeOption = "below3Months" | "months3To6" | "months6To11" | "above11Months";
type QuestionGroupKey = "basicFunctionality" | "warrantyAndBill" | "batteryAndCharging" | "accessoriesAndOwnership";

type DefectChoiceOption = {
  value: string;
  label: string;
  badge?: string;
  icon?: JSX.Element;
};

type DefectSection = {
  key: string;
  title: string;
  prompt: string;
  options: DefectChoiceOption[];
};

type QuestionnaireQuestion = {
  key: string;
  label: string;
  hint?: string;
  options?: AnswerValue[];
};

type SlideItem =
  | { kind: "question"; group: QuestionGroupKey; question: QuestionnaireQuestion }
  | { kind: "issue"; issue: string }
  | { kind: "appleBatteryHealth" }
  | { kind: "screenDefectDetail" }
  | { kind: "bodyDefectDetail" }
  | { kind: "functionalProblemsDetail" }
  | { kind: "mobileAge" }
  | { kind: "accessoriesDetail" };

const issueOptions = [
  "Broken/scratch on device screen",
  "Dead Spot/Visible line and Discoloration on screen",
  "Scratch/Dent on device body",
  "Device panel missing/broken",
] as const;

const issueIcons: Record<string, JSX.Element> = {
  "Broken/scratch on device screen": <Monitor className="h-10 w-10 text-emerald-600" strokeWidth={1.8} />,
  "Dead Spot/Visible line and Discoloration on screen": <ScanSearch className="h-10 w-10 text-emerald-600" strokeWidth={1.8} />,
  "Scratch/Dent on device body": <Grip className="h-10 w-10 text-emerald-600" strokeWidth={1.8} />,
  "Device panel missing/broken": <CircuitBoard className="h-10 w-10 text-emerald-600" strokeWidth={1.8} />,
};

const SCREEN_ISSUE_LABELS = new Set(issueOptions.slice(0, 2));
const BODY_ISSUE_LABELS = new Set(issueOptions.slice(2));

const screenDeadSpotOptions: DefectChoiceOption[] = [
  { value: "largeHeavyVisibleSpots", label: "Large/ heavy visible spots on screen", badge: "1", icon: <CircleAlert className="h-8 w-8 text-emerald-600" /> },
  { value: "threeOrMoreMinorSpots", label: "3 or more minor spots on screen", badge: "2", icon: <MessageCircleWarning className="h-8 w-8 text-emerald-600" /> },
  { value: "oneToTwoMinorSpots", label: "1-2 minor spots on screen", badge: "3", icon: <MinusCircle className="h-8 w-8 text-emerald-600" /> },
  { value: "noSpots", label: "No spots on screen", badge: "4", icon: <Shield className="h-8 w-8 text-emerald-600" /> },
];

const screenLineOptions: DefectChoiceOption[] = [
  { value: "visibleLines", label: "Visible line(s) on display", badge: "1", icon: <ScanSearch className="h-8 w-8 text-emerald-600" /> },
  { value: "fadedEdges", label: "Display faded along edges", badge: "2", icon: <TriangleAlert className="h-8 w-8 text-emerald-600" /> },
  { value: "noLines", label: "No line(s) on Display", badge: "3", icon: <Shield className="h-8 w-8 text-emerald-600" /> },
];

const screenDiscolorationOptions: DefectChoiceOption[] = [
  { value: "majorDiscoloration", label: "Major Discoloration", badge: "1", icon: <Droplets className="h-8 w-8 text-emerald-600" /> },
  { value: "minorDiscoloration", label: "Minor Discoloration", badge: "2", icon: <Lightbulb className="h-8 w-8 text-emerald-600" /> },
  { value: "noDiscoloration", label: "No Discoloration", badge: "3", icon: <Shield className="h-8 w-8 text-emerald-600" /> },
];

const screenCrackOptions: DefectChoiceOption[] = [
  { value: "chippedOrCrackedOutsideDisplay", label: "Chipped/cracked outside display area", badge: "1", icon: <TriangleAlert className="h-8 w-8 text-emerald-600" /> },
  { value: "moreThanTwoScratches", label: "More than 2 scratches on screen", badge: "2", icon: <ScanSearch className="h-8 w-8 text-emerald-600" /> },
  { value: "oneToTwoScratches", label: "1-2 scratches on screen", badge: "3", icon: <SquareDashed className="h-8 w-8 text-emerald-600" /> },
  { value: "noCracksOrScratches", label: "No cracks or scratches on screen", badge: "4", icon: <Shield className="h-8 w-8 text-emerald-600" /> },
];

const bodyScratchOptions: DefectChoiceOption[] = [
  { value: "moreThanTwoBodyScratches", label: "More than 2 scratches", badge: "1", icon: <ScanSearch className="h-8 w-8 text-emerald-600" /> },
  { value: "oneToTwoBodyScratches", label: "1-2 scratches", badge: "2", icon: <Phone className="h-8 w-8 text-emerald-600" /> },
  { value: "noBodyScratches", label: "No scratches", badge: "3", icon: <Shield className="h-8 w-8 text-emerald-600" /> },
];

const bodyDentOptions: DefectChoiceOption[] = [
  { value: "majorOrMoreThanTwoDents", label: "Major dent(s) or more than 2", badge: "1", icon: <TriangleAlert className="h-8 w-8 text-emerald-600" /> },
  { value: "oneToTwoMinorDents", label: "1-2 minor dents", badge: "2", icon: <MessageCircleWarning className="h-8 w-8 text-emerald-600" /> },
  { value: "noDents", label: "No dents", badge: "3", icon: <Shield className="h-8 w-8 text-emerald-600" /> },
];

const screenSections: DefectSection[] = [
  { key: "screenDeadPixels", title: "1. Dead Pixels/Spots on Screen", prompt: "Check your device's screen for visible spots", options: screenDeadSpotOptions },
  { key: "screenVisibleLines", title: "2. Visible Lines on Screen", prompt: "Check your device's screen for visible lines", options: screenLineOptions },
  { key: "screenDiscoloration", title: "3. Discoloration on Screen", prompt: "Check your device's screen for discoloration", options: screenDiscolorationOptions },
  { key: "screenCracks", title: "4. Screen cracked/ glass broken", prompt: "Check your screen glass and display area", options: screenCrackOptions },
];

const panelConditionOptions: BodyDefectOption[] = [
  {
    value: "cracked",
    label: "Cracked/ broken side or back panel",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="34" y="8" width="12" height="94" rx="5" stroke="#1a2733" strokeWidth="2" fill="#f8fafc"/>
        <rect x="30" y="28" width="4" height="14" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <rect x="46" y="42" width="4" height="10" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <path d="M36 30 L39 44 L36 52 L40 66" stroke="#20bf97" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="55" cy="28" r="8" fill="#fff5f5" stroke="#e07060" strokeWidth="1.5"/>
        <line x1="52" y1="25" x2="58" y2="31" stroke="#e07060" strokeWidth="2" strokeLinecap="round"/>
        <line x1="58" y1="25" x2="52" y2="31" stroke="#e07060" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "missing",
    label: "Missing side or back panel",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M34,8 L46,8 Q46,8 46,13 L46,45 L34,45 L34,8 Z" stroke="#1a2733" strokeWidth="2" fill="#f8fafc"/>
        <path d="M34,55 L46,55 L46,96 Q46,102 40,102 Q34,102 34,96 Z" stroke="#1a2733" strokeWidth="2" fill="#f8fafc"/>
        <line x1="34" y1="45" x2="46" y2="45" stroke="#d0d8e0" strokeWidth="1" strokeDasharray="3 2"/>
        <line x1="34" y1="55" x2="46" y2="55" stroke="#d0d8e0" strokeWidth="1" strokeDasharray="3 2"/>
        <rect x="30" y="28" width="4" height="12" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <polygon points="55,18 63,33 47,33" fill="#fff8e6" stroke="#e09020" strokeWidth="1.5" strokeLinejoin="round"/>
        <line x1="55" y1="23" x2="55" y2="28" stroke="#e09020" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="55" cy="31" r="1.2" fill="#e09020"/>
      </svg>
    ),
  },
  {
    value: "none",
    label: "No defect on side or back panel",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="34" y="8" width="12" height="94" rx="5" stroke="#1a2733" strokeWidth="2" fill="#f8fafc"/>
        <rect x="30" y="28" width="4" height="14" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <rect x="46" y="42" width="4" height="10" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <path d="M54 22 L55.5 26.5 L60 28 L55.5 29.5 L54 34 L52.5 29.5 L48 28 L52.5 26.5 Z" fill="#20bf97"/>
      </svg>
    ),
  },
];

const deviceBentOptions: BodyDefectOption[] = [
  {
    value: "bent",
    label: "Bent/ curved panel",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M34,8 Q28,55 34,102 L46,102 Q52,55 46,8 Z" stroke="#1a2733" strokeWidth="2" fill="#f8fafc"/>
        <path d="M30,30 Q26,55 30,80" stroke="#1a2733" strokeWidth="1.5" strokeDasharray="3 2" fill="none"/>
        <rect x="30" y="28" width="4" height="12" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <circle cx="55" cy="28" r="8" fill="#fff5f5" stroke="#e07060" strokeWidth="1.5"/>
        <line x1="52" y1="25" x2="58" y2="31" stroke="#e07060" strokeWidth="2" strokeLinecap="round"/>
        <line x1="58" y1="25" x2="52" y2="31" stroke="#e07060" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "looseScreen",
    label: "Loose screen (Gap in screen and body)",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="36" y="8" width="10" height="94" rx="5" stroke="#1a2733" strokeWidth="2" fill="#f0faf7"/>
        <rect x="34" y="10" width="4" height="88" rx="2" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <line x1="34" y1="10" x2="34" y2="98" stroke="#20bf97" strokeWidth="1.5" strokeDasharray="4 3"/>
        <rect x="30" y="30" width="4" height="12" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <circle cx="26" cy="50" r="3" fill="#20bf97" opacity="0.6"/>
        <circle cx="26" cy="58" r="3" fill="#20bf97" opacity="0.6"/>
        <circle cx="26" cy="66" r="3" fill="#20bf97" opacity="0.6"/>
      </svg>
    ),
  },
  {
    value: "none",
    label: "Phone not bent",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="34" y="8" width="12" height="94" rx="5" stroke="#1a2733" strokeWidth="2" fill="#f8fafc"/>
        <rect x="30" y="28" width="4" height="14" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <rect x="46" y="42" width="4" height="10" rx="2" stroke="#1a2733" strokeWidth="1.5" fill="#e2e8f0"/>
        <path d="M54 22 L55.5 26.5 L60 28 L55.5 29.5 L54 34 L52.5 29.5 L48 28 L52.5 26.5 Z" fill="#20bf97"/>
      </svg>
    ),
  },
];

const bodySections: DefectSection[] = [
  { key: "bodyScratches", title: "1. Scratches on device Body", prompt: "Check for scratches on device body", options: bodyScratchOptions },
  { key: "bodyDents", title: "2. Dents on device Body", prompt: "Check for dents on device body", options: bodyDentOptions },
  { key: "bodyPanelCondition", title: "3. Device Side/Back Panel Condition", prompt: "Check your device's side & back panels", options: panelConditionOptions },
  { key: "bodyBentCondition", title: "4. Device Bent/Screen loose", prompt: "Check if your device is bent or display screen is loose", options: deviceBentOptions },
];

type AccessoryOption = { value: string; label: string; svg: JSX.Element };

const accessoryOptions: AccessoryOption[] = [
  {
    value: "originalCharger",
    label: "Original Charger of Device",
    svg: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Adapter body */}
        <rect x="30" y="18" width="40" height="44" rx="8" stroke="#1a2733" strokeWidth="2.5" fill="#f8fafc"/>
        {/* USB port on top */}
        <rect x="42" y="12" width="16" height="8" rx="2" stroke="#20bf97" strokeWidth="2" fill="#e8f7f3"/>
        <rect x="45" y="14" width="10" height="4" rx="1" fill="#20bf97" opacity="0.5"/>
        {/* Prongs at bottom */}
        <rect x="40" y="62" width="6" height="14" rx="2" stroke="#1a2733" strokeWidth="2" fill="#d0d8e0"/>
        <rect x="54" y="62" width="6" height="14" rx="2" stroke="#1a2733" strokeWidth="2" fill="#d0d8e0"/>
        {/* Logo area */}
        <circle cx="50" cy="40" r="8" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <path d="M46 40 L50 36 L54 40 L50 44 Z" fill="#20bf97"/>
      </svg>
    ),
  },
  {
    value: "originalBoxWithIMEI",
    label: "Original Box with same IMEI",
    svg: (
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Box front face */}
        <rect x="15" y="38" width="70" height="48" rx="3" stroke="#1a2733" strokeWidth="2.5" fill="#f8fafc"/>
        {/* Box top flap */}
        <rect x="15" y="22" width="70" height="18" rx="3" stroke="#1a2733" strokeWidth="2" fill="#e8f7f3"/>
        {/* Lid center line */}
        <line x1="50" y1="22" x2="50" y2="40" stroke="#20bf97" strokeWidth="2" strokeLinecap="round"/>
        {/* Teal accent strip on lid */}
        <rect x="15" y="30" width="70" height="6" fill="#20bf97" opacity="0.15"/>
        <line x1="15" y1="33" x2="85" y2="33" stroke="#20bf97" strokeWidth="1.5"/>
        {/* IMEI label area on front */}
        <rect x="25" y="52" width="50" height="20" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f0f4f8"/>
        <line x1="29" y1="58" x2="71" y2="58" stroke="#20bf97" strokeWidth="1.2" strokeLinecap="round"/>
        <line x1="29" y1="63" x2="60" y2="63" stroke="#d0d8e0" strokeWidth="1" strokeLinecap="round"/>
        <line x1="29" y1="67" x2="55" y2="67" stroke="#d0d8e0" strokeWidth="1" strokeLinecap="round"/>
      </svg>
    ),
  },
];

// Warning triangle helper (positioned at top-right of phone)
const warnTriangle = (cx: number, cy: number) => (
  <>
    <polygon points={`${cx},${cy - 8} ${cx + 7},${cy + 4} ${cx - 7},${cy + 4}`} fill="#fff3cd" stroke="#e09020" strokeWidth="1.2"/>
    <line x1={cx} y1={cy - 4} x2={cx} y2={cy} stroke="#e09020" strokeWidth="1.5" strokeLinecap="round"/>
    <circle cx={cx} cy={cy + 2.5} r="0.9" fill="#e09020"/>
  </>
);

type FunctionalProblemOption = { value: string; label: string; svg: JSX.Element };

const functionalProblemOptions: FunctionalProblemOption[] = [
  {
    value: "frontCameraNotWorking",
    label: "Front Camera not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <circle cx="40" cy="13" r="2.5" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <circle cx="40" cy="13" r="1" fill="#20bf97"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "backCameraNotWorking",
    label: "Back Camera not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="26" y="22" width="14" height="14" rx="3" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <circle cx="33" cy="29" r="4" stroke="#20bf97" strokeWidth="1.2" fill="none"/>
        <circle cx="33" cy="29" r="1.5" fill="#20bf97"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "volumeButtonNotWorking",
    label: "Volume Button not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="13" y="30" width="5" height="10" rx="2" stroke="#20bf97" strokeWidth="1.8" fill="#e8f7f3"/>
        <rect x="13" y="44" width="5" height="10" rx="2" stroke="#20bf97" strokeWidth="1.8" fill="#e8f7f3"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "fingerTouchNotWorking",
    label: "Finger Touch not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <path d="M38 65 L38 45 Q38 42 40 42 Q42 42 42 45 L42 55 Q43 52 45 52 Q47 52 47 55 L47 60 Q48 57 50 57 Q52 57 52 60 L52 68 Q52 74 46 76 L40 76 Q36 76 35 72 Z" stroke="#20bf97" strokeWidth="1.2" fill="#e8f7f3"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "wifiNotWorking",
    label: "WiFi not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <path d="M28 52 Q40 40 52 52" stroke="#20bf97" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M32 57 Q40 48 48 57" stroke="#20bf97" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M36 62 Q40 56 44 62" stroke="#20bf97" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <circle cx="40" cy="66" r="2" fill="#20bf97"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "batteryFaulty",
    label: "Battery Faulty",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="29" y="44" width="22" height="14" rx="2" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <rect x="51" y="48" width="3" height="6" rx="1" fill="#20bf97"/>
        <rect x="31" y="46" width="8" height="10" rx="1" fill="#20bf97" opacity="0.5"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "speakerFaulty",
    label: "Speaker Faulty",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="31" y="98" width="18" height="4" rx="2" stroke="#20bf97" strokeWidth="1.2" fill="#e8f7f3"/>
        <line x1="34" y1="98" x2="34" y2="102" stroke="#20bf97" strokeWidth="1"/>
        <line x1="37" y1="98" x2="37" y2="102" stroke="#20bf97" strokeWidth="1"/>
        <line x1="40" y1="98" x2="40" y2="102" stroke="#20bf97" strokeWidth="1"/>
        <line x1="43" y1="98" x2="43" y2="102" stroke="#20bf97" strokeWidth="1"/>
        <line x1="46" y1="98" x2="46" y2="102" stroke="#20bf97" strokeWidth="1"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "powerButtonNotWorking",
    label: "Power Button not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="62" y="36" width="5" height="14" rx="2" stroke="#20bf97" strokeWidth="1.8" fill="#e8f7f3"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "chargingPortNotWorking",
    label: "Charging Port not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="34" y="103" width="12" height="4" rx="2" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <line x1="40" y1="103" x2="40" y2="98" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M36 95 L40 98 L44 95" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "faceSensorNotWorking",
    label: "Face Sensor not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <ellipse cx="40" cy="52" rx="10" ry="12" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <circle cx="36" cy="49" r="1.5" fill="#20bf97"/>
        <circle cx="44" cy="49" r="1.5" fill="#20bf97"/>
        <path d="M35 56 Q40 60 45 56" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "silentButtonNotWorking",
    label: "Silent Button not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="13" y="22" width="5" height="8" rx="2" stroke="#20bf97" strokeWidth="1.8" fill="#e8f7f3"/>
        <line x1="15.5" y1="22" x2="15.5" y2="20" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "audioReceiverNotWorking",
    label: "Audio Receiver not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#20bf97" strokeWidth="2" fill="#e8f7f3"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "cameraGlassBroken",
    label: "Camera Glass Broken",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="26" y="22" width="14" height="14" rx="3" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <circle cx="33" cy="29" r="4" stroke="#20bf97" strokeWidth="1.2" fill="none"/>
        <line x1="30" y1="24" x2="36" y2="34" stroke="#1a2733" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="28" y1="28" x2="34" y2="22" stroke="#1a2733" strokeWidth="1" strokeLinecap="round"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "bluetoothNotWorking",
    label: "Bluetooth not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <path d="M38 44 L46 50 L38 56 L38 44 Z M38 44 L38 56 M46 44 L38 50 M38 50 L46 56" stroke="#20bf97" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "vibratorNotWorking",
    label: "Vibrator is not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <path d="M12 50 Q15 45 12 40" stroke="#20bf97" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M9 52 Q13 45 9 38" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <path d="M68 50 Q65 45 68 40" stroke="#20bf97" strokeWidth="2" strokeLinecap="round" fill="none"/>
        <path d="M71 52 Q67 45 71 38" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "microphoneNotWorking",
    label: "Microphone not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="37" y="40" width="6" height="14" rx="3" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <path d="M32 52 Q32 60 40 60 Q48 60 48 52" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
        <line x1="40" y1="60" x2="40" y2="66" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round"/>
        <line x1="36" y1="66" x2="44" y2="66" stroke="#20bf97" strokeWidth="1.5" strokeLinecap="round"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "proximitySensorNotWorking",
    label: "Proximity Sensor not working",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <circle cx="32" cy="13" r="2" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <circle cx="32" cy="13" r="0.8" fill="#20bf97"/>
        <path d="M26 10 Q22 13 26 16" stroke="#20bf97" strokeWidth="1.2" strokeLinecap="round" fill="none"/>
        <path d="M23 8 Q17 13 23 18" stroke="#20bf97" strokeWidth="1" strokeLinecap="round" fill="none"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
  {
    value: "batteryHealthBelow80Service",
    label: "Battery health Below 80 (battery in service)",
    svg: (
      <svg viewBox="0 0 80 110" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <rect x="18" y="4" width="44" height="102" rx="7" stroke="#1a2733" strokeWidth="2"/>
        <rect x="28" y="9" width="24" height="3" rx="1.5" stroke="#1a2733" strokeWidth="1.5"/>
        <rect x="22" y="17" width="36" height="76" rx="2" stroke="#d0d8e0" strokeWidth="1" fill="#f8fafc"/>
        <rect x="29" y="43" width="22" height="16" rx="2" stroke="#20bf97" strokeWidth="1.5" fill="#e8f7f3"/>
        <rect x="51" y="48" width="3" height="6" rx="1" fill="#20bf97"/>
        <rect x="31" y="45" width="10" height="12" rx="1" fill="#20bf97" opacity="0.35"/>
        <line x1="33" y1="53" x2="47" y2="53" stroke="#20bf97" strokeWidth="1.6" strokeLinecap="round"/>
        <line x1="39" y1="49" x2="39" y2="57" stroke="#20bf97" strokeWidth="1.6" strokeLinecap="round"/>
        {warnTriangle(55, 24)}
      </svg>
    ),
  },
];

const warrantyAndBillQuestions = [
  { key: "underWarranty", label: "Is your device under manufacturer warranty?", hint: "You can get a better price for your device if it's under manufacturer warranty with a GST valid bill." },
  { key: "billInvoice", label: "Do you have GST valid bill with the same IMEI?", hint: "Make sure your bill has device IMEI mentioned on it." },
] satisfies QuestionnaireQuestion[];

const basicFunctionalityQuestions = [
  { key: "canMakeCalls", label: "Are you able to make and receive calls?", hint: "Check your device for cellular network connectivity issues." },
  { key: "touchWorking", label: "Is your device's touch screen working properly?", hint: "Check the touch screen functionality of your phone." },
  { key: "screenReplaced", label: "Is your phone's screen original?", hint: 'Pick "Yes" if screen was never changed or was changed by Authorized Service Center. Pick "No" if screen was changed at local shop.' },
] satisfies QuestionnaireQuestion[];

const batteryAndChargingQuestions = [
  { key: "charging", label: "Is the phone charging properly?" },
  { key: "batteryDrain", label: "Does battery drain quickly?" },
  { key: "heating", label: "Does phone heat abnormally?" },
] satisfies QuestionnaireQuestion[];

const accessoriesAndOwnershipQuestions = [
  { key: "billInvoice", label: "Do you have bill / invoice?" },
  { key: "originalBox", label: "Do you have original box?" },
  { key: "originalCharger", label: "Do you have original charger?" },
  { key: "underWarranty", label: "Is phone under warranty?" },
  { key: "accountLocked", label: "Is phone locked by password / iCloud / Google account?" },
] satisfies QuestionnaireQuestion[];

const mobileAgeOptions: Array<{ value: MobileAgeOption; label: string; note?: string }> = [
  { value: "below3Months", label: "Below 3 months", note: "Valid bill mandatory" },
  { value: "months3To6", label: "3 months - 6 months", note: "Valid bill mandatory" },
  { value: "months6To11", label: "6 months - 11 months", note: "Valid bill mandatory" },
  { value: "above11Months", label: "Above 11 months" },
];

type StoredDetails = {
  canMakeCalls?: boolean | null;
  touchWorking?: boolean | null;
  screenReplaced?: boolean | null;
  selectedIssues?: string[];
  detailStep?: number;
  questionnaireSlide?: number;
  basicFunctionality?: AnswerMap;
  warrantyAndBill?: AnswerMap;
  physicalIssues?: string[];
  nestedPhysicalIssueAnswers?: Record<string, string>;
  cameraAndBiometrics?: AnswerMap;
  sensorsAndConnectivity?: AnswerMap;
  batteryAndCharging?: AnswerMap;
  accessoriesAndOwnership?: AnswerMap;
  appleBatteryHealth?: AppleBatteryHealth;
  mobileAge?: MobileAgeOption;
  functionalProblems?: string[];
  accessories?: string[];
  metadata?: {
    useCase?: "device-details";
    questionnaireVersion?: string;
    flowType?: "sell-phone";
    selectedIssues?: string[];
    selectedIssueGroups?: string[];
    hasScreenDefectBranch?: boolean;
    hasBodyDefectBranch?: boolean;
    updatedAt?: string;
  };
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
  const cleaned: Record<string, string> = {};
  for (const issue of selectedIssues) {
    const answer = nestedAnswers[issue];
    if (answer) cleaned[issue] = answer;
  }

  if (hasScreenIssueSelection(selectedIssues)) {
    for (const section of screenSections) {
      const answer = nestedAnswers[section.key];
      if (answer) cleaned[section.key] = answer;
    }
  }

  if (hasBodyIssueSelection(selectedIssues)) {
    for (const section of bodySections) {
      const answer = nestedAnswers[section.key];
      if (answer) cleaned[section.key] = answer;
    }
  }

  if (nestedAnswers.panelCondition) cleaned.panelCondition = nestedAnswers.panelCondition;
  if (nestedAnswers.deviceBent) cleaned.deviceBent = nestedAnswers.deviceBent;
  return cleaned;
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

function getFunctionalProblemOptions(isApple: boolean) {
  if (!isApple) return functionalProblemOptions;
  return functionalProblemOptions.filter((option) => option.value !== "batteryFaulty");
}

function getAccessoryOptions(isApple: boolean) {
  if (!isApple) return accessoryOptions;
  return accessoryOptions.filter((option) => option.value !== "originalCharger");
}

function hasScreenIssueSelection(selectedIssues: string[]) {
  return selectedIssues.some((issue) => SCREEN_ISSUE_LABELS.has(issue));
}

function hasBodyIssueSelection(selectedIssues: string[]) {
  return selectedIssues.some((issue) => BODY_ISSUE_LABELS.has(issue));
}

function buildDeviceDetailsMetadata({ selectedIssues, flowType, updatedAt }: { selectedIssues: string[]; flowType: "sell-phone"; updatedAt: string; }) {
  const selectedIssueGroups = [
    hasScreenIssueSelection(selectedIssues) ? "screen" : null,
    hasBodyIssueSelection(selectedIssues) ? "body" : null,
  ].filter((group): group is string => Boolean(group));

  return {
    useCase: "device-details" as const,
    questionnaireVersion: "sell-phone-device-details-v2",
    flowType,
    selectedIssues,
    selectedIssueGroups,
    hasScreenDefectBranch: hasScreenIssueSelection(selectedIssues),
    hasBodyDefectBranch: hasBodyIssueSelection(selectedIssues),
    updatedAt,
  };
}

function buildSlideItems(selectedIssues: string[] = []): SlideItem[] {
  const items: SlideItem[] = [
    ...basicFunctionalityQuestions.map((question) => ({ kind: "question" as const, group: "basicFunctionality" as const, question })),
    ...warrantyAndBillQuestions.map((question) => ({ kind: "question" as const, group: "warrantyAndBill" as const, question })),
    ...issueOptions.map((issue) => ({ kind: "issue" as const, issue })),
  ];

  if (hasScreenIssueSelection(selectedIssues)) {
    items.push({ kind: "screenDefectDetail" as const });
  }

  if (hasBodyIssueSelection(selectedIssues)) {
    items.push({ kind: "bodyDefectDetail" as const });
  }

  items.push({ kind: "functionalProblemsDetail" as const }, { kind: "mobileAge" as const }, { kind: "accessoriesDetail" as const });
  return items;
}

/** Build slides so each group lands on its own slide(s) — issues always isolated. */
function chunkSlideItems(items: SlideItem[]): SlideItem[][] {
  const slides: SlideItem[][] = [];
  let currentSlide: SlideItem[] = [];
  let currentKind: string | null = null;

  const flush = () => {
    if (currentSlide.length > 0) { slides.push(currentSlide); currentSlide = []; }
  };

  for (const item of items) {
    const kind = item.kind === "question" ? item.group : item.kind;

    // Start a new slide whenever the group changes, or issues always get their own slide
    if (kind !== currentKind) {
      flush();
      currentKind = kind;
    }

    // Cap non-issue slides at MAX_SLIDE_ITEMS
    if (item.kind !== "issue" && currentSlide.length >= MAX_SLIDE_ITEMS) {
      flush();
    }

    currentSlide.push(item);
  }
  flush();
  return slides;
}

function getSlideTitle(slide: SlideItem[]) {
  if (slide.some((item) => item.kind === "screenDefectDetail")) {
    return "Tell us more about your device screen defects?";
  }
  if (slide.some((item) => item.kind === "bodyDefectDetail")) {
    return "Tell us more about your device's body defects?";
  }
  if (slide.some((item) => item.kind === "functionalProblemsDetail")) {
    return "Functional or Physical Problems";
  }
  if (slide.some((item) => item.kind === "mobileAge")) {
    return "What is your mobile age?";
  }
  if (slide.some((item) => item.kind === "accessoriesDetail")) {
    return "Do you have the following?";
  }
  if (slide.some((item) => item.kind === "question" && item.group === "warrantyAndBill")) {
    return "Warranty & Bill";
  }
  if (slide.some((item) => item.kind === "issue")) {
    return "Condition";
  }
  if (slide.some((item) => item.kind === "appleBatteryHealth" || (item.kind === "question" && item.group !== "basicFunctionality"))) {
    return "Battery & ownership";
  }
  return "Tell us more about your device?";
}

function getSlideDescription(slide: SlideItem[]) {
  if (slide.some((item) => item.kind === "screenDefectDetail")) {
    return "Because you selected screen defect. Choose the most accurate screen condition below.";
  }
  if (slide.some((item) => item.kind === "bodyDefectDetail")) {
    return "Because you selected device's body defect. Choose the matching body condition below.";
  }
  if (slide.some((item) => item.kind === "functionalProblemsDetail")) {
    return "Please choose appropriate condition to get accurate quote:";
  }
  if (slide.some((item) => item.kind === "mobileAge")) {
    return "(Because you chose your device is under brand's warranty)";
  }
  if (slide.some((item) => item.kind === "accessoriesDetail")) {
    return "Please select accessories which are available";
  }
  const title = getSlideTitle(slide);
  if (title === "Battery & ownership") return "Battery, charging and documents.";
  if (title === "Condition") return "Select visible issues if any.";
  if (title === "Warranty & Bill") return "Help us verify your device ownership details.";
  return "Please answer a few questions about your device.";
}

function AnswerToggleGroup({ name, value, options = ["yes", "no"], onChange }: { name: string; value?: AnswerValue; options?: AnswerValue[]; onChange: (value: AnswerValue) => void }) {
  const answerLabels: Record<AnswerValue, string> = {
    yes: "Yes",
    no: "No",
    na: "Not applicable",
  };

  return (
    <div className="user-radio-group">
      {options.map((option) => (
        <label key={option} className={`user-radio-label${value === option ? " selected" : ""}`}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
          />
          <span className="user-radio-mark" />
          <span className="user-radio-text">{answerLabels[option]}</span>
        </label>
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

function renderDefectSection({
  section,
  activeSlideIndex,
  nestedAnswers,
  setNestedAnswers,
  selectedIssues,
  batteryAndCharging,
  appleBatteryHealth,
  mobileAge,
  functionalProblems,
  accessories,
  persistDeviceDetails,
}: {
  section: DefectSection;
  activeSlideIndex: number;
  nestedAnswers: Record<string, string>;
  setNestedAnswers: (next: Record<string, string>) => void;
  selectedIssues: string[];
  batteryAndCharging: AnswerMap;
  appleBatteryHealth?: AppleBatteryHealth;
  mobileAge?: MobileAgeOption;
  functionalProblems: string[];
  accessories: string[];
  persistDeviceDetails: (
    slideIndex?: number,
    issues?: string[],
    nextBatteryAnswers?: AnswerMap,
    nextAppleBatteryHealth?: AppleBatteryHealth | undefined,
    nextMobileAge?: MobileAgeOption | undefined,
    nextNestedAnswers?: Record<string, string>,
    nextFunctionalProblems?: string[],
    nextAccessories?: string[],
  ) => StoredDetails | null;
}) {
  return (
    <div key={section.key} className="user-body-defect-section">
      <div className="user-body-defect-section-header">
        <h3>{section.title}</h3>
        <p>{section.prompt}</p>
      </div>
      <div className="user-issue-img-grid">
        {section.options.map((opt) => {
          const selected = nestedAnswers[section.key] === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              className={`user-issue-img-tile${selected ? " selected" : ""}`}
              onClick={() => {
                const updated = { ...nestedAnswers, [section.key]: opt.value };
                setNestedAnswers(updated);
                persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, mobileAge, updated, functionalProblems, accessories);
              }}
              aria-pressed={selected}
            >
              <div className="user-issue-img-wrap">
                {opt.icon ?? <span className="user-issue-img-fallback">{opt.badge ?? ""}</span>}
              </div>
              <span className="user-issue-img-label">{opt.label}</span>
              {selected && <span className="user-issue-img-check">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const Route = createFileRoute("/user/sell-phone/device-details")({
  component: UserSellPhoneDeviceDetailsPage,
});

function UserSellPhoneDeviceDetailsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [storedDetails, setStoredDetails] = useState<StoredDetails | null>(null);
  const [storedSelectedModel, setStoredSelectedModel] = useState<SelectedModel | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [basicFunctionality, setBasicFunctionality] = useState<AnswerMap>({});
  const [warrantyAndBill, setWarrantyAndBill] = useState<AnswerMap>({});
  const [selectedIssues, setSelectedIssues] = useState<string[]>([]);
  const [nestedPhysicalIssueAnswers, setNestedPhysicalIssueAnswers] = useState<Record<string, string>>({});
  const [batteryAndCharging, setBatteryAndCharging] = useState<AnswerMap>({});
  const [accessoriesAndOwnership, setAccessoriesAndOwnership] = useState<AnswerMap>({});
  const [appleBatteryHealth, setAppleBatteryHealth] = useState<AppleBatteryHealth | undefined>();
  const [mobileAge, setMobileAge] = useState<MobileAgeOption | undefined>();
  const [functionalProblems, setFunctionalProblems] = useState<string[]>([]);
  const [accessories, setAccessories] = useState<string[]>([]);

  useEffect(() => {
    const details = getStoredDeviceDetails();
    const selectedModel = getStoredSelectedModel();
    const isAppleModel = isAppleDevice(selectedModel);
    const restoredIssues = details?.physicalIssues ?? details?.selectedIssues ?? [];
    const initialSlides = chunkSlideItems(buildSlideItems(details?.physicalIssues ?? details?.selectedIssues ?? []));
    const restoredSlide = details?.questionnaireSlide ?? (typeof details?.detailStep === "number" ? details.detailStep - 1 : 0);

    setStoredDetails(details);
    setStoredSelectedModel(selectedModel);
    setBasicFunctionality(createInitialBasicFunctionality(details));
    setWarrantyAndBill(details?.warrantyAndBill ?? {});
    setSelectedIssues(details?.physicalIssues ?? details?.selectedIssues ?? []);
    setNestedPhysicalIssueAnswers(details?.nestedPhysicalIssueAnswers ?? {});
    setBatteryAndCharging(details?.batteryAndCharging ?? {});
    setAccessoriesAndOwnership(details?.accessoriesAndOwnership ?? {});
    setAppleBatteryHealth(details?.appleBatteryHealth);
    setMobileAge(details?.mobileAge);
    setFunctionalProblems(details?.functionalProblems ?? []);
    setAccessories(details?.accessories ?? []);
    setCurrentSlideIndex(normalizeSlideIndex(restoredSlide, initialSlides.length));
    setIsHydrated(true);
  }, []);

  const isApple = isAppleDevice(storedSelectedModel);
  const slides = chunkSlideItems(buildSlideItems(selectedIssues));
  const functionalProblemOptionsForDevice = getFunctionalProblemOptions(isApple);
  const accessoryOptionsForDevice = getAccessoryOptions(isApple);

  const activeSlideIndex = normalizeSlideIndex(currentSlideIndex, slides.length);
  const activeSlide = slides[activeSlideIndex] ?? [];
  const isLastSlide = activeSlideIndex === slides.length - 1;

  const answerMaps: Record<QuestionGroupKey, AnswerMap> = {
    basicFunctionality,
    warrantyAndBill,
    batteryAndCharging,
    accessoriesAndOwnership,
  };

  const updateAnswerMap = (group: QuestionGroupKey, updater: (previousAnswers: AnswerMap) => AnswerMap) => {
    if (group === "basicFunctionality") setBasicFunctionality(updater);
    if (group === "warrantyAndBill") setWarrantyAndBill(updater);
    if (group === "batteryAndCharging") setBatteryAndCharging(updater);
    if (group === "accessoriesAndOwnership") setAccessoriesAndOwnership(updater);
  };

  const persistDeviceDetails = (slideIndex = activeSlideIndex, issues: string[] = selectedIssues, nextBatteryAnswers: AnswerMap = batteryAndCharging, nextAppleBatteryHealth = appleBatteryHealth, nextMobileAge = mobileAge, nextNestedAnswers: Record<string, string> = nestedPhysicalIssueAnswers, nextFunctionalProblems: string[] = functionalProblems, nextAccessories: string[] = accessories) => {
    if (typeof window === "undefined") return null;

    const cleanIssueAnswers = cleanNestedAnswers(issues, nextNestedAnswers);
    const updatedAt = new Date().toISOString();
    const details = {
      canMakeCalls: toLegacyBoolean(basicFunctionality.canMakeCalls),
      touchWorking: toLegacyBoolean(basicFunctionality.touchWorking),
      screenReplaced: toLegacyBoolean(basicFunctionality.screenReplaced),
      selectedIssues: issues,
      detailStep: Math.min(slideIndex + 1, 3),
      questionnaireSlide: slideIndex,
      basicFunctionality,
      warrantyAndBill,
      physicalIssues: issues,
      nestedPhysicalIssueAnswers: cleanIssueAnswers,
      cameraAndBiometrics: storedDetails?.cameraAndBiometrics ?? {},
      sensorsAndConnectivity: storedDetails?.sensorsAndConnectivity ?? {},
      batteryAndCharging: nextBatteryAnswers,
      accessoriesAndOwnership,
      appleBatteryHealth: isApple ? nextAppleBatteryHealth : undefined,
      mobileAge: nextMobileAge,
      functionalProblems: nextFunctionalProblems,
      accessories: nextAccessories,
      metadata: buildDeviceDetailsMetadata({ selectedIssues: issues, flowType: "sell-phone", updatedAt }),
      updatedAt,
    } satisfies StoredDetails;

    window.localStorage.setItem(DEVICE_DETAILS_STORAGE_KEY, JSON.stringify(details));
    return details;
  };

  useEffect(() => {
    if (!isApple || !functionalProblems.includes("batteryFaulty")) return;
    const updatedFunctionalProblems = functionalProblems.filter((problem) => problem !== "batteryFaulty");
    setFunctionalProblems(updatedFunctionalProblems);
    persistDeviceDetails(
      activeSlideIndex,
      selectedIssues,
      batteryAndCharging,
      appleBatteryHealth,
      mobileAge,
      nestedPhysicalIssueAnswers,
      updatedFunctionalProblems,
      accessories,
    );
  }, [
    isApple,
    functionalProblems,
    activeSlideIndex,
    selectedIssues,
    batteryAndCharging,
    appleBatteryHealth,
    mobileAge,
    nestedPhysicalIssueAnswers,
    accessories,
  ]);

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

  const updateMobileAge = (value: MobileAgeOption) => {
    setMobileAge(value);
    persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, value, nestedPhysicalIssueAnswers);
  };

  const completeFinalStep = () => {
    const details = persistDeviceDetails(activeSlideIndex);
    if (typeof window === "undefined" || !details) return;

    toast.success("Phone details saved.");
    window.location.href = "/user/sell-phone/quote";
  };

  const isSlideComplete = activeSlide.every((item) => {
    if (item.kind === "issue") return true;
    if (item.kind === "screenDefectDetail") return screenSections.every((section) => Boolean(nestedPhysicalIssueAnswers[section.key]));
    if (item.kind === "bodyDefectDetail") return bodySections.every((section) => Boolean(nestedPhysicalIssueAnswers[section.key]));
    if (item.kind === "functionalProblemsDetail") return true;
    if (item.kind === "mobileAge") return Boolean(mobileAge);
    if (item.kind === "accessoriesDetail") return true;
    if (item.kind === "appleBatteryHealth") return Boolean(appleBatteryHealth);
    return Boolean(answerMaps[item.group][item.question.key]);
  });

  const progressItems = slides.flat().filter((item) => item.kind !== "issue" && item.kind !== "functionalProblemsDetail" && item.kind !== "accessoriesDetail");
  const answeredCount = progressItems.filter((item) => {
    if (item.kind === "appleBatteryHealth") return Boolean(appleBatteryHealth);
    if (item.kind === "mobileAge") return Boolean(mobileAge);
    if (item.kind === "screenDefectDetail") return screenSections.every((section) => Boolean(nestedPhysicalIssueAnswers[section.key]));
    if (item.kind === "bodyDefectDetail") return bodySections.every((section) => Boolean(nestedPhysicalIssueAnswers[section.key]));
    return Boolean(answerMaps[item.group][item.question.key]);
  }).length;
  const totalRequiredCount = progressItems.length;
  const progressPercent = totalRequiredCount > 0 ? Math.round((answeredCount / totalRequiredCount) * 100) : 0;

  const renderSlideItem = (item: SlideItem) => {
    if (item.kind === "issue") {
      const selected = selectedIssues.includes(item.issue);
      const icon = issueIcons[item.issue];
      return (
        <button
          key={`issue-${item.issue}`}
          type="button"
          className={`user-issue-img-tile${selected ? " selected" : ""}`}
          onClick={() => toggleIssue(item.issue)}
          aria-pressed={selected}
        >
          <div className="user-issue-img-wrap">{icon}</div>
          <span className="user-issue-img-label">{item.issue}</span>
          {selected && <span className="user-issue-img-check">✓</span>}
        </button>
      );
    }

    if (item.kind === "appleBatteryHealth") {
      return <AppleBatteryHealthGroup key="appleBatteryHealth" value={appleBatteryHealth} onChange={updateAppleBatteryHealth} />;
    }

    if (item.kind === "screenDefectDetail") {
      return (
        <div key="screenDefectDetail" className="user-body-defect-detail">
          {screenSections.map((section) =>
            renderDefectSection({
              section,
              activeSlideIndex,
              nestedAnswers: nestedPhysicalIssueAnswers,
              setNestedAnswers: setNestedPhysicalIssueAnswers,
              selectedIssues,
              batteryAndCharging,
              appleBatteryHealth,
              mobileAge,
              functionalProblems,
              accessories,
              persistDeviceDetails,
            }),
          )}
        </div>
      );
    }

    if (item.kind === "bodyDefectDetail") {
      return (
        <div key="bodyDefectDetail" className="user-body-defect-detail">
          {bodySections.map((section) =>
            renderDefectSection({
              section,
              activeSlideIndex,
              nestedAnswers: nestedPhysicalIssueAnswers,
              setNestedAnswers: setNestedPhysicalIssueAnswers,
              selectedIssues,
              batteryAndCharging,
              appleBatteryHealth,
              mobileAge,
              functionalProblems,
              accessories,
              persistDeviceDetails,
            }),
          )}
        </div>
      );
    }

    /* devicePanelDetail slide commented out
    if (item.kind === "devicePanelDetail") {
      const currentPanel = nestedPhysicalIssueAnswers["panelCondition"];
      const currentBent = nestedPhysicalIssueAnswers["deviceBent"];
      const updatePanelDetail = (key: string, value: string) => {
        const updated = { ...nestedPhysicalIssueAnswers, [key]: value };
        setNestedPhysicalIssueAnswers(updated);
        persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, updated);
      };
      return (
        <div key="devicePanelDetail" className="user-body-defect-detail">
          <div className="user-body-defect-section">
            <div className="user-body-defect-section-header">
              <h3>1. Device Side/Back Panel Condition</h3>
              <p>Check your device's side &amp; back panels</p>
            </div>
            <div className="user-issue-img-grid">
              {panelConditionOptions.map((opt) => (
                <button key={opt.value} type="button"
                  className={`user-issue-img-tile${currentPanel === opt.value ? " selected" : ""}`}
                  onClick={() => updatePanelDetail("panelCondition", opt.value)}
                  aria-pressed={currentPanel === opt.value}
                >
                  <div className="user-issue-img-wrap">{opt.svg}</div>
                  <span className="user-issue-img-label">{opt.label}</span>
                  {currentPanel === opt.value && <span className="user-issue-img-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="user-body-defect-section">
            <div className="user-body-defect-section-header">
              <h3>2. Device Bent/Screen loose</h3>
              <p>Check if your device is bent or display screen is loose</p>
            </div>
            <div className="user-issue-img-grid">
              {deviceBentOptions.map((opt) => (
                <button key={opt.value} type="button"
                  className={`user-issue-img-tile${currentBent === opt.value ? " selected" : ""}`}
                  onClick={() => updatePanelDetail("deviceBent", opt.value)}
                  aria-pressed={currentBent === opt.value}
                >
                  <div className="user-issue-img-wrap">{opt.svg}</div>
                  <span className="user-issue-img-label">{opt.label}</span>
                  {currentBent === opt.value && <span className="user-issue-img-check">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }
    */

    if (item.kind === "functionalProblemsDetail") {
      const toggleFunctionalProblem = (value: string) => {
        const updated = functionalProblems.includes(value)
          ? functionalProblems.filter((p) => p !== value)
          : [...functionalProblems, value];
        setFunctionalProblems(updated);
        persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, nestedPhysicalIssueAnswers, updated);
      };
      return (
        <div key="functionalProblemsDetail" className="user-issue-img-grid user-functional-problems-grid">
          {functionalProblemOptionsForDevice.map((opt) => {
            const selected = functionalProblems.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={`user-issue-img-tile${selected ? " selected" : ""}`}
                onClick={() => toggleFunctionalProblem(opt.value)}
                aria-pressed={selected}
              >
                <div className="user-issue-img-wrap">{opt.svg}</div>
                <span className="user-issue-img-label">{opt.label}</span>
                {selected && <span className="user-issue-img-check">✓</span>}
              </button>
            );
          })}
        </div>
      );
    }

    if (item.kind === "accessoriesDetail") {
      const toggleAccessory = (value: string) => {
        const updated = accessories.includes(value)
          ? accessories.filter((a) => a !== value)
          : [...accessories, value];
        setAccessories(updated);
        persistDeviceDetails(activeSlideIndex, selectedIssues, batteryAndCharging, appleBatteryHealth, mobileAge, nestedPhysicalIssueAnswers, functionalProblems, updated);
      };
      return (
        <div key="accessoriesDetail" className="user-accessories-grid">
          {accessoryOptionsForDevice.map((opt) => {
            const selected = accessories.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                className={`user-issue-img-tile user-accessory-tile${selected ? " selected" : ""}`}
                onClick={() => toggleAccessory(opt.value)}
                aria-pressed={selected}
              >
                <div className="user-accessory-img-wrap">{opt.svg}</div>
                <span className="user-issue-img-label">{opt.label}</span>
                {selected && <span className="user-issue-img-check">✓</span>}
              </button>
            );
          })}
        </div>
      );
    }

    if (item.kind === "mobileAge") {
      return (
        <fieldset key="mobileAge" className="user-mobile-age-group">
          <legend>What is your mobile age?</legend>
          <div className="user-mobile-age-options">
            {mobileAgeOptions.map((option) => {
              const selected = mobileAge === option.value;
              return (
                <label key={option.value} className={`user-mobile-age-option${selected ? " selected" : ""}`}>
                  <input
                    type="radio"
                    name="mobileAge"
                    value={option.value}
                    checked={selected}
                    onChange={() => updateMobileAge(option.value)}
                  />
                  <span className="user-mobile-age-mark" aria-hidden="true" />
                  <span className="user-mobile-age-copy">
                    <span className="user-mobile-age-label">{option.label}</span>
                    {option.note && <span className="user-mobile-age-note">{option.note}</span>}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      );
    }

    return (
      <article className="user-question-card" key={`${item.group}-${item.question.key}`}>
        <h3>{item.question.label}</h3>
        {item.question.hint && <p className="user-question-hint">{item.question.hint}</p>}
        <AnswerToggleGroup
          name={`${item.group}-${item.question.key}`}
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
          </div>
          <div className="user-question-progress-bar" aria-hidden="true">
            <div className="user-question-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <section className="user-questionnaire-block user-question-slide" aria-label={getSlideTitle(activeSlide)}>
          <div className="user-questionnaire-heading">
            <h2>{getSlideTitle(activeSlide)}</h2>
            <p>{getSlideDescription(activeSlide)}</p>
          </div>
          <div className={activeSlide.some((item) => item.kind === "functionalProblemsDetail" || item.kind === "accessoriesDetail") ? "user-body-defect-wrap" : activeSlide.some((item) => item.kind === "issue") && activeSlide.every((item) => item.kind === "issue") ? "user-issue-img-grid" : "user-slide-item-grid"}>
            {activeSlide.map(renderSlideItem)}
          </div>
          <div className="user-auth-actions user-question-actions">
            {activeSlideIndex === 0 ? (
              <Link to="/user/sell-phone" className="user-auth-cancel user-inline-link">
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
          {storedSelectedModel?.modelName && (
            <div className="user-device-model-info">
              <span className="user-device-model-label">Device Details</span>
              <span className="user-device-model-name">Selected Model: {storedSelectedModel.modelName}</span>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
