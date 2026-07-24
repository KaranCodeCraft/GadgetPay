import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { History, Menu, UserRound } from "lucide-react";
import { toast } from "sonner";
import { AppShell, AppShellContainer, AppShellHeader, AppShellMain } from "../components/app-shell";
import { PwaInstallBanner } from "../components/pwa-install-banner";
import { Toaster } from "../components/ui/sonner";
import { clearRoleSession } from "../lib/auth/role-session";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

const USER_TOKEN_KEY = "gadgetpe_user_access_token";
const USER_NAME_KEY = "gadgetpe_user_name";

/** Shows only the GadgetPe logo on sub-pages (sell-phone, login, etc.).
 *  Hidden on /user (has its own full header) and on admin/partner dashboards. */
function GlobalHeader() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [hamburgerOpen, setHamburgerOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sellerName, setSellerName] = useState("Seller");
  const menuWrapRef = useRef<HTMLDivElement>(null);

  const hide =
    pathname === "/user" ||
    pathname === "/" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/partner-page") ||
    pathname.startsWith("/Lead-bucket") ||
    pathname.startsWith("/Lead-assignment");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = window.localStorage.getItem(USER_TOKEN_KEY);
    const storedName = window.localStorage.getItem(USER_NAME_KEY) || "Seller";
    setIsLoggedIn(Boolean(token));
    setSellerName(storedName);
  }, [pathname]);

  useEffect(() => {
    if (!hamburgerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (menuWrapRef.current && !menuWrapRef.current.contains(event.target as Node)) {
        setHamburgerOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [hamburgerOpen]);

  const showSubpageHamburger =
    isLoggedIn &&
    pathname.startsWith("/user") &&
    pathname !== "/user" &&
    pathname !== "/user/login";

  const handleLogout = () => {
    clearRoleSession("user");
    setIsLoggedIn(false);
    setHamburgerOpen(false);
    toast.success("Logged out.");
    void navigate({ to: "/user" });
  };

  if (hide) return null;

  return (
    <AppShellHeader className="shadow-[0_10px_30px_rgba(15,23,42,0.06)]">
      <AppShellContainer className="flex items-center justify-between py-3">
        <a
          href="/user"
          className="text-lg font-black tracking-[-0.04em] text-slate-900 transition-colors hover:text-emerald-600 sm:text-xl"
        >
          GadgetPe
        </a>
        {showSubpageHamburger ? (
          <div className="relative" ref={menuWrapRef}>
            <button
              type="button"
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-emerald-200 hover:text-emerald-600"
              aria-label="Menu"
              aria-expanded={hamburgerOpen}
              onClick={() => setHamburgerOpen((prev) => !prev)}
            >
              <Menu size={20} color="#3d4a5c" />
            </button>
            {hamburgerOpen ? (
              <nav
                className="absolute right-0 top-[calc(100%+0.75rem)] z-50 w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_22px_60px_rgba(15,23,42,0.18)]"
                aria-label="Seller actions"
              >
                <div className="flex items-center gap-3 rounded-3xl bg-slate-50 px-3 py-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 font-bold text-emerald-700">{sellerName.charAt(0).toUpperCase()}</div>
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-semibold text-slate-900">{sellerName}</span>
                    <span className="text-xs text-slate-500">GadgetPe Seller</span>
                  </div>
                </div>
                <div className="my-3 h-px bg-slate-200" />
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-emerald-700"
                  onClick={() => {
                    setHamburgerOpen(false);
                    void navigate({ to: "/user/selling-history" });
                  }}
                >
                  <History size={16} />
                  <span>Selling History</span>
                </button>
                <button
                  type="button"
                  className="mt-1 flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-emerald-700"
                  onClick={() => {
                    setHamburgerOpen(false);
                    void navigate({ to: "/user/profile" });
                  }}
                >
                  <UserRound size={16} />
                  <span>Profile</span>
                </button>
                <div className="my-3 h-px bg-slate-200" />
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-medium text-rose-600 transition hover:bg-rose-50"
                  onClick={handleLogout}
                >
                  <span>↩</span>
                  <span>Logout</span>
                </button>
              </nav>
            ) : null}
          </div>
        ) : null}
      </AppShellContainer>
    </AppShellHeader>
  );
}



function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm">Page not found</p>
        <div className="mt-6">
          <Link to="/" className="underline">Go home</Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <div className="mt-6 flex justify-center gap-2">
          <button onClick={() => { router.invalidate(); reset(); }}>Try again</button>
          <a href="/">Go home</a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { name: "theme-color", content: "#1d9e75" },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "default" },
      { name: "apple-mobile-web-app-title", content: "GadgetPe" },
      { title: "GadgetPe — Buy & Sell Phones at the Best Price" },
      { name: "description", content: "GadgetPe is the #1 rated phone marketplace. Get an instant quote, free pickup, and instant payment." },
      { property: "og:title", content: "GadgetPe — Buy & Sell Phones" },
      { property: "og:description", content: "Instant valuations. Free pickup. Instant payment." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "apple-touch-icon", href: "/icons/icon-192.svg" },
      { rel: "manifest", href: "/manifest.webmanifest" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head><HeadContent /></head>
      <body>
        <AppShell>
          <AppShellMain>{children}</AppShellMain>
        </AppShell>
        <Scripts />
      </body>
    </html>
  );
}

function AppStartupLoader() {
  return (
    <div className="gp-app-startup-loader" role="status" aria-live="polite" aria-label="Application loading">
      <div className="gp-app-startup-loader__inner">
        <span className="gp-app-startup-loader__spinner" aria-hidden="true" />
        <p>Loading...</p>
      </div>
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  const [isAppStarting, setIsAppStarting] = useState(true);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setIsAppStarting(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  if (isAppStarting) {
    return <AppStartupLoader />;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <GlobalHeader />
      <PwaInstallBanner />
      <Outlet />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
}
