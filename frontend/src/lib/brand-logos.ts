const BRAND_LOGO_BASE_PATH = "/assets/brands";

const BRAND_LOGO_BY_SLUG: Record<string, string> = {
  apple: `${BRAND_LOGO_BASE_PATH}/apple.png`,
  iphone: `${BRAND_LOGO_BASE_PATH}/apple.png`,
  samsung: `${BRAND_LOGO_BASE_PATH}/samsung.jpg`,
  oneplus: `${BRAND_LOGO_BASE_PATH}/oneplus.png`,
  one: `${BRAND_LOGO_BASE_PATH}/oneplus.png`,
  oppo: `${BRAND_LOGO_BASE_PATH}/Oppo-Logo.wine.png`,
  poco: `${BRAND_LOGO_BASE_PATH}/POCO-Emblem.png`,
};

const BRAND_SLUG_ALIASES: Record<string, string> = {
  "one plus": "oneplus",
  one_plus: "oneplus",
  oneplusmobiles: "oneplus",
  pocoindia: "poco",
};

export function getBrandLogoUrl(brand: string | null | undefined) {
  if (!brand) return undefined;

  const normalized = brand.trim().toLowerCase();
  const alias = BRAND_SLUG_ALIASES[normalized];
  const compactSlug = (alias ?? normalized).replace(/[^a-z0-9]/g, "");

  return BRAND_LOGO_BY_SLUG[alias ?? normalized] ?? BRAND_LOGO_BY_SLUG[compactSlug];
}