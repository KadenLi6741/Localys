'use client';

/**
 * ThemeToggle — button that flips the app between light and dark mode.
 * Purpose: Gives users a single control to switch themes. The actual theme state and
 *   persistence live in ThemeContext; this component only reads the current theme and
 *   triggers the toggle, so the same button works anywhere it's dropped in.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useTheme } from '@/contexts/ThemeContext';

// Renders the theme switch. Label/tooltip reflect the *current* theme so the user
// can tell at a glance which mode they're in before clicking.
export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-9 items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
      aria-label="Toggle light and dark theme"
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {resolvedTheme === 'dark' ? '' : ''}
      <span>{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
