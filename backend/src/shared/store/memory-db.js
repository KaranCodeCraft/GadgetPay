const otpStore = new Map();
const refreshTokenStore = new Map();
const partnerStore = new Map();
const serviceabilityStore = new Map();

function nowIso() {
  return new Date().toISOString();
}

serviceabilityStore.set("560001", {
  pincode: "560001",
  status: "ACTIVE",
  reason: "Seed active zone",
  updatedBy: "system",
  updatedAt: nowIso(),
});

serviceabilityStore.set("110001", {
  pincode: "110001",
  status: "INACTIVE",
  reason: "Seed inactive zone",
  updatedBy: "system",
  updatedAt: nowIso(),
});

export const db = {
  otpStore,
  refreshTokenStore,
  partnerStore,
  serviceabilityStore,
};

export { nowIso };
