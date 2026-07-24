import { createFileRoute, Link } from "@tanstack/react-router";
import { Truck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/user/pickup-status")({
  component: UserPickupStatusPage,
});

const PICKUP_SCHEDULE_STORAGE_KEY = "gadgetpe_user_sell_phone_pickup_schedule";
const SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";

type PickupSchedule = {
  modelName?: string;
  listedPrice?: number;
  primaryDate?: string;
  primaryTime?: string;
  alternateDate?: string;
  alternateTime?: string;
  sellerName?: string;
  callingPhoneNumber?: string;
  addressLine?: string;
  landmark?: string;
  city?: string;
  updatedAt?: string;
};

type HistoryItem = {
  id?: string;
  selectedModel?: {
    modelName?: string;
    listedPrice?: number;
  };
  pickupSchedule?: PickupSchedule;
  updatedAt?: string;
};

type PickupRow = {
  id: string;
  modelName: string;
  listedPrice: number;
  primaryDate?: string;
  primaryTime?: string;
  city?: string;
  addressLine?: string;
  phone?: string;
  updatedAt?: string;
  status: "Scheduled" | "Awaiting Assignment";
};

function getStoredPickupSchedule() {
  if (typeof window === "undefined") return null as PickupSchedule | null;
  try {
    const raw = window.localStorage.getItem(PICKUP_SCHEDULE_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PickupSchedule;
  } catch {
    return null;
  }
}

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

function formatPickupDate(value?: string) {
  if (!value) return "Date pending";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function UserPickupStatusPage() {
  const [pickupSchedule, setPickupSchedule] = useState<PickupSchedule | null>(null);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setPickupSchedule(getStoredPickupSchedule());
    setHistoryItems(getSellingHistory());
  }, []);

  const pickupRows = useMemo(() => {
    const rowsFromHistory: PickupRow[] = historyItems
      .filter((item) => item.pickupSchedule)
      .map((item, index) => ({
        id: item.id || `history-pickup-${item.updatedAt || index}`,
        modelName: item.selectedModel?.modelName || item.pickupSchedule?.modelName || "Phone listing",
        listedPrice: item.selectedModel?.listedPrice || item.pickupSchedule?.listedPrice || 0,
        primaryDate: item.pickupSchedule?.primaryDate,
        primaryTime: item.pickupSchedule?.primaryTime,
        city: item.pickupSchedule?.city,
        addressLine: item.pickupSchedule?.addressLine,
        phone: item.pickupSchedule?.callingPhoneNumber,
        updatedAt: item.updatedAt || item.pickupSchedule?.updatedAt,
        status: "Scheduled",
      }));

    const hasCurrentSchedule = Boolean(
      pickupSchedule?.primaryDate
      && pickupSchedule.primaryTime
      && !rowsFromHistory.some(
        (row) => row.primaryDate === pickupSchedule.primaryDate && row.primaryTime === pickupSchedule.primaryTime,
      ),
    );

    if (!hasCurrentSchedule || !pickupSchedule) {
      return rowsFromHistory;
    }

    return [
      {
        id: `latest-${pickupSchedule.updatedAt || "pickup"}`,
        modelName: pickupSchedule.modelName || "Phone listing",
        listedPrice: pickupSchedule.listedPrice || 0,
        primaryDate: pickupSchedule.primaryDate,
        primaryTime: pickupSchedule.primaryTime,
        city: pickupSchedule.city,
        addressLine: pickupSchedule.addressLine,
        phone: pickupSchedule.callingPhoneNumber,
        updatedAt: pickupSchedule.updatedAt,
        status: "Awaiting Assignment",
      },
      ...rowsFromHistory,
    ];
  }, [historyItems, pickupSchedule]);

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-dashboard-shell-pro">
        <div className="user-auth-brand">Seller Action</div>
        <h1>Pickup Status</h1>
        <section className="user-action-route-card">
          <span className="user-action-icon"><Truck size={18} /></span>
          <h2>Pickup Tracking</h2>
          <p>Monitor all pickup requests and their current assignment status.</p>

          {pickupRows.length > 0 ? (
            <div className="user-selling-history-list" style={{ marginTop: 10 }}>
              {pickupRows.map((row) => (
                <article className="user-selling-history-card" key={row.id}>
                  <div>
                    <h3>{row.modelName}</h3>
                    <p>
                      Status: {row.status}
                      {row.primaryDate ? ` | Pickup: ${formatPickupDate(row.primaryDate)}` : ""}
                      {row.primaryTime ? `, ${row.primaryTime}` : ""}
                    </p>
                    <small>
                      Price: Rs. {formatInr(row.listedPrice)}
                      {row.phone ? ` | Phone: ${row.phone}` : ""}
                      {row.city ? ` | City: ${row.city}` : ""}
                    </small>
                    {(row.addressLine || row.updatedAt) ? (
                      <small style={{ display: "block", marginTop: 4 }}>
                        {row.addressLine ? `Address: ${row.addressLine}` : ""}
                        {row.updatedAt ? ` ${row.addressLine ? "|" : ""} Updated: ${new Date(row.updatedAt).toLocaleString("en-IN")}` : ""}
                      </small>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="user-action-route-empty">No pickup requests yet. Schedule a pickup after quote verification to see updates here.</div>
          )}

          <div className="user-auth-actions" style={{ marginTop: 18 }}>
            <Link to="/user" className="user-auth-cancel user-inline-link">Back to Dashboard</Link>
          </div>
        </section>
      </section>
    </main>
  );
}
