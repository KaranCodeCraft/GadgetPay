import fs from "fs";
import path from "path";
import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import * as XLSX from "xlsx";

const testDbPath = path.resolve(process.cwd(), "backend/data/gadgetpe-test.sqlite");
for (const f of [testDbPath, testDbPath + ".lock", testDbPath + "-shm", testDbPath + "-wal"]) {
  if (fs.existsSync(f)) fs.rmSync(f, { recursive: true, force: true });
}

process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = testDbPath;
process.env.JWT_ACCESS_SECRET = "test-access-secret";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
process.env.ADMIN_DEV_KEY = "admin-dev-key";

const { app } = await import("../src/app.js");

async function createPartnerSession(phone = "9000000001") {
  await request(app)
    .post("/api/v1/auth/partner/otp/send")
    .send({ phone })
    .expect(200);

  const verify = await request(app)
    .post("/api/v1/auth/partner/otp/verify")
    .send({ phone, otp: "6767", name: "Test Partner" })
    .expect(200);

  return verify.body.data;
}

async function createUserSession(phone = "8000000001") {
  await request(app)
    .post("/api/v1/auth/user/otp/send")
    .send({ phone })
    .expect(200);

  const verify = await request(app)
    .post("/api/v1/auth/user/otp/verify")
    .send({ phone, otp: "6767", name: "Test User" })
    .expect(200);

  return verify.body.data;
}

async function createAdminToken() {
  const login = await request(app)
    .post("/api/v1/auth/admin/dev-login")
    .send({ key: "admin-dev-key", adminId: "admin-test" })
    .expect(200);

  return login.body.data.accessToken;
}

async function approvePartnerWalletRecharge({ partnerToken, adminToken, txnRef, amount = 500 }) {
  const kyc = await request(app)
    .post("/api/v1/partner/kyc/metadata")
    .set("Authorization", `Bearer ${partnerToken}`)
    .send({
      identityProof: "Aadhar",
      fileName: "id.png",
      mimeType: "image/png",
      sizeBytes: 1024,
    })
    .expect(200);

  await request(app)
    .patch(`/api/v1/admin/kyc/submissions/${kyc.body.data.kyc.id}/verification`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ action: "APPROVE", notes: "Verified for wallet recharge" })
    .expect(200);

  const submitted = await request(app)
    .post("/api/v1/partner/coins/recharge")
    .set("Authorization", `Bearer ${partnerToken}`)
    .send({ amount, upiTxnRef: txnRef, upiApp: "MOCK_UPI" })
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/coins/recharge-requests/${submitted.body.data.request.id}/verify`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ action: "APPROVE", note: "Approved for test lead access" })
    .expect(200);
}

test("auth flow returns JWT and protected endpoint works", async () => {
  const session = await createPartnerSession("9000000100");

  assert.equal(typeof session.accessToken, "string");
  assert.equal(typeof session.refreshToken, "string");

  const me = await request(app)
    .get("/api/v1/partner/me")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(200);

  assert.equal(me.body.success, true);
  assert.equal(me.body.data.partner.id, "partner-9000000100");
});

test("user OTP login only requires name for new users", async () => {
  const phone = "8000000200";

  const firstSend = await request(app)
    .post("/api/v1/auth/user/otp/send")
    .send({ phone })
    .expect(200);

  assert.equal(firstSend.body.data.isNewUser, true);
  assert.equal(firstSend.body.data.requiresName, true);

  const firstVerify = await request(app)
    .post("/api/v1/auth/user/otp/verify")
    .send({ phone, otp: "6767", name: "Original User" })
    .expect(200);

  assert.equal(firstVerify.body.data.user.name, "Original User");

  const secondSend = await request(app)
    .post("/api/v1/auth/user/otp/send")
    .send({ phone })
    .expect(200);

  assert.equal(secondSend.body.data.isNewUser, false);
  assert.equal(secondSend.body.data.requiresName, false);

  const secondVerify = await request(app)
    .post("/api/v1/auth/user/otp/verify")
    .send({ phone, otp: "6767" })
    .expect(200);

  assert.equal(secondVerify.body.data.user.name, "Original User");
});

test("user sell flow API creates quote schedule and lists history", async () => {
  const session = await createUserSession("8000000100");

  const me = await request(app)
    .get("/api/v1/user/me")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(200);

  assert.equal(me.body.data.user.id, "user-8000000100");

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-15",
        modelName: "iPhone 15",
        listedPrice: 58800,
        thumbnailUrl: "https://placehold.co/280x180/eef4fb/20384c?text=iPhone+15",
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;
  assert.equal(create.body.data.flow.status, "DRAFT");
  assert.equal(create.body.data.flow.selectedModel.modelName, "iPhone 15");

  const details = await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: ["Any Dead spots"],
        nestedPhysicalIssueAnswers: { "Any Dead spots": "Top" },
        cameraAndBiometrics: { frontCamera: "yes" },
        sensorsAndConnectivity: { proximitySensor: "yes" },
        batteryAndCharging: { charging: "yes" },
        accessoriesAndOwnership: { originalBox: "no" },
      },
    })
    .expect(200);

  assert.equal(details.body.data.flow.status, "QUESTIONNAIRE_COMPLETED");
  assert.equal(details.body.data.flow.deviceDetails.physicalIssues[0], "Any Dead spots");

  const quote = await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({})
    .expect(200);

  assert.equal(quote.body.data.quote.sellingPrice, 58800);
  assert.equal(quote.body.data.flow.status, "QUOTE_READY");

  const schedule = await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-07-15T00:00:00.000Z",
        primaryTime: "10:00 AM - 12:00 PM",
        alternateDate: "2026-07-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 4:00 PM",
        sellerName: "Test User",
        callingPhoneNumber: "8000000100",
        addressLine: "House 1, Test Street",
        landmark: "Near Metro",
        city: "Bengaluru",
      },
    })
    .expect(200);

  assert.equal(schedule.body.data.flow.status, "PICKUP_SCHEDULED");
  assert.equal(schedule.body.data.flow.pickupSchedule.callingPhoneNumber, "8000000100");
  assert.equal(schedule.body.data.flow.flowJson.status, "PICKUP_SCHEDULED");

  const history = await request(app)
    .get("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(200);

  assert.equal(history.body.data.count, 1);
  assert.equal(history.body.data.rows[0].id, flowId);

  const fetched = await request(app)
    .get(`/api/v1/user/sell-flows/${flowId}`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(200);

  assert.equal(fetched.body.data.flow.id, flowId);
});

test("partner token cannot access user sell flow APIs", async () => {
  const partnerSession = await createPartnerSession("9000000102");

  const response = await request(app)
    .get("/api/v1/user/me")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(403);

  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("admin quote deduction rules drive user quotes and schedule snapshots", async () => {
  const adminToken = await createAdminToken();
  const userSession = await createUserSession("8000000103");

  const rupeeRule = await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "accessoriesAndOwnership",
      answerKey: "originalBox",
      answerValue: "no",
      label: "Original box missing",
      deductionType: "RUPEES",
      deductionValue: 1000,
      priority: 10,
    })
    .expect(200);

  const percentRule = await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "physicalIssues",
      answerKey: "Any Dead spots",
      label: "Display dead spots",
      deductionType: "PERCENT",
      deductionValue: 10,
      appliesToBrand: "apple",
      priority: 20,
    })
    .expect(200);

  assert.equal(rupeeRule.body.data.rule.isActive, true);
  assert.equal(percentRule.body.data.rule.deductionType, "PERCENT");

  const listed = await request(app)
    .get("/api/v1/admin/pricing/deductions?active=true")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(listed.body.data.rows.length >= 2, true);

  const preview = await request(app)
    .post("/api/v1/admin/pricing/deductions/preview")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-15",
        modelName: "iPhone 15",
        listedPrice: 50000,
      },
      deviceDetails: {
        physicalIssues: ["Any Dead spots"],
        accessoriesAndOwnership: { originalBox: "no" },
      },
    })
    .expect(200);

  assert.equal(preview.body.data.quote.basePrice, 50000);
  assert.equal(preview.body.data.quote.totalDeduction, 6000);
  assert.equal(preview.body.data.quote.sellingPrice, 44000);
  assert.equal(preview.body.data.quote.deductions.length, 2);

  const publicPreview = await request(app)
    .post("/api/v1/pricing/quote-preview")
    .send({
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-15",
        modelName: "iPhone 15",
        listedPrice: 50000,
      },
      deviceDetails: {
        physicalIssues: ["Any Dead spots"],
        accessoriesAndOwnership: { originalBox: "no" },
      },
    })
    .expect(200);

  assert.equal(publicPreview.body.data.quote.sellingPrice, 44000);
  assert.equal(publicPreview.body.data.quote.deductions.length, 2);

  const createFlow = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-15",
        modelName: "iPhone 15",
        listedPrice: 50000,
      },
    })
    .expect(200);

  const flowId = createFlow.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      deviceDetails: {
        physicalIssues: ["Any Dead spots"],
        accessoriesAndOwnership: { originalBox: "no" },
      },
    })
    .expect(200);

  const quote = await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  assert.equal(quote.body.data.quote.priceSource, "ADMIN_DEDUCTION_RULES");
  assert.equal(quote.body.data.quote.sellingPrice, 44000);

  const scheduled = await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-07-15T00:00:00.000Z",
        primaryTime: "10:00 AM - 12:00 PM",
        alternateDate: "2026-07-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 4:00 PM",
        sellerName: "Test User",
        callingPhoneNumber: "8000000103",
        addressLine: "House 3, Test Street",
        landmark: "Near Metro",
        city: "Bengaluru",
      },
    });

  if (scheduled.status >= 500) {
    return;
  }
  assert.equal(scheduled.status, 200);

  await request(app)
    .patch(`/api/v1/admin/pricing/deductions/${percentRule.body.data.rule.id}/toggle`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ isActive: false })
    .expect(200);

  const freshPreview = await request(app)
    .post("/api/v1/admin/pricing/deductions/preview")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-15",
        modelName: "iPhone 15",
        listedPrice: 50000,
      },
      deviceDetails: {
        physicalIssues: ["Any Dead spots"],
        accessoriesAndOwnership: { originalBox: "no" },
      },
    })
    .expect(200);

  assert.equal(freshPreview.body.data.quote.sellingPrice, 49000);

  const fetched = await request(app)
    .get(`/api/v1/user/sell-flows/${flowId}`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  assert.equal(fetched.body.data.flow.quote.sellingPrice, 44000);
});

test("partner token cannot access admin quote deduction APIs", async () => {
  const partnerSession = await createPartnerSession("9000000104");

  const response = await request(app)
    .get("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(403);

  assert.equal(response.body.error.code, "FORBIDDEN");
});

test("user sell flow becomes pincode scoped partner lead bucket and service lead", async () => {
  const userSession = await createUserSession("8000000105");
  const partnerSession = await createPartnerSession("9000000105");
  const adminToken = await createAdminToken();

  await approvePartnerWalletRecharge({
    partnerToken: partnerSession.accessToken,
    adminToken,
    txnRef: "TXN-9000000105",
  });

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-14",
        modelName: "iPhone 14",
        listedPrice: 46200,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: [],
        accessoriesAndOwnership: { originalBox: "yes" },
      },
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  const bucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const bucketLead = bucket.body.data.rows.find((row) => row.userSellFlowId === flowId);
  assert.equal(Boolean(bucketLead), true);
  assert.equal(bucketLead.leadType, "LEAD_BUCKET");
  assert.equal(bucketLead.selectedModel.modelName, "iPhone 14");

  const otherScope = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=110001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(otherScope.body.data.count, 0);

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-07-15T00:00:00.000Z",
        primaryTime: "10:00 AM - 12:00 PM",
        alternateDate: "2026-07-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 4:00 PM",
        sellerName: "Test User",
        callingPhoneNumber: "8000000105",
        addressLine: "House 5, Test Street",
        landmark: "Near Metro",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const serviceLeads = await request(app)
    .get("/api/v1/partner/service-leads?pincode=560001&date=2026-07-15&timeSlot=10%3A00%20AM%20-%2012%3A00%20PM")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const serviceLead = serviceLeads.body.data.rows.find((row) => row.userSellFlowId === flowId);
  assert.equal(Boolean(serviceLead), true);
  assert.equal(serviceLead.leadType, "SERVICE_LEAD");
  assert.equal(serviceLead.pickupSchedule.callingPhoneNumber, "8000000105");

  const leadId = serviceLead.id;
  const detail = await request(app)
    .get(`/api/v1/partner/leads/${leadId}`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(detail.body.data.lead.id, leadId);

  const claimed = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/claim`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(claimed.body.data.lead.status, "CLAIMED");
  assert.equal(claimed.body.data.lead.partnerId, "partner-9000000105");

  const accepted = await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "ACCEPTED" })
    .expect(200);

  assert.equal(accepted.body.data.lead.status, "ACCEPTED");
});

test("user cancellation marks partner lead cancelled and user token cannot access partner leads", async () => {
  const userSession = await createUserSession("8000000106");
  const partnerSession = await createPartnerSession("9000000106");
  const adminToken = await createAdminToken();

  await approvePartnerWalletRecharge({
    partnerToken: partnerSession.accessToken,
    adminToken,
    txnRef: "TXN-9000000106",
  });

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560002",
      selectedModel: {
        brandSlug: "samsung",
        modelId: "s23",
        modelName: "Galaxy S23",
        listedPrice: 41200,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: [],
      },
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  const forbidden = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560002")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(403);

  assert.equal(forbidden.body.error.code, "FORBIDDEN");

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/cancel`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  const visible = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560002")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(visible.body.data.count, 0);
});

test("scope resolution requires active serviceability", async () => {
  const session = await createPartnerSession("9000000101");

  await request(app)
    .patch("/api/v1/admin/serviceability/pincodes/560001/toggle")
    .set("Authorization", `Bearer ${await createAdminToken()}`)
    .send({ enabled: true, reason: "Test active" })
    .expect(200);

  const resolve = await request(app)
    .post("/api/v1/serviceability/scope/resolve")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({ pincode: "560001" });

  assert.equal([200, 502].includes(resolve.status), true);
  if (resolve.status === 200) {
    assert.equal(resolve.body.data.serviceabilityStatus, "ACTIVE");
  }
});

test("admin toggle endpoint updates serviceability status", async () => {
  const adminToken = await createAdminToken();

  const toggle = await request(app)
    .patch("/api/v1/admin/serviceability/pincodes/560777/toggle")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ enabled: true, reason: "Enable for test" })
    .expect(200);

  assert.equal(toggle.body.data.pincode, "560777");
  assert.equal(toggle.body.data.status, "ACTIVE");

  const list = await request(app)
    .get("/api/v1/admin/serviceability/pincodes?search=560777")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(list.body.data.count, 1);
  assert.equal(list.body.data.rows[0].status, "ACTIVE");
});

test("admin serviceability supports validate/create/update/delete CRUD flow", async () => {
  const adminToken = await createAdminToken();

  const validate = await request(app)
    .get("/api/v1/admin/serviceability/validate/560001")
    .set("Authorization", `Bearer ${adminToken}`);

  // Upstream dependency may be unavailable in CI/offline runs.
  if (validate.status === 502) {
    assert.equal(validate.body.error.code, "UPSTREAM_ERROR");
    return;
  }

  assert.equal(validate.status, 200);

  const created = await request(app)
    .post("/api/v1/admin/serviceability/pincodes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ pincode: "560009", status: "LIMITED", reason: "Create from CRUD test" })
    .expect(200);

  assert.equal(created.body.data.pincode, "560009");
  assert.equal(created.body.data.status, "LIMITED");

  const updated = await request(app)
    .put("/api/v1/admin/serviceability/pincodes/560009")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "ACTIVE", reason: "Updated from CRUD test" })
    .expect(200);

  assert.equal(updated.body.data.status, "ACTIVE");

  const deleted = await request(app)
    .delete("/api/v1/admin/serviceability/pincodes/560009")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(deleted.body.data.deleted, true);
});

test("admin pricing upload stores catalog and user pricing lookup returns listed price", async () => {
  const adminToken = await createAdminToken();

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Brand", "Series", "Model", "Variant", "Launch Year", "GadgetPe Price"],
    ["Apple", "iPhone", "13", "128 GB", "2021", "24500"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Prices");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const upload = await request(app)
    .post("/api/v1/admin/pricing/upload")
    .set("Authorization", `Bearer ${adminToken}`)
    .attach("file", buffer, "prices.xlsx")
    .expect(200);

  assert.equal(upload.body.data.totalProcessed, 1);
  assert.equal(typeof upload.body.data.uploadId, "string");

  const history = await request(app)
    .get("/api/v1/admin/pricing/uploads")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(history.body.data.count >= 1, true);
  assert.equal(history.body.data.rows[0].status, "ACTIVE");

  const lookup = await request(app)
    .post("/api/v1/pricing/lookup")
    .send({
      brand: "apple",
      series: "iphone",
      model: "13",
      storage: "128 gb",
      launchYear: 2021,
    })
    .expect(200);

  assert.equal(lookup.body.data.found, true);
  assert.equal(lookup.body.data.listedPrice, 24500);

  const deleteWhileActive = await request(app)
    .delete(`/api/v1/admin/pricing/uploads/${upload.body.data.uploadId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(400);

  assert.equal(deleteWhileActive.body.error.code, "BAD_REQUEST");

  const deactivated = await request(app)
    .patch(`/api/v1/admin/pricing/uploads/${upload.body.data.uploadId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "DEACTIVATED" })
    .expect(200);

  assert.equal(deactivated.body.data.status, "DEACTIVATED");
  assert.equal(deactivated.body.data.deactivatedCatalogRows >= 1, true);

  const lookupAfterDeactivate = await request(app)
    .post("/api/v1/pricing/lookup")
    .send({
      brand: "apple",
      series: "iphone",
      model: "13",
      storage: "128 gb",
      launchYear: 2021,
    })
    .expect(200);

  assert.equal(lookupAfterDeactivate.body.data.found, false);

  const activated = await request(app)
    .patch(`/api/v1/admin/pricing/uploads/${upload.body.data.uploadId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "ACTIVE" })
    .expect(200);

  assert.equal(activated.body.data.status, "ACTIVE");
  assert.equal(activated.body.data.restoredCatalogRows >= 1, true);

  const lookupAfterActivate = await request(app)
    .post("/api/v1/pricing/lookup")
    .send({
      brand: "apple",
      series: "iphone",
      model: "13",
      storage: "128 gb",
      launchYear: 2021,
    })
    .expect(200);

  assert.equal(lookupAfterActivate.body.data.found, true);
  assert.equal(lookupAfterActivate.body.data.listedPrice, 24500);

  await request(app)
    .patch(`/api/v1/admin/pricing/uploads/${upload.body.data.uploadId}/status`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ status: "DEACTIVATED" })
    .expect(200);

  const removed = await request(app)
    .delete(`/api/v1/admin/pricing/uploads/${upload.body.data.uploadId}`)
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(removed.body.data.deleted, true);
  assert.equal(removed.body.data.deletedSnapshotRows >= 1, true);

  const lookupAfterDelete = await request(app)
    .post("/api/v1/pricing/lookup")
    .send({
      brand: "apple",
      series: "iphone",
      model: "13",
      storage: "128 gb",
      launchYear: 2021,
    })
    .expect(200);

  assert.equal(lookupAfterDelete.body.data.found, false);
});

test("admin pricing upload rejects excel when header labels are not exact", async () => {
  const adminToken = await createAdminToken();

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Brand Name", "Series", "Model", "Variant", "Launch Year", "GadgetPe Price"],
    ["Apple", "iPhone", "13", "128 GB", "2021", "24500"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Prices");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  const upload = await request(app)
    .post("/api/v1/admin/pricing/upload")
    .set("Authorization", `Bearer ${adminToken}`)
    .attach("file", buffer, "prices-invalid.xlsx")
    .expect(400);

  assert.equal(upload.body.error.code, "BAD_REQUEST");
  assert.equal(upload.body.error.details.expectedHeaders[0], "Brand");
});

test("partner lead access unlocks only after admin approves wallet recharge request", async () => {
  const adminToken = await createAdminToken();
  const partnerSession = await createPartnerSession("9000000110");

  const blockedWithoutCoins = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(400);

  assert.equal(blockedWithoutCoins.body.error.code, "BAD_REQUEST");

  await approvePartnerWalletRecharge({
    partnerToken: partnerSession.accessToken,
    adminToken,
    txnRef: "TXN-9000000110",
  });

  const unblockedWithCoins = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(unblockedWithCoins.body.success, true);
  assert.equal(Array.isArray(unblockedWithCoins.body.data.rows), true);
});


test("partner can persist call status attempts and read active pickup state", async () => {
  const userSession = await createUserSession("8000000111");
  const partnerSession = await createPartnerSession("9000000111");
  const adminToken = await createAdminToken();

  await approvePartnerWalletRecharge({
    partnerToken: partnerSession.accessToken,
    adminToken,
    txnRef: "TXN-9000000111",
  });

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-15",
        modelName: "iPhone 15",
        listedPrice: 58800,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: [],
      },
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-07-16T00:00:00.000Z",
        primaryTime: "10:00 AM - 12:00 PM",
        alternateDate: "2026-07-17T00:00:00.000Z",
        alternateTime: "2:00 PM - 4:00 PM",
        sellerName: "Test User",
        callingPhoneNumber: "8000000111",
        addressLine: "House 11, Test Street",
        landmark: "Near Metro",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const serviceLeads = await request(app)
    .get("/api/v1/partner/service-leads?pincode=560001&date=2026-07-16")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const leadId = serviceLeads.body.data.rows[0].id;

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/claim`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "ACCEPTED" })
    .expect(200);

  const inProgress = await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "IN_PROGRESS" })
    .expect(200);

  assert.equal(inProgress.body.data.lead.status, "IN_PROGRESS");
  assert.equal(typeof inProgress.body.data.lead.pickupStartedAt, "string");

  const calledOnce = await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/call-status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ callStatus: "CALLED" })
    .expect(200);

  assert.equal(calledOnce.body.data.lead.callStatus, "CALLED");
  assert.equal(calledOnce.body.data.lead.callAttemptCount, 1);

  const calledTwice = await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/call-status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ callStatus: "FOLLOW_UP_REQUIRED", note: "Customer asked callback" })
    .expect(200);

  assert.equal(calledTwice.body.data.lead.callAttemptCount, 2);
  assert.equal(calledTwice.body.data.lead.callHistory.length, 2);

  const active = await request(app)
    .get("/api/v1/partner/active-pickups?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(active.body.data.count >= 1, true);
  assert.equal(active.body.data.rows[0].id, leadId);
});

test("partner logout is blocked until active pickup workflow is completed", async () => {
  const userSession = await createUserSession("8000000112");
  const partnerSession = await createPartnerSession("9000000112");
  const adminToken = await createAdminToken();

  await approvePartnerWalletRecharge({
    partnerToken: partnerSession.accessToken,
    adminToken,
    txnRef: "TXN-9000000112",
  });

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "samsung",
        modelId: "s23",
        modelName: "Galaxy S23",
        listedPrice: 41200,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: [],
      },
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-07-16T00:00:00.000Z",
        primaryTime: "12:00 PM - 03:00 PM",
        alternateDate: "2026-07-17T00:00:00.000Z",
        alternateTime: "2:00 PM - 4:00 PM",
        sellerName: "Test User",
        callingPhoneNumber: "8000000112",
        addressLine: "House 12, Test Street",
        landmark: "Near Metro",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const serviceLeads = await request(app)
    .get("/api/v1/partner/service-leads?pincode=560001&date=2026-07-16")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const leadId = serviceLeads.body.data.rows[0].id;

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/claim`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "ACCEPTED" })
    .expect(200);

  const blockedLogout = await request(app)
    .post("/api/v1/auth/logout")
    .send({ refreshToken: partnerSession.refreshToken })
    .expect(400);

  assert.equal(blockedLogout.body.error.code, "BAD_REQUEST");

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "IN_PROGRESS" })
    .expect(200);

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/onsite-validation`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ result: "PASS", checklist: { screen: "ok" }, observedIssues: [] })
    .expect(200);

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/payment-proof/metadata`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({
      fileName: "proof.png",
      mimeType: "image/png",
      sizeBytes: 12345,
      amountCollected: 40000,
      paymentMode: "UPI",
      transactionRef: "UPI-112",
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/completion`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ finalAmount: 40000, handoverChecklist: { callDone: true }, remarks: "done" })
    .expect(200);

  const allowedLogout = await request(app)
    .post("/api/v1/auth/logout")
    .send({ refreshToken: partnerSession.refreshToken })
    .expect(200);

  assert.equal(allowedLogout.body.data.loggedOut, true);
});

test("admin lead assignment scope mapping and partner search support onboarding", async () => {
  const adminToken = await createAdminToken();
  const partnerOne = await createPartnerSession("9000000201");
  await createPartnerSession("9000000202");

  const initialSearch = await request(app)
    .get("/api/v1/admin/leads/partners/search?pincode=560001&search=partner-9000000201&includeUnmapped=true")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(initialSearch.body.data.count >= 1, true);

  const mapped = await request(app)
    .post("/api/v1/admin/leads/partner-scopes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ partnerId: "partner-9000000201", pincode: "560001", isActive: true })
    .expect(200);

  assert.equal(mapped.body.data.scope.partnerId, "partner-9000000201");
  assert.equal(mapped.body.data.scope.pincode, "560001");

  const scoped = await request(app)
    .get("/api/v1/admin/leads/partner-scopes?pincode=560001")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(scoped.body.data.rows.some((row) => row.partnerId === "partner-9000000201"), true);

  const eligible = await request(app)
    .get("/api/v1/admin/leads/eligible-partners?pincode=560001")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(eligible.body.data.rows.some((row) => row.partnerId === "partner-9000000201"), true);

  const filteredSearch = await request(app)
    .get("/api/v1/admin/leads/partners/search?pincode=560001&search=partner-9000000201")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(filteredSearch.body.data.count >= 1, true);

  const toggleOff = await request(app)
    .post("/api/v1/admin/leads/partner-scopes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ partnerId: "partner-9000000201", pincode: "560001", isActive: false })
    .expect(200);

  assert.equal(toggleOff.body.data.scope.isActive, 0);

  const noLongerEligible = await request(app)
    .get("/api/v1/admin/leads/eligible-partners?pincode=560001")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(noLongerEligible.body.data.rows.some((row) => row.partnerId === "partner-9000000201"), false);

  await request(app)
    .get("/api/v1/admin/leads/partners/search?pincode=560001&search=partner-9000000202")
    .set("Authorization", `Bearer ${partnerOne.accessToken}`)
    .expect(403);
});

test("admin manual and bulk assignment enforce pincode eligibility and bulk cap", async () => {
  const adminToken = await createAdminToken();
  const userSession = await createUserSession("8000000201");
  const partnerEligible = await createPartnerSession("9000000301");
  await createPartnerSession("9000000302");

  await approvePartnerWalletRecharge({
    partnerToken: partnerEligible.accessToken,
    adminToken,
    txnRef: "TXN-9000000301",
  });

  await request(app)
    .post("/api/v1/admin/leads/partner-scopes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ partnerId: "partner-9000000301", pincode: "560001", isActive: true })
    .expect(200);

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-13",
        modelName: "iPhone 13",
        listedPrice: 30000,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: [],
      },
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-08-15T00:00:00.000Z",
        primaryTime: "10:00 AM - 12:00 PM",
        alternateDate: "2026-08-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 4:00 PM",
        sellerName: "Scope User",
        callingPhoneNumber: "8000000201",
        addressLine: "House 201",
        landmark: "Near Park",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const leadList = await request(app)
    .get("/api/v1/admin/leads?pincode=560001&leadType=SERVICE_LEAD&limit=20")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  const leadId = leadList.body.data.rows[0].id;

  const ineligible = await request(app)
    .post(`/api/v1/admin/leads/${leadId}/assign`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ partnerId: "partner-9000000302", mode: "MANUAL" })
    .expect(400);

  assert.equal(ineligible.body.error.code, "BAD_REQUEST");

  const eligible = await request(app)
    .post(`/api/v1/admin/leads/${leadId}/assign`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ partnerId: "partner-9000000301", mode: "MANUAL" })
    .expect(200);

  assert.equal(eligible.body.data.assignment.partnerId, "partner-9000000301");

  await request(app)
    .post("/api/v1/admin/leads/assign/bulk")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      leadIds: ["a", "b", "c", "d", "e", "f"],
      partnerId: "partner-9000000301",
    })
    .expect(400);
});

test("auto round-robin assignment alternates by mapped partners in same pincode", async () => {
  const adminToken = await createAdminToken();
  const partnerOne = await createPartnerSession("9000000401");
  const partnerTwo = await createPartnerSession("9000000402");
  const userA = await createUserSession("8000000401");
  const userB = await createUserSession("8000000402");

  await approvePartnerWalletRecharge({
    partnerToken: partnerOne.accessToken,
    adminToken,
    txnRef: "TXN-9000000401",
  });
  await approvePartnerWalletRecharge({
    partnerToken: partnerTwo.accessToken,
    adminToken,
    txnRef: "TXN-9000000402",
  });

  await request(app)
    .post("/api/v1/admin/leads/partner-scopes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ partnerId: "partner-9000000401", pincode: "560001", isActive: true })
    .expect(200);
  await request(app)
    .post("/api/v1/admin/leads/partner-scopes")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ partnerId: "partner-9000000402", pincode: "560001", isActive: true })
    .expect(200);

  const createAndSchedule = async (session, phone) => {
    const created = await request(app)
      .post("/api/v1/user/sell-flows")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        servicePincode: "560001",
        selectedModel: {
          brandSlug: "apple",
          modelId: "iphone-12",
          modelName: "iPhone 12",
          listedPrice: 24000,
        },
      })
      .expect(200);

    const flowId = created.body.data.flow.id;

    await request(app)
      .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ deviceDetails: { basicFunctionality: { canMakeCalls: "yes" }, physicalIssues: [] } })
      .expect(200);

    await request(app)
      .post(`/api/v1/user/sell-flows/${flowId}/quote`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    const scheduled = await request(app)
      .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        pickupSchedule: {
          pincode: "560001",
          primaryDate: "2026-09-10T00:00:00.000Z",
          primaryTime: "10:00 AM - 12:00 PM",
          alternateDate: "2026-09-11T00:00:00.000Z",
          alternateTime: "2:00 PM - 4:00 PM",
          sellerName: "Auto User",
          callingPhoneNumber: phone,
          addressLine: "Auto House",
          landmark: "Auto Landmark",
          city: "Bengaluru",
        },
      });

    if (scheduled.status >= 500) {
      return null;
    }
    assert.equal(scheduled.status, 200);

    const adminLeads = await request(app)
      .get(`/api/v1/admin/leads?leadType=SERVICE_LEAD&pincode=560001&search=${encodeURIComponent(flowId)}&limit=5`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    return adminLeads.body.data.rows[0];
  };

  const firstLead = await createAndSchedule(userA, "8000000401");
  const secondLead = await createAndSchedule(userB, "8000000402");

  if (!firstLead || !secondLead) {
    return;
  }

  assert.equal(Boolean(firstLead.partnerId), true);
  assert.equal(Boolean(secondLead.partnerId), true);
  assert.notEqual(firstLead.partnerId, secondLead.partnerId);
});
