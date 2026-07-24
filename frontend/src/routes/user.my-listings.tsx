import { createFileRoute, Link } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/user/my-listings")({
  component: UserMyListingsPage,
});

const SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
const DEVICE_PHONE_MODEL_STORAGE_KEY = "gadgetpe_user_sell_phone_selected_model";
const DEVICE_TABLET_MODEL_STORAGE_KEY = "gadgetpe_user_sell_tablet_selected_model";

type HistoryItem = {
  id?: string;
  selectedModel?: {
    modelName?: string;
    listedPrice?: number;
    thumbnailUrl?: string;
  };
  pickupSchedule?: {
    primaryDate?: string;
    primaryTime?: string;
    callingPhoneNumber?: string;
  };
  updatedAt?: string;
};

type DraftModel = {
  modelName?: string;
  listedPrice?: number;
  thumbnailUrl?: string;
  updatedAt?: string;
};

type ListingRow = {
  id: string;
  modelName: string;
  listedPrice: number;
  thumbnailUrl?: string;
  updatedAt?: string;
  phone?: string;
  primaryDate?: string;
  primaryTime?: string;
  status: "Draft" | "Pickup Scheduled";
};

function getSellingHistory() {
  if (typeof window === "undefined") return [] as HistoryItem[];
  try {
    const raw = window.localStorage.getItem(SELLING_HISTORY_STORAGE_KEY);
    if (!raw) return [] as HistoryItem[];
    return JSON.parse(raw) as HistoryItem[];
  } catch {
    return [] as HistoryItem[];
  }
}

function getDraftModel() {
  if (typeof window === "undefined") return null as DraftModel | null;
  try {
    const tabletRaw = window.localStorage.getItem(DEVICE_TABLET_MODEL_STORAGE_KEY);
    if (tabletRaw) return JSON.parse(tabletRaw) as DraftModel;

    const phoneRaw = window.localStorage.getItem(DEVICE_PHONE_MODEL_STORAGE_KEY);
    if (phoneRaw) return JSON.parse(phoneRaw) as DraftModel;

    return null;
  } catch {
    return null;
  }
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function formatPickupDate(value?: string) {
  if (!value) return "Date pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function UserMyListingsPage() {
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [draftModel, setDraftModel] = useState<DraftModel | null>(null);

  useEffect(() => {
    setHistoryItems(getSellingHistory());
    setDraftModel(getDraftModel());
  }, []);

  const listings = useMemo(() => {
    const scheduledRows: ListingRow[] = historyItems.map((item, index) => ({
      id: item.id || `history-${item.updatedAt || index}`,
      modelName: item.selectedModel?.modelName || "Device listing",
      listedPrice: item.selectedModel?.listedPrice || 0,
      thumbnailUrl: item.selectedModel?.thumbnailUrl,
      updatedAt: item.updatedAt,
      phone: item.pickupSchedule?.callingPhoneNumber,
      primaryDate: item.pickupSchedule?.primaryDate,
      primaryTime: item.pickupSchedule?.primaryTime,
      status: "Pickup Scheduled",
    }));

    const hasDraft = Boolean(
      draftModel?.modelName
      && !scheduledRows.some((row) => row.modelName === draftModel.modelName),
    );

    if (!hasDraft || !draftModel?.modelName) {
      return scheduledRows;
    }

    return [
      {
        id: `draft-${draftModel.updatedAt || "current"}`,
        modelName: draftModel.modelName,
        listedPrice: draftModel.listedPrice || 0,
        thumbnailUrl: draftModel.thumbnailUrl,
        updatedAt: draftModel.updatedAt,
        status: "Draft",
      },
      ...scheduledRows,
    ];
  }, [draftModel, historyItems]);

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-dashboard-shell-pro">
        <div className="user-auth-brand">Seller Action</div>
        <h1>My Listings</h1>
        <section className="user-action-route-card">
          <span className="user-action-icon"><ListChecks size={18} /></span>
          <h2>Listing Workspace</h2>
          <p>Track your drafted listings and pickup-scheduled listings in one place.</p>
          {listings.length > 0 ? (
            <div className="user-selling-history-list" style={{ marginTop: 10 }}>
              {listings.map((listing) => (
                <article className="user-selling-history-card" key={listing.id}>
                  {listing.thumbnailUrl ? (
                    <img src={listing.thumbnailUrl} alt={`${listing.modelName} thumbnail`} />
                  ) : null}
                  <div>
                    <h3>{listing.modelName}</h3>
                    <p>
                      Status: {listing.status}
                      {listing.primaryDate ? ` | Pickup: ${formatPickupDate(listing.primaryDate)}` : ""}
                      {listing.primaryTime ? `, ${listing.primaryTime}` : ""}
                    </p>
                    <small>
                      Listed Price: Rs. {formatInr(listing.listedPrice)}
                      {listing.phone ? ` | Phone: ${listing.phone}` : ""}
                    </small>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="user-action-route-empty">No listings yet. Start with Sell Phone or Sell Tablet to create your first listing.</div>
          )}
          <div className="user-auth-actions" style={{ marginTop: 18 }}>
            <Link to="/user" className="user-auth-cancel user-inline-link">Back to Dashboard</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
