'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useTheme } from '@/contexts/ThemeContext';
import { useAllergens } from '@/contexts/AllergenContext';
import { useAuth } from '@/contexts/AuthContext';
import { COMMON_ALLERGENS } from '@/lib/allergens';
import { supabase } from '@/lib/supabase/client';
import type { Profile } from '@/lib/supabase/profiles';
import { Sun, Moon, Monitor, AlertTriangle, Crown, ChevronRight, Pencil } from 'lucide-react';

export default function SettingsPage() {
  return (
    <ProtectedRoute>
      <SettingsContent />
    </ProtectedRoute>
  );
}

function SettingsContent() {
  const router = useRouter();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { userAllergies, setUserAllergies, hideEnabled, setHideEnabled } = useAllergens();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
      .then(({ data }) => { if (active) setProfile(data); });
    return () => { active = false; };
  }, [user]);

  const toggleAllergen = (key: string) => {
    const next = userAllergies.includes(key)
      ? userAllergies.filter((k) => k !== key)
      : [...userAllergies, key];
    void setUserAllergies(next);
  };

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const options = [
    { value: 'light', label: 'Light', icon: <Sun className="h-5 w-5" />, desc: 'White background, black text' },
    { value: 'dark', label: 'Dark', icon: <Moon className="h-5 w-5" />, desc: 'Black background, white text' },
    { value: 'system', label: 'System', icon: <Monitor className="h-5 w-5" />, desc: 'Follows your device setting' },
  ] as const;

  const avatarLetter = (profile?.full_name || profile?.username || 'U').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#1A1A18] text-gray-900 dark:text-white pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 dark:bg-[#1A1A18]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="w-full px-4 lg:px-12 py-4">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>
      </div>

      <div className="w-full max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Account header */}
        <Link
          href="/profile"
          className="flex items-center gap-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 shadow-sm transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40"
        >
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
            {profile?.profile_picture_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.profile_picture_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-xl font-bold text-gray-500 dark:text-gray-300">
                {avatarLetter}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-gray-900 dark:text-white">{profile?.full_name || 'User'}</p>
            <p className="truncate text-sm text-gray-500 dark:text-gray-400">@{profile?.username || 'username'}</p>
          </div>
          <span className="flex items-center gap-1 text-sm font-medium text-[#f97316]">
            <Pencil className="h-4 w-4" /> Edit
          </span>
        </Link>

        {/* Premium */}
        <Link
          href="/premium"
          className="flex items-center justify-between bg-white dark:bg-gray-900 border border-[#f97316]/30 rounded-2xl p-4 shadow-sm transition-colors hover:bg-[#f97316]/5"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-900 dark:text-white">
            <Crown className="h-4 w-4 text-[#f97316]" /> Localy Premium
          </span>
          <ChevronRight className="h-4 w-4 text-gray-400" />
        </Link>

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

        {/* Food allergies */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
            Food Allergies
          </h2>
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-5 shadow-sm space-y-4">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Select your allergens. Restaurants that contain them are flagged with a warning across Localy.
            </p>
            <div className="flex flex-wrap gap-2">
              {COMMON_ALLERGENS.map((a) => {
                const active = userAllergies.includes(a.key);
                return (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleAllergen(a.key)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      active
                        ? 'border-red-500 bg-red-500 text-white'
                        : 'border-gray-300 text-gray-700 hover:border-red-400 dark:border-gray-600 dark:text-gray-200'
                    }`}
                  >
                    <span aria-hidden>{a.icon}</span>
                    {a.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-600 dark:text-red-400" strokeWidth={2.5} />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">Hide flagged restaurants</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Remove restaurants with my allergens from listings</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setHideEnabled(!hideEnabled)}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-[#f97316] focus:ring-offset-2 ${
                  hideEnabled ? 'bg-[#f97316]' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                role="switch"
                aria-checked={hideEnabled}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    hideEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* Account preferences */}
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
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        </section>

        {/* Sign out */}
        <button
          type="button"
          onClick={handleSignOut}
          className="w-full rounded-xl border border-red-200 bg-red-50 py-3 font-medium text-red-600 transition-colors hover:bg-red-100 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-400 dark:hover:bg-red-950/50"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
