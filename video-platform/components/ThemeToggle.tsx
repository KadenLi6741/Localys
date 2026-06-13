'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';

/**
 * Light/dark toggle. Sun shows in dark mode (click → go light), moon shows
 * in light mode (click → go dark). The icon is only rendered after mount to
 * avoid a hydration mismatch, since the resolved theme is unknown on the
 * server. Squared 4px, hairline border, neutral chrome per the design system.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === 'dark';
  const label = `Switch to ${isDark ? 'light' : 'dark'} theme`;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] border border-border text-muted-foreground transition-colors hover:bg-surface hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      aria-label={mounted ? label : 'Toggle theme'}
      title={mounted ? label : undefined}
    >
      {mounted &&
        (isDark ? (
          // Sun
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path strokeLinecap="round" d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
        ) : (
          // Moon
          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        ))}
    </button>
  );
}
