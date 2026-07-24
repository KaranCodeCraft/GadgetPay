import { useEffect, useState } from "react";

import { Download, WifiOff, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const DISMISS_KEY = "gadgetpe_pwa_install_banner_dismissed";

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(window.navigator.onLine);
    setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === "true");

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setDismissed(true);
      window.sessionStorage.setItem(DISMISS_KEY, "true");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const closeBanner = () => {
    setDismissed(true);
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISS_KEY, "true");
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome !== "accepted") {
      setDismissed(false);
      return;
    }

    setDeferredPrompt(null);
    setDismissed(true);
  };

  if (dismissed && isOnline) return null;
  if (!deferredPrompt && isOnline) return null;

  return (
    <div className="border-b border-emerald-200/60 bg-emerald-50/90 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border",
              isOnline
                ? "border-emerald-200 bg-white text-emerald-700"
                : "border-amber-200 bg-white text-amber-700",
            )}
          >
            {isOnline ? <Download className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-900">
              {isOnline ? "Install GadgetPe for a better mobile experience" : "You are offline right now"}
            </p>
            <p className="text-sm leading-6 text-slate-600">
              {isOnline
                ? "Add GadgetPe to the home screen for faster launch, app-style navigation, and offline app-shell access."
                : "Previously loaded screens can still open, but live quotes, payments, and dashboard updates need a connection."}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end md:self-auto">
          {isOnline ? (
            <Button className="rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700" onClick={() => void installApp()}>
              Install app
            </Button>
          ) : (
            <Button className="rounded-full bg-emerald-600 px-5 text-white hover:bg-emerald-700" onClick={() => window.location.reload()}>
              Retry connection
            </Button>
          )}
          <Button aria-label="Dismiss banner" className="rounded-full" size="icon" variant="ghost" onClick={closeBanner}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}