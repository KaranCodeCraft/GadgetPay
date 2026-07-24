import { upstreamError } from "../../shared/http/errors.js";

const BASE_URL = "https://aniket-thapa.github.io/india-pincode-api";

async function fetchJson(path) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw upstreamError("India pincode provider request failed", {
      status: res.status,
      url,
    });
  }

  return res.json();
}

export const pincodeProviderClient = {
  getStates() {
    return fetchJson("/states.json");
  },
  getStateDetail(stateSlug) {
    return fetchJson(`/states/${stateSlug}.json`);
  },
  getDistrictDetail(stateSlug, districtSlug) {
    return fetchJson(`/districts/${stateSlug}/${districtSlug}.json`);
  },
  getPincodeDetail(pincode) {
    return fetchJson(`/pincodes/${pincode}.json`);
  },
};
