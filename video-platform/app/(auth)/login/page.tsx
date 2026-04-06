'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn, resetPasswordForEmail } from '@/lib/supabase/auth';
import TurnstileWidget from '@/components/TurnstileWidget';

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

async function verifyTurnstile(token: string): Promise<boolean> {
  const res = await fetch('/api/verify-turnstile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  });
  const data = await res.json();
  return data.success === true;
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5F5] flex items-center justify-center px-4">
          <p className="text-[#777]">Loading login...</p>
        </div>
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
  const turnstileEnabled = isTurnstileEnabled();
  const siteKey = resolveTurnstileSiteKey();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please wait for the security check to complete.');
      return;
    }

    setLoading(true);

    if (turnstileEnabled) {
      const verified = await verifyTurnstile(turnstileToken!);
      if (!verified) {
        setError('Security check failed. Please try again.');
        resetTurnstile();
        setLoading(false);
        return;
      }
    }

    const { data, error: signInError } = await signIn({ identifier, password });

    if (signInError) {
      setError(signInError.message || 'Failed to sign in');
      resetTurnstile();
      setLoading(false);
      return;
    }

    if (data?.session) {
      router.push(isEmailVerified ? '/onboarding' : '/');
      router.refresh();
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please wait for the security check to complete.');
      return;
    }

    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier.includes('@')) {
      setError('Enter your account email to reset your password.');
      return;
    }

    setLoading(true);

    if (turnstileEnabled) {
      const verified = await verifyTurnstile(turnstileToken!);
      if (!verified) {
        setError('Security check failed. Please try again.');
        resetTurnstile();
        setLoading(false);
        return;
      }
    }

    const { error: resetError } = await resetPasswordForEmail(normalizedIdentifier);

    if (resetError) {
      setError(resetError.message || 'Failed to send reset email');
      resetTurnstile();
      setLoading(false);
      return;
    }

    setResetSent(true);
    setLoading(false);
  };

  if (resetMode) {
    return (
      <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center px-4 relative overflow-hidden">
        {/* Animated floating icons background */}
        <div className="login-floating-icons" aria-hidden="true">
          <span className="login-icon" style={{ top: '8%', animationDuration: '18s', animationDelay: '0s', fontSize: '28px' }}>🍕</span>
          <span className="login-icon" style={{ top: '22%', animationDuration: '22s', animationDelay: '2s', fontSize: '24px' }}>🏪</span>
          <span className="login-icon" style={{ top: '38%', animationDuration: '20s', animationDelay: '4s', fontSize: '30px' }}>🍔</span>
          <span className="login-icon" style={{ top: '55%', animationDuration: '24s', animationDelay: '1s', fontSize: '26px' }}>☕</span>
          <span className="login-icon" style={{ top: '70%', animationDuration: '19s', animationDelay: '3s', fontSize: '28px' }}>🛒</span>
          <span className="login-icon" style={{ top: '85%', animationDuration: '21s', animationDelay: '5s', fontSize: '22px' }}>🍰</span>
          <span className="login-icon" style={{ top: '15%', animationDuration: '23s', animationDelay: '6s', fontSize: '26px' }}>🥗</span>
          <span className="login-icon" style={{ top: '45%', animationDuration: '17s', animationDelay: '7s', fontSize: '32px' }}>🏬</span>
          <span className="login-icon" style={{ top: '65%', animationDuration: '25s', animationDelay: '2.5s', fontSize: '24px' }}>🍜</span>
          <span className="login-icon" style={{ top: '92%', animationDuration: '20s', animationDelay: '4.5s', fontSize: '28px' }}>✂️</span>
        </div>
        {/* Dark tint overlay */}
        <div className="absolute inset-0 bg-black/30 z-[1]" />

        <div className="w-full max-w-md space-y-8 bg-white rounded-2xl p-8 shadow-xl relative z-10" style={{ animation: 'fadeInUp 0.5s ease-out forwards', opacity: 0 }}>
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2 text-[#111]" style={{ animation: 'slideInLeft 0.4s ease-out 0.1s forwards', opacity: 0 }}>Localy</h1>
            <p className="text-[#777]">Reset your password</p>
          </div>

          {resetSent ? (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg">
                Check your email for a password reset link.
              </div>
              <button
                onClick={() => { switchToLogin(); setResetSent(false); }}
                className="w-full bg-[#2A6FD6] text-white font-semibold py-3 rounded-lg hover:bg-[#245FCC] active:scale-[0.98] transition-all duration-200"
              >
                Back to Sign In
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {isEmailVerified && (
                <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg">
                  Email verified. Please sign in again to continue.
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium mb-2 text-[#111]">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                  className="w-full bg-white border border-[#E0E0E0] rounded-lg px-4 py-3 text-[#111] placeholder-[#999] focus:outline-none focus:border-[#2A6FD6] focus:ring-2 focus:ring-[#2A6FD6]/20 transition-all duration-200"
                  placeholder="you@example.com"
                />
              </div>

              {turnstileEnabled && (
                <TurnstileWidget
                  siteKey={siteKey}
                  onVerify={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  theme="light"
                  resetKey={turnstileResetKey}
                />
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#2A6FD6] text-white font-semibold py-3 rounded-lg disabled:bg-[#2A6FD6]/40 disabled:cursor-not-allowed hover:bg-[#245FCC] active:scale-[0.98] transition-all duration-200"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}

          {!resetSent && (
            <p className="text-center text-[#777]">
              <button
                onClick={switchToLogin}
                className="text-[#2A6FD6] hover:underline font-medium"
              >
                Back to Sign In
              </button>
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F0F0] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated floating icons background */}
      <div className="login-floating-icons" aria-hidden="true">
        <span className="login-icon" style={{ top: '8%', animationDuration: '18s', animationDelay: '0s', fontSize: '28px' }}>🍕</span>
        <span className="login-icon" style={{ top: '22%', animationDuration: '22s', animationDelay: '2s', fontSize: '24px' }}>🏪</span>
        <span className="login-icon" style={{ top: '38%', animationDuration: '20s', animationDelay: '4s', fontSize: '30px' }}>🍔</span>
        <span className="login-icon" style={{ top: '55%', animationDuration: '24s', animationDelay: '1s', fontSize: '26px' }}>☕</span>
        <span className="login-icon" style={{ top: '70%', animationDuration: '19s', animationDelay: '3s', fontSize: '28px' }}>🛒</span>
        <span className="login-icon" style={{ top: '85%', animationDuration: '21s', animationDelay: '5s', fontSize: '22px' }}>🍰</span>
        <span className="login-icon" style={{ top: '15%', animationDuration: '23s', animationDelay: '6s', fontSize: '26px' }}>🥗</span>
        <span className="login-icon" style={{ top: '45%', animationDuration: '17s', animationDelay: '7s', fontSize: '32px' }}>🏬</span>
        <span className="login-icon" style={{ top: '65%', animationDuration: '25s', animationDelay: '2.5s', fontSize: '24px' }}>🍜</span>
        <span className="login-icon" style={{ top: '92%', animationDuration: '20s', animationDelay: '4.5s', fontSize: '28px' }}>✂️</span>
      </div>
      {/* Dark tint overlay */}
      <div className="absolute inset-0 bg-black/30 z-[1]" />

      <div className="w-full max-w-md space-y-8 bg-white rounded-2xl p-8 shadow-xl relative z-10" style={{ animation: 'fadeInUp 0.5s ease-out forwards', opacity: 0 }}>
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2 text-[#111]" style={{ animation: 'slideInLeft 0.4s ease-out 0.1s forwards', opacity: 0 }}>Localy</h1>
          <p className="text-[#777]">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isEmailVerified && (
            <div className="bg-green-50 border border-green-300 text-green-800 px-4 py-3 rounded-lg">
              Email verified. Please sign in again to continue.
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2 text-[#111]">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
              className="w-full bg-white border border-[#E0E0E0] rounded-lg px-4 py-3 text-[#111] placeholder-[#999] focus:outline-none focus:border-[#2A6FD6] focus:ring-2 focus:ring-[#2A6FD6]/20 transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-[#111]">
                Password
              </label>
              <button
                type="button"
                onClick={switchToReset}
                className="text-sm text-[#2A6FD6] hover:underline transition-colors duration-200"
              >
                Forgot Password?
              </button>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-white border border-[#E0E0E0] rounded-lg px-4 py-3 text-[#111] placeholder-[#999] focus:outline-none focus:border-[#2A6FD6] focus:ring-2 focus:ring-[#2A6FD6]/20 transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          {turnstileEnabled && (
            <TurnstileWidget
              siteKey={siteKey}
              onVerify={setTurnstileToken}
              onExpire={() => setTurnstileToken(null)}
              theme="light"
              resetKey={turnstileResetKey}
            />
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2A6FD6] text-white font-semibold py-3 rounded-lg disabled:bg-[#2A6FD6]/40 disabled:cursor-not-allowed hover:bg-[#245FCC] active:scale-[0.98] transition-all duration-200"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-[#777]">
          Don't have an account?{' '}
          <Link href="/signup" className="text-[#2A6FD6] hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
