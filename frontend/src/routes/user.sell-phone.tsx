import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  getCatalogBrands,
  getCatalogModels,
  type CatalogSeriesGroup,
} from "../lib/api/gadgetpe-client";
import { getBrandLogoUrl } from "../lib/brand-logos";

const DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_phone_selected_model";
const DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_phone_device_details";
const PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_phone_pickup_schedule";
const USER_FLOW_JSON_STORAGE_KEY = "gadgetpe_user_sell_phone_flow_json";
const USER_FLOW_ID_STORAGE_KEY = "gadgetpe_user_sell_phone_flow_id";

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

export const Route = createFileRoute("/user/sell-phone")({
  component: UserSellPhonePage,
});

function UserSellPhonePage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const [brands, setBrands] = useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [seriesGroups, setSeriesGroups] = useState<CatalogSeriesGroup[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [loadedLogos, setLoadedLogos] = useState<Record<string, boolean>>({});
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});

  const searchString = typeof window !== "undefined" ? window.location.search : "";
  const queryParams = new URLSearchParams(searchString);
  const selectedBrandSlug = queryParams.get("brand");
  const selectedSeries = queryParams.get("series");
  const selectedModel = queryParams.get("model");
  const selectedStorageParam = queryParams.get("storage");

  useEffect(() => {
    setBrandsLoading(true);
    getCatalogBrands()
      .then(({ brands: b }) => setBrands(b))
      .catch(() => setBrands([]))
      .finally(() => setBrandsLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedBrandSlug) {
      if (!selectedBrandSlug) {
        setSeriesGroups([]);
        setModelSearch("");
      }
      return;
    }
    setModelsLoading(true);
    getCatalogModels(selectedBrandSlug)
      .then(({ series }) => setSeriesGroups(series))
      .catch(() => setSeriesGroups([]))
      .finally(() => setModelsLoading(false));
  }, [selectedBrandSlug]);

  if (pathname !== "/user/sell-phone") {
    return <Outlet />;
  }

  const startFlow = (brand: string, series: string, model: string, storage: string, cashifyPrice: number) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(DEVICE_DETAILS_STORAGE_KEY);
    window.localStorage.removeItem(PICKUP_SCHEDULE_STORAGE_KEY);
    window.localStorage.removeItem(USER_FLOW_JSON_STORAGE_KEY);
    window.localStorage.removeItem(USER_FLOW_ID_STORAGE_KEY);
    const payload = {
      brandSlug: brand,
      modelId: `${brand}__${series}__${model}__${storage}`,
      modelName: `${toTitleCase(model)} (${storage})`,
      listedPrice: cashifyPrice,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DEVICE_MODEL_STORAGE_KEY, JSON.stringify(payload));
    void navigate({ to: "/user/sell-phone/device-details" });
  };

  const openVariantSelection = (brand: string, series: string, model: string) => {
    const params = new URLSearchParams({ brand, series, model });
    void navigate({ to: `/user/sell-phone?${params.toString()}` });
  };

  if (selectedBrandSlug) {
    const brandLabel = toTitleCase(selectedBrandSlug);
    const selectedBrandLogoUrl = getBrandLogoUrl(selectedBrandSlug);
    const selectedSeriesGroup = selectedSeries ? seriesGroups.find((sg) => sg.series === selectedSeries) : undefined;
    const selectedModelEntry = selectedModel ? selectedSeriesGroup?.models.find((m) => m.model === selectedModel) : undefined;
    const modelSearchQuery = modelSearch.trim().toLowerCase();
    const filteredSeriesGroups = modelSearchQuery
      ? seriesGroups
          .map((sg) => {
            const seriesMatches = toTitleCase(sg.series).toLowerCase().includes(modelSearchQuery) || sg.series.toLowerCase().includes(modelSearchQuery);
            const brandMatches = brandLabel.toLowerCase().includes(modelSearchQuery) || selectedBrandSlug.toLowerCase().includes(modelSearchQuery);
            const models = sg.models.filter((m) => {
              const searchableText = [
                brandLabel,
                selectedBrandSlug,
                sg.series,
                toTitleCase(sg.series),
                m.model,
                toTitleCase(m.model),
                `${m.storages.length} storage`,
                `${m.storages.length} variant`,
                ...m.storages.map((sv) => sv.storage),
              ].join(" ").toLowerCase();
              return brandMatches || seriesMatches || searchableText.includes(modelSearchQuery);
            });
            return { ...sg, models };
          })
          .filter((sg) => sg.models.length > 0)
      : seriesGroups;

    if (selectedSeries && selectedModel && selectedModelEntry) {
      // ── Confirmation page: storage selected, show details + Get Exact Value CTA ──
      if (selectedStorageParam) {
        const storageEntry = selectedModelEntry.storages.find((sv) => sv.storage === selectedStorageParam);
        return (
          <main className="user-seller-page">
            <section className="user-dashboard-shell user-confirm-shell">
              <div className="user-confirm-badge">Your Selection</div>

              <div className="user-confirm-card">
                {selectedBrandLogoUrl && (
                  <img src={selectedBrandLogoUrl} alt={`${brandLabel} logo`} className="user-confirm-brand-logo" />
                )}
                <div className="user-confirm-details">
                  <p className="user-confirm-brand">{brandLabel}</p>
                  <h2 className="user-confirm-model">{toTitleCase(selectedModel)}</h2>
                  <span className="user-confirm-storage">{selectedStorageParam}</span>
                </div>
              </div>

              {storageEntry && (
                <div className="user-confirm-price-block">
                  <span className="user-confirm-price-label">Get Upto</span>
                  <span className="user-confirm-price">&#8377; {formatInr(storageEntry.cashifyPrice)}</span>
                </div>
              )}

              <button
                type="button"
                className="user-confirm-cta"
                disabled={!storageEntry}
                onClick={() => {
                  if (storageEntry) startFlow(selectedBrandSlug, selectedSeries, selectedModel, selectedStorageParam, storageEntry.cashifyPrice);
                }}
              >
                Get Exact Value
              </button>

              <button
                type="button"
                className="user-auth-cancel"
                style={{ marginTop: 12 }}
                onClick={() => void navigate({ to: `/user/sell-phone?brand=${encodeURIComponent(selectedBrandSlug)}&series=${encodeURIComponent(selectedSeries)}&model=${encodeURIComponent(selectedModel)}` })}
              >
                ← Change Storage
              </button>
            </section>
          </main>
        );
      }

      // ── Storage selection page ──
      return (
        <main className="user-seller-page">
          <section className="user-dashboard-shell">
            <h1 className="user-brand-heading">
              {selectedBrandLogoUrl ? (
                <span className="user-brand-heading-logo-wrap">
                  <img src={selectedBrandLogoUrl} alt={`${brandLabel} logo`} className="user-brand-heading-logo" />
                </span>
              ) : null}
              <span>{toTitleCase(selectedModel)}</span>
            </h1>
            <p>Select the storage size.</p>

            <section className="user-variant-panel" aria-label={`${toTitleCase(selectedModel)} storage variants`}>
              <div>
                <div className="user-variant-eyebrow">{brandLabel} / {toTitleCase(selectedSeries)}</div>
                <h2>{toTitleCase(selectedModel)}</h2>
              </div>
              <div className="user-variant-grid">
                {selectedModelEntry.storages.map((sv) => (
                  <button
                    key={sv.storage}
                    type="button"
                    className="user-storage-chip user-storage-option"
                    onClick={() => {
                      const params = new URLSearchParams({ brand: selectedBrandSlug, series: selectedSeries, model: selectedModel, storage: sv.storage });
                      void navigate({ to: `/user/sell-phone?${params.toString()}` });
                    }}
                  >
                    <span>{sv.storage}</span>
                  </button>
                ))}
              </div>
            </section>

            <div className="user-auth-actions" style={{ marginTop: 24 }}>
              <button
                type="button"
                className="user-auth-cancel"
                onClick={() => void navigate({ to: `/user/sell-phone?brand=${encodeURIComponent(selectedBrandSlug)}` })}
              >
                Back to Models
              </button>
            </div>
          </section>
        </main>
      );
    }

    return (
      <main className="user-seller-page">
        <section className="user-dashboard-shell">
          <div className="user-brand-toolbar">
            <div>
              <h1 className="user-brand-heading">
                {selectedBrandLogoUrl ? (
                  <span className="user-brand-heading-logo-wrap">
                    <img src={selectedBrandLogoUrl} alt={`${brandLabel} logo`} className="user-brand-heading-logo" />
                  </span>
                ) : null}
                <span>{brandLabel} Models</span>
              </h1>
              <p>Select your model to choose storage on the next step.</p>
            </div>
            <label className="user-model-search">
              <span>Search models</span>
              <input
                type="search"
                value={modelSearch}
                onChange={(event) => setModelSearch(event.target.value)}
                placeholder="Search iPhone, Pro, 128GB"
              />
            </label>
          </div>

          {modelsLoading ? (
            <p style={{ color: "#888", marginTop: 16 }}>Loading models...</p>
          ) : seriesGroups.length === 0 ? (
            <p style={{ color: "#888", marginTop: 16 }}>No models available for this brand yet.</p>
          ) : filteredSeriesGroups.length === 0 ? (
            <p style={{ color: "#888", marginTop: 16 }}>No models match your search.</p>
          ) : (
            filteredSeriesGroups.map((sg) => (
              <section key={sg.series} style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12, color: "#555", textTransform: "none" }}>
                  {toTitleCase(sg.series)}
                </h2>
                <div className="user-model-grid" aria-label={`${toTitleCase(sg.series)} models`}>
                  {sg.models.map((m) => (
                    <button
                      key={m.model}
                      type="button"
                      className="user-model-card user-model-select-card"
                      onClick={() => openVariantSelection(selectedBrandSlug, sg.series, m.model)}
                    >
                      <div className="user-model-meta">
                        <h3>{toTitleCase(m.model)}</h3>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}

          <div className="user-auth-actions" style={{ marginTop: 24 }}>
            <button
              type="button"
              className="user-auth-cancel"
              onClick={() => void navigate({ to: "/user/sell-phone" })}
            >
              Back to Brand Selection
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell">
        <h1>Choose a Phone Brand</h1>
        <p>Tap any brand tile to start selling that phone category.</p>

        {brandsLoading ? (
          <p style={{ color: "#888", marginTop: 16 }}>Loading brands...</p>
        ) : brands.length === 0 ? (
          <p style={{ color: "#888", marginTop: 16 }}>No brands available. Please check back later.</p>
        ) : (
          <section className="user-brand-grid" aria-label="Phone brands">
            {brands.map((brand) => {
              const displayName = toTitleCase(brand);
              const brandLogoUrl = getBrandLogoUrl(brand);
              return (
                <button
                  key={brand}
                  type="button"
                  className="user-brand-tile"
                  onClick={() => void navigate({ to: `/user/sell-phone?brand=${encodeURIComponent(brand)}` })}
                >
                  <span className="user-brand-logo-wrap">
                    {!loadedLogos[brand] ? (
                      <span className="user-brand-fallback" aria-hidden="true">{displayName.charAt(0)}</span>
                    ) : null}
                    {brandLogoUrl && !failedLogos[brand] ? (
                      <img
                        src={brandLogoUrl}
                        alt={`${displayName} logo`}
                        className="user-brand-logo"
                        loading="lazy"
                        onLoad={() => setLoadedLogos((prev) => ({ ...prev, [brand]: true }))}
                        onError={() => setFailedLogos((prev) => ({ ...prev, [brand]: true }))}
                        style={{ opacity: loadedLogos[brand] ? 1 : 0 }}
                      />
                    ) : null}
                  </span>
                  <span className="user-brand-name">{displayName}</span>
                </button>
              );
            })}
          </section>
        )}

        {!brandsLoading ? (
          <div className="user-auth-actions" style={{ marginTop: 18 }}>
            <Link to="/user" className="user-auth-cancel" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Back to User Dashboard
            </Link>
          </div>
        ) : null}
      </section>
    </main>
  );
}

