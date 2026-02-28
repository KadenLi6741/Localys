'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

export default function EmailVerifiedPage() {
  const router = useRouter();

  useEffect(() => {
    const finalizeVerification = async () => {
      try {
        await supabase.auth.getSession();
        await supabase.auth.signOut();
      } finally {
        if (window.location.hash) {
          window.history.replaceState({}, document.title, '/auth/verified');
        }
      }
    };

    finalizeVerification();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <h1 className="text-3xl font-bold">Email verified</h1>
        <p className="text-white/70">
          Your email is confirmed. For security, please sign in again to continue.
        </p>

        <button
          type="button"
          onClick={() => router.push('/login?verified=1')}
          className="w-full bg-white text-black font-semibold py-3 rounded-lg hover:bg-white/90 active:scale-98 transition-all duration-200"
        >
          Go to Sign In
        </button>

        <p className="text-white/60 text-sm">
          You can now log in with your email and password.
        </p>

        <p className="text-white/60 text-sm">
          Need a new account?{' '}
          <Link href="/signup" className="text-white hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
