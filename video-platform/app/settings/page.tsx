'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const { theme, resolvedTheme, setTheme } = useTheme();

  const options = [
    { value: 'light', label: 'Light', icon: <Sun className="h-5 w-5" />, desc: 'White background, black text' },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-5 w-5" />, desc: 'Black background, white text' },
    { value: 'system', label: 'System', icon: <Monitor className="h-5 w-5" />, desc: 'Follows your device setting' },
  ] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A18] text-gray-900 dark:text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#1A1A18]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-4 lg:px-12 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Appearance section */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Appearance
          </h2>

          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            {options.map((opt, i) => {
              const isSelected = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={`flex w-full items-center gap-4 px-5 py-4 text-left transition-colors ${
                    i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                  } ${
                    isSelected
                      ? 'bg-orange-50 dark:bg-orange-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    isSelected
                      ? 'bg-[#f97316] text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                  }`}>
                    {opt.icon}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isSelected ? 'text-[#f97316]' : 'text-gray-900 dark:text-white'}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{opt.desc}</p>
                  </div>
                  {/* Radio indicator */}
                  <div className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center ${
                    isSelected
                      ? 'border-[#f97316]'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}>
                    {isSelected && (
                      <div className="h-2.5 w-2.5 rounded-full bg-[#f97316]" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 px-1">
            Currently showing: <span className="font-medium text-gray-600 dark:text-gray-300 capitalize">{resolvedTheme}</span> mode
          </p>
        </section>

        {/* Quick toggle */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Quick Toggle
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900 dark:text-white text-sm">
                  {resolvedTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                  {resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                </p>
              </div>
              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 ${
                  resolvedTheme === 'dark' ? 'bg-[#f97316]' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={resolvedTheme === 'dark'}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    resolvedTheme === 'dark' ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Divider */}
        <div className="border-t border-gray-200 dark:border-gray-700" />

        {/* Payment Methods placeholder */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Account
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden shadow-sm">
            {[
              { label: 'Payment Methods', href: '#' },
              { label: 'Location Settings', href: '#' },
              { label: 'Notifications', href: '#' },
              { label: 'Privacy', href: '#' },
            ].map((item, i) => (
              <div
                key={item.label}
                className={`flex items-center justify-between px-5 py-4 ${
                  i > 0 ? 'border-t border-gray-100 dark:border-gray-800' : ''
                }`}
              >
                <span className="text-sm text-gray-900 dark:text-white">{item.label}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
