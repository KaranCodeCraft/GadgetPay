import { Link, Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import {
  CircleHelp,
  Coins,
  LogOut,
  MapPin,
  PiggyBank,
  Settings,
  Sparkles,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { clearRoleSession, getActiveRole } from "../lib/auth/role-session";
import { PartnerDashboardCompactFooter, SupportFab } from "../components/partner-footer-and-support";
import {
  ApiClientError,
  getPartnerCoinBalance,
  getPartnerDashboard,
  getPartnerKycStatus,
  listPartnerActivePickups,
  listPartnerCoinRechargeRequests,
  logoutSession,
  resolvePartnerScope,
  type PartnerDashboardResponse,
  type PartnerLead,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/partner-page")({
  component: PartnerDashboardPage,
});

const sidebarItems = [
  "Profile",
  "Progress",
  "Refer",
  "Earnings",
  "Coins",
  "Settings",
  "FAQ",
  "Help",
] as const;

type SidebarItem = (typeof sidebarItems)[number];

const navIcons: Record<SidebarItem, ComponentType<{ size?: number; className?: string }>> = {
  Profile: UserRound,
  Progress: TrendingUp,
  Refer: Users,
  Earnings: PiggyBank,
  Coins,
  Settings,
  FAQ: CircleHelp,
  Help: Sparkles,
};

const defaultMetrics: PartnerDashboardResponse["metrics"] = {
  onboardingProgress: 0,
  coins: 0,
  weeklyLeads: 0,
  monthlyEarnings: 0,
  leadBucket: 0,
  serviceLeads: 0,
};

const PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
const PARTNER_REFRESH_TOKEN_KEY = "gadgetpe_partner_refresh_token";
const PARTNER_ACCESS_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_PARTNER_ACCESS_TOKEN_KEY = "gadgetpe_access_token";
const SERVICE_LEADS_DATE_KEY = "gadgetpe_service_leads_date";

type PartnerScopeSnapshot = {
  pincode: string;
  serviceabilityStatus: "ACTIVE" | "INACTIVE" | "LIMITED";
  state: string;
  district: string;
};

function getPartnerAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PARTNER_ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_PARTNER_ACCESS_TOKEN_KEY);
}

function PartnerDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<SidebarItem>("Profile");
  const [pincodeInput, setPincodeInput] = useState("");
  const [selectedPincode, setSelectedPincode] = useState("");
  const [showPincodeControls, setShowPincodeControls] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState("Initial load");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [serviceabilityStatus, setServiceabilityStatus] = useState<"ACTIVE" | "INACTIVE" | "LIMITED">("INACTIVE");
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [scopeLocation, setScopeLocation] = useState<{ state: string; district: string } | null>(null);
  const [isApplyingScope, setIsApplyingScope] = useState(false);
  const [showWalletGuardModal, setShowWalletGuardModal] = useState(false);
  const [pendingRechargeCount, setPendingRechargeCount] = useState(0);
  const [kpi, setKpi] = useState<PartnerDashboardResponse["metrics"]>(defaultMetrics);
  const [activePickup, setActivePickup] = useState<PartnerLead | null>(null);
  const [activePickupElapsed, setActivePickupElapsed] = useState("--");
  const [partnerName, setPartnerName] = useState("Partner");
  const effectiveCoins = kpi.coins;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPartnerName(localStorage.getItem("gadgetpe_partner_name") || "Partner");
  }, []);

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "user") {
      void navigate({ to: "/user" });
      return;
    }

    if (activeRole === "admin") {
      void navigate({ to: "/admin" });
    }
  }, [navigate]);

  const saveScope = (scope: PartnerScopeSnapshot) => {
    localStorage.setItem(PARTNER_SCOPE_KEY, JSON.stringify(scope));
  };

  const clearScope = () => {
    localStorage.removeItem(PARTNER_SCOPE_KEY);
  };

  const applyPincode = async () => {
    const pincode = pincodeInput.trim();
    if (pincode.length !== 6) {
      setScopeError("Pincode must be 6 digits.");
      toast.error("Pincode must be 6 digits.");
      return;
    }

    const accessToken = getPartnerAccessToken();
    if (!accessToken) {
      setScopeError("Session expired. Please login again.");
      toast.error("Session expired. Please login again.");
      return;
    }

    setScopeError(null);
    setIsApplyingScope(true);

    try {
      const scope = await resolvePartnerScope(pincode, accessToken);
      setSelectedPincode(scope.selectedPincode);
      setServiceabilityStatus(scope.serviceabilityStatus);
      setScopeLocation({
        state: scope.location.state,
        district: scope.location.district,
      });
      saveScope({
        pincode: scope.selectedPincode,
        serviceabilityStatus: scope.serviceabilityStatus,
        state: scope.location.state,
        district: scope.location.district,
      });

      const dashboard = await getPartnerDashboard(scope.selectedPincode, accessToken);
      setKpi(dashboard.metrics);
      setRefreshedAt(new Date().toLocaleTimeString());
      toast.success(`Tenant scope set to ${scope.selectedPincode}.`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        const statusFromDetails =
          error.details && typeof error.details === "object" && "status" in error.details
            ? String((error.details as { status?: string }).status)
            : null;
        const normalizedStatus = statusFromDetails === "LIMITED" ? "LIMITED" : "INACTIVE";
        if (statusFromDetails === "INACTIVE" || statusFromDetails === "LIMITED") {
          setServiceabilityStatus(normalizedStatus);
          clearScope();
          toast.error(`Pincode ${pincode} is ${statusFromDetails}. Operations are blocked.`);
        }
      }
      setScopeError(error instanceof Error ? error.message : "Unable to resolve serviceability.");
    } finally {
      setIsApplyingScope(false);
    }
  };

  useEffect(() => {
    setPincodeInput(selectedPincode);
  }, [selectedPincode]);

  useEffect(() => {
    const scopeRaw = localStorage.getItem(PARTNER_SCOPE_KEY);
    if (!scopeRaw) {
      return;
    }

    try {
      const scope = JSON.parse(scopeRaw) as PartnerScopeSnapshot;
      setSelectedPincode(scope.pincode);
      setServiceabilityStatus(scope.serviceabilityStatus);
      setScopeLocation({
        state: scope.state,
        district: scope.district,
      });
    } catch {
      clearScope();
    }
  }, []);

  useEffect(() => {
    const checkKycAccess = async () => {
      const accessToken = getPartnerAccessToken();
      if (!accessToken) {
        toast.error("Please login first.");
        await navigate({ to: "/partner" });
        return;
      }

      try {
        const status = await getPartnerKycStatus(accessToken);
        if (status.latestSubmission?.verificationStatus !== "VERIFIED") {
          toast.error("KYC not approved yet. Please complete admin approval before accessing partner page.");
          await navigate({ to: "/partner" });
        }
      } catch {
        toast.error("Unable to verify KYC status. Please login again.");
        await navigate({ to: "/partner" });
      }
    };

    void checkKycAccess();
  }, [navigate]);

  useEffect(() => {
    const loadWalletState = async () => {
      const accessToken = getPartnerAccessToken();
      if (!accessToken) return;

      try {
        const [coinBalance, rechargeRequests] = await Promise.all([
          getPartnerCoinBalance(accessToken),
          listPartnerCoinRechargeRequests(accessToken, { status: "PENDING", limit: 20 }),
        ]);
        setKpi((current) => ({ ...current, coins: coinBalance.balance }));
        setPendingRechargeCount(rechargeRequests.count);
      } catch {
        // Keep the dashboard usable; auth/KYC checks handle session redirects.
      }
    };

    void loadWalletState();

    const handleFocus = () => void loadWalletState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadWalletState();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [location.pathname]);

  useEffect(() => {
    const bootstrapDashboard = async () => {
      const accessToken = getPartnerAccessToken();
      if (!accessToken || !selectedPincode || serviceabilityStatus !== "ACTIVE") {
        return;
      }

      try {
        const [dashboard, coinBalance, rechargeRequests] = await Promise.all([
          getPartnerDashboard(selectedPincode, accessToken),
          getPartnerCoinBalance(accessToken),
          listPartnerCoinRechargeRequests(accessToken, { status: "PENDING", limit: 20 }),
        ]);
        setKpi({ ...dashboard.metrics, coins: coinBalance.balance });
        setPartnerName(dashboard.partner.name || "Partner");
        setPendingRechargeCount(rechargeRequests.count);
      } catch {
        // Ignore bootstrap dashboard error; user can retry via Apply flow.
      }
    };

    void bootstrapDashboard();
  }, [selectedPincode, serviceabilityStatus]);

  const handleRestrictedNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (serviceabilityStatus === "ACTIVE") {
      if (effectiveCoins > 0) return;
      event.preventDefault();
      setShowWalletGuardModal(true);
      return;
    }

    event.preventDefault();
    toast.error("Selected pincode is not ACTIVE. Operations are blocked.");
  };

  const handleServiceLeadsNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    handleRestrictedNavigation(event);
    if (event.defaultPrevented || typeof window === "undefined") return;
    const today = new Date().toISOString().slice(0, 10);
    window.localStorage.setItem(SERVICE_LEADS_DATE_KEY, today);
  };

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(PARTNER_REFRESH_TOKEN_KEY) || localStorage.getItem("gadgetpe_refresh_token");
    if (!refreshToken) {
      toast.error("Session expired. Please login again.");
      return;
    }

    try {
      await logoutSession(refreshToken);
      clearScope();
      clearRoleSession("partner");
      setIsSidebarOpen(false);
      toast.success("Logged out successfully.");
      await navigate({ to: "/partner" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Complete active pickup before logout.");
    }
  };

  useEffect(() => {
    const token = getPartnerAccessToken();
    if (!token || serviceabilityStatus !== "ACTIVE") return;

    const loadActivePickup = async () => {
      try {
        const result = await listPartnerActivePickups(token, { pincode: selectedPincode || undefined, limit: 1 });
        setActivePickup(result.rows[0] || null);
      } catch {
        // keep quiet, alert is optional surface
      }
    };

    void loadActivePickup();
    const poller = setInterval(() => {
      void loadActivePickup();
    }, 30000);
    return () => clearInterval(poller);
  }, [selectedPincode, serviceabilityStatus]);

  useEffect(() => {
    const anchor = activePickup?.pickupStartedAt || activePickup?.claimedAt || activePickup?.updatedAt;
    if (!anchor) {
      setActivePickupElapsed("--");
      return;
    }

    const updateElapsed = () => {
      const started = Date.parse(anchor);
      if (Number.isNaN(started)) {
        setActivePickupElapsed("--");
        return;
      }
      const diff = Math.max(0, Date.now() - started);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setActivePickupElapsed(`${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`);
    };

    updateElapsed();
    const timer = setInterval(updateElapsed, 1000);
    return () => clearInterval(timer);
  }, [activePickup?.pickupStartedAt, activePickup?.claimedAt, activePickup?.updatedAt]);

  if (location.pathname !== "/partner-page") {
    return <Outlet />;
  }

  return (
    <>
      <main className="partner-dashboard-page">
        <div className="partner-mobile-topbar-bg" aria-hidden />
        <button
        type="button"
        className="partner-hamburger"
        aria-label="Open navigation menu"
        aria-expanded={isSidebarOpen}
        onClick={() => setIsSidebarOpen((prev) => !prev)}
      >
        ☰
      </button>

        <div className="partner-top-logo">GadgetPe</div>

        <div className="partner-coin-badge" aria-label="Coin balance">
          <Coins size={13} />
          <span>{effectiveCoins}</span>
        </div>

        <div
          className={`partner-sidebar-backdrop${isSidebarOpen ? " open" : ""}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />

        <aside className={`partner-sidebar${isSidebarOpen ? " open" : ""}`}>
        <div className="partner-sidebar-head">
          <div className="partner-sidebar-brand">GadgetPe Partner</div>
          <button
            type="button"
            className="partner-close-menu"
            aria-label="Close navigation menu"
            onClick={() => setIsSidebarOpen(false)}
          >
            ×
          </button>
        </div>

        <nav className="partner-sidebar-nav" aria-label="Partner navigation">
          {sidebarItems.map((item) => (
            <button
              key={item}
              type="button"
              className={item === activeItem ? "active" : ""}
              onClick={() => {
                setActiveItem(item);
                setIsSidebarOpen(false);
              }}
            >
              {(() => {
                const Icon = navIcons[item];
                return (
                  <>
                    <Icon size={15} className="partner-nav-icon" />
                    <span>{item}</span>
                  </>
                );
              })()}
            </button>
          ))}
        </nav>

        <button type="button" className="partner-logout-btn" onClick={() => void handleLogout()} aria-label="Logout from partner dashboard">
          <LogOut size={14} /> Logout
        </button>
        </aside>

        <section className="partner-content-shell">
        <div className="partner-content-topbar">
          <header className="partner-content-head">
            <h1>Welcome {partnerName}</h1>
            {/* <p>Data refreshed for pincode {selectedPincode} at {refreshedAt}.</p>
            {scopeLocation ? <p>{scopeLocation.district}, {scopeLocation.state}</p> : null}
            <p>Serviceability: {serviceabilityStatus}</p> */}
            {effectiveCoins === 0 ? (
              <button
                type="button"
                className="partner-recharge-alert"
                onClick={() => {
                  void navigate({ to: "/partner-page/coins" });
                }}
              >
                Recharge Coins to Get Leads
              </button>
            ) : null}
            {scopeError ? <p className="partner-auth-error">{scopeError}</p> : null}
            {activePickup ? (
              <div className="lead-booking-box partner-active-pickup-alert" style={{ marginTop: 10 }}>
                <h3>Active Pickup Alert</h3>
                <p>You have scheduled pickup: {activePickup.seller.name || "Customer"} | {activePickup.selectedModel.modelName}</p>
                <p>Elapsed: {activePickupElapsed} | Status: {activePickup.status}</p>
                <button
                  type="button"
                  className="lead-book-btn"
                  onClick={() => {
                    void navigate({ to: "/service-Leads/transaction", search: { leadId: activePickup.id } });
                  }}
                >
                  Open Active Pickup
                </button>
              </div>
            ) : null}
          </header>

          <div
            className={`partner-pincode-block partner-pincode-top-right${!showPincodeControls ? " partner-pincode-collapsed" : ""}`}
            onClick={() => {
              if (!showPincodeControls) setShowPincodeControls(true);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(event) => {
              if (!showPincodeControls && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                setShowPincodeControls(true);
              }
            }}
            aria-label="Reveal pincode input"
          >
            <div className="partner-pincode-title">
              <MapPin size={12} />
              <span>Pincode</span>
            </div>
            {showPincodeControls ? (
              <div className="partner-pincode-controls">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter pincode"
                  value={pincodeInput}
                  onChange={(event) => setPincodeInput(event.target.value)}
                />
                <button type="button" onClick={applyPincode}>
                  <MapPin size={11} />
                  <span>{isApplyingScope ? "Applying..." : "Apply"}</span>
                </button>
              </div>
            ) : null}
            {showPincodeControls && (
              <button
                type="button"
                className="partner-pincode-reveal partner-pincode-hide"
                onClick={(event) => {
                  event.stopPropagation();
                  setShowPincodeControls(false);
                }}
              >
                Hide
              </button>
            )}
            <p>
              Current: {selectedPincode}
              {scopeLocation ? ` | ${scopeLocation.district}, ${scopeLocation.state}` : ""}
            </p>
          </div>
        </div>

        <div className="partner-lead-actions">
          <aside className="partner-right-tiles" aria-label="Lead summary">
            <Link
              to="/Lead-bucket"
              className="partner-flash-tile partner-flash-button"
              onClick={handleRestrictedNavigation}
              aria-disabled={serviceabilityStatus !== "ACTIVE"}
            >
              <h3>Click for Lead Bucket</h3>
            </Link>
            <Link
              to="/service-Leads"
              className="partner-flash-tile partner-flash-button"
              onClick={handleServiceLeadsNavigation}
              aria-disabled={serviceabilityStatus !== "ACTIVE"}
            >
              <h3>Service Leads Today</h3>
            </Link>
          </aside>
        </div>

        <div className="partner-kpi-grid partner-kpi-grid-vertical">
          <article>
            <h2>
              <Users size={14} />
              <span>Weekly Leads</span>
            </h2>
            <p>{kpi.weeklyLeads}</p>
          </article>
          <article>
            <h2>
              <Coins size={14} />
              <span>Coins</span>
            </h2>
            <p>{effectiveCoins}</p>
          </article>
        </div>

        <article className="partner-detail-card">
          <h2>{activeItem} Details</h2>
          {/* <p>
            This section updates as a single-page dashboard panel. Changing the pincode from the top-right panel
            refreshes all partner stats and contextual details for your selected location.
          </p> */}
        </article>
        </section>

        {showWalletGuardModal ? (
          <div className="partner-modal-backdrop" role="dialog" aria-modal="true" aria-label="Wallet recharge required">
          <section className="partner-modal-card">
            <h2>Wallet Recharge Required</h2>
            <p>Dear Partner, please wallet recharge to get leads and pickup devices.</p>
            {pendingRechargeCount > 0 ? <p>You already have {pendingRechargeCount} recharge request(s) pending admin approval.</p> : null}
            <div className="partner-modal-actions">
              <button
                type="button"
                className="partner-submit-btn"
                onClick={() => {
                  setShowWalletGuardModal(false);
                  void navigate({ to: "/partner-page/coins" });
                }}
              >
                Wallet Recharge
              </button>
              <button
                type="button"
                className="partner-upload-btn"
                onClick={() => setShowWalletGuardModal(false)}
              >
                Cancel
              </button>
            </div>
          </section>
          </div>
        ) : null}
      </main>
      <PartnerDashboardCompactFooter />
      <SupportFab />
    </>
  );
}
