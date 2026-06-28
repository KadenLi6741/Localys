'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, resetPasswordForEmail, signInWithGoogle } from '@/lib/supabase/auth';
import TurnstileWidget from '@/components/TurnstileWidget';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';

const ORANGE = '#f97316';
const DEFAULT_LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

function isTurnstileEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  return process.env.NEXT_PUBLIC_TURNSTILE_ENABLED_IN_DEV === 'true';
}

function resolveTurnstileSiteKey(): string {
  const prodKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';
  if (typeof window === 'undefined') {
    return prodKey;
  }
  const hostname = window.location.hostname;
  const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  if (!isLocalhost) {
    return prodKey;
  }
  const localKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY_LOCAL ?? '';
  return localKey || prodKey || DEFAULT_LOCAL_TURNSTILE_SITE_KEY;
}

const inputClass =
  'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/10';

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-white px-4 text-gray-500">Loading login…</div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmailVerified = searchParams.get('verified') === '1';
  const oauthError = searchParams.get('error') === 'oauth';
  const turnstileEnabled = isTurnstileEnabled();
  const siteKey = resolveTurnstileSiteKey();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(oauthError ? 'Google sign-in was cancelled or failed. Please try again.' : '');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileResetKey((prev) => prev + 1);
  };

  const switchToReset = () => {
    setResetMode(true);
    resetTurnstile();
    setError('');
  };

  const switchToLogin = () => {
    setResetMode(false);
    resetTurnstile();
    setError('');
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    const { error: googleError } = await signInWithGoogle();
    if (googleError) {
      setError(googleError.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    setLoading(true);

    const { data, error: signInError } = await signIn({
      identifier,
      password,
      captchaToken: turnstileEnabled ? turnstileToken ?? undefined : undefined,
    });

    if (signInError) {
      setError(signInError.message || 'Failed to sign in');
      resetTurnstile();
      setLoading(false);
      return;
    }

    if (data?.session) {
      router.push(isEmailVerified ? '/onboarding' : '/home');
      router.refresh();
    } else {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier.includes('@')) {
      setError('Enter your account email to reset your password.');
      return;
    }

    setLoading(true);

    const { error: resetError } = await resetPasswordForEmail(
      normalizedIdentifier,
      turnstileEnabled ? turnstileToken ?? undefined : undefined,
    );

    if (resetError) {
      setError(resetError.message || 'Failed to send reset email');
      resetTurnstile();
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  };

  // ----- Reset password mode -----
  if (resetMode) {
    return (
      <AuthSplitLayout>
        <div className="space-y-6 text-gray-900">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Reset your password</h1>
            <p className="mt-2 text-sm text-gray-500">Enter your email and we&apos;ll send you a reset link.</p>
          </div>

          {resetSent ? (
            <div className="space-y-6">
              <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-green-700">
                Check your email for a password reset link.
              </div>
              <button
                onClick={() => { switchToLogin(); setResetSent(false); }}
                className="w-full rounded-lg py-3 font-semibold text-white transition hover:opacity-90"
                style={{ backgroundColor: ORANGE }}
              >
                Back to Sign in
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-5">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
              )}
              <div>
                <label htmlFor="reset-email" className="sr-only">Email address</label>
                <input id="reset-email" type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className={inputClass} placeholder="Email Address" />
              </div>

              {turnstileEnabled && (
                <TurnstileWidget siteKey={siteKey} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} theme="light" resetKey={turnstileResetKey} />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: ORANGE }}
              >
                {loading ? 'Sending…' : 'Send reset link'}
              </button>

              <button type="button" onClick={switchToLogin} className="block w-full text-center text-sm text-gray-500 transition hover:text-gray-900">
                Back to Sign in
              </button>
            </form>
          )}
        </div>
      </AuthSplitLayout>
    );
  }

  // ----- Login mode -----
  return (
    <AuthSplitLayout>
      <div className="space-y-6 text-gray-900">
        {/* Top row */}
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-gray-500">Don&apos;t have an account?</span>
          <Link href="/signup" className="rounded-md border border-gray-300 px-4 py-1.5 font-medium text-gray-900 transition hover:bg-gray-50">
            Sign up
          </Link>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Sign in to Localys</h1>
          <p className="mt-2 text-sm text-gray-500">Welcome back — enter your details to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEmailVerified && (
            <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center text-green-700">
              Email verified. Please sign in to continue.
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input id="email" type="email" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required className={inputClass} placeholder="Email Address" />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className={inputClass} placeholder="Password" />
          </div>

          <div className="text-center">
            <button type="button" onClick={switchToReset} className="text-base font-semibold text-black transition hover:opacity-70">
              Forgot the password?
            </button>
          </div>

          {turnstileEnabled && (
            <TurnstileWidget siteKey={siteKey} onVerify={setTurnstileToken} onExpire={() => setTurnstileToken(null)} theme="light" resetKey={turnstileResetKey} />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: ORANGE }}
          >
            {loading ? 'Signing in…' : 'Login'}
          </button>
        </form>

        {/* OR divider */}
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-xs font-medium text-gray-400">OR</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Google */}
        <button
          type="button"
          onClick={handleGoogle}
          disabled={googleLoading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-900 transition hover:bg-gray-50 disabled:opacity-60"
        >
          <GoogleIcon />
          {googleLoading ? 'Opening Google…' : 'Sign in with Google'}
        </button>
      </div>
    </AuthSplitLayout>
  );
}
