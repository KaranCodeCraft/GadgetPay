function getDefaultApiBase() {
  if (typeof window === "undefined") {
    return "/api/v1";
  }

  const host = window.location.hostname;
  const isLocalHost = host === "localhost" || host === "127.0.0.1";
  const localFrontendPorts = new Set(["5173", "8080", "4173"]);

  // Local setups often run frontend and backend on different ports.
  // Prefer direct backend calls when no explicit API base env is provided.
  if (isLocalHost && localFrontendPorts.has(window.location.port)) {
    return "http://localhost:4000/api/v1";
  }

  return "/api/v1";
}

const API_BASE = (import.meta.env.VITE_GADGETPE_API_BASE as string | undefined) || getDefaultApiBase();

function isLocalBrowser() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function buildOtpApiCandidates() {
  const candidates = [API_BASE];

  if (isLocalBrowser()) {
    candidates.push("http://localhost:4000/api/v1");
    candidates.push("http://localhost:4010/api/v1");
    candidates.push("/api/v1");
  }

  return [...new Set(candidates)];
}

const PARTNER_SESSION_KEYS = [
  "gadgetpe_access_token",
  "gadgetpe_refresh_token",
  "gadgetpe_partner_access_token",
  "gadgetpe_partner_refresh_token",
  "gadgetpe_partner_name",
  "gadgetpe_partner_scope",
];

type RefreshAccessTokenResponse = {
  accessToken: string;
};

type RefreshableRole = "user" | "partner";

const roleRefreshTokenKeys: Record<RefreshableRole, string[]> = {
  user: ["gadgetpe_user_refresh_token"],
  partner: ["gadgetpe_partner_refresh_token", "gadgetpe_refresh_token"],
};

const roleAccessTokenKeys: Record<RefreshableRole, string[]> = {
  user: ["gadgetpe_user_access_token"],
  partner: ["gadgetpe_partner_access_token", "gadgetpe_access_token"],
};

function getStoredRefreshToken(role: RefreshableRole) {
  if (typeof window === "undefined") return null;
  for (const key of roleRefreshTokenKeys[role]) {
    const token = window.localStorage.getItem(key);
    if (token) return token;
  }
  return null;
}

function storeRoleAccessToken(role: RefreshableRole, accessToken: string) {
  if (typeof window === "undefined") return;
  roleAccessTokenKeys[role].forEach((key) => window.localStorage.setItem(key, accessToken));
}

function clearPartnerSessionAndRedirect() {
  if (typeof window === "undefined") return;

  PARTNER_SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
  if (window.localStorage.getItem("gadgetpe_active_role") === "partner") {
    window.localStorage.removeItem("gadgetpe_active_role");
  }

  if (window.location.pathname !== "/partner") {
    window.location.assign("/partner");
  }
}

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    requestId?: string;
  };
};

export class ApiClientError extends Error {
  code?: string;
  status?: number;
  details?: unknown;

  constructor(message: string, options: { code?: string; status?: number; details?: unknown } = {}) {
    super(message);
    this.name = "ApiClientError";
    this.code = options.code;
    this.status = options.status;
    this.details = options.details;
  }
}

type VerifyOtpResponse = {
  partner: {
    id: string;
    phone: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
};

export type UserAuthResponse = {
  user: {
    id: string;
    phone: string;
    name: string;
  };
  accessToken: string;
  refreshToken: string;
};

type SendUserOtpResponse = {
  phone: string;
  otpTtlSeconds: number;
  resendAfterSeconds: number;
  devOtp?: string;
  isNewUser: boolean;
  requiresName: boolean;
};

type SendPartnerOtpResponse = {
  phone: string;
  otpTtlSeconds: number;
  resendAfterSeconds: number;
  devOtp?: string;
  deliveryStatus?: string;
};

export type PartnerDashboardResponse = {
  partner: {
    id: string;
    phone: string | null;
    name: string;
  };
  scope: {
    scopeType: "PINCODE";
    selectedPincode: string;
  };
  metrics: {
    onboardingProgress: number;
    coins: number;
    todayLeads: number;
    weeklyLeads: number;
    monthlyLeads: number;
    monthlyEarnings: number;
    leadBucket: number;
    serviceLeads: number;
  };
};

export type ServiceabilityRow = {
  pincode: string;
  status: "ACTIVE" | "INACTIVE" | "LIMITED";
  reason: string;
  state: string | null;
  district: string | null;
  officeCount: number | null;
  deliveryOfficeCount: number | null;
  metadata: {
    provider: string;
    state: string | null;
    district: string | null;
    offices: Array<{
      officeName: string;
      officeType: string;
      deliveryStatus: string;
      circleName: string;
      regionName: string;
      divisionName: string;
      latitude: number | null;
      longitude: number | null;
    }>;
  } | null;
  updatedBy: string;
  updatedAt: string;
};

export type PincodeValidationPreview = {
  state: string | null;
  district: string | null;
  officeCount: number;
  deliveryOfficeCount: number;
  offices: Array<{
    officeName: string;
    officeType: string;
    deliveryStatus: string;
    circleName: string;
    regionName: string;
    divisionName: string;
    latitude: number | null;
    longitude: number | null;
  }>;
};

export type KycSubmissionRow = {
  id: string;
  partnerId: string;
  identityProof: "Aadhar" | "Voter ID" | "Driving License" | "PAN Card" | "Passport";
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  storageStatus: string;
  storageProvider: string;
  storageKey: string;
  mediaUrl?: string | null;
  verificationStatus: "PENDING_REVIEW" | "VERIFIED" | "REJECTED";
  verificationNotes: string | null;
  verifiedBy: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PartnerKycStatusResponse = {
  latestSubmission: KycSubmissionRow | null;
};

export type PartnerCoinBalanceResponse = {
  partnerId: string;
  balance: number;
  updatedAt: string;
};

export type PartnerCoinLedgerRow = {
  id: string;
  partnerId: string;
  txnType: "CREDIT" | "DEBIT";
  amount: number;
  method: string;
  reference: string | null;
  note: string | null;
  metadata: unknown;
  createdAt: string;
};

export type PartnerCoinRechargeRequestRow = {
  id: string;
  partnerId: string;
  amount: number;
  upiTxnRef: string;
  upiApp: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  requestedAt: string;
  verifiedAt: string | null;
  verifiedBy: string | null;
  adminNote: string | null;
  ledgerEntryId: string | null;
  metadata: unknown;
};

export type ScopeResolveResponse = {
  partnerId: string;
  scopeType: "PINCODE";
  selectedPincode: string;
  serviceabilityStatus: "ACTIVE" | "INACTIVE" | "LIMITED";
  location: {
    state: string;
    district: string;
    officeCount: number;
  };
  offices: Array<{
    officeName: string;
    officeType: string;
    deliveryStatus: string;
    circleName: string;
    regionName: string;
    divisionName: string;
    latitude: number | null;
    longitude: number | null;
  }>;
};

export type PincodeAvailabilityResponse = {
  pincode: string;
  status: "ACTIVE" | "INACTIVE" | "LIMITED";
  reason: string;
  location: {
    state: string;
    district: string;
    officeCount: number;
  };
};

export type DevicePriceCatalogRow = {
  id: number;
  brand: string;
  series: string;
  model: string;
  storage: string;
  launchYear: number;
  cashifyPrice: number;
  sourceFileName: string | null;
  createdAt: string;
  updatedAt: string;
  row: {
    Brand: string;
    Series: string;
    Model: string;
    Storage: string;
    "Launch Year": string;
    CASHIFY: string;
  } | null;
};

export type CatalogStorageVariant = {
  storage: string;
  launchYear: number;
  cashifyPrice: number;
};

export type CatalogModelEntry = {
  model: string;
  storages: CatalogStorageVariant[];
};

export type CatalogSeriesGroup = {
  series: string;
  models: CatalogModelEntry[];
};

export type ListedPriceLookupResponse = {
  found: boolean;
  listedPrice: number | null;
  currency?: "INR";
  sourceFileName?: string;
  matchedDevice?: {
    brand: string;
    series: string;
    model: string;
    storage: string;
    launchYear: number;
  };
  rowJson?: unknown;
  message?: string;
};

export type UserSellFlowStatus = "DRAFT" | "QUESTIONNAIRE_COMPLETED" | "QUOTE_READY" | "PICKUP_SCHEDULED" | "CANCELLED";
export type UserSellFlowType = "sell-phone" | "sell-tablet";

export type UserSellFlowSelectedModel = {
  brandSlug: string;
  modelId: string;
  modelName: string;
  listedPrice: number;
  thumbnailUrl?: string;
};

export type UserSellFlowDeviceDetails = {
  basicFunctionality?: Record<string, "yes" | "no" | "na" | undefined>;
  physicalIssues?: string[];
  nestedPhysicalIssueAnswers?: Record<string, string>;
  cameraAndBiometrics?: Record<string, "yes" | "no" | "na" | undefined>;
  sensorsAndConnectivity?: Record<string, "yes" | "no" | "na" | undefined>;
  batteryAndCharging?: Record<string, "yes" | "no" | "na" | undefined>;
  accessoriesAndOwnership?: Record<string, "yes" | "no" | "na" | undefined>;
  [key: string]: unknown;
};

export type QuoteDeductionAnswerGroup =
  | "basicFunctionality"
  | "physicalIssues"
  | "nestedPhysicalIssueAnswers"
  | "cameraAndBiometrics"
  | "sensorsAndConnectivity"
  | "batteryAndCharging"
  | "accessoriesAndOwnership";

export type QuoteDeductionRule = {
  id: string;
  answerGroup: QuoteDeductionAnswerGroup;
  answerKey: string;
  answerValue: string | null;
  label: string;
  deductionType: "RUPEES" | "PERCENT";
  deductionValue: number;
  maxDeductionAmount: number | null;
  priority: number;
  isActive: boolean;
  appliesToBrand: string | null;
  appliesToModelId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type QuoteDeductionRuleInput = Omit<QuoteDeductionRule, "id" | "createdBy" | "createdAt" | "updatedAt">;

export type QuoteDeductionLine = {
  ruleId: string;
  label: string;
  answerGroup: QuoteDeductionAnswerGroup;
  answerKey: string;
  answerValue: string | null;
  deductionType: "RUPEES" | "PERCENT";
  deductionValue: number;
  deductionAmount: number;
};

export type UserSellFlowQuote = {
  basePrice?: number;
  sellingPrice: number;
  totalDeduction?: number;
  currency: "INR";
  priceSource: string;
  validUntil: string;
  deductions?: QuoteDeductionLine[];
};

export type UserPickupSchedule = {
  pincode?: string;
  primaryDate: string;
  primaryTime: string;
  alternateDate: string;
  alternateTime: string;
  sellerName: string;
  callingPhoneNumber: string;
  addressLine: string;
  landmark?: string;
  city?: string;
  modelName?: string;
  listedPrice?: number;
  updatedAt?: string;
};

export type UserSellFlow = {
  id: string;
  userId: string;
  flowType: UserSellFlowType;
  status: UserSellFlowStatus;
  selectedModel: UserSellFlowSelectedModel;
  deviceDetails: UserSellFlowDeviceDetails | null;
  pickupSchedule: UserPickupSchedule | null;
  quote: UserSellFlowQuote | null;
  flowJson: unknown;
  createdAt: string;
  updatedAt: string;
};

export type DevicePriceUploadHistoryRow = {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "ACTIVE" | "DEACTIVATED";
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  deactivatedRowCount: number;
  insertedCount: number;
  updatedCount: number;
  totalProcessed: number;
  activeRowCount: number;
};

export type ServiceabilityUploadHistoryRow = {
  id: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  status: "ACTIVE" | "DEACTIVATED";
  mediaId: string | null;
  deactivatedBy: string | null;
  deactivatedAt: string | null;
  deactivatedRowCount: number;
  insertedCount: number;
  updatedCount: number;
  totalProcessed: number;
  activeRowCount: number;
};

export type PriceUploadSummary = {
  uploadId: string;
  sourceFileName: string;
  insertedCount: number;
  updatedCount: number;
  totalProcessed: number;
};

export type PriceUploadResponse = {
  insertedCount: number;
  updatedCount: number;
  totalProcessed: number;
  expectedHeaders: string[];
  uploads: PriceUploadSummary[];
  uploadId?: string;
  sourceFileName?: string;
};

export type ServiceabilityUploadResponse = {
  insertedCount: number;
  updatedCount: number;
  totalProcessed: number;
  expectedHeaders: string[];
  uploads: Array<{
    uploadId: string;
    sourceFileName: string;
    insertedCount: number;
    updatedCount: number;
    totalProcessed: number;
  }>;
  uploadId?: string;
  sourceFileName?: string;
};

export type PartnerLeadStatus = "AVAILABLE" | "CLAIMED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "CANCELLED";

export type PartnerLead = {
  id: string;
  userSellFlowId: string;
  userId: string;
  leadType: "LEAD_BUCKET" | "SERVICE_LEAD";
  status: PartnerLeadStatus;
  partnerId: string | null;
  pincode: string;
  city: string | null;
  seller: {
    name: string | null;
    phone: string | null;
    addressLine: string | null;
    landmark: string | null;
    city: string | null;
    pincode: string;
  };
  selectedModel: UserSellFlowSelectedModel;
  deviceDetails: UserSellFlowDeviceDetails | null;
  quote: UserSellFlowQuote | null;
  pickupSchedule: UserPickupSchedule | null;
  flowSnapshot: unknown;
  createdAt: string;
  updatedAt: string;
  claimedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  rejectionReason: string | null;
  pickupStartedAt: string | null;
  callStatus: "CALLED" | "NO_ANSWER" | "RESCHEDULE_REQUESTED" | "FOLLOW_UP_REQUIRED" | null;
  callAttemptCount: number;
  lastCalledAt: string | null;
  callHistory: Array<{
    status: string;
    note: string | null;
    calledAt: string;
    actorId: string;
  }>;
  onsiteValidation: {
    result: "PASS" | "FAIL" | "NEEDS_REWORK";
    checklist: Record<string, string | number | boolean | null>;
    observedIssues: string[];
    revisedQuote: number | null;
    notes: string | null;
    updatedBy: string;
    updatedAt: string;
  } | null;
  onsiteValidatedAt: string | null;
  onsiteValidatedBy: string | null;
  paymentProof: {
    id: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    amountCollected: number;
    paymentMode: "UPI" | "BANK_TRANSFER" | "CASH" | "OTHER";
    transactionRef: string | null;
    notes: string | null;
    storageProvider: string;
    storageKey: string;
    mediaAssetId?: string | null;
    mediaUrl?: string | null;
    submittedAt: string;
  } | null;
  paymentSubmittedAt: string | null;
  completionEvent: {
    completionCode: string | null;
    handoverChecklist: Record<string, string | number | boolean | null>;
    finalAmount: number;
    remarks: string | null;
    completedBy: string;
    completedAt: string;
  } | null;
  completionEventAt: string | null;
  unlockOrder?: PartnerLeadUnlockOrder | null;
};

export type UserDealInvoice = {
  id: string;
  leadId: string;
  userSellFlowId: string;
  status: "DEAL_CLOSED";
  modelName: string | null;
  listedPrice: number;
  finalAmount: number;
  deductions: {
    listedPrice: number;
    totalDeductionPercent: number;
    totalDeductionAmount: number;
    finalAssessedPrice: number;
    issues: Array<{ description: string; deductionPercent: number }>;
  } | null;
  payment: {
    amountCollected: number;
    paymentMode: "UPI" | "BANK_TRANSFER" | "CASH" | "OTHER";
    transactionRef: string | null;
    submittedAt: string;
  } | null;
  partner: {
    id: string;
    name: string;
    phone: string | null;
  };
  completedAt: string;
};

export type PartnerLeadUnlockOrder = {
  id: string;
  leadId: string;
  partnerId: string;
  userSellFlowId: string;
  unlockPrice: number;
  paymentMethod: string;
  status: "PENDING_PAYMENT" | "SCREENSHOT_SENT" | "APPROVED" | "REJECTED" | "EXPIRED" | "CLOSED";
  screenshotStatus: "NOT_SENT" | "SENT";
  adminNote: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  metadata: unknown;
  createdAt: string;
  expiresAt: string;
  closedAt: string | null;
};

export type AdminLeadUnlockIntentRow = PartnerLeadUnlockOrder & {
  lead: PartnerLead | null;
};

export type AdminLeadDispositionCount = {
  key: string;
  count: number;
};

export type AdminLeadDispositionSummaryResponse = {
  byStatus: AdminLeadDispositionCount[];
  byDisposition: AdminLeadDispositionCount[];
};

export type AdminLeadDispositionEvent = {
  id: string;
  leadId: string;
  userSellFlowId: string;
  partnerId: string | null;
  fromStatus: string | null;
  toStatus: string;
  dispositionKey: string;
  note: string | null;
  actorRole: string;
  actorId: string;
  createdAt: string;
};

export type AdminOverviewMetricsResponse = {
  totalLeads: number;
  inProgressPickups: number;
  completedLeads: number;
  conversionRate: number;
  weeklyTrend: Array<{ label: string; value: number }>;
  monthlyPayout: number;
  activePartners: number;
  partnerActivity?: Array<{
    partnerId: string;
    partnerName: string;
    leadsTouched: number;
    completedLeads: number;
    activeLeads: number;
    lastActivityAt: string;
  }>;
};

export type AdminAssignmentMetricsResponse = {
  assigned: number;
  claimed: number;
  unassigned: number;
  manualAssigned: number;
  manualPartners: number;
};

export type AdminLeadAssignmentResponse = {
  lead: PartnerLead;
  assignment: {
    id: string;
    leadId: string;
    partnerId: string;
    adminId: string;
    assignmentMode: "MANUAL" | "AUTO";
    note: string | null;
    createdAt: string;
  };
};

export type AdminPartnerSearchRow = {
  id: string;
  name: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  scopePincode: string | null;
  scopeActive: boolean;
  lastAssignedAt: string | null;
};

export type PartnerPincodeScope = {
  id: string;
  partnerId: string;
  pincode: string;
  isActive: boolean;
  lastAssignedAt: string | null;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  partnerName: string;
  partnerPhone: string;
};

export type AdminBulkLeadAssignmentResult = {
  leadId: string;
  result: string;
  lead: PartnerLead | null;
  assignment: {
    id: string;
    leadId: string;
    partnerId: string;
    adminId: string;
    assignmentMode: "MANUAL" | "AUTO";
    note: string | null;
    createdAt: string;
  } | null;
};

export type PartnerLeadDispositionEvent = AdminLeadDispositionEvent;

async function parseResponse<T>(response: Response): Promise<T> {
  const activeRole =
    typeof window !== "undefined" ? window.localStorage.getItem("gadgetpe_active_role") : null;

  if (response.status === 401 && activeRole === "partner") {
    clearPartnerSessionAndRedirect();
  }

  const json = (await response.json().catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok || !json?.success) {
    const defaultMessage = response.status >= 500
      ? `API request failed (${response.status}). Server unavailable or proxy issue.`
      : `API request failed (${response.status}).`;

    throw new ApiClientError(json?.error?.message || defaultMessage, {
      code: json?.error?.code,
      status: response.status,
      details: json?.error?.details,
    });
  }

  return json.data;
}

export async function sendPartnerOtp(phone: string): Promise<SendPartnerOtpResponse> {
  const response = await fetch(`${API_BASE}/auth/partner/otp/send`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone }),
  });

  return parseResponse<SendPartnerOtpResponse>(response);
}

export async function verifyPartnerOtp(phone: string, otp: string, name?: string): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_BASE}/auth/partner/otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, otp, name }),
  });

  return parseResponse<VerifyOtpResponse>(response);
}

export async function partnerDevLogin(phone: string, name?: string): Promise<VerifyOtpResponse> {
  const response = await fetch(`${API_BASE}/auth/partner/dev-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone, name }),
  });

  return parseResponse<VerifyOtpResponse>(response);
}

export async function userDevLogin(phone: string, name?: string): Promise<UserAuthResponse> {
  const candidates = buildOtpApiCandidates();
  let lastError: unknown = null;
  const resolvedName = name?.trim() || `User ${phone.slice(-4)}`;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/auth/user/dev-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, name: resolvedName }),
      });

      return await parseResponse<UserAuthResponse>(response);
    } catch (error) {
      lastError = error;
    }
  }

  // Backward-compatible fallback for environments where /auth/user/dev-login route
  // is not yet live but the regular OTP endpoints are available.
  try {
    await sendUserOtp(phone);
    return await verifyUserOtp(phone, "6767", resolvedName);
  } catch (error) {
    lastError = error;
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new ApiClientError("Failed to use dev OTP bypass.");
}

export async function sendUserOtp(phone: string): Promise<SendUserOtpResponse> {
  const candidates = buildOtpApiCandidates();
  let lastError: unknown = null;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/auth/user/otp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const result = await parseResponse<SendUserOtpResponse>(response);

      if (isLocalBrowser() && result.devOtp && base.includes("localhost:4000") && candidates.length > 1) {
        continue;
      }

      return result;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new ApiClientError("Failed to send OTP.");
}

export async function verifyUserOtp(phone: string, otp: string, name?: string): Promise<UserAuthResponse> {
  const candidates = buildOtpApiCandidates();
  let lastError: unknown = null;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/auth/user/otp/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, otp, name }),
      });

      return await parseResponse<UserAuthResponse>(response);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }
  throw new ApiClientError("OTP verification failed.");
}

export async function refreshAccessToken(refreshToken: string): Promise<RefreshAccessTokenResponse> {
  const response = await fetch(`${API_BASE}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  return parseResponse<RefreshAccessTokenResponse>(response);
}

export async function ensureRoleAccessToken(role: RefreshableRole): Promise<string | null> {
  const refreshToken = getStoredRefreshToken(role);
  if (!refreshToken) return null;

  try {
    const result = await refreshAccessToken(refreshToken);
    storeRoleAccessToken(role, result.accessToken);
    return result.accessToken;
  } catch {
    return null;
  }
}

export async function getUserMe(token: string): Promise<{ user: UserAuthResponse["user"] }> {
  const response = await fetch(`${API_BASE}/user/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ user: UserAuthResponse["user"] }>(response);
}

export async function createUserSellFlow(
  token: string,
  selectedModel: UserSellFlowSelectedModel,
  servicePincode?: string,
  flowType: UserSellFlowType = "sell-phone",
): Promise<{ flow: UserSellFlow }> {
  const response = await fetch(`${API_BASE}/user/sell-flows`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ flowType, selectedModel, servicePincode }),
  });

  return parseResponse<{ flow: UserSellFlow }>(response);
}

export async function saveUserDeviceDetails(token: string, flowId: string, deviceDetails: UserSellFlowDeviceDetails): Promise<{ flow: UserSellFlow }> {
  const response = await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/device-details`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ deviceDetails }),
  });

  return parseResponse<{ flow: UserSellFlow }>(response);
}

export async function createUserQuote(token: string, flowId: string): Promise<{ flow: UserSellFlow; quote: UserSellFlowQuote }> {
  const response = await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/quote`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({}),
  });

  return parseResponse<{ flow: UserSellFlow; quote: UserSellFlowQuote }>(response);
}

export async function previewUserQuote(input: {
  selectedModel: UserSellFlowSelectedModel;
  deviceDetails: UserSellFlowDeviceDetails | null;
}): Promise<{ quote: UserSellFlowQuote }> {
  const response = await fetch(`${API_BASE}/pricing/quote-preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ quote: UserSellFlowQuote }>(response);
}

export async function saveUserPickupSchedule(token: string, flowId: string, pickupSchedule: UserPickupSchedule): Promise<{ flow: UserSellFlow }> {
  const response = await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/pickup-schedule`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pickupSchedule }),
  });

  return parseResponse<{ flow: UserSellFlow }>(response);
}

export async function getCatalogBrands(): Promise<{ brands: string[] }> {
  const response = await fetch(`${API_BASE}/pricing/catalog/brands`);
  return parseResponse<{ brands: string[] }>(response);
}

export async function getCatalogModels(brand: string): Promise<{ brand: string; series: CatalogSeriesGroup[] }> {
  const response = await fetch(`${API_BASE}/pricing/catalog/models?brand=${encodeURIComponent(brand)}`);
  return parseResponse<{ brand: string; series: CatalogSeriesGroup[] }>(response);
}

export async function listUserSellFlows(
  token: string,
  filters: { status?: UserSellFlowStatus; limit?: number } = {},
): Promise<{ rows: UserSellFlow[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.limit) params.set("limit", String(filters.limit));
  const qs = params.toString();
  const response = await fetch(`${API_BASE}/user/sell-flows${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: UserSellFlow[]; count: number }>(response);
}

export async function getUserSellFlow(token: string, flowId: string): Promise<{ flow: UserSellFlow }> {
  const response = await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ flow: UserSellFlow }>(response);
}

export async function getUserSellFlowInvoice(token: string, flowId: string): Promise<{ invoice: UserDealInvoice }> {
  const response = await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/invoice`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ invoice: UserDealInvoice }>(response);
}

export async function cancelUserSellFlow(token: string, flowId: string): Promise<{ flow: UserSellFlow }> {
  const response = await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ flow: UserSellFlow }>(response);
}

export async function resolvePartnerScope(pincode: string, token: string): Promise<ScopeResolveResponse> {
  const response = await fetch(`${API_BASE}/serviceability/scope/resolve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ pincode }),
  });

  return parseResponse<ScopeResolveResponse>(response);
}

export async function getPincodeAvailability(pincode: string): Promise<PincodeAvailabilityResponse> {
  const response = await fetch(`${API_BASE}/serviceability/availability/${encodeURIComponent(pincode)}`);
  return parseResponse<PincodeAvailabilityResponse>(response);
}

export async function getPartnerDashboard(pincode: string, token: string): Promise<PartnerDashboardResponse> {
  const response = await fetch(`${API_BASE}/partner/dashboard?pincode=${encodeURIComponent(pincode)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<PartnerDashboardResponse>(response);
}

export async function listPartnerLeadBucket(
  token: string,
  filters: { pincode: string; status?: PartnerLeadStatus; limit?: number },
): Promise<{ rows: PartnerLead[]; count: number }> {
  const params = new URLSearchParams({ pincode: filters.pincode });
  if (filters.status) params.set("status", filters.status);
  if (filters.limit) params.set("limit", String(filters.limit));

  const response = await fetch(`${API_BASE}/partner/lead-bucket?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerLead[]; count: number }>(response);
}

export async function listPartnerServiceLeads(
  token: string,
  filters: { pincode: string; status?: PartnerLeadStatus; date?: string; timeSlot?: string; limit?: number },
): Promise<{ rows: PartnerLead[]; count: number }> {
  const params = new URLSearchParams({ pincode: filters.pincode });
  if (filters.status) params.set("status", filters.status);
  if (filters.date) params.set("date", filters.date);
  if (filters.timeSlot && filters.timeSlot !== "All") params.set("timeSlot", filters.timeSlot);
  if (filters.limit) params.set("limit", String(filters.limit));

  const response = await fetch(`${API_BASE}/partner/service-leads?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerLead[]; count: number }>(response);
}

export async function listPartnerOwnedLeads(
  token: string,
  filters: { status?: Extract<PartnerLeadStatus, "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED">; limit?: number } = {},
): Promise<{ rows: PartnerLead[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.limit) params.set("limit", String(filters.limit));

  const response = await fetch(`${API_BASE}/partner/my-leads?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerLead[]; count: number }>(response);
}

export async function getPartnerLead(token: string, leadId: string): Promise<{ lead: PartnerLead }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ lead: PartnerLead }>(response);
}

export async function getLeadUnlockIntent(
  token: string,
  intentId: string,
): Promise<{ intent: PartnerLeadUnlockOrder; lead: PartnerLead | null }> {
  const response = await fetch(`${API_BASE}/partner/lead-unlock-intents/${encodeURIComponent(intentId)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ intent: PartnerLeadUnlockOrder; lead: PartnerLead | null }>(response);
}

export async function createLeadUnlockIntent(
  token: string,
  leadId: string,
): Promise<{ intent: PartnerLeadUnlockOrder; lead: PartnerLead | null; unlockPrice: number; paymentQrUrl: string; expiresAt: string }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/unlock-intent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ intent: PartnerLeadUnlockOrder; lead: PartnerLead | null; unlockPrice: number; paymentQrUrl: string; expiresAt: string }>(response);
}

export async function markLeadUnlockScreenshotSent(
  token: string,
  intentId: string,
): Promise<{ intent: PartnerLeadUnlockOrder; message: string }> {
  const response = await fetch(`${API_BASE}/partner/lead-unlock-intents/${encodeURIComponent(intentId)}/screenshot-sent`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ intent: PartnerLeadUnlockOrder; message: string }>(response);
}

export async function claimPartnerLead(token: string, leadId: string): Promise<{ lead: PartnerLead }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/claim`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ lead: PartnerLead }>(response);
}

export async function updatePartnerLeadStatus(
  token: string,
  leadId: string,
  input: { status: "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" | "CANCELLED"; reason?: string },
): Promise<{ lead: PartnerLead }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ lead: PartnerLead }>(response);
}

export async function updatePartnerLeadCallStatus(
  token: string,
  leadId: string,
  input: {
    callStatus: "CALLED" | "NO_ANSWER" | "RESCHEDULE_REQUESTED" | "FOLLOW_UP_REQUIRED";
    note?: string;
  },
): Promise<{ lead: PartnerLead }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/call-status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ lead: PartnerLead }>(response);
}

export async function sendPartnerLeadCustomerOtp(
  token: string,
  leadId: string,
): Promise<{ phone: string; otpTtlSeconds: number; resendAfterSeconds: number; devOtp?: string }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/customer-otp/send`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ phone: string; otpTtlSeconds: number; resendAfterSeconds: number; devOtp?: string }>(response);
}

export async function verifyPartnerLeadCustomerOtp(
  token: string,
  leadId: string,
  otp: string,
): Promise<{ phone: string; verified: boolean }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/customer-otp/verify`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ otp }),
  });

  return parseResponse<{ phone: string; verified: boolean }>(response);
}

export async function listPartnerActivePickups(
  token: string,
  filters: { pincode?: string; limit?: number } = {},
): Promise<{ rows: PartnerLead[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.pincode) params.set("pincode", filters.pincode);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/partner/active-pickups${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerLead[]; count: number }>(response);
}

export async function logoutSession(refreshToken: string): Promise<{ loggedOut: boolean }> {
  const response = await fetch(`${API_BASE}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });

  return parseResponse<{ loggedOut: boolean }>(response);
}

export async function submitPartnerOnsiteValidation(
  token: string,
  leadId: string,
  input: {
    result: "PASS" | "FAIL" | "NEEDS_REWORK";
    checklist: Record<string, string | number | boolean | null>;
    observedIssues?: string[];
    revisedQuote?: number;
    notes?: string;
    photos: File[];
  },
): Promise<{ lead: PartnerLead }> {
  const formData = new FormData();
  formData.append("result", input.result);
  formData.append("checklist", JSON.stringify(input.checklist));
  formData.append("observedIssues", JSON.stringify(input.observedIssues || []));
  if (typeof input.revisedQuote === "number") formData.append("revisedQuote", String(input.revisedQuote));
  if (input.notes) formData.append("notes", input.notes);
  input.photos.forEach((photo) => formData.append("photos", photo));

  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/onsite-validation`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseResponse<{ lead: PartnerLead }>(response);
}

export async function submitPartnerPaymentProofMetadata(
  token: string,
  leadId: string,
  input: {
    file: File;
    amountCollected: number;
    paymentMode: "UPI" | "BANK_TRANSFER" | "CASH" | "OTHER";
    transactionRef?: string;
    notes?: string;
  },
): Promise<{
  lead: PartnerLead;
  storage: {
    strategy: string;
    provider: string;
    storageKey: string;
    uploadUrl: string | null;
    note: string;
  };
}> {
  const formData = new FormData();
  formData.append("file", input.file);
  formData.append("amountCollected", String(input.amountCollected));
  formData.append("paymentMode", input.paymentMode);
  if (input.transactionRef) formData.append("transactionRef", input.transactionRef);
  if (input.notes) formData.append("notes", input.notes);

  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/payment-proof/metadata`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseResponse<{
    lead: PartnerLead;
    storage: {
      strategy: string;
      provider: string;
      storageKey: string;
      uploadUrl: string | null;
      note: string;
    };
  }>(response);
}

export async function completePartnerLead(
  token: string,
  leadId: string,
  input: {
    completionCode?: string;
    handoverChecklist?: Record<string, string | number | boolean | null>;
    finalAmount: number;
    remarks?: string;
  },
): Promise<{ lead: PartnerLead }> {
  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/completion`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ lead: PartnerLead }>(response);
}

export async function listPartnerLeadDispositionEvents(
  token: string,
  leadId: string,
  limit = 100,
): Promise<{ rows: PartnerLeadDispositionEvent[]; count: number }> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const response = await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/disposition-events?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerLeadDispositionEvent[]; count: number }>(response);
}

export async function submitPartnerKycMetadata(
  token: string,
  input: { identityProof: "Aadhar" | "Voter ID" | "Driving License" | "PAN Card" | "Passport"; file: File },
): Promise<{ kyc: KycSubmissionRow }> {
  const formData = new FormData();
  formData.append("identityProof", input.identityProof);
  formData.append("file", input.file);

  const response = await fetch(`${API_BASE}/partner/kyc/metadata`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseResponse<{ kyc: KycSubmissionRow }>(response);
}

export async function getPartnerKycStatus(token: string): Promise<PartnerKycStatusResponse> {
  const response = await fetch(`${API_BASE}/partner/kyc/status`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<PartnerKycStatusResponse>(response);
}

export async function getPartnerCoinBalance(token: string): Promise<PartnerCoinBalanceResponse> {
  const response = await fetch(`${API_BASE}/partner/coins/balance`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<PartnerCoinBalanceResponse>(response);
}

export async function listPartnerCoinLedger(token: string): Promise<{ rows: PartnerCoinLedgerRow[]; count: number }> {
  const response = await fetch(`${API_BASE}/partner/coins/ledger`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerCoinLedgerRow[]; count: number }>(response);
}

export async function rechargePartnerCoins(
  token: string,
  input: { amount: number; upiTxnRef: string; upiApp?: string },
): Promise<{ request: PartnerCoinRechargeRequestRow; message: string }> {
  const response = await fetch(`${API_BASE}/partner/coins/recharge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ request: PartnerCoinRechargeRequestRow; message: string }>(response);
}

export async function listPartnerCoinRechargeRequests(
  token: string,
  filters: { status?: "PENDING" | "APPROVED" | "REJECTED"; limit?: number } = {},
): Promise<{ rows: PartnerCoinRechargeRequestRow[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/partner/coins/recharge-requests${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerCoinRechargeRequestRow[]; count: number }>(response);
}

export async function listAdminPartnerCoinRechargeRequests(
  token: string,
  filters: { status?: "PENDING" | "APPROVED" | "REJECTED"; partnerId?: string; limit?: number } = {},
): Promise<{ rows: PartnerCoinRechargeRequestRow[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/partner/coins/recharge-requests/admin${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerCoinRechargeRequestRow[]; count: number }>(response);
}

export async function verifyPartnerCoinRechargeRequest(
  token: string,
  requestId: string,
  input: { action: "APPROVE" | "REJECT"; note?: string },
): Promise<{ request: PartnerCoinRechargeRequestRow }> {
  const response = await fetch(`${API_BASE}/partner/coins/recharge-requests/${encodeURIComponent(requestId)}/verify`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ request: PartnerCoinRechargeRequestRow }>(response);
}

export async function listAdminLeadUnlockIntents(
  token: string,
  filters: { status?: PartnerLeadUnlockOrder["status"]; partnerId?: string; limit?: number } = {},
): Promise<{ rows: AdminLeadUnlockIntentRow[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/partner/lead-unlock-intents/admin${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: AdminLeadUnlockIntentRow[]; count: number }>(response);
}

export async function verifyAdminLeadUnlockIntent(
  token: string,
  intentId: string,
  input: { action: "APPROVE" | "REJECT"; note?: string },
): Promise<{ intent: PartnerLeadUnlockOrder; lead: PartnerLead | null }> {
  const response = await fetch(`${API_BASE}/partner/lead-unlock-intents/${encodeURIComponent(intentId)}/verify`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ intent: PartnerLeadUnlockOrder; lead: PartnerLead | null }>(response);
}

export async function listAdminLeads(
  token: string,
  filters: {
    status?: PartnerLeadStatus;
    leadType?: "LEAD_BUCKET" | "SERVICE_LEAD";
    pincode?: string;
    partnerId?: string;
    search?: string;
    fromDate?: string;
    toDate?: string;
    limit?: number;
    offset?: number;
  } = {},
): Promise<{ rows: PartnerLead[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.leadType) params.set("leadType", filters.leadType);
  if (filters.pincode) params.set("pincode", filters.pincode);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (filters.search) params.set("search", filters.search);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
  if (typeof filters.offset === "number") params.set("offset", String(filters.offset));

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/leads${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerLead[]; count: number }>(response);
}

export async function listAdminLeadDispositionSummary(
  token: string,
  filters: {
    pincode?: string;
    partnerId?: string;
    fromDate?: string;
    toDate?: string;
  } = {},
): Promise<AdminLeadDispositionSummaryResponse> {
  const params = new URLSearchParams();
  if (filters.pincode) params.set("pincode", filters.pincode);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/leads/disposition-summary${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<AdminLeadDispositionSummaryResponse>(response);
}

export async function listAdminLeadDispositionEvents(
  token: string,
  leadId: string,
  limit = 100,
): Promise<{ rows: AdminLeadDispositionEvent[]; count: number }> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const response = await fetch(`${API_BASE}/admin/leads/${encodeURIComponent(leadId)}/disposition-events?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: AdminLeadDispositionEvent[]; count: number }>(response);
}

export async function getAdminOverviewMetrics(
  token: string,
  filters: {
    pincode?: string;
    partnerId?: string;
    leadType?: "LEAD_BUCKET" | "SERVICE_LEAD";
    fromDate?: string;
    toDate?: string;
  } = {},
): Promise<AdminOverviewMetricsResponse> {
  const params = new URLSearchParams();
  if (filters.pincode) params.set("pincode", filters.pincode);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (filters.leadType) params.set("leadType", filters.leadType);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/leads/overview${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<AdminOverviewMetricsResponse>(response);
}

export async function getAdminDispositionMetrics(
  token: string,
  filters: {
    pincode?: string;
    partnerId?: string;
    leadType?: "LEAD_BUCKET" | "SERVICE_LEAD";
    fromDate?: string;
    toDate?: string;
  } = {},
): Promise<AdminLeadDispositionSummaryResponse> {
  const params = new URLSearchParams();
  if (filters.pincode) params.set("pincode", filters.pincode);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (filters.leadType) params.set("leadType", filters.leadType);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/leads/disposition-metrics${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<AdminLeadDispositionSummaryResponse>(response);
}

export async function getAdminAssignmentMetrics(
  token: string,
  filters: {
    pincode?: string;
    partnerId?: string;
    leadType?: "LEAD_BUCKET" | "SERVICE_LEAD";
    fromDate?: string;
    toDate?: string;
  } = {},
): Promise<AdminAssignmentMetricsResponse> {
  const params = new URLSearchParams();
  if (filters.pincode) params.set("pincode", filters.pincode);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (filters.leadType) params.set("leadType", filters.leadType);
  if (filters.fromDate) params.set("fromDate", filters.fromDate);
  if (filters.toDate) params.set("toDate", filters.toDate);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/leads/assignment-metrics${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<AdminAssignmentMetricsResponse>(response);
}

export async function assignAdminLead(
  token: string,
  leadId: string,
  input: { partnerId: string; note?: string; mode?: "MANUAL" | "AUTO" },
): Promise<AdminLeadAssignmentResponse> {
  const response = await fetch(`${API_BASE}/admin/leads/${encodeURIComponent(leadId)}/assign`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<AdminLeadAssignmentResponse>(response);
}

export async function assignAdminLeadsBulk(
  token: string,
  input: { leadIds: string[]; partnerId: string; note?: string },
): Promise<{ rows: AdminBulkLeadAssignmentResult[]; count: number }> {
  const response = await fetch(`${API_BASE}/admin/leads/assign/bulk`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ rows: AdminBulkLeadAssignmentResult[]; count: number }>(response);
}

export async function listAdminPartnersForLeadAssignment(
  token: string,
  input: { pincode: string; search?: string; includeUnmapped?: boolean; limit?: number },
): Promise<{ rows: AdminPartnerSearchRow[]; count: number }> {
  const params = new URLSearchParams();
  params.set("pincode", input.pincode);
  if (input.search) params.set("search", input.search);
  if (typeof input.includeUnmapped === "boolean") {
    params.set("includeUnmapped", String(input.includeUnmapped));
  }
  if (typeof input.limit === "number") params.set("limit", String(input.limit));

  const response = await fetch(`${API_BASE}/admin/leads/partners/search?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: AdminPartnerSearchRow[]; count: number }>(response);
}

export async function listAdminLeadPartnerScopes(
  token: string,
  filters: { pincode?: string; partnerId?: string; activeOnly?: boolean; limit?: number } = {},
): Promise<{ rows: PartnerPincodeScope[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.pincode) params.set("pincode", filters.pincode);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);
  if (typeof filters.activeOnly === "boolean") params.set("activeOnly", String(filters.activeOnly));
  if (typeof filters.limit === "number") params.set("limit", String(filters.limit));

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/leads/partner-scopes${qs ? `?${qs}` : ""}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: PartnerPincodeScope[]; count: number }>(response);
}

export async function upsertAdminLeadPartnerScope(
  token: string,
  input: { partnerId: string; pincode: string; isActive?: boolean },
): Promise<{ scope: PartnerPincodeScope }> {
  const response = await fetch(`${API_BASE}/admin/leads/partner-scopes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ scope: PartnerPincodeScope }>(response);
}

export async function listAdminEligiblePartnersForPincode(
  token: string,
  pincode: string,
): Promise<{ rows: Array<{ partnerId: string; partnerName: string; partnerPhone: string; lastAssignedAt: string | null }>; count: number }> {
  const response = await fetch(`${API_BASE}/admin/leads/eligible-partners?pincode=${encodeURIComponent(pincode)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: Array<{ partnerId: string; partnerName: string; partnerPhone: string; lastAssignedAt: string | null }>; count: number }>(response);
}

export async function adminDevLogin(key: string, adminId = "admin-ops"): Promise<{ accessToken: string }> {
  const response = await fetch(`${API_BASE}/auth/admin/dev-login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ key, adminId }),
  });

  return parseResponse<{ accessToken: string }>(response);
}

export async function listServiceabilityPincodes(
  token: string,
  filters: { status?: "ACTIVE" | "INACTIVE" | "LIMITED"; search?: string } = {},
): Promise<{ rows: ServiceabilityRow[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.search) params.set("search", filters.search);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/serviceability/pincodes${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: ServiceabilityRow[]; count: number }>(response);
}

export async function toggleServiceabilityPincode(
  token: string,
  pincode: string,
  enabled: boolean,
  reason: string,
): Promise<ServiceabilityRow> {
  const response = await fetch(`${API_BASE}/admin/serviceability/pincodes/${encodeURIComponent(pincode)}/toggle`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ enabled, reason }),
  });

  return parseResponse<ServiceabilityRow>(response);
}

export async function validateServiceabilityPincode(
  token: string,
  pincode: string,
): Promise<PincodeValidationPreview> {
  const response = await fetch(`${API_BASE}/admin/serviceability/validate/${encodeURIComponent(pincode)}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<PincodeValidationPreview>(response);
}

export async function createServiceabilityPincode(
  token: string,
  input: { pincode: string; status: "ACTIVE" | "INACTIVE" | "LIMITED"; reason?: string },
): Promise<ServiceabilityRow> {
  const response = await fetch(`${API_BASE}/admin/serviceability/pincodes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<ServiceabilityRow>(response);
}

export async function updateServiceabilityPincode(
  token: string,
  pincode: string,
  input: { status: "ACTIVE" | "INACTIVE" | "LIMITED"; reason?: string },
): Promise<ServiceabilityRow> {
  const response = await fetch(`${API_BASE}/admin/serviceability/pincodes/${encodeURIComponent(pincode)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<ServiceabilityRow>(response);
}

export async function deleteServiceabilityPincode(token: string, pincode: string): Promise<{ pincode: string; deleted: boolean }> {
  const response = await fetch(`${API_BASE}/admin/serviceability/pincodes/${encodeURIComponent(pincode)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ pincode: string; deleted: boolean }>(response);
}

export async function uploadServiceabilityExcel(
  token: string,
  files: File | File[],
): Promise<ServiceabilityUploadResponse> {
  const formData = new FormData();
  const uploadFiles = Array.isArray(files) ? files : [files];
  uploadFiles.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/admin/serviceability/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseResponse<ServiceabilityUploadResponse>(response);
}

export async function listServiceabilityUploadHistory(token: string): Promise<{ rows: ServiceabilityUploadHistoryRow[]; count: number; expectedHeaders: string[] }> {
  const response = await fetch(`${API_BASE}/admin/serviceability/uploads`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: ServiceabilityUploadHistoryRow[]; count: number; expectedHeaders: string[] }>(response);
}

export async function updateServiceabilityUploadStatus(
  token: string,
  uploadId: string,
  status: "ACTIVE" | "DEACTIVATED",
): Promise<{
  uploadId: string;
  fileName: string;
  status: "ACTIVE" | "DEACTIVATED";
  updated: boolean;
  deactivatedRowCount?: number;
}> {
  const response = await fetch(`${API_BASE}/admin/serviceability/uploads/${encodeURIComponent(uploadId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  return parseResponse<{
    uploadId: string;
    fileName: string;
    status: "ACTIVE" | "DEACTIVATED";
    updated: boolean;
    deactivatedRowCount?: number;
  }>(response);
}

export async function deleteServiceabilityUpload(token: string, uploadId: string): Promise<{
  uploadId: string;
  fileName: string;
  deletedRows: number;
  deleted: boolean;
}> {
  const response = await fetch(`${API_BASE}/admin/serviceability/uploads/${encodeURIComponent(uploadId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{
    uploadId: string;
    fileName: string;
    deletedRows: number;
    deleted: boolean;
  }>(response);
}

export async function listKycSubmissions(
  token: string,
  filters: { status?: "PENDING_REVIEW" | "VERIFIED" | "REJECTED"; partnerId?: string } = {},
): Promise<{ rows: KycSubmissionRow[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.partnerId) params.set("partnerId", filters.partnerId);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/kyc/submissions${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: KycSubmissionRow[]; count: number }>(response);
}

export async function verifyKycSubmission(
  token: string,
  kycId: string,
  action: "APPROVE" | "REJECT",
  notes: string,
): Promise<KycSubmissionRow> {
  const response = await fetch(`${API_BASE}/admin/kyc/submissions/${encodeURIComponent(kycId)}/verification`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, notes }),
  });

  return parseResponse<KycSubmissionRow>(response);
}

export async function uploadPricingExcel(
  token: string,
  files: File | File[],
): Promise<PriceUploadResponse> {
  const formData = new FormData();
  const uploadFiles = Array.isArray(files) ? files : [files];
  uploadFiles.forEach((file) => formData.append("files", file));

  const response = await fetch(`${API_BASE}/admin/pricing/upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  return parseResponse<PriceUploadResponse>(response);
}

export async function listPriceCatalog(
  token: string,
  search?: string,
): Promise<{ rows: DevicePriceCatalogRow[]; count: number; expectedHeaders: string[] }> {
  const query = search ? `?search=${encodeURIComponent(search)}` : "";
  const response = await fetch(`${API_BASE}/admin/pricing/catalog${query}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: DevicePriceCatalogRow[]; count: number; expectedHeaders: string[] }>(response);
}

export async function listQuoteDeductionRules(
  token: string,
  filters: { active?: boolean; search?: string } = {},
): Promise<{ rows: QuoteDeductionRule[]; count: number }> {
  const params = new URLSearchParams();
  if (filters.active !== undefined) params.set("active", String(filters.active));
  if (filters.search) params.set("search", filters.search);

  const qs = params.toString();
  const response = await fetch(`${API_BASE}/admin/pricing/deductions${qs ? `?${qs}` : ""}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: QuoteDeductionRule[]; count: number }>(response);
}

export async function createQuoteDeductionRule(token: string, input: QuoteDeductionRuleInput): Promise<{ rule: QuoteDeductionRule }> {
  const response = await fetch(`${API_BASE}/admin/pricing/deductions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ rule: QuoteDeductionRule }>(response);
}

export async function updateQuoteDeductionRule(token: string, ruleId: string, input: QuoteDeductionRuleInput): Promise<{ rule: QuoteDeductionRule }> {
  const response = await fetch(`${API_BASE}/admin/pricing/deductions/${encodeURIComponent(ruleId)}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ rule: QuoteDeductionRule }>(response);
}

export async function toggleQuoteDeductionRule(token: string, ruleId: string, isActive: boolean): Promise<{ rule: QuoteDeductionRule }> {
  const response = await fetch(`${API_BASE}/admin/pricing/deductions/${encodeURIComponent(ruleId)}/toggle`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ isActive }),
  });

  return parseResponse<{ rule: QuoteDeductionRule }>(response);
}

export async function previewQuoteDeductions(
  token: string,
  input: { selectedModel: UserSellFlowSelectedModel; deviceDetails: UserSellFlowDeviceDetails },
): Promise<{ quote: UserSellFlowQuote }> {
  const response = await fetch(`${API_BASE}/admin/pricing/deductions/preview`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  return parseResponse<{ quote: UserSellFlowQuote }>(response);
}

export async function lookupListedPrice(input: {
  brand: string;
  series: string;
  model: string;
  storage: string;
  launchYear: number;
}): Promise<ListedPriceLookupResponse> {
  const response = await fetch(`${API_BASE}/pricing/lookup`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });

  return parseResponse<ListedPriceLookupResponse>(response);
}

export async function listPriceUploadHistory(token: string): Promise<{ rows: DevicePriceUploadHistoryRow[]; count: number }> {
  const response = await fetch(`${API_BASE}/admin/pricing/uploads`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{ rows: DevicePriceUploadHistoryRow[]; count: number }>(response);
}

export async function updatePriceUploadStatus(
  token: string,
  uploadId: string,
  status: "ACTIVE" | "DEACTIVATED",
): Promise<{
  uploadId: string;
  fileName: string;
  status: "ACTIVE" | "DEACTIVATED";
  updated: boolean;
  deactivatedCatalogRows?: number;
  restoredCatalogRows?: number;
}> {
  const response = await fetch(`${API_BASE}/admin/pricing/uploads/${encodeURIComponent(uploadId)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  return parseResponse<{
    uploadId: string;
    fileName: string;
    status: "ACTIVE" | "DEACTIVATED";
    updated: boolean;
    deactivatedCatalogRows?: number;
    restoredCatalogRows?: number;
  }>(response);
}

export async function deletePriceUpload(token: string, uploadId: string): Promise<{
  uploadId: string;
  fileName: string;
  deletedCatalogRows: number;
  deletedSnapshotRows: number;
  deleted: boolean;
}> {
  const response = await fetch(`${API_BASE}/admin/pricing/uploads/${encodeURIComponent(uploadId)}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return parseResponse<{
    uploadId: string;
    fileName: string;
    deletedCatalogRows: number;
    deletedSnapshotRows: number;
    deleted: boolean;
  }>(response);
}
