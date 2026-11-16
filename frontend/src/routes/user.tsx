import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  CheckCircle2,
  ChevronRight,
  Coins,
  Flame,
  History,
  IndianRupee,
  Instagram,
  ListChecks,
  Mail,
  MapPin,
  Menu,
  PackageCheck,
  PhoneCall,
  Search,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Star,
  Tablet,
  TabletSmartphone,
  Truck,
  UserRound,
  Zap,
} from "lucide-react";
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
  { name: "Apple", logoUrl: getBrandLogoUrl("Apple") ?? "https://logo.clearbit.com/apple.com", to: "/user/sell-phone?brand=Apple", badge: "iPhones & iPads" },
  { name: "Xiaomi", logoUrl: "https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/xiaomi-mi-logo-icon.png", to: "/user/sell-phone?brand=Xiaomi", badge: "Redmi & Mi" },
  { name: "Samsung", logoUrl: getBrandLogoUrl("Samsung") ?? "https://logo.clearbit.com/samsung.com", to: "/user/sell-phone?brand=Samsung", badge: "Galaxy S & A Series" },
  { name: "Vivo", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/2/29/Vivo_Logo.svg", to: "/user/sell-phone?brand=Vivo", badge: "V & X Series" },
  { name: "OnePlus", logoUrl: getBrandLogoUrl("OnePlus") ?? "https://logo.clearbit.com/oneplus.com", to: "/user/sell-phone?brand=OnePlus", badge: "Nord & Flagships" },
  { name: "OPPO", logoUrl: getBrandLogoUrl("OPPO") ?? "https://logo.clearbit.com/oppo.com", to: "/user/sell-phone?brand=OPPO", badge: "Reno & F Series" },
  { name: "realme", logoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/bc/Realme-realme-_logo_box-RGB-01.png", to: "/user/sell-phone?brand=realme", badge: "GT & Number Series" },
];

const quickCategoryCards = [
  {
    title: "Sell Phones",
    tag: "Most Popular",
    desc: "iPhone, Samsung, OnePlus & 30+ brands",
    cta: "Check Phone Value",
    icon: Smartphone,
    to: "/user/sell-phone",
  },
  {
    title: "Sell iPads",
    tag: "High Value",
    desc: "iPad Pro, Air, mini & standard models",
    cta: "Check iPad Value",
    icon: Tablet,
    to: "/user/sell-tablet?category=ipad",
  },
  {
    title: "Sell Tablets",
    tag: "Best Rates",
    desc: "OnePlus Pad, Xiaomi Pad, Samsung Tab",
    cta: "Check Tab Value",
    icon: TabletSmartphone,
    to: "/user/sell-tablet?category=tablet",
  },
];

const howItWorksSteps = [
  {
    num: "1",
    tag: "Takes ~60s",
    title: "Get Instant Price Estimate",
    desc: "Choose your device model and answer simple questions about its working condition and accessories.",
  },
  {
    num: "2",
    tag: "Zero Convenience Fee",
    title: "Free Doorstep Pickup",
    desc: "Pick a date and time slot that fits your schedule. Our verified partner comes directly to your home.",
  },
  {
    num: "3",
    tag: "Direct to Bank / UPI",
    title: "Instant On-the-Spot Payment",
    desc: "After a quick physical check, your funds are transferred directly into your UPI or bank account before pickup.",
  },
];

const whyChooseUsFeatures = [
  {
    icon: IndianRupee,
    title: "Best Market Price",
    desc: "Transparent algorithmic pricing ensures you always get top value for your old device without endless haggling.",
  },
  {
    icon: Truck,
    title: "Free Doorstep Pickup",
    desc: "Enjoy hassle-free doorstep collection from your home or office with flexible rescheduling at zero cost.",
  },
  {
    icon: Zap,
    title: "Instant Payout",
    desc: "Immediate money transfer via UPI, IMPS, or bank transfer right at your doorstep before the device leaves your hands.",
  },
  {
    icon: ShieldCheck,
    title: "100% Data Safe & Secure",
    desc: "Certified data wipe assistance guidelines to ensure complete privacy and zero lingering personal information.",
  },
  {
    icon: Award,
    title: "Verified Professional Partners",
    desc: "Trained and background-verified field executives equipped with specialized diagnostic toolkits.",
  },
  {
    icon: Smartphone,
    title: "Wide Device Support",
    desc: "Sell iPhones, Android smartphones, iPads, and modern tablets across major brands and variants.",
  },
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
  { id: "sell-ipad", label: "Sell iPad", type: "Page", href: "/user/sell-tablet?category=ipad", keywords: ["ipad", "apple", "tablet", "sell"] },
  { id: "sell-tablet", label: "Sell Tablet", type: "Page", href: "/user/sell-tablet?category=tablet", keywords: ["tablet", "tab", "android", "sell"] },
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
    to: "/user/sell-phone",
  },
  {
    title: "Sell iPads",
    description: "Sell your Apple iPad with an instant quote.",
    icon: Tablet,
    to: "/user/sell-tablet?category=ipad",
  },
  {
    title: "Sell Tablets",
    description: "Sell Android and other tablets with the same flow.",
    icon: TabletSmartphone,
    to: "/user/sell-tablet?category=tablet",
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
          <div className="gp-user-footer-logo"><img src="/logo-dark.png" alt="GadgetPe" style={{ height: "60px", width: "auto" }} /></div>
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

  const handleSellFlowSelection = (to: string) => {
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
        <div className="gp-wrap gp-head-row" style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: "24px" }}>
          <Link to="/user" className="gp-logo" aria-label="GadgetPe Home">
            <img
              src="/logo.png"
              alt="GadgetPe"
              className="gp-logo-img"
              style={{ height: "92px", width: "auto", objectFit: "contain", display: "block" }}
            />
          </Link>

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
                <a href="/user/sell-tablet?category=ipad">Sell iPads</a>
                <a href="/user/sell-tablet?category=tablet">Sell Tablets</a>
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
                <a href="/user/sell-tablet?category=ipad">All iPads</a>
                <a href="/user/sell-tablet?category=ipad&series=IPAD+AIR">iPad Air</a>
                <a href="/user/sell-tablet?category=ipad&series=IPAD+PRO">iPad Pro</a>
                <a href="/user/sell-tablet?category=ipad&series=IPAD+MINI">iPad mini</a>
                <a href="/user/sell-tablet?category=ipad&series=IPAD">iPad (standard)</a>
              </div>
            </div>

            {/* Sell Tablets */}
            <div className="gp-nav-item">
              <span className="gp-nav-trigger">Sell Tablets <span className="gp-nav-chevron">▾</span></span>
              <div className="gp-dropdown">
                <a href="/user/sell-tablet?category=tablet">All Tablets</a>
                <a href="/user/sell-tablet?category=tablet&brand=OnePlus">OnePlus Tabs</a>
                <a href="/user/sell-tablet?category=tablet&brand=OPPO">OPPO Tabs</a>
                <a href="/user/sell-tablet?category=tablet&brand=realme">Realme Tabs</a>
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

      <section className="hero-revamped" id="sell">
        <div className="hero-revamped-inner">
          <div className="hero-copy">
            <span className="hero-pill-badge">
              <Sparkles size={14} /> The Smartest Way to Sell Old Gadgets
            </span>
            <h1 className="hero-main-title">
              Sell Old Gadgets. <br />
              <span className="hero-gradient-text">Get Paid Instantly.</span>
            </h1>
            <p className="hero-lead-text">
              Turn your unused smartphones, iPads, and tablets into instant cash with fair market valuation and free doorstep pickup.
            </p>

            {/* Quick 1-Click Sell Category Cards */}
            <div className="hero-category-cards" aria-label="Sell category options">
              {quickCategoryCards.map((card) => {
                const Icon = card.icon;
                return (
                  <Link key={card.title} to={card.to} className="hero-category-card">
                    <div>
                      <div className="hero-category-card-top">
                        <span className="hero-category-icon-wrap">
                          <Icon size={20} />
                        </span>
                        <span className="hero-category-badge">{card.tag}</span>
                      </div>
                      <h3 className="hero-category-title">{card.title}</h3>
                      <p className="hero-category-sub">{card.desc}</p>
                    </div>
                    <div className="hero-category-footer">
                      <span>{card.cta}</span>
                      <ArrowRight size={14} />
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Trust Strip */}
            <div className="hero-trust-strip">
              <div className="hero-trust-item">
                <span className="hero-trust-item-icon">
                  <IndianRupee size={16} />
                </span>
                <div className="hero-trust-item-copy">
                  <strong>Best Value</strong>
                  <span>Market-matched prices</span>
                </div>
              </div>
              <div className="hero-trust-item">
                <span className="hero-trust-item-icon">
                  <Truck size={16} />
                </span>
                <div className="hero-trust-item-copy">
                  <strong>Free Pickup</strong>
                  <span>Right at your doorstep</span>
                </div>
              </div>
              <div className="hero-trust-item">
                <span className="hero-trust-item-icon">
                  <Zap size={16} />
                </span>
                <div className="hero-trust-item-copy">
                  <strong>Instant Cash</strong>
                  <span>UPI / Bank on inspection</span>
                </div>
              </div>
              <div className="hero-trust-item">
                <span className="hero-trust-item-icon">
                  <ShieldCheck size={16} />
                </span>
                <div className="hero-trust-item-copy">
                  <strong>Safe &amp; Verified</strong>
                  <span>Trained pickup partners</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hero-art-showcase">
            <img src="/hero.jpeg" alt="Sell your old smartphones and gadgets on GadgetPe" className="hero-art-main-img" />
            <div className="hero-float-tag hero-float-tag-1">
              <span style={{ width: 32, height: 32, borderRadius: 8, background: "#e8f7f2", color: "#16a085", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <CheckCircle2 size={18} />
              </span>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>Instant ₹ Transfer</strong>
                <span style={{ fontSize: 11, color: "#64748b" }}>On doorstep verification</span>
              </div>
            </div>
            <div className="hero-float-tag hero-float-tag-2">
              <span style={{ width: 32, height: 32, borderRadius: 8, background: "#fef3c7", color: "#d97706", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                <Star size={18} fill="#d97706" />
              </span>
              <div>
                <strong style={{ display: "block", fontSize: 13, color: "#0f172a" }}>4.8/5 Rated</strong>
                <span style={{ fontSize: 11, color: "#64748b" }}>By 10,000+ satisfied sellers</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="gp-section" id="top-brands">
        <div className="gp-wrap">
          <div className="gp-section-header">
            <span className="gp-section-kicker">Popular Brands</span>
            <h2 className="gp-section-title">Select Your Brand</h2>
            <p className="gp-section-desc">Choose your device brand to get an instant tailored evaluation</p>
          </div>
          <div className="gp-brand-strip-revamped">
            {brands.map((brand) => (
              <Link key={brand.name} to={brand.to} className="gp-brand-card-link">
                <span className="gp-brand-card-logo-wrap">
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
                <span style={{ fontWeight: 700 }}>{brand.name}</span>
                <span className="gp-brand-card-badge">{brand.badge}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-how-section" id="how">
        <div className="gp-wrap">
          <div className="gp-section-header">
            <span className="gp-section-kicker">Simple 3-Step Process</span>
            <h2 className="gp-section-title">How GadgetPe Works</h2>
            <p className="gp-section-desc">From price calculation to cash in your account in under 24 hours</p>
          </div>
          <div className="gp-steps-grid">
            {howItWorksSteps.map((step) => (
              <article key={step.num} className="gp-step-card">
                <div className="gp-step-card-top">
                  <span className="gp-step-num-pill">{step.num}</span>
                  <span className="gp-step-tag">{step.tag}</span>
                </div>
                <h3>{step.title}</h3>
                <p>{step.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-why-section" id="why-sell">
        <div className="gp-wrap">
          <div className="gp-section-header">
            <span className="gp-section-kicker">The GadgetPe Advantage</span>
            <h2 className="gp-section-title">Why Sell With GadgetPe?</h2>
            <p className="gp-section-desc">We make selling your old devices fast, safe, and truly rewarding</p>
          </div>
          <div className="gp-why-grid-revamped">
            {whyChooseUsFeatures.map((feat) => {
              const Icon = feat.icon;
              return (
                <article key={feat.title} className="gp-why-card">
                  <span className="gp-why-icon-wrap">
                    <Icon size={22} />
                  </span>
                  <h3>{feat.title}</h3>
                  <p>{feat.desc}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="gp-reviews-section" id="reviews">
        <div className="gp-wrap">
          <div className="gp-section-header">
            <span className="gp-section-kicker">Seller Stories</span>
            <h2 className="gp-section-title">What Our Customers Say</h2>
            <p className="gp-section-desc">Real experiences from customers who traded their old gadgets for quick cash</p>
          </div>
          <div className="gp-reviews-grid">
            {userReviews.map((rev) => (
              <article key={`${rev.name}-${rev.device}`} className="gp-review-card-modern">
                <div>
                  <div className="gp-review-stars" aria-label="5 out of 5 stars">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={15} fill="#f59e0b" color="#f59e0b" />
                    ))}
                  </div>
                  <p className="gp-review-quote">&ldquo;{rev.quote}&rdquo;</p>
                </div>
                <div className="gp-review-bottom">
                  <div className="gp-review-author">
                    <strong>{rev.name}</strong>
                    <span>{rev.city}</span>
                  </div>
                  <div className="gp-review-device-tag">
                    <span>{rev.device}</span> • <strong>{rev.amount}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-faq-section" id="faq">
        <div className="gp-wrap">
          <div className="gp-section-header">
            <span className="gp-section-kicker">Got Questions?</span>
            <h2 className="gp-section-title">Frequently Asked Questions</h2>
            <p className="gp-section-desc">Everything you need to know about selling with GadgetPe</p>
          </div>
          <div className="gp-faq-grid">
            {faqs.map((item) => (
              <details key={item.question} className="gp-faq-item">
                <summary className="gp-faq-summary">
                  <span>{item.question}</span>
                  <span style={{ color: "#16a085", fontSize: 18, fontWeight: 700 }}>+</span>
                </summary>
                <p className="gp-faq-answer">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="gp-section" id="become-partner" style={{ background: "#f8fafc", padding: "60px 0" }}>
        <div className="gp-wrap">
          <div className="gp-partner-banner-modern">
            <div>
              <span className="gp-partner-banner-badge">Partner Network</span>
              <h2 className="gp-partner-banner-title">Grow Your Business With GadgetPe</h2>
              <p className="gp-partner-banner-desc">
                Join our certified partner network to fulfill doorstep device inspections, pickups, and trade-ins. Get consistent local orders, prompt weekly payouts, and end-to-end partner app support.
              </p>
              <div className="gp-partner-perks">
                <span className="gp-partner-perk-item"><CheckCircle2 size={15} color="#5eead4" /> Daily local pickup leads</span>
                <span className="gp-partner-perk-item"><CheckCircle2 size={15} color="#5eead4" /> Verified seller devices</span>
                <span className="gp-partner-perk-item"><CheckCircle2 size={15} color="#5eead4" /> Dedicated partner support</span>
              </div>
            </div>
            <Link to="/partner" className="gp-partner-btn">
              <span>Become a Partner</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

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
