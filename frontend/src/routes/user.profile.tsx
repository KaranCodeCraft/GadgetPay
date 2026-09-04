import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiClientError, deleteUserAccount, ensureRoleAccessToken, getUserMe, listUserSellFlows, updateUserProfile } from "../lib/api/gadgetpe-client";
import { clearRoleSession } from "../lib/auth/role-session";
import { AlertTriangle, ArrowLeft, BadgeCheck, Calendar, Loader2, Menu, Pencil, Phone, Save, ShoppingBag, Trash2, User, X } from "lucide-react";

const USER_TOKEN_KEY = "gadgetpe_user_access_token";
const USER_REFRESH_KEY = "gadgetpe_user_refresh_token";
const USER_NAME_KEY  = "gadgetpe_user_name";
const USER_ID_KEY    = "gadgetpe_user_id";
const USER_SCOPE_KEY = "gadgetpe_user_scope";
const SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
const USER_POST_LOGIN_SELL_MODAL_FLAG_KEY = "gadgetpe_user_post_login_sell_modal";

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
  const navigate = useNavigate();
  // Synchronous init from localStorage — never shows loading state
  const [name, setName] = useState(() =>
    typeof window !== "undefined" ? (window.localStorage.getItem(USER_NAME_KEY) || "User") : "User"
  );
  const [draftName, setDraftName] = useState(name);
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [salesCount, setSalesCount] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

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
        const fetchedName = u.name || name;
        setName(fetchedName);
        setDraftName(fetchedName);
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

  const handleSaveName = async () => {
    const token = window.localStorage.getItem(USER_TOKEN_KEY);
    if (!token) {
      toast.error("Please login again to update your profile.");
      return;
    }

    const nextName = draftName.trim();
    if (nextName.length < 2) {
      toast.error("Full name must be at least 2 characters.");
      return;
    }

    setSavingName(true);
    try {
      const result = await updateUserProfile(token, { name: nextName });
      setName(result.user.name);
      setDraftName(result.user.name);
      window.localStorage.setItem(USER_NAME_KEY, result.user.name);
      setEditingName(false);
      toast.success("Profile name updated.");
    } catch (err) {
      toast.error(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to update profile name.");
    } finally {
      setSavingName(false);
    }
  };

  const clearLocalUserAccountData = () => {
    clearRoleSession("user");
    [
      USER_TOKEN_KEY,
      USER_REFRESH_KEY,
      USER_NAME_KEY,
      USER_ID_KEY,
      USER_SCOPE_KEY,
      SELLING_HISTORY_STORAGE_KEY,
      USER_POST_LOGIN_SELL_MODAL_FLAG_KEY,
    ].forEach((key) => window.localStorage.removeItem(key));
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== "DELETE") {
      toast.error("Type DELETE to confirm account deletion.");
      return;
    }

    const token = window.localStorage.getItem(USER_TOKEN_KEY) || await ensureRoleAccessToken("user");
    if (!token) {
      toast.error("Please login again to delete your account.");
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteUserAccount(token);
      clearLocalUserAccountData();
      toast.success("Your account has been deleted.");
      void navigate({ to: "/user" });
    } catch (err) {
      toast.error(err instanceof ApiClientError || err instanceof Error ? err.message : "Failed to delete account.");
    } finally {
      setDeletingAccount(false);
    }
  };

  return (
    <main className="user-seller-page">
      <section className="user-dashboard-shell user-profile-shell">
        <div className="user-profile-topbar">
          <Link to="/user" className="user-profile-back">
            <ArrowLeft size={16} />
            <span>Back</span>
          </Link>

          <div className="user-profile-menu-wrap">
            <button
              type="button"
              className="gp-hamburger user-profile-menu-button"
              aria-label="Profile menu"
              aria-expanded={hamburgerOpen}
              onClick={() => setHamburgerOpen((prev) => !prev)}
            >
              <Menu size={20} color="#3d4a5c" />
            </button>
            {hamburgerOpen && (
              <nav className="gp-hamburger-menu user-profile-menu" aria-label="Profile actions">
                <button
                  type="button"
                  className="gp-hamburger-item gp-hm-delete"
                  onClick={() => {
                    setHamburgerOpen(false);
                    setDeleteConfirmText("");
                    setConfirmingDelete(true);
                  }}
                >
                  <Trash2 size={16} />
                  <span>Delete Account</span>
                </button>
              </nav>
            )}
          </div>
        </div>

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
            <div className="user-profile-editable-detail">
              <div className="user-profile-editable-copy">
                <span className="user-profile-detail-label">Full Name</span>
                {editingName ? (
                  <input
                    className="user-profile-name-input"
                    value={draftName}
                    maxLength={80}
                    onChange={(event) => setDraftName(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void handleSaveName();
                      if (event.key === "Escape") { setDraftName(name); setEditingName(false); }
                    }}
                    autoFocus
                  />
                ) : (
                  <span className="user-profile-detail-value">{name}</span>
                )}
              </div>
              {editingName ? (
                <div className="user-profile-edit-actions">
                  <button type="button" className="user-profile-icon-button" disabled={savingName} onClick={() => void handleSaveName()} aria-label="Save full name">
                    <Save size={14} />
                  </button>
                  <button type="button" className="user-profile-icon-button" disabled={savingName} onClick={() => { setDraftName(name); setEditingName(false); }} aria-label="Cancel editing full name">
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button type="button" className="user-profile-icon-button" onClick={() => setEditingName(true)} aria-label="Edit full name">
                  <Pencil size={14} />
                </button>
              )}
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

      {confirmingDelete && (
        <div className="user-auth-overlay" role="presentation">
          <div className="user-auth-card user-delete-account-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-account-title">
            <div className="user-delete-account-icon"><AlertTriangle size={22} /></div>
            <h2 id="delete-account-title">Delete account</h2>
            <p>
              This permanently deletes your seller account, profile details, saved sessions, sale flows, pickup leads, and related account records.
            </p>
            <label>
              Type DELETE to confirm
              <input
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
                autoComplete="off"
                disabled={deletingAccount}
              />
            </label>
            <div className="user-delete-account-actions">
              <button
                type="button"
                className="user-auth-cancel"
                disabled={deletingAccount}
                onClick={() => {
                  setConfirmingDelete(false);
                  setDeleteConfirmText("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="user-delete-account-confirm"
                disabled={deletingAccount || deleteConfirmText.trim() !== "DELETE"}
                onClick={() => void handleDeleteAccount()}
              >
                {deletingAccount ? <Loader2 size={16} className="user-delete-account-spinner" /> : <Trash2 size={16} />}
                <span>{deletingAccount ? "Deleting..." : "Delete Account"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
