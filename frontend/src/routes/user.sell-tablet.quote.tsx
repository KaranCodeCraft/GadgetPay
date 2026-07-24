import { createFileRoute, Link } from "@tanstack/react-router";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { activateRoleSession } from "../lib/auth/role-session";
import {
  ApiClientError,
  createUserQuote,
  createUserSellFlow,
  getPincodeAvailability,
  previewUserQuote,
  saveUserDeviceDetails,
  saveUserPickupSchedule,
  sendUserOtp,
  verifyUserOtp,
  type UserSellFlowDeviceDetails,
  type UserSellFlowQuote,
  type UserSellFlowSelectedModel,
} from "../lib/api/gadgetpe-client";

const DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";
const DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_tablet_device_details";
const PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_tablet_pickup_schedule";
const USER_FLOW_JSON_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_json";
const USER_FLOW_ID_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_id";
const QUOTE_STORAGE_KEY = "gadgetpe_user_sell_tablet_quote";
const SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
const USER_TOKEN_KEY = "gadgetpe_user_access_token";
const USER_REFRESH_KEY = "gadgetpe_user_refresh_token";
const USER_NAME_KEY = "gadgetpe_user_name";
const USER_ID_KEY = "gadgetpe_user_id";
const USER_SCOPE_KEY = "gadgetpe_user_scope";

const timeSlots = ["10:00 AM - 12:00 PM", "12:00 PM - 2:00 PM", "2:00 PM - 4:00 PM", "4:00 PM - 6:00 PM", "6:00 PM - 8:00 PM"];

type SelectedModel = {
  brandSlug?: string;
  modelId?: string;
  modelName?: string;
  listedPrice?: number;
  thumbnailUrl?: string;
};

type ModalStep = "schedule" | "address" | "success";

type PickupSchedule = {
  pincode?: string;
  modelName?: string;
  listedPrice?: number;
  primaryDate: string;
  primaryTime: string;
  alternateDate: string;
  alternateTime: string;
  sellerName: string;
  callingPhoneNumber: string;
  addressLine: string;
  landmark: string;
  city: string;
  updatedAt: string;
};

type UserSellTabletFlowJson = {
  id: string;
  flowType: "sell-tablet";
  status: string;
  user: {
    id: string | null;
    name: string;
  };
  selectedModel: SelectedModel;
  deviceDetails: Record<string, unknown> | null;
  quote?: UserSellFlowQuote | null;
  pickupSchedule: PickupSchedule;
  createdAt: string;
  updatedAt: string;
};

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

function getStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function getStoredUserPincode() {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(USER_SCOPE_KEY);
    if (!raw) return undefined;
    const scope = JSON.parse(raw) as { pincode?: string; status?: string };
    return scope.status === "ACTIVE" ? scope.pincode : undefined;
  } catch {
    return undefined;
  }
}

function getToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function formatPickupDate(date?: Date) {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getApiSelectedModel(selectedModel: SelectedModel | null): UserSellFlowSelectedModel | null {
  if (!selectedModel?.brandSlug || !selectedModel.modelId || !selectedModel.modelName || typeof selectedModel.listedPrice !== "number") {
    return null;
  }

  return {
    brandSlug: selectedModel.brandSlug,
    modelId: selectedModel.modelId,
    modelName: selectedModel.modelName,
    listedPrice: selectedModel.listedPrice,
    thumbnailUrl: selectedModel.thumbnailUrl,
  };
}

export const Route = createFileRoute("/user/sell-tablet/quote")({
  component: UserSellTabletQuotePage,
});

function UserSellTabletQuotePage() {
  const [selectedModel, setSelectedModel] = useState<SelectedModel | null>(null);
  const [quote, setQuote] = useState<UserSellFlowQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("schedule");
  const [primaryDate, setPrimaryDate] = useState<Date | undefined>();
  const [primaryTime, setPrimaryTime] = useState("");
  const [alternateDate, setAlternateDate] = useState<Date | undefined>();
  const [alternateTime, setAlternateTime] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [callingPhoneNumber, setCallingPhoneNumber] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [landmark, setLandmark] = useState("");
  const [pincode, setPincode] = useState("");
  const [validatedPincode, setValidatedPincode] = useState<string | null>(null);
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
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [verifiedUser, setVerifiedUser] = useState<{ id: string; name: string } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    if (modalStep !== "success" || typeof window === "undefined") return;

    const fireConfetti = () => {
      void confetti({
        particleCount: 120,
        spread: 72,
        origin: { y: 0.72 },
        colors: ["#20bf97", "#0ea5c9", "#facc15", "#ffffff"],
      });
      void confetti({
        particleCount: 55,
        angle: 60,
        spread: 56,
        origin: { x: 0, y: 0.76 },
        colors: ["#20bf97", "#0ea5c9", "#facc15"],
      });
      void confetti({
        particleCount: 55,
        angle: 120,
        spread: 56,
        origin: { x: 1, y: 0.76 },
        colors: ["#20bf97", "#0ea5c9", "#facc15"],
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

    const fallbackQuote: UserSellFlowQuote = {
      basePrice: storedModel.listedPrice ?? 0,
      sellingPrice: storedModel.listedPrice ?? 0,
      totalDeduction: 0,
      currency: "INR",
      priceSource: "LOCAL_LISTED_PRICE",
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      deductions: [],
    };
    setQuote(getStoredJson<UserSellFlowQuote>(QUOTE_STORAGE_KEY, fallbackQuote));

    const apiSelectedModel = getApiSelectedModel(storedModel);
    if (!apiSelectedModel) return;

    const loadBackendQuotePreview = async () => {
      setQuoteLoading(true);
      setQuoteError(null);
      try {
        const result = await previewUserQuote({
          selectedModel: apiSelectedModel,
          deviceDetails: getStoredJson<UserSellFlowDeviceDetails | null>(DEVICE_DETAILS_STORAGE_KEY, null),
        });
        setQuote(result.quote);
        window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(result.quote));
      } catch (err) {
        setQuoteError(err instanceof Error ? err.message : "Unable to calculate backend quote preview.");
      } finally {
        setQuoteLoading(false);
      }
    };

    void loadBackendQuotePreview();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedName = window.localStorage.getItem(USER_NAME_KEY) || "";
    const storedPhone = window.localStorage.getItem("gadgetpe_user_phone") || "";
    const storedScope = getStoredJson<{ pincode?: string } | null>(USER_SCOPE_KEY, null);
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

  const handleValidatePincode = async (rawPincode?: string) => {
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
      if (typeof window !== "undefined") {
        window.localStorage.setItem(
          USER_SCOPE_KEY,
          JSON.stringify({
            pincode: result.pincode,
            status: result.status,
            city: result.location?.district || null,
            state: result.location?.state || null,
            district: result.location?.district || null,
          }),
        );
      }
      return true;
    } catch (err) {
      setValidatedPincode(null);
      setValidatedDistrict("");
      setValidatedState("");
      const message = err instanceof ApiClientError || err instanceof Error ? err.message : "Unable to validate pincode.";
      setAuthError(message);
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

    const updatedAt = new Date().toISOString();
    const pickupSchedule: PickupSchedule = {
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
      updatedAt,
    };

    return pickupSchedule;
  };

  const commitPickup = async (token: string, user: { id: string; name: string }) => {
    const apiSelectedModel = getApiSelectedModel(selectedModel);
    const pickupSchedule = buildPickupSchedule();
    if (!apiSelectedModel || !pickupSchedule) {
      throw new Error("Missing selected tablet or pickup details.");
    }

    const updatedAt = new Date().toISOString();
    const deviceDetails = getStoredJson<UserSellFlowDeviceDetails | null>(DEVICE_DETAILS_STORAGE_KEY, null) || {};
    const userFlowJson: UserSellTabletFlowJson = {
      id: `sell-tablet-${Date.now()}`,
      flowType: "sell-tablet",
      status: "PICKUP_SCHEDULED",
      user: {
        id: user.id,
        name: user.name || sellerName.trim(),
      },
      selectedModel: apiSelectedModel,
      deviceDetails,
      quote,
      pickupSchedule,
      createdAt: updatedAt,
      updatedAt,
    };
    let flowJsonToStore: unknown = userFlowJson;

    const created = await createUserSellFlow(token, apiSelectedModel, getStoredUserPincode(), "sell-tablet");
    window.localStorage.setItem(USER_FLOW_ID_STORAGE_KEY, created.flow.id);

    await saveUserDeviceDetails(token, created.flow.id, deviceDetails);
    const quoteResult = await createUserQuote(token, created.flow.id);
    const scheduleResult = await saveUserPickupSchedule(token, created.flow.id, pickupSchedule);

    setQuote(quoteResult.quote);
    flowJsonToStore = scheduleResult.flow.flowJson ?? scheduleResult.flow;

    const sellingHistory = getStoredJson<unknown[]>(SELLING_HISTORY_STORAGE_KEY, []);

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
      const message = err instanceof ApiClientError ? err.message : "Failed to send OTP.";
      setAuthError(message);
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
      const result = await verifyUserOtp(phone, trimmedOtp, sellerName.trim() || undefined);
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
      if (!sellerName.trim()) {
        setSellerName(result.user.name || "");
      }
      setAuthError(null);
    } catch (err) {
      const message = err instanceof ApiClientError || err instanceof Error ? err.message : "Unable to verify phone.";
      setAuthError(message);
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
      await commitPickup(token, { id: userId, name: userName });
      setModalStep("success");
    } catch (err) {
      const message = err instanceof ApiClientError || err instanceof Error ? err.message : "Unable to schedule pickup.";
      setAuthError(message);
    } finally {
      setSchedulingPickup(false);
    }
  };

  const displayedPrice = quote?.sellingPrice ?? selectedModel?.listedPrice ?? 0;

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-quote-shell">
        <div className="user-auth-brand">Your Quote</div>
        <h1>Selling Price</h1>

        {selectedModel?.modelName ? (
          !isPhoneVerified ? (
            <section className="user-question-card" aria-label="Verify phone for final quote">
              <h3>Verify your mobile to unlock final price</h3>
              {/* <p className="user-quote-muted">
                We will show your final price after OTP verification.
              </p> */}
              <div className="user-address-form" style={{ marginTop: 12 }}>
                <label>
                  Phone number
                  <Input
                    value={quoteAccessPhone}
                    onChange={(event) => setQuoteAccessPhone(event.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter 10-digit phone"
                    inputMode="tel"
                    maxLength={10}
                  />
                </label>
                {quoteOtpSent ? (
                  <label>
                    OTP
                    <Input
                      value={quoteAccessOtp}
                      onChange={(event) => setQuoteAccessOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter OTP (dev: 6767)"
                      inputMode="numeric"
                      maxLength={6}
                    />
                  </label>
                ) : null}
                {authError ? <div className="user-auth-error">{authError}</div> : null}
              </div>
              <div className="user-auth-actions user-quote-actions">
                <Link to="/user/sell-tablet/device-details" className="user-auth-cancel user-inline-link">
                  Back
                </Link>
                {!quoteOtpSent ? (
                  <button
                    type="button"
                    className="user-auth-submit"
                    disabled={isQuoteSendingOtp}
                    onClick={() => void handleSendOtp()}
                  >
                    {isQuoteSendingOtp ? "Sending..." : "Send OTP"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="user-auth-submit"
                    disabled={isQuoteVerifyingOtp}
                    onClick={() => void handleVerifyOtp()}
                  >
                    {isQuoteVerifyingOtp ? "Verifying..." : "Verify OTP"}
                  </button>
                )}
              </div>
            </section>
          ) : (
            <section className="user-quote-card" aria-label="Selected phone quote">
              <div className="user-quote-media">
                {selectedModel.thumbnailUrl ? (
                  <img src={selectedModel.thumbnailUrl} alt={`${selectedModel.modelName} thumbnail`} className="user-quote-thumb" />
                ) : (
                  <div className="user-quote-thumb-fallback">{selectedModel.modelName.charAt(0)}</div>
                )}
              </div>
              <div className="user-quote-details">
                <span className="user-step-progress">Final quote</span>
                <h2>{selectedModel.modelName}</h2>
                <p>Device verified. You can now schedule a pickup.</p>
                <div className="user-quote-price-label">Selling Price</div>
                <div className="user-quote-price">Rs. {formatInr(displayedPrice)}</div>
                {quoteLoading ? <p className="user-quote-muted">Calculating latest quote...</p> : null}
                {quoteError ? <p className="user-quote-muted" style={{ color: "#b91c1c" }}>{quoteError}</p> : null}
                {quote ? (
                  <div className="user-quote-breakdown">
                    <span>Base price: Rs. {formatInr(Math.round(quote.basePrice ?? selectedModel.listedPrice ?? 0))}</span>
                    <span>Total deduction: Rs. {formatInr(Math.round(quote.totalDeduction ?? 0))}</span>
                    {(quote.deductions || []).map((item) => (
                      <span key={item.ruleId}>{item.label}: -Rs. {formatInr(Math.round(item.deductionAmount))}</span>
                    ))}
                  </div>
                ) : null}
                <div className="user-auth-actions user-quote-actions">
                  <Link to="/user/sell-tablet/device-details" className="user-auth-cancel user-inline-link">
                    Back
                  </Link>
                  <button type="button" className="user-auth-submit" onClick={openScheduleModal}>
                    Sell Now
                  </button>
                </div>
              </div>
            </section>
          )
        ) : (
          <section className="user-question-card">
            <h3>No tablet model selected.</h3>
            <p className="user-quote-muted">Choose your tablet model first to generate a quote.</p>
            <div className="user-auth-actions user-quote-actions">
              <Link to="/user/sell-tablet" className="user-auth-submit user-inline-link">
                Choose Tablet
              </Link>
            </div>
          </section>
        )}
      </section>

      <Dialog open={scheduleModalOpen} onOpenChange={setScheduleModalOpen}>
        <DialogContent className="user-pickup-modal">
          {modalStep === "schedule" ? (
            <>
              <DialogHeader>
                <DialogTitle>Schedule a home pickup</DialogTitle>
                <DialogDescription>Select your preferred slot first. Alternate slot will open after that.</DialogDescription>
              </DialogHeader>
              <div className="user-pickup-schedule-grid">
                {!isPrimarySlotComplete ? (
                  <section className="user-pickup-section">
                    <h3>Preferred pickup</h3>
                    <Calendar mode="single" selected={primaryDate} onSelect={setPrimaryDate} disabled={{ before: getToday() }} className="user-pickup-calendar" />
                    <div className="user-time-slot-grid">
                      {timeSlots.map((slot) => (
                        <button key={slot} type="button" className={`user-time-slot${primaryTime === slot ? " selected" : ""}`} onClick={() => setPrimaryTime(slot)}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : (
                  <section className="user-pickup-summary">
                    <span>Preferred pickup selected</span>
                    <strong>{formatPickupDate(primaryDate)} at {primaryTime}</strong>
                    <button
                      type="button"
                      className="user-pickup-change-btn"
                      onClick={() => {
                        setPrimaryTime("");
                        setAlternateDate(undefined);
                        setAlternateTime("");
                      }}
                    >
                      Change
                    </button>
                  </section>
                )}

                {isPrimarySlotComplete ? (
                  <section className="user-pickup-section">
                    <h3>Alternate pickup</h3>
                    <Calendar mode="single" selected={alternateDate} onSelect={setAlternateDate} disabled={{ before: getToday() }} className="user-pickup-calendar" />
                    <div className="user-time-slot-grid">
                      {timeSlots.map((slot) => (
                        <button key={slot} type="button" className={`user-time-slot${alternateTime === slot ? " selected" : ""}`} onClick={() => setAlternateTime(slot)}>
                          {slot}
                        </button>
                      ))}
                    </div>
                  </section>
                ) : null}
              </div>
              <DialogFooter className="user-modal-actions">
                <button type="button" className="user-auth-cancel" onClick={() => setScheduleModalOpen(false)}>
                  Cancel
                </button>
                <button type="button" className="user-auth-submit" disabled={!isScheduleComplete} onClick={() => setModalStep("address")}>
                  Save and next
                </button>
              </DialogFooter>
            </>
          ) : null}

          {modalStep === "address" ? (
            <>
              <DialogHeader>
                <DialogTitle>Address details</DialogTitle>
                <DialogDescription>Share the contact details our executive should use for pickup.</DialogDescription>
              </DialogHeader>
              <div className="user-address-form">
                <label>
                  Name
                  <Input value={sellerName} onChange={(event) => setSellerName(event.target.value)} placeholder="Enter full name" />
                </label>
                <label>
                  Calling phone number
                  <Input value={callingPhoneNumber} onChange={(event) => setCallingPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="Enter calling phone number" inputMode="tel" maxLength={10} />
                </label>
                <label>
                  Address details
                  <Input value={addressLine} onChange={(event) => setAddressLine(event.target.value)} placeholder="House number, street, area" />
                </label>
                <label>
                  Landmark
                  <Input value={landmark} onChange={(event) => setLandmark(event.target.value)} placeholder="Nearby landmark" />
                </label>
                <label>
                  Pincode
                  <Input
                    value={pincode}
                    onChange={(event) => {
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
                      if (!isValidatingPincode && value !== validatedPincode) {
                        void handleValidatePincode(value);
                      }
                    }}
                    placeholder="Enter 6-digit pincode"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </label>
                {isValidatingPincode ? <p className="user-quote-muted">Validating pincode...</p> : null}
                {validatedPincode ? (
                  <p className="user-quote-muted">
                    Selected: {validatedPincode}{validatedDistrict || validatedState ? ` · ${[validatedDistrict, validatedState].filter(Boolean).join(", ")}` : ""}
                  </p>
                ) : null}
                {authError ? <div className="user-auth-error">{authError}</div> : null}
              </div>
              <DialogFooter className="user-modal-actions">
                <button type="button" className="user-auth-cancel" onClick={() => setModalStep("schedule")}>
                  Back
                </button>
                <button
                  type="button"
                  className="user-auth-submit"
                  disabled={!isAddressComplete || schedulingPickup}
                  onClick={() => void handleSchedulePickup()}
                >
                  {schedulingPickup ? "Scheduling..." : "Schedule pickup"}
                </button>
              </DialogFooter>
            </>
          ) : null}

          {modalStep === "success" ? (
            <section className="user-pickup-success" aria-label="Pickup scheduled confirmation">
              <div className="user-pickup-success-badge">Hooray!</div>
              <h2>Your pickup is scheduled for {confirmedPickupText}.</h2>
              <p>Our executive will get in touch with you soon! Thank you for using GadgetPe.</p>
              <p className="user-quote-muted">Alternate slot: {formatPickupDate(alternateDate)} at {alternateTime}</p>
              <button
                type="button"
                className="user-auth-submit"
                onClick={() => {
                  setScheduleModalOpen(false);
                  if (typeof window !== "undefined") window.location.href = "/user";
                }}
              >
                Done
              </button>
            </section>
          ) : null}
        </DialogContent>
      </Dialog>
    </main>
  );
}
