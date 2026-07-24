import { z } from "zod";
import { env } from "../../config/env.js";
import { badRequest, notFound } from "../../shared/http/errors.js";
import { getServiceabilityByPincode } from "../../db/repository.js";
import { pincodeProviderClient } from "./pincode-provider.client.js";

function nowIso() {
  return new Date().toISOString();
}

const pincodeSchema = z.string().regex(/^\d{6}$/, "Pincode must be 6 digits");
const resolveScopeSchema = z.object({
  pincode: z.string().regex(/^\d{6}$/),
});

const providerCache = new Map();

function getFromCache(key) {
  const rec = providerCache.get(key);
  if (!rec) return null;

  if (Date.now() > rec.expiresAt) {
    providerCache.delete(key);
    return null;
  }

  return rec.data;
}

function setCache(key, data) {
  providerCache.set(key, {
    data,
    expiresAt: Date.now() + env.pincodeCacheTtlSeconds * 1000,
  });
}

async function fetchPincodeInfo(pincode) {
  const cacheKey = `pin:${pincode}`;
  const cached = getFromCache(cacheKey);
  if (cached) return cached;

  const details = await pincodeProviderClient.getPincodeDetail(pincode);
  if (!details?.state || !details?.district || !Array.isArray(details?.offices)) {
    throw notFound("Pincode not found in provider dataset");
  }

  setCache(cacheKey, details);
  return details;
}

export async function getPincodeDetails(pincodeRaw) {
  const pincode = pincodeSchema.parse(pincodeRaw);
  const provider = await fetchPincodeInfo(pincode);
  const serviceability = getServiceabilityByPincode(pincode) || {
    pincode,
    status: "INACTIVE",
    reason: "Not enabled by admin",
    updatedBy: "system",
    updatedAt: nowIso(),
  };

  return {
    pincode,
    provider,
    serviceability,
  };
}

export async function resolvePartnerTenantScope(inputRaw, partnerId) {
  const input = resolveScopeSchema.parse(inputRaw);
  const record = await getPincodeDetails(input.pincode);

  if (record.serviceability.status !== "ACTIVE") {
    throw badRequest("Selected pincode is currently not serviceable", {
      status: record.serviceability.status,
      pincode: input.pincode,
    });
  }

  return {
    partnerId,
    scopeType: "PINCODE",
    selectedPincode: input.pincode,
    serviceabilityStatus: record.serviceability.status,
    location: {
      state: record.provider.state,
      district: record.provider.district,
      officeCount: record.provider.offices.length,
    },
    offices: record.provider.offices,
  };
}
