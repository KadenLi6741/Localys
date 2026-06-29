'use client';

/**
 * ProtectedRoute — auth gate that wraps pages requiring a signed-in user.
 * Purpose: Prevents logged-out visitors from seeing protected screens (profile, orders, upload,
 *   etc.). It waits for auth to resolve, redirects guests to /login, and only renders its
 *   children once a real user is confirmed.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useTranslation } from '@/hooks/useTranslation';

// Wrapper that renders `children` only for authenticated users. Used around any page
// that should be off-limits to guests so we don't repeat the redirect logic everywhere.
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useTranslation();
  const router = useRouter();

  // Redirect to login only AFTER auth has finished loading — checking too early would
  // bounce a logged-in user during the brief moment before their session is restored.
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-transparent text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}




