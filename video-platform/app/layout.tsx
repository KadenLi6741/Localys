import type { Metadata, Viewport } from "next";
import { Anton, Inter, Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { CartProvider } from "@/contexts/CartContext";
import { ActivityProvider } from "@/contexts/ActivityContext";
import { DeliveryLocationProvider } from "@/contexts/DeliveryLocationContext";
import { AppChrome } from "@/components/AppChrome";

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

const anton = Anton({
  variable: "--font-anton",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Localy - Small Business Discovery",
  description: "Discover local small businesses through TikTok-style video scrolling",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Localy",
  },
};

// Black mobile/PWA status bar (OS clock/battery area). The in-app header stays white.
export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} ${anton.variable} ${inter.variable} antialiased h-full bg-background text-foreground`}
      >
        {/* Inline script prevents flash of wrong theme before React hydrates */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('localy-theme');var r=t==='light'?'light':t==='dark'?'dark':(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.classList.add(r);}catch(e){document.documentElement.classList.add('dark');}})();` }} />
        <ThemeProvider>
          <AuthProvider>
            <LanguageProvider>
              <CartProvider>
                <ActivityProvider>
                  <DeliveryLocationProvider>
                    <AppChrome>{children}</AppChrome>
                  </DeliveryLocationProvider>
                </ActivityProvider>
              </CartProvider>
            </LanguageProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
