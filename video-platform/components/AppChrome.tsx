"use client";

import { usePathname } from "next/navigation";
import { ActivityPanel } from "@/components/ActivityPanel";
import { PersistentVideoFeed } from "@/components/PersistentVideoFeed";
import { TopHeader } from "@/components/shell/TopHeader";
import { SecondaryNav } from "@/components/shell/SecondaryNav";
import { LocalysAssistant } from "@/components/LocalysAssistant";
import { Footer } from "@/components/layout/Footer";

// Routes where the footer should not render:
// - /feed: full-screen fixed video player — footer is invisible behind it anyway,
//   but we skip it to avoid it appearing briefly during navigation.
// - /chats/[id]: message thread is a full-height panel; footer doesn't belong there.
const NO_FOOTER_ROUTES = ['/feed', '/chats/'];

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

  const showFooter = !NO_FOOTER_ROUTES.some((r) => pathname === r || (r.endsWith('/') && pathname.startsWith(r)));

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
      <LocalysAssistant />
      {showFooter && <Footer />}
    </div>
  );
}
