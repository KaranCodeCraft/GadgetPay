import { Link, Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  MapPin,
  UserRound,
  Users,
} from "lucide-react";
import { useEffect, useState, type ComponentType } from "react";
import { toast } from "sonner";
import { clearRoleSession, getActiveRole } from "../lib/auth/role-session";
import { PartnerDashboardCompactFooter, SupportFab } from "../components/partner-footer-and-support";
import {
  ensureRoleAccessToken,
  getPartnerCoinBalance,
  getPartnerDashboard,
  getPartnerKycStatus,
  getPartnerWorkingPincodes,
  listPartnerActivePickups,
  logoutSession,
  type PartnerDashboardResponse,
  type PartnerLead,
} from "../lib/api/gadgetpe-client";

export const Route = createFileRoute("/partner-page")({
  component: PartnerDashboardPage,
});

const sidebarItems = [
  "Profile",
] as const;

type SidebarItem = (typeof sidebarItems)[number];

const navIcons: Record<SidebarItem, ComponentType<{ size?: number; className?: string }>> = {
  Profile: UserRound,
};

const defaultMetrics: PartnerDashboardResponse["metrics"] = {
  onboardingProgress: 0,
  coins: 0,
  todayLeads: 0,
  weeklyLeads: 0,
  monthlyLeads: 0,
  monthlyEarnings: 0,
  leadBucket: 0,
  serviceLeads: 0,
};

const PARTNER_SCOPE_KEY = "gadgetpe_partner_scope";
const PARTNER_REFRESH_TOKEN_KEY = "gadgetpe_partner_refresh_token";
const PARTNER_ACCESS_TOKEN_KEY = "gadgetpe_partner_access_token";
const LEGACY_PARTNER_ACCESS_TOKEN_KEY = "gadgetpe_access_token";

function formatMetricValue(value: number) {
  return value > 0 ? value : "-";
}

function formatLeadDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN");
}

function getLeadDisplayAmount(lead: PartnerLead) {
  return lead.onsiteValidation?.revisedQuote ?? lead.paymentProof?.amountCollected ?? lead.quote?.sellingPrice ?? lead.selectedModel.listedPrice ?? 0;
}

function getPartnerAccessToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PARTNER_ACCESS_TOKEN_KEY) || localStorage.getItem(LEGACY_PARTNER_ACCESS_TOKEN_KEY);
}

function persistPartnerScope(pincode: string, status: "ACTIVE" | "INACTIVE" | "LIMITED") {
  if (typeof window === "undefined") return;
  if (!pincode) return;
  window.localStorage.setItem(PARTNER_SCOPE_KEY, JSON.stringify({ pincode, serviceabilityStatus: status }));
}

function PartnerDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeItem, setActiveItem] = useState<SidebarItem>("Profile");
  const [selectedPincode, setSelectedPincode] = useState("");
  const [workingPincodes, setWorkingPincodes] = useState<string[]>([]);
  const [refreshedAt, setRefreshedAt] = useState("Initial load");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [serviceabilityStatus, setServiceabilityStatus] = useState<"ACTIVE" | "INACTIVE" | "LIMITED">("INACTIVE");
  const [kpi, setKpi] = useState<PartnerDashboardResponse["metrics"]>(defaultMetrics);
  const [activePickup, setActivePickup] = useState<PartnerLead | null>(null);
  const [activePickupElapsed, setActivePickupElapsed] = useState("--");
  const [partnerName, setPartnerName] = useState("Partner");
  const effectiveCoins = kpi.coins;

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPartnerName(localStorage.getItem("gadgetpe_partner_name") || "Partner");

    if (localStorage.getItem(PARTNER_REFRESH_TOKEN_KEY) || localStorage.getItem("gadgetpe_refresh_token")) {
      void ensureRoleAccessToken("partner");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refreshToken = localStorage.getItem(PARTNER_REFRESH_TOKEN_KEY) || localStorage.getItem("gadgetpe_refresh_token");
    if (!refreshToken) return;

    const refreshPartnerSession = () => {
      void ensureRoleAccessToken("partner");
    };

    refreshPartnerSession();
    const intervalId = window.setInterval(refreshPartnerSession, 10 * 60 * 1000);
    return () => window.clearInterval(intervalId);
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

  useEffect(() => {
    const accessToken = getPartnerAccessToken();
    if (!accessToken) return;

    void (async () => {
      try {
        const result = await getPartnerWorkingPincodes(accessToken);
        const pins = result.pincodes.map((p) => p.pincode);
        setWorkingPincodes(pins);
        if (pins.length > 0) {
          setSelectedPincode(pins[0]);
          setServiceabilityStatus("ACTIVE");
        }
      } catch {
        // No working pincodes yet
      }
    })();
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
    const loadDashboardState = async () => {
      const accessToken = getPartnerAccessToken();
      if (!accessToken) return;

      try {
        if (selectedPincode && serviceabilityStatus === "ACTIVE") {
          const [dashboard, coinBalance] = await Promise.all([
            getPartnerDashboard(selectedPincode, accessToken),
            getPartnerCoinBalance(accessToken),
          ]);
          setKpi({ ...dashboard.metrics, coins: coinBalance.balance });
          setPartnerName(dashboard.partner.name || "Partner");
          return;
        }

        const coinBalance = await getPartnerCoinBalance(accessToken);
        setKpi((current) => ({ ...current, coins: coinBalance.balance }));
      } catch {
        // Keep the dashboard usable; auth/KYC checks handle session redirects.
      }
    };

    void loadDashboardState();

    const handleFocus = () => void loadDashboardState();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void loadDashboardState();
      }
    };

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [location.pathname, selectedPincode, serviceabilityStatus]);

  useEffect(() => {
    const bootstrapDashboard = async () => {
      const accessToken = getPartnerAccessToken();
      if (!accessToken || !selectedPincode || serviceabilityStatus !== "ACTIVE") {
        return;
      }

      try {
        const [dashboard, coinBalance] = await Promise.all([
          getPartnerDashboard(selectedPincode, accessToken),
          getPartnerCoinBalance(accessToken),
        ]);
        setKpi({ ...dashboard.metrics, coins: coinBalance.balance });
        setPartnerName(dashboard.partner.name || "Partner");
      } catch {
        // Ignore bootstrap dashboard error; user can retry via Apply flow.
      }
    };

    void bootstrapDashboard();
  }, [selectedPincode, serviceabilityStatus]);

  const handleRestrictedNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (serviceabilityStatus === "ACTIVE") {
      return;
    }

    event.preventDefault();
    toast.error("Add working pincodes first.");
    void navigate({ to: "/partner-page/working-pincodes" });
  };

  const handleServiceLeadsNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => {
    handleRestrictedNavigation(event);
    if (event.defaultPrevented || typeof window === "undefined") return;
    const scopePincode = selectedPincode || workingPincodes[0] || "";
    persistPartnerScope(scopePincode, serviceabilityStatus);
  };

  useEffect(() => {
    if (serviceabilityStatus !== "ACTIVE") return;
    const scopePincode = selectedPincode || workingPincodes[0] || "";
    if (!scopePincode) return;
    persistPartnerScope(scopePincode, serviceabilityStatus);
  }, [selectedPincode, workingPincodes, serviceabilityStatus]);

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem(PARTNER_REFRESH_TOKEN_KEY) || localStorage.getItem("gadgetpe_refresh_token");
    if (refreshToken) {
      try {
        await logoutSession(refreshToken);
      } catch {
        // Session may already be expired/revoked; continue with local logout.
      }
    }

    localStorage.removeItem(PARTNER_SCOPE_KEY);
    clearRoleSession("partner");
    setIsSidebarOpen(false);
    toast.success("Logged out successfully.");
    await navigate({ to: "/partner" });
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

  const renderActivePanel = () => {
    return (
      <section className="partner-detail-card partner-profile-panel">
        <h2>
          <UserRound size={14} />
          <span>Profile</span>
        </h2>
        <p>Name: {partnerName}</p>
        {/* <p>Pincode: {selectedPincode || "Not set"}</p> */}
        <p>Serviceability: {serviceabilityStatus}</p>
        <p>Coins: {effectiveCoins}</p>
      </section>
    );
  };

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

        <div className="partner-top-logo"><img src="/logo.png" alt="GadgetPe" style={{ height: "90px", width: "auto" }} /></div>

        <div
          className={`partner-sidebar-backdrop${isSidebarOpen ? " open" : ""}`}
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden
        />

        <aside className={`partner-sidebar${isSidebarOpen ? " open" : ""}`}>
        <div className="partner-sidebar-head">
          <div className="partner-sidebar-brand"><img src="/logo.png" alt="GadgetPe" style={{ height: "90px", width: "auto" }} /></div>
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
          <Link
            to="/partner-page/working-pincodes"
            className="partner-sidebar-nav-link"
            onClick={() => setIsSidebarOpen(false)}
          >
            <MapPin size={15} className="partner-nav-icon" />
            <span>Working Pincodes</span>
          </Link>
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
            <p>Serviceability: {serviceabilityStatus}</p> */}
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
        </div>

        {renderActivePanel()}

        {activeItem === "Profile" ? (
          <>
            <div className="partner-lead-actions">
              <aside className="partner-right-tiles" aria-label="Lead summary">
                <Link
                  to="/Lead-bucket"
                  className="partner-flash-tile partner-flash-button partner-flash-blue"
                  onClick={handleRestrictedNavigation}
                  aria-disabled={serviceabilityStatus !== "ACTIVE"}
                >
                  <h3>Lead Bucket</h3>
                </Link>
                <Link
                  to="/service-Leads"
                  className="partner-flash-tile partner-flash-button partner-flash-green"
                  onClick={handleServiceLeadsNavigation}
                  aria-disabled={serviceabilityStatus !== "ACTIVE"}
                >
                  <h3>Assigned Leads</h3>
                </Link>
              </aside>
            </div>

            <div className="partner-kpi-grid partner-kpi-grid-vertical">
              <article>
                <h2>
                  <Users size={14} />
                  <span>Today's Leads</span>
                </h2>
                <p>{formatMetricValue(kpi.todayLeads)}</p>
              </article>
              <article>
                <h2>
                  <Users size={14} />
                  <span>Weekly Leads</span>
                </h2>
                <p>{formatMetricValue(kpi.weeklyLeads)}</p>
              </article>
              <article>
                <h2>
                  <Users size={14} />
                  <span>Monthly Leads</span>
                </h2>
                <p>{formatMetricValue(kpi.monthlyLeads)}</p>
              </article>
            </div>
          </>
        ) : null}
        </section>

      </main>
      <PartnerDashboardCompactFooter />
      <SupportFab />
    </>
  );
}
