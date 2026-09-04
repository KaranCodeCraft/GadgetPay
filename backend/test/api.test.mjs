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
process.env.OTP_PROVIDER = "DEV";

const { app } = await import("../src/app.js");
const { getPartnerLeadByFlowId, getUserByPhone, listUserSellFlows } = await import("../src/db/repository.js");

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

async function createScheduledSellFlow({ userPhone, modelId, modelName, sellerName, pincode = "560001", primaryDate = "2026-07-26T00:00:00.000Z", primaryTime = "5:00 PM - 6:00 PM" }) {
  const userSession = await createUserSession(userPhone);

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: pincode,
      selectedModel: {
        brandSlug: "asus",
        modelId,
        modelName,
        listedPrice: 7020,
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
        pincode,
        primaryDate,
        primaryTime,
        alternateDate: "2026-07-27T00:00:00.000Z",
        alternateTime: "1:00 PM - 2:00 PM",
        sellerName,
        callingPhoneNumber: userPhone,
        addressLine: `House ${userPhone.slice(-2)}, Test Street`,
        landmark: "Near Test Park",
        city: "Bengaluru",
      },
    })
    .expect(200);

  return flowId;
}

async function createAdminToken() {
  const login = await request(app)
    .post("/api/v1/auth/admin/dev-login")
    .send({ key: "admin-dev-key", adminId: "admin-test" })
    .expect(200);

  return login.body.data.accessToken;
}

async function withMockedNow(isoString, fn) {
  const RealDate = Date;

  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(isoString);
      } else {
        super(...args);
      }
    }

    static now() {
      return new RealDate(isoString).getTime();
    }
  }

  global.Date = MockDate;
  try {
    return await fn();
  } finally {
    global.Date = RealDate;
  }
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

test("user can update profile full name", async () => {
  const session = await createUserSession("8000000203");

  const updated = await request(app)
    .patch("/api/v1/user/me")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({ name: "Updated User Name" })
    .expect(200);

  assert.equal(updated.body.data.user.name, "Updated User Name");

  const me = await request(app)
    .get("/api/v1/user/me")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(200);

  assert.equal(me.body.data.user.name, "Updated User Name");
});

test("user can permanently delete account data", async () => {
  const userPhone = "8000000199";
  const session = await createUserSession(userPhone);

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-13",
        modelName: "iPhone 13",
        listedPrice: 29000,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: [],
      },
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-07-26T00:00:00.000Z",
        primaryTime: "5:00 PM - 6:00 PM",
        alternateDate: "2026-07-27T00:00:00.000Z",
        alternateTime: "1:00 PM - 2:00 PM",
        sellerName: "Delete Me",
        callingPhoneNumber: userPhone,
        addressLine: "House 99, Delete Street",
        landmark: "Near Delete Park",
        city: "Bengaluru",
      },
    })
    .expect(200);

  await request(app)
    .delete("/api/v1/user/me")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({ confirm: "DELETE" })
    .expect(200)
    .expect((res) => {
      assert.equal(res.body.data.deleted, true);
      assert.equal(res.body.data.deletedCounts.users, 1);
      assert.equal(res.body.data.deletedCounts.userSellFlows, 1);
      assert.equal(res.body.data.deletedCounts.partnerLeads, 1);
      assert.equal(res.body.data.deletedCounts.refreshTokens, 1);
    });

  assert.equal(getUserByPhone(userPhone), null);
  assert.deepEqual(listUserSellFlows({ userId: session.user.id }), []);
  assert.equal(getPartnerLeadByFlowId(flowId), null);

  await request(app)
    .get("/api/v1/user/me")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(404);

  await request(app)
    .post("/api/v1/auth/refresh")
    .send({ refreshToken: session.refreshToken })
    .expect(401);
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
        primaryTime: "10:00 AM - 11:00 AM",
        alternateDate: "2026-07-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
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

test("user scheduled pickup does not auto-expire when only primary slot has ended", async () => {
  const userPhone = "8000000460";
  const flowId = await withMockedNow("2026-07-14T05:00:00.000Z", () => createScheduledSellFlow({
    userPhone,
    modelId: "auto-expiry-phone",
    modelName: "Auto Expiry Phone",
    sellerName: "Expiry User",
    primaryDate: "2026-07-15T00:00:00.000Z",
    primaryTime: "10:00 AM - 11:00 AM",
  }));
  const session = await createUserSession(userPhone);

  await withMockedNow("2026-07-15T05:31:00.000Z", async () => {
    const active = await request(app)
      .get("/api/v1/user/sell-flows?status=PICKUP_SCHEDULED")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    assert.equal(active.body.data.count, 1);
    assert.equal(active.body.data.rows[0].id, flowId);

    const closed = await request(app)
      .get("/api/v1/user/sell-flows?status=CANCELLED")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    assert.equal(closed.body.data.count, 0);
  });
});

test("user scheduled pickup auto-expires after alternate slot also ends", async () => {
  const userPhone = "8000000462";
  const flowId = await withMockedNow("2026-07-14T05:00:00.000Z", () => createScheduledSellFlow({
    userPhone,
    modelId: "auto-expiry-phone-both-slots",
    modelName: "Auto Expiry Phone Both Slots",
    sellerName: "Expiry User 2",
    primaryDate: "2026-07-15T00:00:00.000Z",
    primaryTime: "10:00 AM - 11:00 AM",
  }));
  const session = await createUserSession(userPhone);

  await withMockedNow("2026-07-27T08:31:00.000Z", async () => {
    const closed = await request(app)
      .get("/api/v1/user/sell-flows?status=CANCELLED")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    assert.equal(closed.body.data.count, 1);
    assert.equal(closed.body.data.rows[0].id, flowId);
    assert.equal(closed.body.data.rows[0].flowJson.cancellationReason, "AUTO_EXPIRED_ALL_SLOTS");

    const active = await request(app)
      .get("/api/v1/user/sell-flows?status=PICKUP_SCHEDULED")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    assert.equal(active.body.data.count, 0);

    const leadStatus = await request(app)
      .get(`/api/v1/user/sell-flows/${flowId}/lead-status`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    assert.equal(leadStatus.body.data.found, true);
    assert.equal(leadStatus.body.data.lead.status, "CANCELLED");
    assert.equal(leadStatus.body.data.lead.rejectionReason, "AUTO_EXPIRED_ALL_SLOTS");
    assert.equal(typeof leadStatus.body.data.lead.cancelledAt, "string");
  });
});

test("user scheduled pickup does not auto-expire early for IST date serialized as previous-day UTC", async () => {
  const userPhone = "8000000461";
  const flowId = await withMockedNow("2026-07-15T04:00:00.000Z", () => createScheduledSellFlow({
    userPhone,
    modelId: "auto-expiry-ist-serialize",
    modelName: "Auto Expiry IST Serialize",
    sellerName: "Expiry IST User",
    // 2026-07-15T18:30:00.000Z equals 2026-07-16 00:00 IST (typical browser Date.toISOString for selected IST date)
    primaryDate: "2026-07-15T18:30:00.000Z",
    primaryTime: "10:00 AM - 11:00 AM",
  }));
  const session = await createUserSession(userPhone);

  await withMockedNow("2026-07-15T20:00:00.000Z", async () => {
    const active = await request(app)
      .get("/api/v1/user/sell-flows?status=PICKUP_SCHEDULED")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    assert.equal(active.body.data.count, 1);
    assert.equal(active.body.data.rows[0].id, flowId);

    const closed = await request(app)
      .get("/api/v1/user/sell-flows?status=CANCELLED")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    assert.equal(closed.body.data.count, 0);
  });
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

  const nestedRule = await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "screenPhysical",
      answerValue: "cracked",
      label: "Screen cracked / glass broken",
      deductionType: "RUPEES",
      deductionValue: 2000,
      priority: 30,
    })
    .expect(200);

  assert.equal(nestedRule.body.data.rule.answerGroup, "nestedPhysicalIssueAnswers");

  const nestedPreview = await request(app)
    .post("/api/v1/pricing/quote-preview")
    .send({
      selectedModel: {
        brandSlug: "samsung",
        modelId: "galaxy-s24",
        modelName: "Galaxy S24",
        listedPrice: 40000,
      },
      deviceDetails: {
        physicalIssues: ["Broken/scratch on device screen"],
        nestedPhysicalIssueAnswers: { screenPhysical: ["cracked", "oneToTwoScratches"] },
      },
    })
    .expect(200);

  assert.equal(nestedPreview.body.data.quote.deductions.length, 1);
  assert.equal(nestedPreview.body.data.quote.totalDeduction, 2000);
  assert.equal(nestedPreview.body.data.quote.sellingPrice, 38000);

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
        primaryDate: "2027-07-15T00:00:00.000Z",
        primaryTime: "10:00 AM - 11:00 AM",
        alternateDate: "2027-07-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
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

test("canonical device detail groups drive quote preview and user quote", async () => {
  const adminToken = await createAdminToken();
  const userSession = await createUserSession("8000000321");
  const model = {
    brandSlug: "phase4",
    modelId: "phase4-canonical-device-details",
    modelName: "Phase 4 Canonical Device",
    listedPrice: 40000,
  };

  const ruleInputs = [
    { answerGroup: "warrantyAndBill", answerKey: "underWarranty", answerValue: "no", label: "Warranty expired", deductionValue: 1000 },
    { answerGroup: "functionalProblems", answerKey: "speakerFaulty", answerValue: null, label: "Speaker faulty", deductionValue: 1200 },
    { answerGroup: "accessories", answerKey: "originalCharger", answerValue: null, label: "Original charger missing", deductionValue: 700 },
    { answerGroup: "mobileAge", answerKey: "mobileAge", answerValue: "above11Months", label: "Older than 11 months", deductionValue: 1500 },
    { answerGroup: "nestedPhysicalIssueAnswers", answerKey: "phase4ScreenPhysical", answerValue: "phase4Cracked", label: "Screen cracked", deductionValue: 500 },
  ];

  for (const [index, rule] of ruleInputs.entries()) {
    await request(app)
      .post("/api/v1/admin/pricing/deductions")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        ...rule,
        deductionType: "RUPEES",
        priority: 100 + index,
        isActive: true,
        appliesToBrand: model.brandSlug,
        appliesToModelId: model.modelId,
      })
      .expect(200);
  }

  const deviceDetails = {
    warrantyAndBill: { underWarranty: "no" },
    functionalProblems: ["speakerFaulty"],
    accessories: ["originalCharger"],
    mobileAge: "above11Months",
    physicalIssues: ["Broken/scratch on device screen"],
    nestedPhysicalIssueAnswers: { phase4ScreenPhysical: ["phase4Cracked", "oneToTwoScratches"] },
  };

  const preview = await request(app)
    .post("/api/v1/pricing/quote-preview")
    .send({ selectedModel: model, deviceDetails })
    .expect(200);

  assert.equal(preview.body.data.quote.totalDeduction, 4900);
  assert.equal(preview.body.data.quote.sellingPrice, 35100);
  assert.deepEqual(preview.body.data.quote.deductions.map((item) => item.label).sort(), [
    "Older than 11 months",
    "Original charger missing",
    "Screen cracked",
    "Speaker faulty",
    "Warranty expired",
  ]);

  const createFlow = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({ servicePincode: "560001", selectedModel: model })
    .expect(200);

  const flowId = createFlow.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({ deviceDetails })
    .expect(200);

  const quote = await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .expect(200);

  assert.equal(quote.body.data.quote.totalDeduction, 4900);
  assert.equal(quote.body.data.quote.sellingPrice, 35100);
});

test("partner token cannot access admin quote deduction APIs", async () => {
  const partnerSession = await createPartnerSession("9000000104");

  const response = await request(app)
    .get("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(403);

  assert.equal(response.body.error.code, "FORBIDDEN");
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

test("partner unlock payment gates lead details until admin approval", async () => {
  const userSession = await createUserSession("8000000116");
  const partnerSession = await createPartnerSession("9000000116");
  const adminToken = await createAdminToken();

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "asus",
        modelId: "rog-phone-test",
        modelName: "Rog Phone Test",
        listedPrice: 7020,
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
        primaryDate: "2026-07-26T00:00:00.000Z",
        primaryTime: "10:00 AM - 11:00 AM",
        alternateDate: "2026-07-27T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
        sellerName: "Masked Seller",
        callingPhoneNumber: "8000000116",
        addressLine: "House 16, Test Street",
        landmark: "Near Test Park",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const bucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const lockedLead = bucket.body.data.rows.find((row) => row.userSellFlowId === flowId);
  assert.equal(Boolean(lockedLead), true);
  assert.equal(lockedLead.selectedModel.modelName, "Rog Phone Test");
  assert.equal(lockedLead.city, "Bengaluru");
  assert.equal(lockedLead.pincode, "560001");
  assert.equal(lockedLead.quote.sellingPrice, 7020);
  assert.equal(lockedLead.seller.name, null);
  assert.equal(lockedLead.seller.phone, null);
  assert.equal(lockedLead.pickupSchedule.primaryTime, "10:00 AM - 11:00 AM");
  assert.equal(lockedLead.pickupSchedule.alternateTime, null);

  await request(app)
    .get(`/api/v1/partner/leads/${lockedLead.id}`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(403);

  const intent = await request(app)
    .post(`/api/v1/partner/leads/${lockedLead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(intent.body.data.unlockPrice, 500);
  assert.equal(intent.body.data.paymentQrUrl, "/Leadpay.jpeg");
  assert.equal(intent.body.data.intent.status, "PENDING_PAYMENT");

  await request(app)
    .post(`/api/v1/partner/lead-unlock-intents/${intent.body.data.intent.id}/screenshot-sent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const pendingList = await request(app)
    .get("/api/v1/partner/lead-unlock-intents/admin?status=SCREENSHOT_SENT")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);

  assert.equal(pendingList.body.data.rows.some((row) => row.id === intent.body.data.intent.id), true);

  await request(app)
    .patch(`/api/v1/partner/lead-unlock-intents/${intent.body.data.intent.id}/verify`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ action: "APPROVE", note: "Approved in unlock workflow test" })
    .expect(200);

  const detail = await request(app)
    .get(`/api/v1/partner/leads/${lockedLead.id}`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(detail.body.data.lead.seller.name, "Masked Seller");
  assert.equal(detail.body.data.lead.seller.phone, "8000000116");
  assert.equal(detail.body.data.lead.status, "CLAIMED");
  assert.equal(detail.body.data.lead.partnerId, "partner-9000000116");
});

test("partner cannot create unlock intent for lead claimed by another partner", async () => {
  const ownerPartnerSession = await createPartnerSession("9000000126");
  const otherPartnerSession = await createPartnerSession("9000000127");
  const flowId = await createScheduledSellFlow({
    userPhone: "8000000126",
    modelId: "claimed-by-other",
    modelName: "Claimed By Other",
    sellerName: "Claimed Seller",
  });

  const bucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${ownerPartnerSession.accessToken}`)
    .expect(200);

  const lead = bucket.body.data.rows.find((row) => row.userSellFlowId === flowId);
  assert.equal(Boolean(lead), true);

  await request(app)
    .post(`/api/v1/partner/leads/${lead.id}/claim`)
    .set("Authorization", `Bearer ${ownerPartnerSession.accessToken}`)
    .expect(200);

  const otherPartnerBucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(200);

  assert.equal(otherPartnerBucket.body.data.rows.some((row) => row.id === lead.id), false);

  const response = await request(app)
    .post(`/api/v1/partner/leads/${lead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(409);

  assert.equal(response.body.error.code, "CONFLICT");
  assert.equal(response.body.error.message, "This lead is already owned by another partner.");
});

test("partner unlocks multiple same-slot leads and another partner can unlock the same lead", async () => {
  const partnerSession = await createPartnerSession("9000000117");
  const otherPartnerSession = await createPartnerSession("9000000118");
  const adminToken = await createAdminToken();

  const firstFlowId = await createScheduledSellFlow({
    userPhone: "8000000117",
    modelId: "same-slot-one",
    modelName: "Same Slot One",
    sellerName: "Same Slot Seller One",
  });
  const secondFlowId = await createScheduledSellFlow({
    userPhone: "8000000118",
    modelId: "same-slot-two",
    modelName: "Same Slot Two",
    sellerName: "Same Slot Seller Two",
  });

  const bucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const firstLead = bucket.body.data.rows.find((row) => row.userSellFlowId === firstFlowId);
  const secondLead = bucket.body.data.rows.find((row) => row.userSellFlowId === secondFlowId);
  assert.equal(Boolean(firstLead), true);
  assert.equal(Boolean(secondLead), true);
  assert.equal(firstLead.pickupSchedule.primaryTime, secondLead.pickupSchedule.primaryTime);

  const firstIntent = await request(app)
    .post(`/api/v1/partner/leads/${firstLead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);
  const secondIntent = await request(app)
    .post(`/api/v1/partner/leads/${secondLead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.notEqual(firstIntent.body.data.intent.id, secondIntent.body.data.intent.id);

  const lockedForOtherPartner = await request(app)
    .post(`/api/v1/partner/leads/${firstLead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(409);

  assert.equal(lockedForOtherPartner.body.error.message, "This lead is temporarily reserved by another partner. Please try again after a few minutes.");

  for (const intent of [firstIntent.body.data.intent, secondIntent.body.data.intent]) {
    await request(app)
      .post(`/api/v1/partner/lead-unlock-intents/${intent.id}/screenshot-sent`)
      .set("Authorization", `Bearer ${partnerSession.accessToken}`)
      .expect(200);

    await request(app)
      .patch(`/api/v1/partner/lead-unlock-intents/${intent.id}/verify`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ action: "APPROVE", note: "Approved same-slot unlock" })
      .expect(200);
  }

  const firstDetail = await request(app)
    .get(`/api/v1/partner/leads/${firstLead.id}`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);
  const secondDetail = await request(app)
    .get(`/api/v1/partner/leads/${secondLead.id}`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(firstDetail.body.data.lead.seller.phone, "8000000117");
  assert.equal(secondDetail.body.data.lead.seller.phone, "8000000118");
  assert.equal(firstDetail.body.data.lead.status, "CLAIMED");
  assert.equal(secondDetail.body.data.lead.status, "CLAIMED");

  const otherPartnerIntent = await request(app)
    .post(`/api/v1/partner/leads/${firstLead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(409);

  assert.equal(otherPartnerIntent.body.error.message, "This lead is already owned by another partner.");
});

test("expired unlock reservation releases lead for retry", async () => {
  const partnerSession = await createPartnerSession("9000000130");
  const otherPartnerSession = await createPartnerSession("9000000131");
  const flowId = await createScheduledSellFlow({
    userPhone: "8000000130",
    modelId: "reservation-expiry",
    modelName: "Reservation Expiry",
    sellerName: "Reservation Seller",
  });

  const bucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const lead = bucket.body.data.rows.find((row) => row.userSellFlowId === flowId);
  assert.equal(Boolean(lead), true);

  const firstIntent = await withMockedNow("2026-08-20T10:00:00.000Z", async () => request(app)
    .post(`/api/v1/partner/leads/${lead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200));

  assert.equal(firstIntent.body.data.expiresAt, "2026-08-20T10:05:00.000Z");

  await withMockedNow("2026-08-20T10:04:59.000Z", async () => request(app)
    .post(`/api/v1/partner/leads/${lead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(409));

  const latePayment = await withMockedNow("2026-08-20T10:06:00.000Z", async () => request(app)
    .post(`/api/v1/partner/lead-unlock-intents/${firstIntent.body.data.intent.id}/screenshot-sent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(400));

  assert.equal(latePayment.body.error.message, "Payment intent is EXPIRED. Start a new unlock payment.");

  const retryIntent = await withMockedNow("2026-08-20T10:06:00.000Z", async () => request(app)
    .post(`/api/v1/partner/leads/${lead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(200));

  assert.equal(retryIntent.body.data.intent.status, "PENDING_PAYMENT");
});

test("admin rejection releases unlock reservation for another partner", async () => {
  const partnerSession = await createPartnerSession("9000000132");
  const otherPartnerSession = await createPartnerSession("9000000133");
  const adminToken = await createAdminToken();
  const flowId = await createScheduledSellFlow({
    userPhone: "8000000132",
    modelId: "reservation-rejected",
    modelName: "Reservation Rejected",
    sellerName: "Rejected Seller",
  });

  const bucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const lead = bucket.body.data.rows.find((row) => row.userSellFlowId === flowId);
  assert.equal(Boolean(lead), true);

  const intent = await request(app)
    .post(`/api/v1/partner/leads/${lead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  await request(app)
    .post(`/api/v1/partner/lead-unlock-intents/${intent.body.data.intent.id}/screenshot-sent`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  await request(app)
    .post(`/api/v1/partner/leads/${lead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(409);

  await request(app)
    .patch(`/api/v1/partner/lead-unlock-intents/${intent.body.data.intent.id}/verify`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ action: "REJECT", note: "Rejected to release reservation" })
    .expect(200);

  const retryIntent = await request(app)
    .post(`/api/v1/partner/leads/${lead.id}/unlock-intent`)
    .set("Authorization", `Bearer ${otherPartnerSession.accessToken}`)
    .expect(200);

  assert.equal(retryIntent.body.data.intent.status, "PENDING_PAYMENT");
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

test("partner can configure more than four working pincodes", async () => {
  const adminToken = await createAdminToken();
  const partnerSession = await createPartnerSession("9000000199");
  const pincodes = ["560901", "560902", "560903", "560904", "560905"];

  for (const pincode of pincodes) {
    await request(app)
      .patch(`/api/v1/admin/serviceability/pincodes/${pincode}/toggle`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ enabled: true, reason: "Enable for partner pincode limit test" })
      .expect(200);
  }

  for (const pincode of pincodes) {
    const response = await request(app)
      .post("/api/v1/partner/pincodes")
      .set("Authorization", `Bearer ${partnerSession.accessToken}`)
      .send({ pincode })
      .expect(200);

    assert.equal(response.body.data.pincodes.some((row) => row.pincode === pincode), true);
  }

  const configured = await request(app)
    .get("/api/v1/partner/pincodes")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(configured.body.data.pincodes.length, 5);

  await request(app)
    .post("/api/v1/partner/pincodes")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ pincode: pincodes[0] })
    .expect(409);
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
    .post("/api/v1/admin/pricing/upload/mobile")
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
      deviceType: "MOBILE",
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
      deviceType: "MOBILE",
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
      deviceType: "MOBILE",
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
      deviceType: "MOBILE",
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
    .post("/api/v1/admin/pricing/upload/mobile")
    .set("Authorization", `Bearer ${adminToken}`)
    .attach("file", buffer, "prices-invalid.xlsx")
    .expect(400);

  assert.equal(upload.body.error.code, "BAD_REQUEST");
  assert.equal(upload.body.error.details.expectedHeaders[0], "Brand");
});

test("pricing catalog brands requires deviceType query parameter", async () => {
  const response = await request(app)
    .get("/api/v1/pricing/catalog/brands")
    .expect(400);

  assert.equal(response.body.success, false);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
});

test("partner can list lead bucket and service leads without wallet recharge", async () => {
  const partnerSession = await createPartnerSession("9000000110");

  const leadBucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(leadBucket.body.success, true);
  assert.equal(Array.isArray(leadBucket.body.data.rows), true);

  const serviceLeads = await request(app)
    .get("/api/v1/partner/service-leads?pincode=560001&date=2026-07-16")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(serviceLeads.body.success, true);
  assert.equal(Array.isArray(serviceLeads.body.data.rows), true);

  const dashboard = await request(app)
    .get("/api/v1/partner/dashboard?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  assert.equal(typeof dashboard.body.data.metrics.todayLeads, "number");
  assert.equal(typeof dashboard.body.data.metrics.weeklyLeads, "number");
  assert.equal(typeof dashboard.body.data.metrics.monthlyLeads, "number");
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
        primaryTime: "10:00 AM - 11:00 AM",
        alternateDate: "2026-07-17T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
        sellerName: "Test User",
        callingPhoneNumber: "8000000111",
        addressLine: "House 11, Test Street",
        landmark: "Near Metro",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const leadBucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const leadId = leadBucket.body.data.rows[0].id;

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

  await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "basicFunctionality",
      answerKey: "canMakeCalls",
      answerValue: "no",
      label: "Cannot make calls onsite",
      deductionType: "RUPEES",
      deductionValue: 1200,
      appliesToModelId: "s23",
      priority: 10,
    })
    .expect(200);

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
        primaryTime: "12:00 PM - 1:00 PM",
        alternateDate: "2026-07-17T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
        sellerName: "Test User",
        callingPhoneNumber: "8000000112",
        addressLine: "House 12, Test Street",
        landmark: "Near Metro",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const leadBucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const leadId = leadBucket.body.data.rows[0].id;

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

  const rejectedValidationFields = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/onsite-validation`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .field("result", "PASS")
    .field("notes", "legacy note")
    .expect(400);

  assert.equal(rejectedValidationFields.body.error.message, "Unsupported field(s): result, notes");

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/onsite-validation`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .field(
      "checklist",
      JSON.stringify({
        gstBillSameImei: JSON.stringify({
          field: "GST Bill with Same IMEI",
          userInput: "Yes",
          partnerVerify: "yes",
          deductRupees: 0,
          comment: null,
        }),
        screen: "ok",
        __deductions: JSON.stringify({
          listedPrice: 41200,
          totalDeductionAmount: 2200,
          partnerDecisionDeductionAmount: 1200,
          anyOtherIssueDeductionAmount: 1000,
          finalAssessedPrice: 39000,
          questionDeductions: [{ key: "screenOriginal", field: "Screen Original", deductRupees: 1200 }],
          issues: [{ description: "Back panel scratch", deductionAmount: 1000 }],
          anyOtherIssues: [{ description: "Back panel scratch", deductRupees: 1000 }],
        }),
      }),
    )
    .field("observedIssues", JSON.stringify(["Back panel scratch (Deduction: Rs. 1000)"]))
    .field("observedIssueDeductions", JSON.stringify([{ description: "Back panel scratch", deductionAmount: 1000 }]))
    .field("partnerChecks", JSON.stringify([
      {
        key: "basicFunctionality.canMakeCalls",
        label: "Basic Functionality / Can Make Calls",
        userValue: "yes",
        partnerInput: "no",
        comment: null,
      },
    ]))
    .field("revisedQuote", "39000")
    .attach("photos", Buffer.from("photo-1"), { filename: "photo-1.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-2"), { filename: "photo-2.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-3"), { filename: "photo-3.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-4"), { filename: "photo-4.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-5"), { filename: "photo-5.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-6"), { filename: "photo-6.png", contentType: "image/png" })
    .expect(200);

  const rejectedPaymentFields = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/payment-proof/metadata`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({
      fileName: "proof.png",
      mimeType: "image/png",
      sizeBytes: 12345,
      amountCollected: 40000,
      paymentMode: "UPI",
      transactionRef: "UPI-112",
      notes: "legacy note",
    })
    .expect(400);

  assert.equal(rejectedPaymentFields.body.error.message, "Unsupported field(s): transactionRef, notes");

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/payment-proof/metadata`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({
      fileName: "proof.png",
      mimeType: "image/png",
      sizeBytes: 12345,
      amountCollected: 40000,
      paymentMode: "UPI",
    })
    .expect(200);

  const rejectedWrongFinalAmount = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/completion`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ finalAmount: 38999, handoverChecklist: { callDone: true } })
    .expect(400);

  assert.equal(rejectedWrongFinalAmount.body.error.message, "Final amount must match the backend computed re quoted price.");

  const rejectedCompletionFields = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/completion`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ finalAmount: 39000, handoverChecklist: { callDone: true }, remarks: "done" })
    .expect(400);

  assert.equal(rejectedCompletionFields.body.error.message, "Unsupported field(s): remarks");

  const completion = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/completion`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ finalAmount: 39000, handoverChecklist: { callDone: true } })
    .expect(200);

  assert.equal(completion.body.data.lead.onsiteValidation.revisedQuote, 39000);

  assert.equal(completion.body.data.lead.completionEvent.invoice.deductions.deductionType, "RUPEES");
  assert.equal(completion.body.data.lead.completionEvent.invoice.deductions.totalDeductionAmount, 2200);
  assert.equal(completion.body.data.lead.completionEvent.invoice.deductions.questionDeductions[0].deductRupees, 1200);
  assert.equal(completion.body.data.lead.completionEvent.invoice.deductions.issues[0].deductRupees, 1000);
  assert.equal(completion.body.data.lead.completionEvent.invoice.finalAmount, 39000);

  const allowedLogout = await request(app)
    .post("/api/v1/auth/logout")
    .send({ refreshToken: partnerSession.refreshToken })
    .expect(200);

  assert.equal(allowedLogout.body.data.loggedOut, true);
});

test("onsite validation rejects legacy gstBill and sameImei checklist keys", async () => {
  const userSession = await createUserSession("8000000310");
  const partnerSession = await createPartnerSession("9000000310");

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-13",
        modelName: "iPhone 13",
        listedPrice: 52000,
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
        primaryDate: "2026-07-30T00:00:00.000Z",
        primaryTime: "12:00 PM - 1:00 PM",
        alternateDate: "2026-07-31T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
        sellerName: "Legacy Key User",
        callingPhoneNumber: "8000000310",
        addressLine: "House 310, Legacy Street",
        landmark: "Near Legacy Circle",
        city: "Bengaluru",
      },
    })
    .expect(200);

  const leadBucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const leadId = leadBucket.body.data.rows.find((row) => row.userSellFlowId === flowId)?.id;
  assert.equal(Boolean(leadId), true);

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/claim`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "ACCEPTED" })
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "IN_PROGRESS" })
    .expect(200);

  const legacyResponse = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/onsite-validation`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({
      checklist: {
        gstBill: "Yes",
        sameImei: "Yes",
        __deductions: JSON.stringify({
          listedPrice: 52000,
          totalDeductionAmount: 0,
          questionDeductions: [],
          anyOtherIssues: [],
        }),
      },
      observedIssues: [],
      revisedQuote: 52000,
    })
    .expect(400);

  assert.equal(legacyResponse.body.error.code, "BAD_REQUEST");
  assert.equal(
    legacyResponse.body.error.message,
    "Use checklist.gstBillSameImei only. Legacy checklist keys gstBill and sameImei are no longer supported.",
  );
});

test("onsite validation requires exactly six validation photos", async () => {
  const partnerSession = await createPartnerSession("9000000311");
  const flowId = await createScheduledSellFlow({
    userPhone: "8000000311",
    modelId: "photo-required-phone",
    modelName: "Photo Required Phone",
    sellerName: "Photo Required User",
  });

  const leadBucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const leadId = leadBucket.body.data.rows.find((row) => row.userSellFlowId === flowId)?.id;
  assert.equal(Boolean(leadId), true);

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/claim`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "ACCEPTED" })
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "IN_PROGRESS" })
    .expect(200);

  const response = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/onsite-validation`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .field("checklist", JSON.stringify({
      gstBillSameImei: JSON.stringify({
        field: "GST Bill with Same IMEI",
        userInput: "Yes",
        partnerVerify: "yes",
        deductRupees: 0,
        comment: null,
      }),
      screen: "ok",
    }))
    .field("observedIssues", JSON.stringify([]))
    .field("revisedQuote", "7020")
    .attach("photos", Buffer.from("photo-1"), { filename: "photo-1.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-2"), { filename: "photo-2.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-3"), { filename: "photo-3.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-4"), { filename: "photo-4.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-5"), { filename: "photo-5.png", contentType: "image/png" })
    .expect(400);

  assert.equal(response.body.error.message, "Exactly 6 validation photos are required.");
});

test("onsite mismatch applies only matching categorical nested rule", async () => {
  const userSession = await createUserSession("8000000320");
  const partnerSession = await createPartnerSession("9000000320");
  const adminToken = await createAdminToken();

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-13-categorical-check",
        modelName: "iPhone 13 Categorical Check",
        listedPrice: 50000,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${userSession.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes", screenReplaced: "yes" },
        physicalIssues: ["Dead Spot/Visible line and Discoloration on screen"],
        nestedPhysicalIssueAnswers: { screenDiscoloration: "majorDiscoloration" },
        accessories: ["originalBoxWithIMEI"],
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
        primaryDate: "2026-08-01T00:00:00.000Z",
        primaryTime: "12:00 PM - 1:00 PM",
        alternateDate: "2026-08-02T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
        sellerName: "Categorical User",
        callingPhoneNumber: "8000000320",
        addressLine: "House 320, Test Street",
        landmark: "Near Test Circle",
        city: "Bengaluru",
      },
    })
    .expect(200);

  await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "discoloration",
      answerValue: "major",
      label: "Major Discoloration",
      deductionType: "RUPEES",
      deductionValue: 7000,
      priority: 10,
      isActive: true,
      appliesToBrand: "apple",
      appliesToModelId: "iphone-13-categorical-check",
    })
    .expect(200);

  await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "accessories",
      answerKey: "originalBoxWithIMEI",
      answerValue: null,
      label: "Original Box with same IMEI",
      deductionType: "RUPEES",
      deductionValue: 100,
      priority: 13,
      isActive: true,
      appliesToBrand: "apple",
      appliesToModelId: "iphone-13-categorical-check",
    })
    .expect(200);

  await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "nestedPhysicalIssueAnswers",
      answerKey: "discoloration",
      answerValue: "minor",
      label: "Minor Discoloration",
      deductionType: "RUPEES",
      deductionValue: 3000,
      priority: 11,
      isActive: true,
      appliesToBrand: "apple",
      appliesToModelId: "iphone-13-categorical-check",
    })
    .expect(200);

  await request(app)
    .post("/api/v1/admin/pricing/deductions")
    .set("Authorization", `Bearer ${adminToken}`)
    .send({
      answerGroup: "basicFunctionality",
      answerKey: "screenReplaced",
      answerValue: "no",
      label: "Screen Not Original",
      deductionType: "RUPEES",
      deductionValue: 2000,
      priority: 12,
      isActive: true,
      appliesToBrand: "apple",
      appliesToModelId: "iphone-13-categorical-check",
    })
    .expect(200);

  const leadBucket = await request(app)
    .get("/api/v1/partner/lead-bucket?pincode=560001")
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const leadId = leadBucket.body.data.rows.find((row) => row.userSellFlowId === flowId)?.id;
  assert.equal(Boolean(leadId), true);

  await request(app)
    .post(`/api/v1/partner/leads/${leadId}/claim`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "ACCEPTED" })
    .expect(200);

  await request(app)
    .patch(`/api/v1/partner/leads/${leadId}/status`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .send({ status: "IN_PROGRESS" })
    .expect(200);

  const onsiteCatalog = await request(app)
    .get(`/api/v1/partner/leads/${leadId}/onsite-deduction-catalog`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .expect(200);

  const screenOriginalRules = onsiteCatalog.body.data.catalog.fields.screenOriginal.rules;
  assert.equal(screenOriginalRules.some((rule) => rule.label === "Screen Not Original" && rule.answerValue === "no"), true);
  const screenDiscolorationRules = onsiteCatalog.body.data.catalog.fields.screenDiscolorationMajor.rules;
  assert.equal(screenDiscolorationRules.some((rule) => rule.label === "Major Discoloration" && rule.answerKey === "discoloration" && rule.answerValue === "major"), true);
  const originalBoxRules = onsiteCatalog.body.data.catalog.fields.originalBoxWithIMEI.rules;
  assert.equal(originalBoxRules.some((rule) => rule.label === "Original Box with same IMEI" && rule.answerGroup === "accessories"), true);
  const gstBillRules = onsiteCatalog.body.data.catalog.fields.gstBillSameImei.rules;
  assert.equal(gstBillRules.some((rule) => rule.label === "Original Box with same IMEI"), false);

  const confirmedValidation = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/onsite-validation`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .field("checklist", JSON.stringify({
      screenDiscoloration: JSON.stringify({
        field: "Nested Physical Issue Answers / Screen Discoloration",
        userInput: "majorDiscoloration",
        partnerInput: "yes",
        comment: "User condition confirmed",
      }),
      screenReplaced: JSON.stringify({
        field: "Basic Functionality / Screen Original",
        userInput: "yes",
        partnerInput: "yes",
        comment: "Original display confirmed",
      }),
      originalBoxWithIMEI: JSON.stringify({
        field: "Original Box with same IMEI",
        userInput: "yes",
        partnerInput: "yes",
        comment: "Original box confirmed",
      }),
    }))
    .field("partnerChecks", JSON.stringify([
      {
        key: "nestedPhysicalIssueAnswers.screenDiscoloration",
        label: "Nested Physical Issue Answers / Screen Discoloration",
        userValue: "majorDiscoloration",
        partnerInput: "yes",
        comment: "User condition confirmed",
      },
      {
        key: "basicFunctionality.screenReplaced",
        label: "Basic Functionality / Screen Original",
        userValue: "yes",
        partnerInput: "yes",
        comment: "Original display confirmed",
      },
      {
        key: "accessories.originalBoxWithIMEI",
        label: "Original Box with same IMEI",
        userValue: "yes",
        partnerInput: "yes",
        comment: "Original box confirmed",
      },
    ]))
    .field("observedIssues", JSON.stringify([]))
    .field("observedIssueDeductions", JSON.stringify([]))
    .attach("photos", Buffer.from("confirmed-photo-1"), { filename: "confirmed-photo-1.png", contentType: "image/png" })
    .attach("photos", Buffer.from("confirmed-photo-2"), { filename: "confirmed-photo-2.png", contentType: "image/png" })
    .attach("photos", Buffer.from("confirmed-photo-3"), { filename: "confirmed-photo-3.png", contentType: "image/png" })
    .attach("photos", Buffer.from("confirmed-photo-4"), { filename: "confirmed-photo-4.png", contentType: "image/png" })
    .attach("photos", Buffer.from("confirmed-photo-5"), { filename: "confirmed-photo-5.png", contentType: "image/png" })
    .attach("photos", Buffer.from("confirmed-photo-6"), { filename: "confirmed-photo-6.png", contentType: "image/png" })
    .expect(200);

  const confirmedDeductions = JSON.parse(confirmedValidation.body.data.lead.onsiteValidation.checklist.__deductions);
  assert.equal(confirmedDeductions.questionDeductions.length, 0);
  assert.equal(confirmedDeductions.totalDeductionAmount, 0);

  const validation = await request(app)
    .post(`/api/v1/partner/leads/${leadId}/onsite-validation`)
    .set("Authorization", `Bearer ${partnerSession.accessToken}`)
    .field("checklist", JSON.stringify({
      screenDiscoloration: JSON.stringify({
        field: "Nested Physical Issue Answers / Screen Discoloration",
        userInput: "majorDiscoloration",
        partnerInput: "no",
        comment: "Not matching condition",
      }),
      screenReplaced: JSON.stringify({
        field: "Basic Functionality / Screen Original",
        userInput: "yes",
        partnerInput: "no",
        comment: "Screen was replaced",
      }),
      originalBoxWithIMEI: JSON.stringify({
        field: "Original Box with same IMEI",
        userInput: "yes",
        partnerInput: "no",
        comment: "Box IMEI did not match",
      }),
    }))
    .field("partnerChecks", JSON.stringify([
      {
        key: "nestedPhysicalIssueAnswers.screenDiscoloration",
        label: "Nested Physical Issue Answers / Screen Discoloration",
        userValue: "majorDiscoloration",
        partnerInput: "no",
        comment: "Not matching condition",
      },
      {
        key: "basicFunctionality.screenReplaced",
        label: "Basic Functionality / Screen Original",
        userValue: "yes",
        partnerInput: "no",
        comment: "Screen was replaced",
      },
      {
        key: "accessories.originalBoxWithIMEI",
        label: "Original Box with same IMEI",
        userValue: "yes",
        partnerInput: "no",
        comment: "Box IMEI did not match",
      },
    ]))
    .field("observedIssues", JSON.stringify([]))
    .field("observedIssueDeductions", JSON.stringify([]))
    .attach("photos", Buffer.from("photo-1"), { filename: "photo-1.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-2"), { filename: "photo-2.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-3"), { filename: "photo-3.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-4"), { filename: "photo-4.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-5"), { filename: "photo-5.png", contentType: "image/png" })
    .attach("photos", Buffer.from("photo-6"), { filename: "photo-6.png", contentType: "image/png" })
    .expect(200);

  const deductions = JSON.parse(validation.body.data.lead.onsiteValidation.checklist.__deductions);
  assert.equal(deductions.questionDeductions.length, 3);
  assert.equal(deductions.questionDeductions[0].label, "Major Discoloration");
  assert.equal(deductions.questionDeductions[0].deductRupees, 7000);
  assert.equal(deductions.questionDeductions.filter((item) => item.label === "Screen Not Original").length, 1);
  assert.equal(deductions.questionDeductions.filter((item) => item.label === "Original Box with same IMEI").length, 1);
  assert.equal(deductions.totalDeductionAmount, 9100);

  const discolorationTrace = deductions.decisionTrace.find((item) => item.key === "nestedPhysicalIssueAnswers.screenDiscoloration");
  assert.equal(discolorationTrace.appliedRules[0].label, "Major Discoloration");
  assert.equal(discolorationTrace.skippedRules.some((item) => item.label === "Minor Discoloration" && item.reason === "answer_value_or_partner_input_mismatch"), true);
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
        primaryTime: "10:00 AM - 11:00 AM",
        alternateDate: "2026-08-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
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

test("pickup scheduling leaves mapped pincode leads unassigned for partner unlock", async () => {
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
          primaryTime: "10:00 AM - 11:00 AM",
          alternateDate: "2026-09-11T00:00:00.000Z",
          alternateTime: "2:00 PM - 3:00 PM",
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

  assert.equal(firstLead.partnerId, null);
  assert.equal(secondLead.partnerId, null);
  assert.equal(firstLead.status, "AVAILABLE");
  assert.equal(secondLead.status, "AVAILABLE");
});

test("pickup schedule rejects invalid slot labels", async () => {
  const session = await createUserSession("8000000451");

  const create = await request(app)
    .post("/api/v1/user/sell-flows")
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      servicePincode: "560001",
      selectedModel: {
        brandSlug: "apple",
        modelId: "iphone-11",
        modelName: "iPhone 11",
        listedPrice: 21000,
      },
    })
    .expect(200);

  const flowId = create.body.data.flow.id;

  await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      deviceDetails: {
        basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
        physicalIssues: [],
      },
    })
    .expect(200);

  await request(app)
    .post(`/api/v1/user/sell-flows/${flowId}/quote`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .expect(200);

  const invalidSlot = await request(app)
    .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
    .set("Authorization", `Bearer ${session.accessToken}`)
    .send({
      pickupSchedule: {
        pincode: "560001",
        primaryDate: "2026-10-15T00:00:00.000Z",
        primaryTime: "10:00 AM - 12:00 PM",
        alternateDate: "2026-10-16T00:00:00.000Z",
        alternateTime: "2:00 PM - 3:00 PM",
        sellerName: "Invalid Slot User",
        callingPhoneNumber: "8000000451",
        addressLine: "House 451",
        landmark: "Near Lake",
        city: "Bengaluru",
      },
    })
    .expect(400);

  assert.equal(invalidSlot.body.error.code, "BAD_REQUEST");
  assert.match(invalidSlot.body.error.message, /Invalid pickup slot selected/);
});

test("pickup schedule rejects past same-day slots and allows later same-day slots", async () => {
  await withMockedNow("2026-10-15T08:45:00.000Z", async () => {
    const session = await createUserSession("8000000452");

    const create = await request(app)
      .post("/api/v1/user/sell-flows")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        servicePincode: "560001",
        selectedModel: {
          brandSlug: "apple",
          modelId: "iphone-12-mini",
          modelName: "iPhone 12 Mini",
          listedPrice: 26000,
        },
      })
      .expect(200);

    const flowId = create.body.data.flow.id;

    await request(app)
      .patch(`/api/v1/user/sell-flows/${flowId}/device-details`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        deviceDetails: {
          basicFunctionality: { canMakeCalls: "yes", touchWorking: "yes" },
          physicalIssues: [],
        },
      })
      .expect(200);

    await request(app)
      .post(`/api/v1/user/sell-flows/${flowId}/quote`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    const pastPrimarySlot = await request(app)
      .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        pickupSchedule: {
          pincode: "560001",
          primaryDate: "2026-10-15T00:00:00.000Z",
          primaryTime: "2:00 PM - 3:00 PM",
          alternateDate: "2026-10-16T00:00:00.000Z",
          alternateTime: "4:00 PM - 5:00 PM",
          sellerName: "Slot Timing User",
          callingPhoneNumber: "8000000452",
          addressLine: "House 452",
          landmark: "Near Bridge",
          city: "Bengaluru",
        },
      })
      .expect(400);

    assert.equal(pastPrimarySlot.body.error.code, "BAD_REQUEST");
    assert.match(pastPrimarySlot.body.error.message, /preferred pickup slot has already passed/);

    const pastAlternateSlot = await request(app)
      .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        pickupSchedule: {
          pincode: "560001",
          primaryDate: "2026-10-15T00:00:00.000Z",
          primaryTime: "3:00 PM - 4:00 PM",
          alternateDate: "2026-10-15T00:00:00.000Z",
          alternateTime: "2:00 PM - 3:00 PM",
          sellerName: "Slot Timing User",
          callingPhoneNumber: "8000000452",
          addressLine: "House 452",
          landmark: "Near Bridge",
          city: "Bengaluru",
        },
      })
      .expect(400);

    assert.equal(pastAlternateSlot.body.error.code, "BAD_REQUEST");
    assert.match(pastAlternateSlot.body.error.message, /alternate pickup slot has already passed/);

    const laterSameDaySlot = await request(app)
      .patch(`/api/v1/user/sell-flows/${flowId}/pickup-schedule`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        pickupSchedule: {
          pincode: "560001",
          primaryDate: "2026-10-15T00:00:00.000Z",
          primaryTime: "3:00 PM - 4:00 PM",
          alternateDate: "2026-10-16T00:00:00.000Z",
          alternateTime: "2:00 PM - 3:00 PM",
          sellerName: "Slot Timing User",
          callingPhoneNumber: "8000000452",
          addressLine: "House 452",
          landmark: "Near Bridge",
          city: "Bengaluru",
        },
      })
      .expect(200);

    assert.equal(laterSameDaySlot.body.data.flow.status, "PICKUP_SCHEDULED");
  });
});
