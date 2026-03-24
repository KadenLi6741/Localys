import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { UnreadMessagesProvider } from "@/contexts/UnreadMessagesContext";
import { AppBottomNav } from "@/components/AppBottomNav";
import { ActivityPanel } from "@/components/ActivityPanel";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { PersistentVideoFeed } from "@/components/PersistentVideoFeed";
import { CursorOrb } from "@/components/CursorOrb";
import { DesktopSidebar } from "@/components/DesktopSidebar";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
    <html lang="en" className="h-full">
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased h-full`}
      >
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <CartProvider>
                <ActivityProvider>
                <UnreadMessagesProvider>
                <a href="#main-content" className="skip-to-main">Skip to main content</a>
                {/* Premium background elements */}
                <div className="premium-blob premium-blob--amber" aria-hidden="true" />
                <div className="premium-blob premium-blob--sage" aria-hidden="true" />
                <div className="premium-blob premium-blob--warm" aria-hidden="true" />
                <CursorOrb />
                <PersistentVideoFeed />
                <div className="app-layout">
                  <DesktopSidebar />
                  <main id="main-content" className="responsive-container">
                    {children}
                  </main>
                </div>
                <AppBottomNav />
                <ActivityPanel />
                </UnreadMessagesProvider>
                </ActivityProvider>
              </CartProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
