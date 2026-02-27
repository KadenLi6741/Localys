import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { CouponProvider } from "@/contexts/CouponContext";

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
        className={`${outfit.variable} ${jetbrainsMono.variable} antialiased h-full overflow-hidden dark`}
      >
        <AuthProvider>
          <LanguageProvider>
            <CouponProvider>
              {children}
            </CouponProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
