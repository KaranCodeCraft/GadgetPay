//#region src/lib/api/gadgetpe-client.ts
var API_BASE = "https://api.gadgetpe.com/api/v1";
var PARTNER_SESSION_KEYS = [
	"gadgetpe_access_token",
	"gadgetpe_refresh_token",
	"gadgetpe_partner_access_token",
	"gadgetpe_partner_refresh_token",
	"gadgetpe_partner_name",
	"gadgetpe_partner_scope"
];
function clearPartnerSessionAndRedirect() {
	if (typeof window === "undefined") return;
	PARTNER_SESSION_KEYS.forEach((key) => window.localStorage.removeItem(key));
	if (window.localStorage.getItem("gadgetpe_active_role") === "partner") window.localStorage.removeItem("gadgetpe_active_role");
	if (window.location.pathname !== "/partner") window.location.assign("/partner");
}
var ApiClientError = class extends Error {
	code;
	status;
	details;
	constructor(message, options = {}) {
		super(message);
		this.name = "ApiClientError";
		this.code = options.code;
		this.status = options.status;
		this.details = options.details;
	}
};
async function parseResponse(response) {
	const activeRole = typeof window !== "undefined" ? window.localStorage.getItem("gadgetpe_active_role") : null;
	if (response.status === 401 && activeRole === "partner") clearPartnerSessionAndRedirect();
	const json = await response.json().catch(() => null);
	if (!response.ok || !json?.success) {
		const defaultMessage = response.status >= 500 ? `API request failed (${response.status}). Server unavailable or proxy issue.` : `API request failed (${response.status}).`;
		throw new ApiClientError(json?.error?.message || defaultMessage, {
			code: json?.error?.code,
			status: response.status,
			details: json?.error?.details
		});
	}
	return json.data;
}
async function sendPartnerOtp(phone) {
	await parseResponse(await fetch(`${API_BASE}/auth/partner/otp/send`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ phone })
	}));
}
async function verifyPartnerOtp(phone, otp, name) {
	return parseResponse(await fetch(`${API_BASE}/auth/partner/otp/verify`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			phone,
			otp,
			name
		})
	}));
}
async function sendUserOtp(phone) {
	return parseResponse(await fetch(`${API_BASE}/auth/user/otp/send`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ phone })
	}));
}
async function verifyUserOtp(phone, otp, name) {
	return parseResponse(await fetch(`${API_BASE}/auth/user/otp/verify`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			phone,
			otp,
			name
		})
	}));
}
async function getUserMe(token) {
	return parseResponse(await fetch(`${API_BASE}/user/me`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function createUserSellFlow(token, selectedModel, servicePincode, flowType = "sell-phone") {
	return parseResponse(await fetch(`${API_BASE}/user/sell-flows`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			flowType,
			selectedModel,
			servicePincode
		})
	}));
}
async function saveUserDeviceDetails(token, flowId, deviceDetails) {
	return parseResponse(await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/device-details`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ deviceDetails })
	}));
}
async function createUserQuote(token, flowId) {
	return parseResponse(await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/quote`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({})
	}));
}
async function previewUserQuote(input) {
	return parseResponse(await fetch(`${API_BASE}/pricing/quote-preview`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input)
	}));
}
async function saveUserPickupSchedule(token, flowId, pickupSchedule) {
	return parseResponse(await fetch(`${API_BASE}/user/sell-flows/${encodeURIComponent(flowId)}/pickup-schedule`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ pickupSchedule })
	}));
}
async function getCatalogBrands() {
	return parseResponse(await fetch(`${API_BASE}/pricing/catalog/brands`));
}
async function getCatalogModels(brand) {
	return parseResponse(await fetch(`${API_BASE}/pricing/catalog/models?brand=${encodeURIComponent(brand)}`));
}
async function listUserSellFlows(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.status) params.set("status", filters.status);
	if (filters.limit) params.set("limit", String(filters.limit));
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/user/sell-flows${qs ? `?${qs}` : ""}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function resolvePartnerScope(pincode, token) {
	return parseResponse(await fetch(`${API_BASE}/serviceability/scope/resolve`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ pincode })
	}));
}
async function getPincodeAvailability(pincode) {
	return parseResponse(await fetch(`${API_BASE}/serviceability/availability/${encodeURIComponent(pincode)}`));
}
async function getPartnerDashboard(pincode, token) {
	return parseResponse(await fetch(`${API_BASE}/partner/dashboard?pincode=${encodeURIComponent(pincode)}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function listPartnerLeadBucket(token, filters) {
	const params = new URLSearchParams({ pincode: filters.pincode });
	if (filters.status) params.set("status", filters.status);
	if (filters.limit) params.set("limit", String(filters.limit));
	return parseResponse(await fetch(`${API_BASE}/partner/lead-bucket?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function listPartnerServiceLeads(token, filters) {
	const params = new URLSearchParams({ pincode: filters.pincode });
	if (filters.status) params.set("status", filters.status);
	if (filters.date) params.set("date", filters.date);
	if (filters.timeSlot && filters.timeSlot !== "All") params.set("timeSlot", filters.timeSlot);
	if (filters.limit) params.set("limit", String(filters.limit));
	return parseResponse(await fetch(`${API_BASE}/partner/service-leads?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function getPartnerLead(token, leadId) {
	return parseResponse(await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function claimPartnerLead(token, leadId) {
	return parseResponse(await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/claim`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function updatePartnerLeadStatus(token, leadId, input) {
	return parseResponse(await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/status`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function updatePartnerLeadCallStatus(token, leadId, input) {
	return parseResponse(await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/call-status`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function listPartnerActivePickups(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.pincode) params.set("pincode", filters.pincode);
	if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/partner/active-pickups${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function logoutSession(refreshToken) {
	return parseResponse(await fetch(`${API_BASE}/auth/logout`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ refreshToken })
	}));
}
async function submitPartnerOnsiteValidation(token, leadId, input) {
	const formData = new FormData();
	formData.append("result", input.result);
	formData.append("checklist", JSON.stringify(input.checklist));
	formData.append("observedIssues", JSON.stringify(input.observedIssues || []));
	if (typeof input.revisedQuote === "number") formData.append("revisedQuote", String(input.revisedQuote));
	if (input.notes) formData.append("notes", input.notes);
	input.photos.forEach((photo) => formData.append("photos", photo));
	return parseResponse(await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/onsite-validation`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData
	}));
}
async function submitPartnerPaymentProofMetadata(token, leadId, input) {
	const formData = new FormData();
	formData.append("file", input.file);
	formData.append("amountCollected", String(input.amountCollected));
	formData.append("paymentMode", input.paymentMode);
	if (input.transactionRef) formData.append("transactionRef", input.transactionRef);
	if (input.notes) formData.append("notes", input.notes);
	return parseResponse(await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/payment-proof/metadata`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData
	}));
}
async function completePartnerLead(token, leadId, input) {
	return parseResponse(await fetch(`${API_BASE}/partner/leads/${encodeURIComponent(leadId)}/completion`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function submitPartnerKycMetadata(token, input) {
	const formData = new FormData();
	formData.append("identityProof", input.identityProof);
	formData.append("file", input.file);
	return parseResponse(await fetch(`${API_BASE}/partner/kyc/metadata`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData
	}));
}
async function getPartnerKycStatus(token) {
	return parseResponse(await fetch(`${API_BASE}/partner/kyc/status`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function getPartnerCoinBalance(token) {
	return parseResponse(await fetch(`${API_BASE}/partner/coins/balance`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function listPartnerCoinLedger(token) {
	return parseResponse(await fetch(`${API_BASE}/partner/coins/ledger`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function rechargePartnerCoins(token, input) {
	return parseResponse(await fetch(`${API_BASE}/partner/coins/recharge`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function listPartnerCoinRechargeRequests(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.status) params.set("status", filters.status);
	if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/partner/coins/recharge-requests${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function listAdminPartnerCoinRechargeRequests(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.status) params.set("status", filters.status);
	if (filters.partnerId) params.set("partnerId", filters.partnerId);
	if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/partner/coins/recharge-requests/admin${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function verifyPartnerCoinRechargeRequest(token, requestId, input) {
	return parseResponse(await fetch(`${API_BASE}/partner/coins/recharge-requests/${encodeURIComponent(requestId)}/verify`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function listAdminLeads(token, filters = {}) {
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
	return parseResponse(await fetch(`${API_BASE}/admin/leads${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function listAdminLeadDispositionEvents(token, leadId, limit = 100) {
	const params = new URLSearchParams();
	params.set("limit", String(limit));
	return parseResponse(await fetch(`${API_BASE}/admin/leads/${encodeURIComponent(leadId)}/disposition-events?${params.toString()}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function getAdminOverviewMetrics(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.pincode) params.set("pincode", filters.pincode);
	if (filters.partnerId) params.set("partnerId", filters.partnerId);
	if (filters.leadType) params.set("leadType", filters.leadType);
	if (filters.fromDate) params.set("fromDate", filters.fromDate);
	if (filters.toDate) params.set("toDate", filters.toDate);
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/admin/leads/overview${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function getAdminDispositionMetrics(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.pincode) params.set("pincode", filters.pincode);
	if (filters.partnerId) params.set("partnerId", filters.partnerId);
	if (filters.leadType) params.set("leadType", filters.leadType);
	if (filters.fromDate) params.set("fromDate", filters.fromDate);
	if (filters.toDate) params.set("toDate", filters.toDate);
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/admin/leads/disposition-metrics${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function getAdminAssignmentMetrics(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.pincode) params.set("pincode", filters.pincode);
	if (filters.partnerId) params.set("partnerId", filters.partnerId);
	if (filters.leadType) params.set("leadType", filters.leadType);
	if (filters.fromDate) params.set("fromDate", filters.fromDate);
	if (filters.toDate) params.set("toDate", filters.toDate);
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/admin/leads/assignment-metrics${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function assignAdminLead(token, leadId, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/leads/${encodeURIComponent(leadId)}/assign`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function assignAdminLeadsBulk(token, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/leads/assign/bulk`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function listAdminPartnersForLeadAssignment(token, input) {
	const params = new URLSearchParams();
	params.set("pincode", input.pincode);
	if (input.search) params.set("search", input.search);
	if (typeof input.includeUnmapped === "boolean") params.set("includeUnmapped", String(input.includeUnmapped));
	if (typeof input.limit === "number") params.set("limit", String(input.limit));
	return parseResponse(await fetch(`${API_BASE}/admin/leads/partners/search?${params.toString()}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function listAdminLeadPartnerScopes(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.pincode) params.set("pincode", filters.pincode);
	if (filters.partnerId) params.set("partnerId", filters.partnerId);
	if (typeof filters.activeOnly === "boolean") params.set("activeOnly", String(filters.activeOnly));
	if (typeof filters.limit === "number") params.set("limit", String(filters.limit));
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/admin/leads/partner-scopes${qs ? `?${qs}` : ""}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function upsertAdminLeadPartnerScope(token, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/leads/partner-scopes`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function listAdminEligiblePartnersForPincode(token, pincode) {
	return parseResponse(await fetch(`${API_BASE}/admin/leads/eligible-partners?pincode=${encodeURIComponent(pincode)}`, {
		method: "GET",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function adminDevLogin(key, adminId = "admin-ops") {
	return parseResponse(await fetch(`${API_BASE}/auth/admin/dev-login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			key,
			adminId
		})
	}));
}
async function listServiceabilityPincodes(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.status) params.set("status", filters.status);
	if (filters.search) params.set("search", filters.search);
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/pincodes${qs ? `?${qs}` : ""}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function toggleServiceabilityPincode(token, pincode, enabled, reason) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/pincodes/${encodeURIComponent(pincode)}/toggle`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			enabled,
			reason
		})
	}));
}
async function validateServiceabilityPincode(token, pincode) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/validate/${encodeURIComponent(pincode)}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function createServiceabilityPincode(token, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/pincodes`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function updateServiceabilityPincode(token, pincode, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/pincodes/${encodeURIComponent(pincode)}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function deleteServiceabilityPincode(token, pincode) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/pincodes/${encodeURIComponent(pincode)}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function uploadServiceabilityExcel(token, files) {
	const formData = new FormData();
	(Array.isArray(files) ? files : [files]).forEach((file) => formData.append("files", file));
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/upload`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData
	}));
}
async function listServiceabilityUploadHistory(token) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/uploads`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function updateServiceabilityUploadStatus(token, uploadId, status) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/uploads/${encodeURIComponent(uploadId)}/status`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ status })
	}));
}
async function deleteServiceabilityUpload(token, uploadId) {
	return parseResponse(await fetch(`${API_BASE}/admin/serviceability/uploads/${encodeURIComponent(uploadId)}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
async function listKycSubmissions(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.status) params.set("status", filters.status);
	if (filters.partnerId) params.set("partnerId", filters.partnerId);
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/admin/kyc/submissions${qs ? `?${qs}` : ""}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function verifyKycSubmission(token, kycId, action, notes) {
	return parseResponse(await fetch(`${API_BASE}/admin/kyc/submissions/${encodeURIComponent(kycId)}/verification`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({
			action,
			notes
		})
	}));
}
async function uploadPricingExcel(token, files) {
	const formData = new FormData();
	(Array.isArray(files) ? files : [files]).forEach((file) => formData.append("files", file));
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/upload`, {
		method: "POST",
		headers: { Authorization: `Bearer ${token}` },
		body: formData
	}));
}
async function listPriceCatalog(token, search) {
	const query = search ? `?search=${encodeURIComponent(search)}` : "";
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/catalog${query}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function listQuoteDeductionRules(token, filters = {}) {
	const params = new URLSearchParams();
	if (filters.active !== void 0) params.set("active", String(filters.active));
	if (filters.search) params.set("search", filters.search);
	const qs = params.toString();
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/deductions${qs ? `?${qs}` : ""}`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function createQuoteDeductionRule(token, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/deductions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function updateQuoteDeductionRule(token, ruleId, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/deductions/${encodeURIComponent(ruleId)}`, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function toggleQuoteDeductionRule(token, ruleId, isActive) {
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/deductions/${encodeURIComponent(ruleId)}/toggle`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ isActive })
	}));
}
async function previewQuoteDeductions(token, input) {
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/deductions/preview`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify(input)
	}));
}
async function listPriceUploadHistory(token) {
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/uploads`, { headers: { Authorization: `Bearer ${token}` } }));
}
async function updatePriceUploadStatus(token, uploadId, status) {
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/uploads/${encodeURIComponent(uploadId)}/status`, {
		method: "PATCH",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${token}`
		},
		body: JSON.stringify({ status })
	}));
}
async function deletePriceUpload(token, uploadId) {
	return parseResponse(await fetch(`${API_BASE}/admin/pricing/uploads/${encodeURIComponent(uploadId)}`, {
		method: "DELETE",
		headers: { Authorization: `Bearer ${token}` }
	}));
}
//#endregion
export { submitPartnerOnsiteValidation as $, listAdminPartnersForLeadAssignment as A, listServiceabilityPincodes as B, getPincodeAvailability as C, listAdminLeadPartnerScopes as D, listAdminLeadDispositionEvents as E, listPartnerLeadBucket as F, previewUserQuote as G, listUserSellFlows as H, listPartnerServiceLeads as I, saveUserDeviceDetails as J, rechargePartnerCoins as K, listPriceCatalog as L, listPartnerActivePickups as M, listPartnerCoinLedger as N, listAdminLeads as O, listPartnerCoinRechargeRequests as P, submitPartnerKycMetadata as Q, listPriceUploadHistory as R, getPartnerLead as S, listAdminEligiblePartnersForPincode as T, logoutSession as U, listServiceabilityUploadHistory as V, previewQuoteDeductions as W, sendPartnerOtp as X, saveUserPickupSchedule as Y, sendUserOtp as Z, getCatalogBrands as _, claimPartnerLead as a, updatePriceUploadStatus as at, getPartnerDashboard as b, createServiceabilityPincode as c, updateServiceabilityUploadStatus as ct, deletePriceUpload as d, upsertAdminLeadPartnerScope as dt, submitPartnerPaymentProofMetadata as et, deleteServiceabilityPincode as f, validateServiceabilityPincode as ft, getAdminOverviewMetrics as g, verifyUserOtp as gt, getAdminDispositionMetrics as h, verifyPartnerOtp as ht, assignAdminLeadsBulk as i, updatePartnerLeadStatus as it, listKycSubmissions as j, listAdminPartnerCoinRechargeRequests as k, createUserQuote as l, uploadPricingExcel as lt, getAdminAssignmentMetrics as m, verifyPartnerCoinRechargeRequest as mt, adminDevLogin as n, toggleServiceabilityPincode as nt, completePartnerLead as o, updateQuoteDeductionRule as ot, deleteServiceabilityUpload as p, verifyKycSubmission as pt, resolvePartnerScope as q, assignAdminLead as r, updatePartnerLeadCallStatus as rt, createQuoteDeductionRule as s, updateServiceabilityPincode as st, ApiClientError as t, toggleQuoteDeductionRule as tt, createUserSellFlow as u, uploadServiceabilityExcel as ut, getCatalogModels as v, getUserMe as w, getPartnerKycStatus as x, getPartnerCoinBalance as y, listQuoteDeductionRules as z };
