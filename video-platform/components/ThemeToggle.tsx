'use client';

import { useTheme } from '@/contexts/ThemeContext';

export function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] bg-[var(--surface-1)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-2)]"
      aria-label="Toggle light and dark theme"
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} theme`}
    >
      {resolvedTheme === 'dark' ? '🌙' : '☀️'}
      <span>{resolvedTheme === 'dark' ? 'Dark' : 'Light'}</span>
    </button>
  );
}
