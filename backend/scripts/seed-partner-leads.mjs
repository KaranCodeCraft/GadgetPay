import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { resolvedDbPath, sqlite as appSqlite } from "../src/db/sqlite.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = resolvedDbPath;

if (appSqlite) {
  appSqlite.close();
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

const PARTNER_ID = "partner-9000000110";
const PARTNER_PHONE = "9000000110";
const PARTNER_NAME = "Apex Devices Partner";
const SEED_ACTOR_ID = "seed-partner-leads-script";
const PINCODES = ["201301", "560001"];
const BASE_TIME = Date.parse("2026-07-10T09:00:00.000Z");

function isoAt(index, offsetMinutes = 0) {
  return new Date(BASE_TIME + index * 60 * 60 * 1000 + offsetMinutes * 60 * 1000).toISOString();
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function json(value) {
  return JSON.stringify(value);
}

const modelCatalog = [
  { brand: "Apple", series: "iPhone 13", model: "iPhone 13", storage: "128GB", color: "Midnight", launchYear: 2021 },
  { brand: "Samsung", series: "Galaxy S22", model: "Galaxy S22", storage: "128GB", color: "Phantom Black", launchYear: 2022 },
  { brand: "OnePlus", series: "OnePlus 11", model: "OnePlus 11", storage: "256GB", color: "Titan Black", launchYear: 2023 },
  { brand: "Xiaomi", series: "Redmi Note 12 Pro", model: "Redmi Note 12 Pro", storage: "128GB", color: "Frosted Blue", launchYear: 2023 },
  { brand: "Google", series: "Pixel 7", model: "Pixel 7", storage: "128GB", color: "Snow", launchYear: 2022 },
  { brand: "Vivo", series: "V27", model: "Vivo V27", storage: "256GB", color: "Magic Blue", launchYear: 2023 },
  { brand: "Oppo", series: "Reno 10", model: "Oppo Reno 10", storage: "256GB", color: "Ice Blue", launchYear: 2023 },
  { brand: "Realme", series: "GT Neo 3", model: "Realme GT Neo 3", storage: "128GB", color: "Nitro Blue", launchYear: 2022 },
  { brand: "Motorola", series: "Edge 40", model: "Motorola Edge 40", storage: "256GB", color: "Lunar Blue", launchYear: 2023 },
  { brand: "Nothing", series: "Phone (2)", model: "Nothing Phone (2)", storage: "256GB", color: "Dark Gray", launchYear: 2023 },
  { brand: "Apple", series: "iPhone 12", model: "iPhone 12", storage: "128GB", color: "Blue", launchYear: 2020 },
  { brand: "Samsung", series: "Galaxy A54", model: "Galaxy A54", storage: "256GB", color: "Awesome White", launchYear: 2023 },
];

const userNames = [
  "Arjun Mehta",
  "Kavya Sharma",
  "Rohan Verma",
  "Sneha Iyer",
  "Vikram Singh",
  "Nisha Rao",
  "Harsh Gupta",
  "Ananya Kulkarni",
  "Dev Malhotra",
  "Ishita Nair",
  "Rahul Bansal",
  "Priya Das",
];

const userPhones = [
  "9899001001",
  "9899001002",
  "9899001003",
  "9899001004",
  "9899001005",
  "9899001006",
  "9899001007",
  "9899001008",
  "9899001009",
  "9899001010",
  "9899001011",
  "9899001012",
];

const pincodeToCity = {
  "201301": { city: "Noida", state: "Uttar Pradesh", district: "Gautam Buddha Nagar" },
  "560001": { city: "Bengaluru", state: "Karnataka", district: "Bengaluru Urban" },
};

const insertPartner = db.prepare(`
  INSERT INTO partners (id, phone, name, created_at, updated_at)
  VALUES (@id, @phone, @name, @created_at, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    phone = excluded.phone,
    name = excluded.name,
    updated_at = excluded.updated_at
`);

const upsertWallet = db.prepare(`
  INSERT INTO partner_coin_wallets (partner_id, balance, updated_at)
  VALUES (@partner_id, @balance, @updated_at)
  ON CONFLICT(partner_id) DO UPDATE SET
    balance = CASE
      WHEN partner_coin_wallets.balance > 0 THEN partner_coin_wallets.balance
      ELSE excluded.balance
    END,
    updated_at = excluded.updated_at
`);

const upsertServiceability = db.prepare(`
  INSERT INTO serviceability_pincodes (
    pincode, status, reason, state, district, office_count, delivery_office_count, metadata_json, updated_by, updated_at
  )
  VALUES (
    @pincode, @status, @reason, @state, @district, @office_count, @delivery_office_count, @metadata_json, @updated_by, @updated_at
  )
  ON CONFLICT(pincode) DO UPDATE SET
    status = excluded.status,
    reason = excluded.reason,
    state = excluded.state,
    district = excluded.district,
    office_count = excluded.office_count,
    delivery_office_count = excluded.delivery_office_count,
    metadata_json = excluded.metadata_json,
    updated_by = excluded.updated_by,
    updated_at = excluded.updated_at
`);

const upsertUser = db.prepare(`
  INSERT INTO users (id, phone, name, created_at, updated_at)
  VALUES (@id, @phone, @name, @created_at, @updated_at)
  ON CONFLICT(id) DO UPDATE SET
    phone = excluded.phone,
    name = excluded.name,
    updated_at = excluded.updated_at
`);

const upsertSellFlow = db.prepare(`
  INSERT INTO user_sell_flows (
    id, user_id, flow_type, status, selected_model_json, device_details_json, pickup_schedule_json, quote_json, flow_json, created_at, updated_at
  )
  VALUES (
    @id, @user_id, @flow_type, @status, @selected_model_json, @device_details_json, @pickup_schedule_json, @quote_json, @flow_json, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    user_id = excluded.user_id,
    flow_type = excluded.flow_type,
    status = excluded.status,
    selected_model_json = excluded.selected_model_json,
    device_details_json = excluded.device_details_json,
    pickup_schedule_json = excluded.pickup_schedule_json,
    quote_json = excluded.quote_json,
    flow_json = excluded.flow_json,
    updated_at = excluded.updated_at
`);

const upsertPartnerLead = db.prepare(`
  INSERT INTO partner_leads (
    id, user_sell_flow_id, user_id, lead_type, status, partner_id, pincode, city, seller_name, seller_phone, address_line, landmark,
    selected_model_json, device_details_json, quote_json, pickup_schedule_json, flow_snapshot_json, created_at, updated_at
  )
  VALUES (
    @id, @user_sell_flow_id, @user_id, @lead_type, @status, @partner_id, @pincode, @city, @seller_name, @seller_phone, @address_line, @landmark,
    @selected_model_json, @device_details_json, @quote_json, @pickup_schedule_json, @flow_snapshot_json, @created_at, @updated_at
  )
  ON CONFLICT(id) DO UPDATE SET
    user_sell_flow_id = excluded.user_sell_flow_id,
    user_id = excluded.user_id,
    lead_type = excluded.lead_type,
    status = excluded.status,
    partner_id = excluded.partner_id,
    pincode = excluded.pincode,
    city = excluded.city,
    seller_name = excluded.seller_name,
    seller_phone = excluded.seller_phone,
    address_line = excluded.address_line,
    landmark = excluded.landmark,
    selected_model_json = excluded.selected_model_json,
    device_details_json = excluded.device_details_json,
    quote_json = excluded.quote_json,
    pickup_schedule_json = excluded.pickup_schedule_json,
    flow_snapshot_json = excluded.flow_snapshot_json,
    updated_at = excluded.updated_at
`);

const upsertDispositionEvent = db.prepare(`
  INSERT INTO partner_lead_disposition_events (
    id, lead_id, user_sell_flow_id, partner_id, from_status, to_status, disposition_key, note, actor_role, actor_id, created_at
  )
  VALUES (
    @id, @lead_id, @user_sell_flow_id, @partner_id, @from_status, @to_status, @disposition_key, @note, @actor_role, @actor_id, @created_at
  )
  ON CONFLICT(id) DO UPDATE SET
    lead_id = excluded.lead_id,
    user_sell_flow_id = excluded.user_sell_flow_id,
    partner_id = excluded.partner_id,
    from_status = excluded.from_status,
    to_status = excluded.to_status,
    disposition_key = excluded.disposition_key,
    note = excluded.note,
    actor_role = excluded.actor_role,
    actor_id = excluded.actor_id,
    created_at = excluded.created_at
`);

const seedTransaction = db.transaction(() => {
  const now = isoAt(0);

  insertPartner.run({
    id: PARTNER_ID,
    phone: PARTNER_PHONE,
    name: PARTNER_NAME,
    created_at: now,
    updated_at: now,
  });

  upsertWallet.run({
    partner_id: PARTNER_ID,
    balance: 1500,
    updated_at: now,
  });

  for (const pincode of PINCODES) {
    const geo = pincodeToCity[pincode];
    upsertServiceability.run({
      pincode,
      status: "ACTIVE",
      reason: "Seeded active coverage for partner leads testing",
      state: geo.state,
      district: geo.district,
      office_count: pincode === "201301" ? 24 : 31,
      delivery_office_count: pincode === "201301" ? 18 : 26,
      metadata_json: json({
        source: "seed-partner-leads.mjs",
        slaHours: pincode === "201301" ? 24 : 18,
        priorityZone: pincode === "560001",
      }),
      updated_by: "seed-script",
      updated_at: now,
    });
  }

  for (let i = 0; i < 12; i += 1) {
    const idx = i + 1;
    const key = pad2(idx);
    const pincode = i < 6 ? "201301" : "560001";
    const geo = pincodeToCity[pincode];
    const model = modelCatalog[i];
    const leadType = i % 2 === 0 ? "LEAD_BUCKET" : "SERVICE_LEAD";
    const flowStatus = leadType === "SERVICE_LEAD" ? "PICKUP_SCHEDULED" : "QUOTE_READY";

    const createdAt = isoAt(idx, 0);
    const updatedAt = isoAt(idx, 10);

    const userId = `seed-user-${key}`;
    const flowId = `seed-flow-${key}`;
    const leadId = `seed-lead-${key}`;
    const eventId = `seed-disp-created-${key}`;

    const modelId = `${model.brand}-${model.model}-${model.storage}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    const selectedModel = {
      brandSlug: model.brand.toLowerCase(),
      modelId,
      modelName: `${model.brand} ${model.model} ${model.storage}`,
      listedPrice: 12000 + i * 900,
      thumbnailUrl: `https://example.cdn/devices/${modelId}.png`,
    };

    const deviceDetails = {
      basicFunctionality: {
        powerOn: "yes",
        touchscreen: i % 3 === 0 ? "na" : "yes",
        speaker: "yes",
      },
      physicalIssues: i % 3 === 0 ? ["Broken/scratch on device screen", "Scratch/Dent on device body"] : ["Scratch/Dent on device body"],
      nestedPhysicalIssueAnswers: {
        scratches: i % 3 === 0 ? "Visible near frame" : "Very minor",
        dents: i % 3 === 0 ? "Bottom left corner" : "None",
      },
      cameraAndBiometrics: {
        camera: i % 4 === 0 ? "no" : "yes",
        biometrics: model.brand === "Apple" ? (i % 5 === 0 ? "no" : "yes") : "yes",
      },
      sensorsAndConnectivity: {
        wifi: "yes",
        bluetooth: "yes",
        gps: "yes",
      },
      batteryAndCharging: {
        batteryHealth: `${78 + (i % 15)}%`,
        chargingPort: "yes",
      },
      accessoriesAndOwnership: {
        chargerIncluded: i % 2 === 0 ? "yes" : "no",
        boxIncluded: i % 3 !== 0 ? "yes" : "no",
        billAvailable: i % 4 !== 0 ? "yes" : "no",
      },
    };

    const basePrice = selectedModel.listedPrice;
    const deductionAmount = 700 + (i % 4) * 250;
    const finalQuote = Math.max(2500, basePrice - deductionAmount);

    const quote = {
      basePrice,
      sellingPrice: finalQuote,
      totalDeduction: deductionAmount,
      currency: "INR",
      priceSource: "seed-script",
      validUntil: isoAt(idx, 60 * 24 * 3),
      deductions: [
        {
          ruleId: `seed-rule-cosmetic-${key}`,
          label: "Cosmetic wear",
          answerGroup: "physicalIssues",
          answerKey: "cosmetic_wear",
          answerValue: "yes",
          deductionType: "RUPEES",
          deductionValue: Math.floor(deductionAmount * 0.6),
          deductionAmount: Math.floor(deductionAmount * 0.6),
        },
        {
          ruleId: `seed-rule-battery-${key}`,
          label: "Battery health",
          answerGroup: "batteryAndCharging",
          answerKey: "battery_health",
          answerValue: "low",
          deductionType: "RUPEES",
          deductionValue: Math.ceil(deductionAmount * 0.4),
          deductionAmount: Math.ceil(deductionAmount * 0.4),
        },
      ],
    };

    const pickupSchedule = {
      pincode,
      primaryDate: `2026-07-${String(16 + (i % 8)).padStart(2, "0")}T00:00:00.000Z`,
      primaryTime: i % 2 === 0 ? "10:00-12:00" : "14:00-16:00",
      alternateDate: `2026-07-${String(18 + (i % 8)).padStart(2, "0")}T00:00:00.000Z`,
      alternateTime: i % 2 === 0 ? "16:00-18:00" : "11:00-13:00",
      sellerName: userNames[i],
      callingPhoneNumber: userPhones[i],
      addressLine: i < 6 ? `Tower ${10 + i}, Sector 62` : `Block ${String.fromCharCode(65 + (i % 4))}, MG Road`,
      landmark: i < 6 ? "Opposite Tech Park Gate 2" : "Behind Metro Station Exit B",
      city: geo.city,
      modelName: selectedModel.modelName,
      listedPrice: selectedModel.listedPrice,
      updatedAt,
    };

    const flowSnapshot = {
      id: flowId,
      flowType: "sell-phone",
      status: flowStatus,
      servicePincode: pincode,
      user: {
        id: userId,
        phone: userPhones[i],
        name: userNames[i],
      },
      selectedModel,
      deviceDetails,
      quote,
      pickupSchedule,
      createdAt,
      updatedAt,
    };

    upsertUser.run({
      id: userId,
      phone: userPhones[i],
      name: userNames[i],
      created_at: createdAt,
      updated_at: updatedAt,
    });

    upsertSellFlow.run({
      id: flowId,
      user_id: userId,
      flow_type: "sell-phone",
      status: flowStatus,
      selected_model_json: json(selectedModel),
      device_details_json: json(deviceDetails),
      pickup_schedule_json: json(pickupSchedule),
      quote_json: json(quote),
      flow_json: json(flowSnapshot),
      created_at: createdAt,
      updated_at: updatedAt,
    });

    upsertPartnerLead.run({
      id: leadId,
      user_sell_flow_id: flowId,
      user_id: userId,
      lead_type: leadType,
      status: "AVAILABLE",
      partner_id: null,
      pincode,
      city: geo.city,
      seller_name: userNames[i],
      seller_phone: userPhones[i],
      address_line: pickupSchedule.addressLine,
      landmark: pickupSchedule.landmark,
      selected_model_json: json(selectedModel),
      device_details_json: json(deviceDetails),
      quote_json: json(quote),
      pickup_schedule_json: json(pickupSchedule),
      flow_snapshot_json: json(flowSnapshot),
      created_at: createdAt,
      updated_at: updatedAt,
    });

    upsertDispositionEvent.run({
      id: eventId,
      lead_id: leadId,
      user_sell_flow_id: flowId,
      partner_id: null,
      from_status: null,
      to_status: "AVAILABLE",
      disposition_key: "CREATED",
      note: "Lead seeded in AVAILABLE state",
      actor_role: "system",
      actor_id: SEED_ACTOR_ID,
      created_at: updatedAt,
    });
  }
});

try {
  seedTransaction();

  const summary = {
    partner: db.prepare("SELECT id, phone, name FROM partners WHERE id = ?").get(PARTNER_ID),
    wallet: db.prepare("SELECT partner_id, balance FROM partner_coin_wallets WHERE partner_id = ?").get(PARTNER_ID),
    serviceabilityActiveCount: db
      .prepare(
        "SELECT COUNT(*) AS count FROM serviceability_pincodes WHERE pincode IN (?, ?) AND status = 'ACTIVE'",
      )
      .get(PINCODES[0], PINCODES[1]).count,
    usersCount: db.prepare("SELECT COUNT(*) AS count FROM users WHERE id LIKE 'seed-user-%'").get().count,
    sellFlowsCount: db.prepare("SELECT COUNT(*) AS count FROM user_sell_flows WHERE id LIKE 'seed-flow-%'").get().count,
    partnerLeadsCount: db.prepare("SELECT COUNT(*) AS count FROM partner_leads WHERE id LIKE 'seed-lead-%'").get().count,
    dispositionEventsCount: db
      .prepare("SELECT COUNT(*) AS count FROM partner_lead_disposition_events WHERE id LIKE 'seed-disp-created-%'")
      .get().count,
    leadsByType: db
      .prepare("SELECT lead_type AS leadType, COUNT(*) AS count FROM partner_leads WHERE id LIKE 'seed-lead-%' GROUP BY lead_type")
      .all(),
    leadsByPincode: db
      .prepare("SELECT pincode, COUNT(*) AS count FROM partner_leads WHERE id LIKE 'seed-lead-%' GROUP BY pincode")
      .all(),
  };

  console.log("Seed completed successfully.");
  console.log(JSON.stringify(summary, null, 2));
} finally {
  db.close();
}
