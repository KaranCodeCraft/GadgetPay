import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { Coins, Flame, History, IndianRupee, Instagram, ListChecks, Mail, MapPin, Menu, PackageCheck, PhoneCall, Search, ShieldCheck, Smartphone, Tablet, TabletSmartphone, Truck, UserRound } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { clearRoleSession, getActiveRole } from "../lib/auth/role-session";
import { ApiClientError, ensureRoleAccessToken, getPincodeAvailability, logoutSession } from "../lib/api/gadgetpe-client";
import { getBrandLogoUrl } from "../lib/brand-logos";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/user")({
  component: UserPage,
});

type TopPhone = {
  name: string;
  variant: string;
  basePrice: number;
};

type PriceTrend = "up" | "down";

type PriceTicker = {
  value: number;
  trend: PriceTrend;
  changePercent: number;
  pulse: number;
};

const topPhones: TopPhone[] = [];

const brands = [
  { name: "Apple", logoUrl: getBrandLogoUrl("Apple") ?? "https://logo.clearbit.com/apple.com" },
  { name: "Xiaomi", logoUrl: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/xiaomi-mi-logo-icon.png" },
  { name: "Samsung", logoUrl: getBrandLogoUrl("Samsung") ?? "https://logo.clearbit.com/samsung.com" },
  { name: "Vivo", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/Vivo_Logo.svg" },
  { name: "OnePlus", logoUrl: getBrandLogoUrl("OnePlus") ?? "https://logo.clearbit.com/oneplus.com" },
  { name: "OPPO", logoUrl: getBrandLogoUrl("OPPO") ?? "https://logo.clearbit.com/oppo.com" },
  { name: "realme", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Realme-realme-_logo_box-RGB-01.png" },
];
// const subnavMarqueeItems = ["All", "Sell SmartPhones", "Sell iPads", "Sell Tabs", "More"];
const faqs = [
  {
    question: "How can I check the value of my old device?",
    answer: "Simply select your device and answer a few questions to receive an instant estimated price.",
  },
  {
    question: "Is the online price final?",
    answer: "The online price is an estimate. The final price is confirmed after physical inspection.",
  },
  {
    question: "What should I do before selling?",
    answer: "Back up your data, sign out of accounts, remove SIM/memory cards, disable activation locks and factory reset if possible.",
  },
  {
    question: "Can I cancel or reschedule?",
    answer: "Yes, before the scheduled pickup.",
  },
  {
    question: "How long does payment take?",
    answer: "Payment is processed instantly after successful verification.",
  },
  {
    question: "Which devices can I sell?",
    answer: "Smartphones, iPads, tablets, and other eligible supported devices.",
  },
];

const userReviews = [
  {
    name: "Rohan",
    city: "Bengaluru",
    quote:
      "Booked pickup in less than 2 minutes. The partner arrived on time and payment was reflected the same evening.",
    device: "iPhone 13",
    amount: "Rs. 29,400",
  },
  {
    name: "Priya",
    city: "Pune",
    quote:
      "Condition check was transparent and exactly matched the app flow. No last-minute price drop during pickup.",
    device: "Samsung S22",
    amount: "Rs. 21,800",
  },
  {
    name: "Aditya",
    city: "Hyderabad",
    quote:
      "I sold my tablet and phone in one week. Dashboard updates were clear and I could track every stage.",
    device: "iPad Air",
    amount: "Rs. 24,100",
  },
  {
    name: "Sneha",
    city: "Mumbai",
    quote:
      "Best part was doorstep pickup slot flexibility. Rebooking was simple and support helped quickly.",
    device: "OnePlus 11R",
    amount: "Rs. 18,600",
  },
];

type SearchItem = { id: string; label: string; type: string; href: string; keywords: string[] };

const searchableItems: SearchItem[] = [
  { id: "sell-now", label: "Sell Now", type: "Page", href: "/user/sell-phone", keywords: ["sell", "phone", "quote", "instant", "now"] },
  { id: "how-it-works", label: "How It Works", type: "Section", href: "#how", keywords: ["how", "works", "steps", "process", "pickup", "payment", "verify"] },
  { id: "become-partner", label: "Become Our Partner", type: "Page", href: "/partner", keywords: ["partner", "join", "business", "become"] },
  { id: "help-faq", label: "Help & FAQ", type: "Section", href: "#faq", keywords: ["help", "faq", "question", "support", "cancel", "price"] },
  { id: "top-brands", label: "Top Brands", type: "Section", href: "#top-brands", keywords: ["brands", "apple", "samsung", "xiaomi", "vivo", "oneplus", "oppo", "realme", "brand"] },
  { id: "hero-sell", label: "Get Instant Quote", type: "Action", href: "#sell", keywords: ["quote", "price", "instant", "value", "check"] },
  { id: "login", label: "Seller Login", type: "Action", href: "/user/login", keywords: ["login", "sign in", "account", "seller"] },
  { id: "brand-apple", label: "Apple", type: "Brand", href: "/user/sell-phone", keywords: ["apple", "iphone", "ipad", "ios"] },
  { id: "brand-samsung", label: "Samsung", type: "Brand", href: "/user/sell-phone", keywords: ["samsung", "galaxy", "android"] },
  { id: "brand-xiaomi", label: "Xiaomi / Mi", type: "Brand", href: "/user/sell-phone", keywords: ["xiaomi", "mi", "redmi", "poco"] },
  { id: "brand-oneplus", label: "OnePlus", type: "Brand", href: "/user/sell-phone", keywords: ["oneplus", "one plus"] },
  { id: "brand-vivo", label: "Vivo", type: "Brand", href: "/user/sell-phone", keywords: ["vivo"] },
  { id: "brand-oppo", label: "OPPO", type: "Brand", href: "/user/sell-phone", keywords: ["oppo"] },
  { id: "brand-realme", label: "realme", type: "Brand", href: "/user/sell-phone", keywords: ["realme"] },
  { id: "faq-1", label: "How can I check the value of my old device?", type: "FAQ", href: "#faq", keywords: ["price", "old", "device", "value", "estimate"] },
  { id: "faq-2", label: "Is the online price final?", type: "FAQ", href: "#faq", keywords: ["online", "price", "final", "estimate", "inspection"] },
  { id: "faq-3", label: "What should I do before selling?", type: "FAQ", href: "#faq", keywords: ["before", "selling", "backup", "factory reset", "activation lock"] },
  { id: "faq-4", label: "Can I cancel or reschedule?", type: "FAQ", href: "#faq", keywords: ["cancel", "reschedule", "pickup", "schedule"] },
  { id: "faq-5", label: "How long does payment take?", type: "FAQ", href: "#faq", keywords: ["payment", "instant", "verification", "payout"] },
  { id: "faq-6", label: "Which devices can I sell?", type: "FAQ", href: "#faq", keywords: ["devices", "smartphones", "ipads", "tablets", "supported"] },
  { id: "sell-tablet", label: "Sell Tablet", type: "Page", href: "/user/sell-tablet", keywords: ["tablet", "ipad", "sell", "tab"] },
  { id: "pickup-status", label: "Pickup Status", type: "Page", href: "/user/pickup-status", keywords: ["pickup", "status", "track", "schedule"] },
  { id: "my-listings", label: "My Listings", type: "Page", href: "/user/my-listings", keywords: ["listings", "my", "active", "sold"] },
  { id: "payments", label: "Payments", type: "Page", href: "/user/payments", keywords: ["payments", "payout", "upi", "settlement"] },
];

const HERO_WORDS = ["Phones", "Tablets", "iPads"] as const;
const INSTAGRAM_URL = "https://www.instagram.com/gadgetpeofficial?igsh=MWt5ZTRwaGtiMnU3bw%3D%3D&utm_source=qr";
const USER_TOKEN_KEY = "gadgetpe_user_access_token";
const USER_REFRESH_KEY = "gadgetpe_user_refresh_token";
const USER_NAME_KEY = "gadgetpe_user_name";
const SELLING_HISTORY_STORAGE_KEY = "gadgetpe_user_selling_history";
const USER_SCOPE_KEY = "gadgetpe_user_scope";
const USER_POST_LOGIN_SELL_MODAL_FLAG_KEY = "gadgetpe_user_post_login_sell_modal";

const sellerActions = [
  { title: "List Device", description: "Create a new device listing with expected price.", icon: Smartphone, to: "/user/list-device" as const },
  // { title: "My Listings", description: "Track active, sold, and draft device listings.", icon: ListChecks, to: "/user/my-listings" as const },
  { title: "Pickup Status", description: "Watch pickup scheduling and partner movement live.", icon: Truck, to: "/user/pickup-status" as const },
  { title: "Payments", description: "Review payouts, pending settlements, and UPI status.", icon: IndianRupee, to: "/user/payments" as const },
];

const sellFlowOptions = [
  {
    title: "Sell Phones",
    description: "Pick your smartphone model and get an instant quote.",
    icon: Smartphone,
    to: "/user/sell-phone" as const,
  },
  {
    title: "Sell iPads",
    description: "Start your iPad flow in the tablet category.",
    icon: Tablet,
    to: "/user/sell-tablet" as const,
  },
  {
    title: "Sell Tablets",
    description: "Sell Android and other tablets with the same flow.",
    icon: TabletSmartphone,
    to: "/user/sell-tablet" as const,
  },
];

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
    sellerName?: string;
    callingPhoneNumber?: string;
  };
  updatedAt?: string;
};

function getSellingHistory() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SELLING_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SellingHistoryItem[];
  } catch {
    return [];
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

function HeroIconShield() {
  return <ShieldCheck size={16} />;
}

function HeroIconTruck() {
  return <Truck size={16} />;
}

function HeroIconMoney() {
  return <IndianRupee size={16} />;
}

function UserFooter() {
  return (
    <footer className="gp-user-footer">
      <div className="gp-wrap gp-user-footer-grid">
        <div className="gp-user-footer-brand">
          <div className="gp-user-footer-logo"><img src="/logo-dark.png" alt="GadgetPe" style={{ height: "40px", width: "auto" }} /></div>
          <h3>Turn Your Device Into Money</h3>
          <p>GadgetPe is a modern device marketplace that makes selling your old smartphones, iPads, and tablets simple, secure, and rewarding.</p>
          <div className="gp-user-footer-social" aria-label="Contact shortcuts">
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" aria-label="Instagram GadgetPe"><Instagram size={18} /></a>
            <a href="mailto:support@gadgetpe.com" aria-label="Email GadgetPe"><Mail size={18} /></a>
            <a href="https://wa.me/919311125745" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp GadgetPe"><PhoneCall size={18} /></a>
          </div>
        </div>
        <div className="gp-user-footer-column">
          <h3>Contact</h3>
          <a href="https://wa.me/919311125745" target="_blank" rel="noopener noreferrer"><PhoneCall size={16} /><span>+91 93111 25745</span></a>
          <a href="mailto:support@gadgetpe.com"><Mail size={16} /><span>support@gadgetpe.com</span></a>
          <a href="https://www.gadgetpe.com" target="_blank" rel="noopener noreferrer"><Instagram size={16} /><span>www.gadgetpe.com</span></a>
        </div>
        <div className="gp-user-footer-column">
          <h3>Currently Serving</h3>
          <div className="gp-user-footer-text-row"><MapPin size={16} /><span>Delhi NCR</span></div>
        </div>
        <div className="gp-user-footer-column gp-user-footer-contact">
          <h3>Legal</h3>
          <div className="gp-user-footer-legal-links">
            <a href="/Policy">Privacy Policy</a>
            <span>|</span>
            <a href="/Policy">Terms &amp; Conditions</a>
            <span>|</span>
            <a href="/Policy">Refund &amp; Cancellation Policy</a>
            <span>|</span>
            <a href="/Policy">Partner Policy</a>
          </div>
        </div>
      </div>
      <div className="gp-wrap gp-user-footer-bottom">
        <span>© 2026 GadgetPe. All Rights Reserved.</span>
      </div>
    </footer>
  );
}

function UserPage() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [isHydrated, setIsHydrated] = useState(false);
  const [blockedByRole, setBlockedByRole] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [showSellTypeModal, setShowSellTypeModal] = useState(false);
  const [showPincodeModal, setShowPincodeModal] = useState(false);
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [sellingHistory, setSellingHistory] = useState<SellingHistoryItem[]>([]);
  const [pincodeInput, setPincodeInput] = useState("");
  const [isCheckingPincode, setIsCheckingPincode] = useState(false);
  const [selectedCityName, setSelectedCityName] = useState("");
  const [failedBrandLogos, setFailedBrandLogos] = useState<Record<string, boolean>>({});
  const [sellerName, setSellerName] = useState("Seller");
  const [wordIndex, setWordIndex] = useState(0);
  const [typedText, setTypedText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [activeReviewIndex, setActiveReviewIndex] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchResults = searchQuery.trim().length > 0
    ? searchableItems.filter((item) => {
        const q = searchQuery.toLowerCase();
        return item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q));
      }).slice(0, 8)
    : [];

  const handleSearchFocus = useCallback(() => {
    if (searchQuery.trim()) setShowSearchResults(true);
  }, [searchQuery]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [priceTickers, setPriceTickers] = useState<Record<string, PriceTicker>>(() => {
    const seeded: Record<string, PriceTicker> = {};
    topPhones.forEach((phoneItem, index) => {
      const key = `${phoneItem.name}-${phoneItem.variant}`;
      seeded[key] = {
        value: phoneItem.basePrice,
        trend: index % 2 === 0 ? "up" : "down",
        changePercent: 0,
        pulse: 0,
      };
    });
    return seeded;
  });

  useEffect(() => {
    const activeRole = getActiveRole();
    if (activeRole === "admin") {
      setBlockedByRole(true);
      void navigate({ to: "/admin" });
      return;
    }

    if (activeRole === "partner") {
      setBlockedByRole(true);
      void navigate({ to: "/partner-page" });
      return;
    }

    setBlockedByRole(false);
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storedName = window.localStorage.getItem(USER_NAME_KEY) || "Seller";
    const hasRefreshToken = Boolean(window.localStorage.getItem(USER_REFRESH_KEY));

    setIsLoggedIn(Boolean(window.localStorage.getItem(USER_TOKEN_KEY) || hasRefreshToken));
    setSellerName(storedName);
    setSellingHistory(getSellingHistory());
    setIsHydrated(true);

    if (hasRefreshToken) {
      void ensureRoleAccessToken("user").then((accessToken) => {
        if (accessToken) setIsLoggedIn(true);
      });
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn || typeof window === "undefined") return;
    if (!window.localStorage.getItem(USER_REFRESH_KEY)) return;

    const refreshUserSession = () => {
      void ensureRoleAccessToken("user");
    };

    refreshUserSession();
    const intervalId = window.setInterval(refreshUserSession, 10 * 60 * 1000);
    return () => window.clearInterval(intervalId);
  }, [isLoggedIn]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = window.localStorage.getItem(USER_TOKEN_KEY) || window.localStorage.getItem(USER_REFRESH_KEY);
    const storedName = window.localStorage.getItem(USER_NAME_KEY) || "Seller";

    setIsLoggedIn(Boolean(token));
    setSellerName(storedName);
  }, [pathname]);

  useEffect(() => {
    const currentWord = HERO_WORDS[wordIndex];
    const isWordComplete = typedText === currentWord;
    const isWordCleared = typedText.length === 0;

    const timeout = setTimeout(
      () => {
        if (!isDeleting && !isWordComplete) {
          setTypedText(currentWord.slice(0, typedText.length + 1));
          return;
        }
        if (!isDeleting && isWordComplete) {
          setIsDeleting(true);
          return;
        }
        if (isDeleting && !isWordCleared) {
          setTypedText(currentWord.slice(0, typedText.length - 1));
          return;
        }
        setIsDeleting(false);
        setWordIndex((prev) => (prev + 1) % HERO_WORDS.length);
      },
      isDeleting ? 120 : isWordComplete ? 1200 : 180,
    );

    return () => clearTimeout(timeout);
  }, [typedText, isDeleting, wordIndex]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPriceTickers((prev) => {
        const next: Record<string, PriceTicker> = { ...prev };
        topPhones.forEach((phoneItem, index) => {
          const key = `${phoneItem.name}-${phoneItem.variant}`;
          const current = next[key];
          const direction: PriceTrend = (current.pulse + index) % 2 === 0 ? "up" : "down";
          const delta = 70 + ((current.pulse + index) % 5) * 35;
          const value = direction === "up" ? current.value + delta : Math.max(500, current.value - delta);
          next[key] = {
            value,
            trend: direction,
            changePercent: Number(((delta / Math.max(1, current.value)) * 100).toFixed(1)),
            pulse: current.pulse + 1,
          };
        });
        return next;
      });
    }, 1800);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const reviewInterval = setInterval(() => {
      setActiveReviewIndex((prev) => (prev + 1) % userReviews.length);
    }, 4500);
    return () => clearInterval(reviewInterval);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || pathname !== "/user") return;
    setSellingHistory(getSellingHistory());
  }, [isLoggedIn, pathname]);

  useEffect(() => {
    if (!isLoggedIn || typeof window === "undefined") return;
    try {
      const rawScope = window.localStorage.getItem(USER_SCOPE_KEY);
      if (!rawScope) return;
      const parsed = JSON.parse(rawScope) as { city?: string | null; district?: string | null; state?: string | null };
      const district = parsed.district || "";
      const state = parsed.state || "";
      const city = district && state ? `${district}, ${state}` : district || state || parsed.city || "";
      if (city) setSelectedCityName(city);
    } catch {
      // Ignore malformed local scope and keep default display.
    }
  }, [isLoggedIn]);

  const handleLogout = async () => {
    const refreshToken = typeof window !== "undefined" ? window.localStorage.getItem(USER_REFRESH_KEY) : null;

    if (refreshToken) {
      try {
        await logoutSession(refreshToken);
      } catch {
        // Clear local state even if the server-side token is already expired or revoked.
      }
    }

    clearRoleSession("user");
    setIsLoggedIn(false);
    setShowSellModal(false);
    setShowPincodeModal(false);
    setPincodeInput("");
    setSelectedCityName("");
    setSellerName("Seller");
    toast.success("Logged out.");
  };

  const handlePincodeSelect = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const pincode = pincodeInput.trim();

    if (!/^\d{6}$/.test(pincode)) {
      toast.error("Enter a valid 6-digit pincode.");
      return;
    }

    setIsCheckingPincode(true);
    try {
      const result = await getPincodeAvailability(pincode);
      const district = result.location?.district || "";
      const state = result.location?.state || "";
      const cityName = [district, state].filter(Boolean).join(", ") || "your city";
      setSelectedCityName(cityName);
      localStorage.setItem(
        USER_SCOPE_KEY,
        JSON.stringify({
          pincode,
          status: result.status,
          city: cityName,
          state: result.location?.state || null,
          district: result.location?.district || null,
        }),
      );
      toast.success(`You have selected pincode ${pincode} (${cityName}).`);
      setShowPincodeModal(false);
    } catch (apiError) {
      const message = apiError instanceof ApiClientError ? apiError.message : "Failed to fetch pincode details.";
      toast.error(message);
    } finally {
      setIsCheckingPincode(false);
    }
  };

  const handleSellFlowSelection = (to: "/user/sell-phone" | "/user/sell-tablet") => {
    setShowSellTypeModal(false);
    void navigate({ to });
  };

  useEffect(() => {
    if (!isLoggedIn || pathname !== "/user") return;
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(USER_POST_LOGIN_SELL_MODAL_FLAG_KEY) !== "1") return;

    setShowSellModal(true);
    window.localStorage.removeItem(USER_POST_LOGIN_SELL_MODAL_FLAG_KEY);
  }, [isLoggedIn, pathname]);

  if (blockedByRole) {
    return null;
  }

  if (!isHydrated && pathname === "/user") {
    return (
      <main className="user-seller-page">
        <section className="user-dashboard-shell user-dashboard-shell-pro">
          <header className="user-dashboard-hero">
            <div className="user-dashboard-hero-copy">
              <div className="user-auth-brand">GadgetPe Seller</div>
              <h1>Loading dashboard...</h1>
            </div>
          </header>
        </section>
      </main>
    );
  }

  if (isLoggedIn && pathname !== "/user") {
    return (
      <div className="user-page-outer">
        <Outlet />
        <UserFooter />
      </div>
    );
  }

  if (pathname !== "/user") {
    return (
      <div className="user-page-outer">
        <Outlet />
        <UserFooter />
      </div>
    );
  }

  return (
    <main className="gp-page">
      <header className="gp-header">
        {/* Single row: Logo | Search | Login */}
        <div className="gp-wrap gp-head-row" style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", alignItems: "center", gap: "20px" }}>
          <div className="gp-logo"><img src="/logo.png" alt="GadgetPe" style={{ height: "60px", width: "auto" }} /></div>

          <div className="gp-search-bar" ref={searchRef} style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
            <Search size={16} className="gp-search-icon" aria-hidden="true" />
            <input
              type="search"
              className="gp-search-input"
              placeholder="Search phones, brands, FAQs, sections…"
              value={searchQuery}
              autoComplete="off"
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setShowSearchResults(e.target.value.trim().length > 0);
              }}
              onFocus={handleSearchFocus}
              aria-label="Search page content"
            />
            {searchQuery && (
              <button
                type="button"
                className="gp-search-clear"
                aria-label="Clear search"
                onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
              >
                ✕
              </button>
            )}
            {showSearchResults && searchResults.length > 0 && (
              <div className="gp-search-results" role="listbox" aria-label="Search results">
                {searchResults.map((result) => (
                  <a
                    key={result.id}
                    href={result.href}
                    className="gp-search-result-item"
                    role="option"
                    aria-selected="false"
                    onClick={() => { setSearchQuery(""); setShowSearchResults(false); }}
                  >
                    <span className="gp-search-result-label">{result.label}</span>
                    <span className="gp-search-result-type">{result.type}</span>
                  </a>
                ))}
              </div>
            )}
            {showSearchResults && searchQuery.trim().length > 0 && searchResults.length === 0 && (
              <div className="gp-search-results gp-search-empty">
                <span>No results for &ldquo;{searchQuery}&rdquo;</span>
              </div>
            )}
          </div>

          <div className="gp-head-actions">
            {isLoggedIn ? (
              <div className="user-top-menu-wrap" style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
                <button
                  type="button"
                  className="gp-hamburger"
                  aria-label="Menu"
                  aria-expanded={hamburgerOpen}
                  onClick={() => setHamburgerOpen((prev) => !prev)}
                >
                  <Menu size={20} color="#3d4a5c" />
                </button>
                {hamburgerOpen && (
                  <nav className="gp-hamburger-menu" aria-label="Seller actions">
                    <div className="gp-hm-profile">
                      <div className="gp-hm-avatar">{sellerName.charAt(0).toUpperCase()}</div>
                      <div className="gp-hm-profile-info">
                        <span className="gp-hm-profile-name">{sellerName}</span>
                        <span className="gp-hm-profile-role">GadgetPe Seller</span>
                      </div>
                    </div>
                    <div className="gp-hm-divider" />
                    <button
                      type="button"
                      className="gp-hamburger-item"
                      onClick={() => { setHamburgerOpen(false); void navigate({ to: "/user/active-orders" }); }}
                    >
                      <PackageCheck size={16} />
                      <span>Active Orders</span>
                    </button>
                    <button
                      type="button"
                      className="gp-hamburger-item"
                      onClick={() => { setHamburgerOpen(false); void navigate({ to: "/user/closed-orders" }); }}
                    >
                      <History size={16} />
                      <span>Closed Orders</span>
                    </button>
                    <button
                      type="button"
                      className="gp-hamburger-item"
                      onClick={() => { setHamburgerOpen(false); void navigate({ to: "/user/profile" }); }}
                    >
                      <UserRound size={16} />
                      <span>Profile</span>
                    </button>
                    <div className="gp-hm-divider" />
                    <button
                      type="button"
                      className="gp-hamburger-item gp-hm-logout"
                      onClick={() => { setHamburgerOpen(false); handleLogout(); }}
                    >
                      <span className="gp-hm-logout-icon">↩</span>
                      <span>Logout</span>
                    </button>
                  </nav>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="gp-login"
                onClick={() => {
                  void navigate({ to: "/user/login", search: { redirectTo: "/user" } });
                }}
              >
                Login
              </button>
            )}
          </div>
        </div>

        {/* Nav links row — centered with dropdowns */}
        <div className="gp-wrap gp-nav-row">
          <nav className="gp-nav">

            {/* All */}
            <div className="gp-nav-item">
              <span className="gp-nav-trigger">All <span className="gp-nav-chevron">▾</span></span>
              <div className="gp-dropdown">
                <a href="/user/sell-phone">Sell Phones</a>
                <a href="/user/sell-tablet">Sell iPads</a>
                <a href="/user/sell-tablet">Sell Tablets</a>
                <a href="#how">How It Works</a>
                <a href="/partner">Become Our Partner</a>
                <a href="#faq">Help</a>
              </div>
            </div>

            {/* Sell Phones */}
            <div className="gp-nav-item">
              <span className="gp-nav-trigger">Sell Phones <span className="gp-nav-chevron">▾</span></span>
              <div className="gp-dropdown">
                <a href="/user/sell-phone">All Phones</a>
                <a href="/user/sell-phone?brand=Apple">Apple</a>
                <a href="/user/sell-phone?brand=Samsung">Samsung</a>
                <a href="/user/sell-phone?brand=Xiaomi">Xiaomi</a>
                <a href="/user/sell-phone?brand=OnePlus">OnePlus</a>
                <a href="/user/sell-phone?brand=Vivo">Vivo</a>
                <a href="/user/sell-phone?brand=OPPO">OPPO</a>
                <a href="/user/sell-phone?brand=realme">realme</a>
              </div>
            </div>

            {/* Sell iPads */}
            <div className="gp-nav-item">
              <span className="gp-nav-trigger">Sell iPads <span className="gp-nav-chevron">▾</span></span>
              <div className="gp-dropdown">
                <a href="/user/sell-tablet">iPad Air</a>
                <a href="/user/sell-tablet">iPad Pro</a>
                <a href="/user/sell-tablet">iPad mini</a>
                <a href="/user/sell-tablet">iPad (standard)</a>
              </div>
            </div>

            {/* Sell Tablets */}
            <div className="gp-nav-item">
              <span className="gp-nav-trigger">Sell Tablets <span className="gp-nav-chevron">▾</span></span>
              <div className="gp-dropdown">
                <a href="/user/sell-tablet">All Tablets & iPads</a>
                <a href="/user/sell-tablet">Samsung Tabs</a>
                <a href="/user/sell-tablet">Xiaomi Tabs</a>
                <a href="/user/sell-tablet">Other Tablets</a>
              </div>
            </div>

            {/* How It Works */}
            <div className="gp-nav-item">
              <span className="gp-nav-trigger">How It Works <span className="gp-nav-chevron">▾</span></span>
              <div className="gp-dropdown">
                <a href="#how">Check Price</a>
                <a href="#how">Schedule Pickup</a>
                <a href="#how">Get Paid</a>
              </div>
            </div>

            {/* Become Our Partner */}
            <div className="gp-nav-item gp-nav-item-partner">
              <a className="gp-nav-link-partner" href="/partner">Become Our Partner</a>
            </div>

            {/* Help */}
            <div className="gp-nav-item">
              <span className="gp-nav-trigger">Help <span className="gp-nav-chevron">▾</span></span>
              <div className="gp-dropdown">
                <a href="#faq">FAQ</a>
                <a href="#faq">Pickup Issues</a>
                <a href="#faq">Payment Issues</a>
                <a href="mailto:support@gadgetpe.local">Contact Us</a>
              </div>
            </div>

          </nav>
        </div>
      </header>

      {isLoggedIn && (
        <div style={{
          padding: "8px 24px",
          background: "#f0f4f8",
          borderBottom: "1px solid #e2e8f0",
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: 13,
          color: "#3d4a5c",
        }}>
          <span>Hello, <strong>{sellerName}</strong></span>
          {selectedCityName ? (
            <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#64748b" }}>
              <MapPin size={13} />
              {selectedCityName}
            </span>
          ) : (
            <button
              type="button"
              style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: 13, padding: 0 }}
              onClick={() => setShowPincodeModal(true)}
            >
              <MapPin size={13} />
              Set your pincode
            </button>
          )}
        </div>
      )}

      {/* <section className="gp-subnav" aria-label="Categories">
        <div className="gp-wrap gp-subnav-row">
          <div className="gp-subnav-marquee" aria-label="Category ticker">
            <div className="gp-subnav-track">
              {subnavMarqueeItems.map((item) => (
                <span key={`left-${item}`} className="gp-subnav-item gp-subnav-item-marquee">{item} <span>▾</span></span>
              ))}
              {subnavMarqueeItems.map((item) => (
                <span key={`right-${item}`} className="gp-subnav-item gp-subnav-item-marquee" aria-hidden="true">{item} <span>▾</span></span>
              ))}
            </div>
          </div>
        </div>
      </section> */}

      <section className="hero" id="sell">
        <div className="hero-copy">
          <span className="hero-kicker">✨ The Smartest Way to Sell Your Old Gadgets</span>
          <h1 className="hero-title">
            Turn Your Old Device
            <span>Into Money.</span>
          </h1>
          <p className="hero-sub">
            Get the best value for your used smartphones, iPads, tablets and more –
            quickly, safely and effortlessly with GadgetPe.
          </p>
          <div className="hero-feature-strip">
            <span><HeroIconMoney /><span className="hero-chip-text"><strong>Best Price</strong><small>Guaranteed</small></span></span>
            <span><HeroIconTruck /><span className="hero-chip-text"><strong>Free</strong><small>Doorstep Pickup</small></span></span>
            <span><HeroIconShield /><span className="hero-chip-text"><strong>100% Safe</strong><small>&amp; Transparent</small></span></span>
          </div>
          <div className="cta-row">
            <button
              type="button"
              className="hero-main-cta cta-green"
              onClick={() => {
                setShowSellTypeModal(true);
              }}
            >
              Sell Your Device Now
            </button>
          </div>
        </div>
        <div className="hero-art">
          <img src="/hero.jpeg" alt="Sell your old smartphones, tablets and gadgets" className="hero-art-image" />
          <div className="hero-art-stage" aria-hidden="true" />
        </div>
      </section>

      <section className="gp-section" id="top-brands">
        <div className="gp-wrap">
          <h2>Top Brands</h2>
          <div className="gp-brand-strip">
            {brands.map((brand) => (
              <span key={brand.name} className="gp-brand-item">
                <span className="gp-brand-logo-wrap">
                  {failedBrandLogos[brand.name] ? (
                    <span className="gp-brand-logo-fallback" aria-hidden="true">{brand.name.charAt(0)}</span>
                  ) : (
                    <img
                      src={brand.logoUrl}
                      alt={`${brand.name} logo`}
                      className="gp-brand-logo"
                      loading="lazy"
                      onError={() => setFailedBrandLogos((prev) => ({ ...prev, [brand.name]: true }))}
                    />
                  )}
                </span>
                <span>{brand.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-section gp-how-tone" id="how">
        <div className="gp-wrap">
          <h2>How GadgetPe Works</h2>
          <div className="gp-steps">
            <article>
              <div className="gp-icon">1</div>
              <h3>Get an Instant Price Estimate</h3>
              <p>Choose your device and answer a few quick questions about its condition.</p>
            </article>
            <article>
              <div className="gp-icon">2</div>
              <h3>Schedule a Free Doorstep Pickup</h3>
              <p>Select a convenient date and time. Our verified pickup partner will visit your location.</p>
            </article>
            <article>
              <div className="gp-icon">3</div>
              <h3>Receive Instant Payment</h3>
              <p>Once your device is verified, payment is processed instantly via UPI or bank transfer.</p>
            </article>
          </div>
        </div>
      </section>

      {/* <section className="gp-section gp-user-reviews" aria-labelledby="user-reviews-heading">
        <div className="gp-wrap">
          <div className="gp-user-reviews-head">
            <h2 id="user-reviews-heading">User Reviews</h2>
          </div>

          <div className="gp-user-reviews-viewport" role="region" aria-live="polite" aria-label="User reviews carousel">
            <div
              className="gp-user-reviews-track"
              style={{ transform: `translateX(-${activeReviewIndex * 100}%)` }}
            >
              {userReviews.map((review) => (
                <article key={`${review.name}-${review.device}`} className="gp-user-review-card">
                  <p className="gp-user-review-text">&ldquo;{review.quote}&rdquo;</p>
                  <div className="gp-user-review-meta">
                    <strong>{review.name}</strong>
                    <span>{review.city}</span>
                  </div>
                  <div className="gp-user-review-sale">
                    <span>{review.device}</span>
                    <strong>{review.amount}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <div className="gp-user-reviews-dots" aria-label="Jump to review">
            {userReviews.map((review, index) => (
              <button
                type="button"
                key={`${review.name}-dot`}
                className={`gp-user-reviews-dot ${activeReviewIndex === index ? "is-active" : ""}`}
                aria-label={`Show review ${index + 1}`}
                onClick={() => setActiveReviewIndex(index)}
              />
            ))}
          </div>
        </div>
      </section> */}

      {/* <section className="gp-section gp-soft gp-phones-market" id="deals">
        <div className="gp-wrap">
          <h2>Become Our Partner</h2>
          <div className="gp-table">
            <div className="gp-row gp-row-head">
              <span>Phone</span>
              <span>Live Price</span>
              <span>Action</span>
            </div>
            {topPhones.length > 0 ? topPhones.map((phoneItem, index) => {
              const key = `${phoneItem.name}-${phoneItem.variant}`;
              const ticker = priceTickers[key];
              return (
                <div key={key} className="gp-row">
                  <span>
                    <strong>{phoneItem.name}</strong>
                    <small>{phoneItem.variant}</small>
                  </span>
                  <span className={`gp-price gp-price-${ticker.trend}`}>
                    <span className={`gp-price-indicator`}>{ticker.trend === "up" ? "▲" : "▼"}</span>
                    <span className={`gp-price-value ${ticker.pulse % 2 === 0 ? "flash-a" : "flash-b"}`}>Rs. {formatInr(ticker.value)}</span>
                    <span className="gp-price-percent">{ticker.changePercent}%</span>
                  </span>
                  <button type="button" onClick={() => setIsLoginOpen(true)}>{index % 2 === 0 ? "Sell Now" : "Check"}</button>
                </div>
              );
            }) : (
              <div className="gp-row">
                <span>
                  <strong>No live phone price data</strong>
                  <small>Please check back later.</small>
                </span>
                <span className="gp-price">-</span>
                <button type="button" disabled>Unavailable</button>
              </div>
            )}
          </div>
        </div>
      </section> */}

      <section className="gp-section" id="why-sell">
        <div className="gp-wrap">
          <h2>Why Sell with GadgetPe</h2>
          <div className="gp-why-sell-list" aria-label="Why sell with GadgetPe benefits">
            {[
              "Best Market Prices",
              "Free Doorstep Pickup",
              "Instant & Secure Payment",
              "Safe & Transparent Process",
              "Verified Pickup Partners",
              "Wide Device Coverage",
            ].map((item) => (
              <article key={item}>
                <p>{item}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-section" id="faq">
        <div className="gp-wrap">
          <h2>FAQ</h2>
          <div className="gp-faq-list">
            {faqs.map((item) => (
              <details key={item.question}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-section gp-soft" id="become-partner">
        <div className="gp-wrap">
          <div className="gp-partner-promo">
            <h2>Become a Partner</h2>
            <p>
              Join our growing network of trusted partners and connect with customers looking to sell their old
              devices. Expand your business with quality leads, streamlined operations, and dedicated support.
            </p>
            <a href="/partner" className="gp-partner-promo-link">Explore Partner Program</a>
          </div>
        </div>
      </section>

      {/* Sell Phone / Sell Tablet cards — commented out, preserved for re-enabling
      <section className="user-sell-type-grid" aria-label="Sell category">
        <Link to="/user/sell-phone" className="user-sell-type-tile user-sell-phone-tile">
          <span className="user-sell-type-label">Sell Phone</span>
          <small>List your smartphone in seconds</small>
        </Link>
        <Link to="/user/sell-tablet" className="user-sell-type-tile user-sell-tablet-tile">
          <span className="user-sell-type-label">Sell Tablet</span>
          <small>Open tablet selling flow</small>
        </Link>
      </section>
      */}

      {isLoggedIn && showSellModal && (
        <div className="user-auth-overlay" role="dialog" aria-modal="true">
          <section className="user-auth-card user-sell-modal">
            <div className="user-sell-badge-strip" aria-hidden="true">
              <div className="user-sell-badge-track" style={{ display: "flex", justifyContent: "center", gap: "10px", margin: "10px 0" }}>
                <Flame size={32} color="#FFD700" />
                <Flame size={32} color="#C0C0C0" />
                <Flame size={32} color="#CD7F32" />
              </div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div className="user-auth-brand" style={{ display: "inline-block" }}>GadgetPe Seller Boost</div>
              <h1>You are ready to win today.</h1>
              <p>List your Gadgets and earn a streak score with every successful sale.</p>
            </div>
            <div className="user-auth-actions" style={{ justifyContent: "center" }}>
              <button
                type="button"
                className="user-auth-submit user-sell-cta"
                onClick={() => {
                  setShowSellModal(false);
                  setShowPincodeModal(true);
                }}
              >
                Sell
              </button>
            </div>
          </section>
        </div>
      )}

      <Dialog open={showSellTypeModal} onOpenChange={setShowSellTypeModal}>
        <DialogContent className="max-w-2xl border-slate-200 bg-white text-slate-900 shadow-2xl">
          <DialogHeader>
            <DialogTitle>Choose Your Device Category</DialogTitle>
            <DialogDescription>
              Select what you want to sell to continue to the right flow.
            </DialogDescription>
          </DialogHeader>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 8 }}>
            {sellFlowOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.title}
                  type="button"
                  onClick={() => handleSellFlowSelection(option.to)}
                  style={{
                    textAlign: "left",
                    borderRadius: 14,
                    border: "1px solid #d8e2ee",
                    background: "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
                    padding: "14px 12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    cursor: "pointer",
                  }}
                >
                  <span style={{ width: 34, height: 34, borderRadius: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#e8f7f0", color: "#1a8b6f" }}>
                    <Icon size={18} />
                  </span>
                  <span style={{ fontWeight: 700, color: "#102132", fontSize: 14 }}>{option.title}</span>
                  <span style={{ color: "#5f7285", fontSize: 12, lineHeight: 1.35 }}>{option.description}</span>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {isLoggedIn && showPincodeModal && (
        <div className="user-auth-overlay" role="dialog" aria-modal="true">
          <section className="user-auth-card user-pincode-modal">
            <div className="user-pincode-layer user-pincode-layer-a" aria-hidden="true" />
            <div className="user-pincode-layer user-pincode-layer-b" aria-hidden="true" />
            <div className="user-auth-brand">Choose Service Area</div>
            <h1>Select Your Pincode</h1>
            <p>Pick your local area to start selling gadgets faster and smarter.</p>
            <form className="user-auth-form" onSubmit={(e) => void handlePincodeSelect(e)}>
              <label>
                Pincode
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter 6-digit pincode"
                  value={pincodeInput}
                  onChange={(event) => setPincodeInput(event.target.value)}
                />
              </label>
              {selectedCityName ? <div className="user-auth-hint">Last selected city: {selectedCityName}</div> : null}
              <div className="user-auth-actions">
                <button
                  type="button"
                  className="user-auth-cancel"
                  onClick={() => {
                    setShowPincodeModal(false);
                    setPincodeInput("");
                  }}
                >
                  Skip
                </button>
                <button type="submit" className="user-auth-submit" disabled={isCheckingPincode}>
                  {isCheckingPincode ? "Selecting..." : "Select Pincode"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      <UserFooter />

    </main>
  );
}
