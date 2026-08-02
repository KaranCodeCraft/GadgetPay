import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getUserMe, listUserSellFlows } from "../lib/api/gadgetpe-client";
import { ArrowLeft, Phone, User, Calendar, ShoppingBag, BadgeCheck } from "lucide-react";

const USER_TOKEN_KEY = "gadgetpe_user_access_token";
const USER_NAME_KEY  = "gadgetpe_user_name";
const USER_ID_KEY    = "gadgetpe_user_id";

function formatInr(v: number) {
  return new Intl.NumberFormat("en-IN").format(v);
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
}

export const Route = createFileRoute("/user/profile")({
  component: UserProfilePage,
});

function UserProfilePage() {
  // Synchronous init from localStorage — never shows loading state
  const [name, setName] = useState(() =>
    typeof window !== "undefined" ? (window.localStorage.getItem(USER_NAME_KEY) || "User") : "User"
  );
  const [phone, setPhone] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [salesCount, setSalesCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);

  useEffect(() => {
    const token = window.localStorage.getItem(USER_TOKEN_KEY);
    if (!token) return;

    // Fetch profile details in background — page already shows content above
    Promise.allSettled([
      getUserMe(token),
      listUserSellFlows(token, { limit: 100 }),
    ]).then(([meResult, flowsResult]) => {
      if (meResult.status === "fulfilled") {
        const u = meResult.value.user;
        setName(u.name || name);
        setPhone((u as unknown as Record<string, string>).phone || null);
        setCreatedAt((u as unknown as Record<string, string>).createdAt);
      }
      if (flowsResult.status === "fulfilled") {
        const rows = flowsResult.value.rows ?? [];
        const completed = rows.filter((f) => f.status === "PICKUP_SCHEDULED" || f.status === "COMPLETED");
        setSalesCount(completed.length);
        setTotalValue(completed.reduce((s, f) => s + (f.selectedModel?.listedPrice ?? 0), 0));
      }
    }).catch(() => { /* silent */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-profile-shell">
        {/* Back */}
        <Link to="/user" className="user-profile-back">
          <ArrowLeft size={16} />
          <span>Back</span>
        </Link>

        {/* Avatar + name card */}
        <div className="user-profile-hero">
          <div className="user-profile-hero-info">
            <h1 className="user-profile-name">{name}</h1>
            <span className="user-profile-badge"><BadgeCheck size={13} />GadgetPe Seller</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="user-profile-stats">
          <div className="user-profile-stat">
            <ShoppingBag size={20} strokeWidth={1.5} />
            <div>
              <span className="user-profile-stat-value">{salesCount}</span>
              <span className="user-profile-stat-label">Completed Sales</span>
            </div>
          </div>
          <div className="user-profile-stat">
            <span className="user-profile-stat-currency">₹</span>
            <div>
              <span className="user-profile-stat-value">{formatInr(totalValue)}</span>
              <span className="user-profile-stat-label">Total Quoted Value</span>
            </div>
          </div>
        </div>

        {/* Details card */}
        <div className="user-profile-details-card">
          <h2 className="user-profile-section-title">Account Details</h2>

          <div className="user-profile-detail-row">
            <User size={16} strokeWidth={1.5} />
            <div>
              <span className="user-profile-detail-label">Full Name</span>
              <span className="user-profile-detail-value">{name}</span>
            </div>
          </div>

          <div className="user-profile-detail-row">
            <Phone size={16} strokeWidth={1.5} />
            <div>
              <span className="user-profile-detail-label">Phone</span>
              <span className="user-profile-detail-value">{phone ? `+91 ${phone}` : "—"}</span>
            </div>
          </div>

          {createdAt && (
            <div className="user-profile-detail-row">
              <Calendar size={16} strokeWidth={1.5} />
              <div>
                <span className="user-profile-detail-label">Member Since</span>
                <span className="user-profile-detail-value">{formatDate(createdAt)}</span>
              </div>
            </div>
          )}
        </div>

        {/* Actions
        <div className="user-profile-actions">
          <Link to="/user/sell-phone" className="user-auth-submit user-inline-link" style={{ textAlign: "center" }}>
            Sell a Phone
          </Link>
          <Link to="/user/selling-history" className="user-auth-cancel user-inline-link" style={{ textAlign: "center" }}>
            Seller History
          </Link>
        </div>
        */}
      </section>
    </main>
  );
}
