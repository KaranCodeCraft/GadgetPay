import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/user/selling-history")({
  component: UserSellingHistoryPage,
});

type SellingHistoryItem = {
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

const SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";

function getSellingHistory() {
  if (typeof window === "undefined") return [] as SellingHistoryItem[];
  try {
    const raw = window.localStorage.getItem(SELLING_HISTORY_STORAGE_KEY);
    if (!raw) return [] as SellingHistoryItem[];
    return JSON.parse(raw) as SellingHistoryItem[];
  } catch {
    return [] as SellingHistoryItem[];
  }
}

function formatPickupDate(value?: string) {
  if (!value) return "Pickup scheduled";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatInr(value: number) {
  return new Intl.NumberFormat("en-IN").format(value);
}

function UserSellingHistoryPage() {
  const [sellingHistory, setSellingHistory] = useState<SellingHistoryItem[]>([]);

  useEffect(() => {
    setSellingHistory(getSellingHistory());
  }, []);

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-dashboard-shell-pro">
        <div className="user-auth-brand">Seller Action</div>
        <h1>Seller History</h1>
        <p>Completed pickup schedules saved locally are shown here so the root dashboard stays focused.</p>

        {sellingHistory.length > 0 ? (
          <div className="user-selling-history-list">
            {sellingHistory.map((historyItem) => (
              <article className="user-selling-history-card" key={historyItem.id || historyItem.updatedAt}>
                {historyItem.selectedModel?.thumbnailUrl ? (
                  <img src={historyItem.selectedModel.thumbnailUrl} alt={`${historyItem.selectedModel.modelName || "Phone"} thumbnail`} />
                ) : null}
                <div>
                  <h3>{historyItem.selectedModel?.modelName || "Phone sale"}</h3>
                  <p>
                    Pickup: {formatPickupDate(historyItem.pickupSchedule?.primaryDate)}
                    {historyItem.pickupSchedule?.primaryTime ? `, ${historyItem.pickupSchedule.primaryTime}` : ""}
                  </p>
                  <small>
                    Selling Price: Rs. {formatInr(historyItem.selectedModel?.listedPrice || 0)}
                    {historyItem.pickupSchedule?.callingPhoneNumber ? ` | Phone: ${historyItem.pickupSchedule.callingPhoneNumber}` : ""}
                  </small>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="user-action-route-empty">No seller history yet. Complete a pickup schedule to see it here.</div>
        )}

        <div className="user-auth-actions" style={{ marginTop: 18 }}>
          <Link to="/user" className="user-auth-cancel user-inline-link">Back to Dashboard</Link>
        </div>
      </section>
    </main>
  );
}
