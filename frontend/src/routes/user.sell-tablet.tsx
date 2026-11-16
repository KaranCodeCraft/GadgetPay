import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  getCatalogBrands,
  getCatalogModels,
  type CatalogSeriesGroup,
} from "../lib/api/gadgetpe-client";
import { getBrandLogoUrl } from "../lib/brand-logos";

const DEVICE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";
const DEVICE_DETAILS_STORAGE_KEY = "gadgetpe_user_sell_tablet_device_details";
const PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_tablet_pickup_schedule";
const USER_FLOW_JSON_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_json";
const USER_FLOW_ID_STORAGE_KEY = "gadgetpe_user_sell_tablet_flow_id";

function toTitleCase(str: string) {
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatIpadSeries(series: string) {
  const upper = series.toUpperCase().trim();
  if (upper === "IPAD") return "iPad (Standard)";
  if (upper === "IPAD AIR") return "iPad Air";
  if (upper === "IPAD PRO") return "iPad Pro";
  if (upper === "IPAD MINI") return "iPad mini";
  return toTitleCase(series);
}

function formatModelName(model: string) {
  return model
    .replace(/\bIPAD\b/gi, "iPad")
    .replace(/\bWI-FI\b/gi, "Wi-Fi")
    .replace(/\bWIFI\b/gi, "Wi-Fi")
    .replace(/\bLTE\b/gi, "LTE")
    .replace(/\bGEN\b/gi, "Gen")
    .replace(/\bPRO\b/gi, "Pro")
    .replace(/\bAIR\b/gi, "Air")
    .replace(/\bMINI\b/gi, "mini");
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(Math.round(value));
}

export const Route = createFileRoute("/user/sell-tablet")({
  component: UserSellTabletPage,
});

function UserSellTabletPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search });

  const categoryParam = new URLSearchParams(search).get("category")?.toLowerCase() || new URLSearchParams(search).get("type")?.toLowerCase();
  const rawBrandParam = new URLSearchParams(search).get("brand");
  const selectedSeries = new URLSearchParams(search).get("series");
  const selectedModel = new URLSearchParams(search).get("model");
  const selectedStorageParam = new URLSearchParams(search).get("storage");

  // Determine if user is in the "Sell iPad" flow
  const isIpadSection = categoryParam === "ipad" || categoryParam === "ipads" || rawBrandParam?.toLowerCase() === "apple";

  const selectedBrandSlug = isIpadSection ? "Apple" : rawBrandParam;

  const [brands, setBrands] = useState<string[]>([]);
  const [brandsLoading, setBrandsLoading] = useState(true);
  const [seriesGroups, setSeriesGroups] = useState<CatalogSeriesGroup[]>([]);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});
  const [seriesFilter, setSeriesFilter] = useState<string>(selectedSeries || "ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Keep seriesFilter in sync if URL series param changes
  useEffect(() => {
    if (selectedSeries) {
      setSeriesFilter(selectedSeries.toUpperCase());
    }
  }, [selectedSeries]);

  useEffect(() => {
    if (isIpadSection) {
      // In iPad section, directly fetch Apple iPad models
      setModelsLoading(true);
      getCatalogModels("APPLE", "IPAD")
        .then(({ series }) => setSeriesGroups(series))
        .catch(() => setSeriesGroups([]))
        .finally(() => setModelsLoading(false));
    } else if (rawBrandParam) {
      // Android tablet brand selected
      setModelsLoading(true);
      getCatalogModels(rawBrandParam, "TABLET")
        .then(({ series }) => setSeriesGroups(series))
        .catch(() => setSeriesGroups([]))
        .finally(() => setModelsLoading(false));
    } else {
      // General brand list for tablets
      setBrandsLoading(true);
      getCatalogBrands("TABLET")
        .then(({ brands: b }) => {
          const listWithApple = b.some((brand) => brand.toUpperCase() === "APPLE")
            ? b
            : ["APPLE", ...b];
          setBrands(listWithApple);
        })
        .catch(() => setBrands(["APPLE"]))
        .finally(() => setBrandsLoading(false));
    }
  }, [isIpadSection, rawBrandParam]);

  if (pathname !== "/user/sell-tablet") {
    return <Outlet />;
  }

  const startFlow = (brand: string, series: string, model: string, storage: string, cashifyPrice: number) => {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(DEVICE_DETAILS_STORAGE_KEY);
    window.localStorage.removeItem(PICKUP_SCHEDULE_STORAGE_KEY);
    window.localStorage.removeItem(USER_FLOW_JSON_STORAGE_KEY);
    window.localStorage.removeItem(USER_FLOW_ID_STORAGE_KEY);
    const displayName = isIpadSection ? formatModelName(model) : toTitleCase(model);
    const payload = {
      brandSlug: brand,
      modelId: `${brand}__${series}__${model}__${storage}`,
      modelName: `${displayName} (${storage})`,
      listedPrice: cashifyPrice,
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem(DEVICE_MODEL_STORAGE_KEY, JSON.stringify(payload));
    void navigate({ to: "/user/sell-tablet/device-details" });
  };

  const openVariantSelection = (brand: string, series: string, model: string) => {
    const params = new URLSearchParams();
    if (isIpadSection) params.set("category", "ipad");
    params.set("brand", brand);
    params.set("series", series);
    params.set("model", model);
    void navigate({ to: `/user/sell-tablet?${params.toString()}` });
  };

  // Filtered series groups for the iPad section
  const displayedSeriesGroups = useMemo(() => {
    let groups = seriesGroups;
    if (seriesFilter !== "ALL") {
      groups = groups.filter((sg) => sg.series.toUpperCase() === seriesFilter.toUpperCase());
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      groups = groups
        .map((sg) => ({
          ...sg,
          models: sg.models.filter((m) => m.model.toLowerCase().includes(q) || sg.series.toLowerCase().includes(q)),
        }))
        .filter((sg) => sg.models.length > 0);
    }
    return groups;
  }, [seriesGroups, seriesFilter, searchQuery]);

  // Selected Model Storage Variant / Confirmation View
  if (selectedBrandSlug && selectedSeries && selectedModel) {
    const brandLabel = toTitleCase(selectedBrandSlug);
    const selectedBrandLogoUrl = getBrandLogoUrl(selectedBrandSlug);
    const selectedSeriesGroup = seriesGroups.find((sg) => sg.series.toUpperCase() === selectedSeries.toUpperCase());
    const selectedModelEntry = selectedSeriesGroup?.models.find((m) => m.model === selectedModel);

    if (selectedModelEntry) {
      const displayModelName = isIpadSection ? formatModelName(selectedModel) : toTitleCase(selectedModel);
      const displaySeriesName = isIpadSection ? formatIpadSeries(selectedSeries) : toTitleCase(selectedSeries);

      // Confirmation screen when storage is picked
      if (selectedStorageParam) {
        const storageEntry = selectedModelEntry.storages.find((sv) => sv.storage === selectedStorageParam);
        return (
          <main className="user-seller-page">
            <section className="user-dashboard-shell user-confirm-shell">
              <div className="user-confirm-badge">Your Selection</div>

              <div className="user-confirm-card">
                {selectedBrandLogoUrl ? (
                  <img src={selectedBrandLogoUrl} alt={`${brandLabel} logo`} className="user-confirm-brand-logo" />
                ) : null}
                <div className="user-confirm-details">
                  <p className="user-confirm-brand">{brandLabel}</p>
                  <h2 className="user-confirm-model">{displayModelName}</h2>
                  <span className="user-confirm-storage">{selectedStorageParam}</span>
                </div>
              </div>

              {storageEntry ? (
                <div className="user-confirm-price-block">
                  <span className="user-confirm-price-label">Get Upto</span>
                  <span className="user-confirm-price">&#8377; {formatInr(storageEntry.cashifyPrice)}</span>
                </div>
              ) : null}

              <button
                type="button"
                className="user-confirm-cta"
                disabled={!storageEntry}
                onClick={() => {
                  if (storageEntry) {
                    startFlow(selectedBrandSlug, selectedSeries, selectedModel, selectedStorageParam, storageEntry.cashifyPrice);
                  }
                }}
              >
                Get Exact Value
              </button>

              <button
                type="button"
                className="user-auth-cancel"
                style={{ marginTop: 12 }}
                onClick={() => {
                  const params = new URLSearchParams();
                  if (isIpadSection) params.set("category", "ipad");
                  params.set("brand", selectedBrandSlug);
                  params.set("series", selectedSeries);
                  params.set("model", selectedModel);
                  void navigate({ to: `/user/sell-tablet?${params.toString()}` });
                }}
              >
                ← Change Storage
              </button>
            </section>
          </main>
        );
      }

      // Storage Variant Selection Screen
      return (
        <main className="user-seller-page">
          <section className="user-dashboard-shell">
            <h1 className="user-brand-heading">
              {selectedBrandLogoUrl ? (
                <span className="user-brand-heading-logo-wrap">
                  <img src={selectedBrandLogoUrl} alt={`${brandLabel} logo`} className="user-brand-heading-logo" />
                </span>
              ) : null}
              <span>{displayModelName}</span>
            </h1>
            <p>Select the storage variant for this model.</p>

            <section className="user-variant-panel" aria-label={`${displayModelName} storage variants`}>
              <div>
                <div className="user-variant-eyebrow">{brandLabel} / {displaySeriesName}</div>
                <h2>{displayModelName}</h2>
              </div>
              <div className="user-variant-grid">
                {selectedModelEntry.storages.map((sv) => (
                  <button
                    key={sv.storage}
                    type="button"
                    className="user-storage-chip user-storage-option"
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (isIpadSection) params.set("category", "ipad");
                      params.set("brand", selectedBrandSlug);
                      params.set("series", selectedSeries);
                      params.set("model", selectedModel);
                      params.set("storage", sv.storage);
                      void navigate({ to: `/user/sell-tablet?${params.toString()}` });
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
                onClick={() => {
                  if (isIpadSection) {
                    void navigate({ to: "/user/sell-tablet?category=ipad" });
                  } else {
                    void navigate({ to: `/user/sell-tablet?brand=${encodeURIComponent(selectedBrandSlug)}` });
                  }
                }}
              >
                {isIpadSection ? "Back to iPad Models" : "Back to Models"}
              </button>
            </div>
          </section>
        </main>
      );
    }
  }

  // ── iPad Section (Show ONLY iPad Options) ──
  if (isIpadSection) {
    const appleLogoUrl = getBrandLogoUrl("apple");
    const ipadSeriesList = ["ALL", "IPAD AIR", "IPAD PRO", "IPAD MINI", "IPAD"];

    return (
      <main className="user-seller-page">
        <section className="user-dashboard-shell">
          {/* Category Tabs: iPads vs Other Tablets */}
          <div className="user-category-tabs" role="tablist" aria-label="Device category">
            <button
              type="button"
              role="tab"
              aria-selected="true"
              className="user-category-tab active"
            >
              Sell iPads
            </button>
            <button
              type="button"
              role="tab"
              aria-selected="false"
              className="user-category-tab"
              onClick={() => void navigate({ to: "/user/sell-tablet?category=tablet" })}
            >
              Sell Other Tablets
            </button>
          </div>

          <h1 className="user-brand-heading">
            {appleLogoUrl ? (
              <span className="user-brand-heading-logo-wrap">
                <img src={appleLogoUrl} alt="Apple logo" className="user-brand-heading-logo" />
              </span>
            ) : null}
            <span>Sell Your iPad</span>
          </h1>
          <p>Choose your iPad model below to check the instant cash price and schedule free doorstep pickup.</p>

          {/* Quick Series Filter Chips */}
          <div className="user-series-filter-bar" role="tablist" aria-label="iPad series filter">
            {ipadSeriesList.map((s) => {
              const label = s === "ALL" ? "All iPads" : formatIpadSeries(s);
              const isActive = seriesFilter.toUpperCase() === s.toUpperCase();
              return (
                <button
                  key={s}
                  type="button"
                  className={`user-series-filter-chip${isActive ? " active" : ""}`}
                  onClick={() => setSeriesFilter(s)}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Search iPad Model */}
          <div className="user-model-search-box">
            <input
              type="search"
              className="user-model-search-input"
              placeholder="Search iPad model (e.g. iPad Pro M4, Air 5, 10th Gen)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search iPad models"
            />
          </div>

          {modelsLoading ? (
            <p style={{ color: "#888", marginTop: 16 }}>Loading iPad models...</p>
          ) : displayedSeriesGroups.length === 0 ? (
            <p style={{ color: "#888", marginTop: 16 }}>
              {searchQuery ? `No iPad models found matching "${searchQuery}".` : "No iPad models available."}
            </p>
          ) : (
            displayedSeriesGroups.map((sg) => (
              <section key={sg.series} style={{ marginTop: 24 }}>
                <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 12, color: "#1f3a4e", textTransform: "none" }}>
                  {formatIpadSeries(sg.series)}
                </h2>
                <div className="user-model-grid" aria-label={`${formatIpadSeries(sg.series)} models`}>
                  {sg.models.map((m) => (
                    <button
                      key={m.model}
                      type="button"
                      className="user-model-card user-model-select-card"
                      onClick={() => openVariantSelection("Apple", sg.series, m.model)}
                    >
                      <div className="user-model-meta">
                        <h3>{formatModelName(m.model)}</h3>
                        <p>{m.storages.length} storage {m.storages.length === 1 ? "variant" : "variants"} available</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            ))
          )}

          <div className="user-auth-actions" style={{ marginTop: 28 }}>
            <Link to="/user" className="user-auth-cancel" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Back to User Dashboard
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // ── Android / Other Tablet Brand Models ──
  if (selectedBrandSlug) {
    const brandLabel = toTitleCase(selectedBrandSlug);
    const selectedBrandLogoUrl = getBrandLogoUrl(selectedBrandSlug);

    return (
      <main className="user-seller-page">
        <section className="user-dashboard-shell">
          <h1 className="user-brand-heading">
            {selectedBrandLogoUrl ? (
              <span className="user-brand-heading-logo-wrap">
                <img src={selectedBrandLogoUrl} alt={`${brandLabel} logo`} className="user-brand-heading-logo" />
              </span>
            ) : null}
            <span>{brandLabel} Tablet Models</span>
          </h1>
          <p>Select your model to choose storage on the next step.</p>

          {modelsLoading ? (
            <p style={{ color: "#888", marginTop: 16 }}>Loading models...</p>
          ) : seriesGroups.length === 0 ? (
            <p style={{ color: "#888", marginTop: 16 }}>No models available for this brand yet.</p>
          ) : (
            seriesGroups.map((sg) => (
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
                        <p>{m.storages.length} storage {m.storages.length === 1 ? "variant" : "variants"} available</p>
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
              onClick={() => void navigate({ to: "/user/sell-tablet?category=tablet" })}
            >
              Back to Brand Selection
            </button>
          </div>
        </section>
      </main>
    );
  }

  // ── General / Tablet Brands List ──
  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell">
        {/* Category Tabs: iPads vs Other Tablets */}
        <div className="user-category-tabs" role="tablist" aria-label="Device category">
          <button
            type="button"
            role="tab"
            aria-selected="false"
            className="user-category-tab"
            onClick={() => void navigate({ to: "/user/sell-tablet?category=ipad" })}
          >
            Sell iPads
          </button>
          <button
            type="button"
            role="tab"
            aria-selected="true"
            className="user-category-tab active"
          >
            Sell Other Tablets
          </button>
        </div>

        <h1>Choose a Tablet or iPad Brand</h1>
        <p>Tap any brand tile to start selling that tablet or iPad category.</p>

        {brandsLoading ? (
          <p style={{ color: "#888", marginTop: 16 }}>Loading brands...</p>
        ) : brands.length === 0 ? (
          <p style={{ color: "#888", marginTop: 16 }}>No brands available. Please check back later.</p>
        ) : (
          <section className="user-brand-grid" aria-label="Tablet brands">
            {brands.map((brand) => {
              const isAppleBrand = brand.toUpperCase() === "APPLE";
              const displayName = isAppleBrand ? "Apple (iPad)" : toTitleCase(brand);
              const brandLogoUrl = getBrandLogoUrl(brand);

              return (
                <button
                  key={brand}
                  type="button"
                  className="user-brand-tile"
                  onClick={() => {
                    if (isAppleBrand) {
                      void navigate({ to: "/user/sell-tablet?category=ipad" });
                    } else {
                      void navigate({ to: `/user/sell-tablet?category=tablet&brand=${encodeURIComponent(brand)}` });
                    }
                  }}
                >
                  <span className="user-brand-logo-wrap">
                    {failedLogos[brand] ? (
                      <span className="user-brand-fallback" aria-hidden="true">{displayName.charAt(0)}</span>
                    ) : (
                      <img
                        src={brandLogoUrl}
                        alt={`${displayName} logo`}
                        className="user-brand-logo"
                        loading="lazy"
                        onError={() => setFailedLogos((prev) => ({ ...prev, [brand]: true }))}
                      />
                    )}
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
