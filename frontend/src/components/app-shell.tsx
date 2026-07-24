import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/lib/utils";

type AppShellProps = ComponentPropsWithoutRef<"div"> & {
  children: ReactNode;
};

export function AppShell({ className, children, ...props }: AppShellProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(29,158,117,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(14,165,201,0.16),_transparent_22%),linear-gradient(180deg,_#f8fbfd_0%,_#eef4f8_100%)] text-slate-900",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function AppShellHeader({ className, children, ...props }: AppShellProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl supports-[backdrop-filter]:bg-white/72",
        className,
      )}
      {...props}
    >
      {children}
    </header>
  );
}

export function AppShellContainer({ className, children, ...props }: AppShellProps) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8", className)} {...props}>
      {children}
    </div>
  );
}

export function AppShellMain({ className, children, ...props }: AppShellProps) {
  return (
    <main className={cn("relative flex min-h-screen flex-col", className)} {...props}>
      {children}
    </main>
  );
}