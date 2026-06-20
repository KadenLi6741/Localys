import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { AppBottomNav } from "@/components/AppBottomNav";
import { ActivityPanel } from "@/components/ActivityPanel";
import { PersistentVideoFeed } from "@/components/PersistentVideoFeed";
import { LayoutShell } from "@/components/LayoutShell";

// Inter is the single UI typeface (Söhne substitute). Weight 100 is reserved
// for display-scale hero text; 400 body, 600 subheads, 700 button labels.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["100", "400", "600", "700"],
});

// Monospace for codes / prices.
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

// Distinct display face for the "Localys" wordmark only (stronger than Inter's
// 700 cap) — geometric + brandy, so the logo doesn't read as plain body text.
const outfit = Outfit({
  variable: "--font-wordmark",
  subsets: ["latin"],
  weight: ["700", "800"],
});

export const metadata: Metadata = {
  title: "Localy - Small Business Discovery",
  description: "Discover local small businesses through TikTok-style video scrolling",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: next-themes sets the theme class on <html>
    // before React hydrates, which would otherwise trip a mismatch warning.
    <html
      lang="en"
      className={`h-full ${inter.variable} ${jetbrainsMono.variable} ${outfit.variable}`}
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="antialiased h-full">
        <Providers>
          <a href="#main-content" className="skip-to-main">Skip to main content</a>
          <PersistentVideoFeed />
          <LayoutShell>{children}</LayoutShell>
          <AppBottomNav />
          <ActivityPanel />
        </Providers>
      </body>
    </html>
  );
}
