import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
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

export const Route = createFileRoute("/user/sell-phone/$brand")({
  component: UserSellPhoneBrandPage,
});

function UserSellPhoneBrandPage() {
  const { brand } = Route.useParams();
  const [seriesGroups, setSeriesGroups] = useState<CatalogSeriesGroup[]>([]);
  const [selectedModel, setSelectedModel] = useState<{ series: string; model: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const brandLabel = toTitleCase(brand);
  const brandLogoUrl = getBrandLogoUrl(brand);

  useEffect(() => {
    setLoading(true);
    setSelectedModel(null);
    getCatalogModels(brand)
      .then(({ series }) => setSeriesGroups(series))
      .catch(() => setSeriesGroups([]))
      .finally(() => setLoading(false));
  }, [brand]);

  const startFlow = (series: string, model: string, storage: string, cashifyPrice: number) => {
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
    window.location.href = "/user/sell-phone/device-details";
  };

  if (!loading && seriesGroups.length === 0) {
    return (
      <main className="user-seller-page">
        <section className="user-dashboard-shell">
          <h1>No Models Found</h1>
          <p>No devices are available for this brand yet.</p>
          <div className="user-auth-actions" style={{ marginTop: 18 }}>
            <Link to="/user/sell-phone" className="user-auth-cancel" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              Back to Brand Selection
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const selectedSeriesGroup = selectedModel ? seriesGroups.find((sg) => sg.series === selectedModel.series) : undefined;
  const selectedModelEntry = selectedModel ? selectedSeriesGroup?.models.find((m) => m.model === selectedModel.model) : undefined;

  if (!loading && selectedModel && selectedModelEntry) {
    return (
      <main className="user-seller-page">
        <section className="user-dashboard-shell">
          <h1 className="user-brand-heading">
            {brandLogoUrl ? (
              <span className="user-brand-heading-logo-wrap">
                <img src={brandLogoUrl} alt={`${brandLabel} logo`} className="user-brand-heading-logo" />
              </span>
            ) : null}
            <span>{toTitleCase(selectedModel.model)}</span>
          </h1>
          <p>Select the storage variant for this model.</p>

          <section className="user-variant-panel" aria-label={`${toTitleCase(selectedModel.model)} storage variants`}>
            <div>
              <div className="user-variant-eyebrow">{brandLabel} / {toTitleCase(selectedModel.series)}</div>
              <h2>{toTitleCase(selectedModel.model)}</h2>
            </div>
            <div className="user-variant-grid">
              {selectedModelEntry.storages.map((sv) => (
                <button
                  key={sv.storage}
                  type="button"
                  className="user-storage-chip user-storage-option"
                  onClick={() => startFlow(selectedModel.series, selectedModel.model, sv.storage, sv.cashifyPrice)}
                >
                  <span>{sv.storage}</span>
                  <span className="user-storage-price">Rs. {formatInr(sv.cashifyPrice)}</span>
                </button>
              ))}
            </div>
          </section>

          <div className="user-auth-actions" style={{ marginTop: 24 }}>
            <button type="button" className="user-auth-cancel" onClick={() => setSelectedModel(null)}>
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
        <h1 className="user-brand-heading">
          {brandLogoUrl ? (
            <span className="user-brand-heading-logo-wrap">
              <img src={brandLogoUrl} alt={`${brandLabel} logo`} className="user-brand-heading-logo" />
            </span>
          ) : null}
          <span>{brandLabel} Models</span>
        </h1>
        <p>Select your model to choose storage on the next step.</p>

        {loading ? (
          <p style={{ color: "#888", marginTop: 16 }}>Loading models...</p>
        ) : (
          seriesGroups.map((sg) => (
            <section key={sg.series} style={{ marginTop: 24 }}>
              <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12, color: "#555" }}>
                {toTitleCase(sg.series)}
              </h2>
              <div className="user-model-grid" aria-label={`${toTitleCase(sg.series)} models`}>
                {sg.models.map((m) => (
                  <button
                    key={m.model}
                    type="button"
                    className="user-model-card user-model-select-card"
                    onClick={() => setSelectedModel({ series: sg.series, model: m.model })}
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
          <Link to="/user/sell-phone" className="user-auth-cancel" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            Back to Brand Selection
          </Link>
        </div>
      </section>
    </main>
  );
}

