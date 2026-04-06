import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Cormorant_Garamond } from "next/font/google";
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
import { LayoutShell } from "@/components/LayoutShell";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
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
        className={`${inter.variable} ${jetbrainsMono.variable} ${cormorant.variable} antialiased h-full`}
      >
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <CartProvider>
                <ActivityProvider>
                <UnreadMessagesProvider>
                <a href="#main-content" className="skip-to-main">Skip to main content</a>
                <PersistentVideoFeed />
                <LayoutShell>
                  <main id="main-content" className="responsive-container">
                    {children}
                  </main>
                </LayoutShell>
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
