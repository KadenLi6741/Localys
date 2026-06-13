'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { CartProvider } from '@/contexts/CartContext';
import { ActivityProvider } from '@/contexts/ActivityContext';
import { UnreadMessagesProvider } from '@/contexts/UnreadMessagesContext';

/**
 * Client-side provider stack for the whole app.
 *
 * next-themes drives the design system: `attribute="class"` toggles the
 * `.dark` class on <html>, which flips every design token in globals.css.
 * Its inline SSR script sets the class before paint, so there is no
 * light/dark flash on load. `disableTransitionOnChange` stops the global
 * color transitions from animating during a theme switch.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <AuthProvider>
        <LanguageProvider>
          <CartProvider>
            <ActivityProvider>
              <UnreadMessagesProvider>{children}</UnreadMessagesProvider>
            </ActivityProvider>
          </CartProvider>
        </LanguageProvider>
      </AuthProvider>
    </NextThemesProvider>
  );
}
