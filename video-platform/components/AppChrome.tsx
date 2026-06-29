"use client";

/**
 * AppChrome — the global layout "frame" wrapped around every page.
 * Purpose: Decides what shared UI (top header, secondary nav, footer, activity panel, AI assistant,
 *   persistent video feed) surrounds the current page. Marketing home and auth screens render bare;
 *   everything else gets the full app shell. Centralising this keeps layout consistent across routes.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

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

// Routes where the footer should not render:
// - /feed: full-screen fixed video player — footer is invisible behind it anyway,
//   but we skip it to avoid it appearing briefly during navigation.
// - /chats/[id]: message thread is a full-height panel; footer doesn't belong there.
const NO_FOOTER_ROUTES = ['/feed', '/chats/'];

// Chooses the layout for the current route and renders the appropriate shell around `children`.
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
