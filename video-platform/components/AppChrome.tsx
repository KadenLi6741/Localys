"use client";

import { usePathname } from "next/navigation";
import { ActivityPanel } from "@/components/ActivityPanel";
import { PersistentVideoFeed } from "@/components/PersistentVideoFeed";
import { TopHeader } from "@/components/shell/TopHeader";
import { SecondaryNav } from "@/components/shell/SecondaryNav";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMarketingHome = pathname === "/";
  // Auth screens render bare (no app chrome).
  const isAuthRoute =
    pathname === "/login" || pathname === "/signup" || pathname === "/reset-password";

  if (isMarketingHome || isAuthRoute) {
    return (
      <main id="main-content" className="min-h-screen">
        {children}
      </main>
    );
  }

  // Global Walmart-style shell: top header + secondary nav, white/orange/Inter,
  // light + dark. Replaces the old left sidebar + mobile bottom nav app-wide.
  return (
    <div className="font-[family-name:var(--font-inter)]">
      <a href="#main-content" className="skip-to-main">
        Skip to main content
      </a>
      <PersistentVideoFeed />
      <TopHeader />
      <SecondaryNav />
      <main id="main-content">{children}</main>
      <ActivityPanel />
    </div>
  );
}
