'use client';

/**
 * Signup page (/signup) — create a new Localy account (user or business).
 * Purpose: Registers new accounts with inline-validated fields (email, password, username, account type),
 *   a Turnstile bot check, and a Google sign-up option. On success a profile (and welcome coupon) is
 *   created via the auth data layer.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp, signInWithGoogle } from '@/lib/supabase/auth';
import TurnstileWidget from '@/components/TurnstileWidget';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';
import { FieldError } from '@/components/forms/FieldError';
import { validateRequired, validateEmail, validatePassword, validateUsername } from '@/lib/utils/validation';

const ORANGE = '#f97316';
const DEFAULT_LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

function isTurnstileEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  // Default ON so the Cloudflare bot check is visible during dev too (localhost
  // falls back to Cloudflare's always-passing test key). Only hidden when
  // explicitly disabled.
  return process.env.NEXT_PUBLIC_TURNSTILE_ENABLED_IN_DEV !== 'false';
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

export default function SignUpPage() {
  const router = useRouter();
  const turnstileEnabled = isTurnstileEnabled();
  const siteKey = resolveTurnstileSiteKey();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'business' | 'user'>('user');
  const [businessType, setBusinessType] = useState<'food' | 'retail' | 'service' | ''>('');
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string | null;
    username?: string | null;
    email?: string | null;
    password?: string | null;
    businessType?: string | null;
  }>({});
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileResetKey((prev) => prev + 1);
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

    // Syntactic + semantic field checks. Submission is blocked until all pass.
    const nextErrors = {
      name: validateRequired(name, 'Full name'),
      username: validateUsername(username),
      email: validateEmail(email),
      password: validatePassword(password, 6),
      businessType: accountType === 'business' && !businessType ? 'Please select a business type.' : null,
    };
    setFieldErrors(nextErrors);
    if (Object.values(nextErrors).some(Boolean)) return;

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await signUp({
      email,
      password,
      name,
      username,
      accountType,
      businessType: accountType === 'business' && businessType ? businessType : undefined,
      captchaToken: turnstileEnabled ? turnstileToken ?? undefined : undefined,
    });

    if (signUpError) {
      setError(signUpError.message || 'Failed to create account');
      resetTurnstile();
      setLoading(false);
      return;
    }

    if (data?.session) {
      router.push('/onboarding');
      router.refresh();
      return;
    }

    setVerificationEmail(email);
    setPassword('');
    resetTurnstile();
    setLoading(false);
  };

  return (
    <AuthSplitLayout>
      <div className="space-y-6 text-gray-900">
        {/* Top row */}
        <div className="flex items-center justify-end gap-3 text-sm">
          <span className="text-gray-500">Already have an account?</span>
          <Link href="/login" className="rounded-md border border-gray-300 px-4 py-1.5 font-medium text-gray-900 transition hover:bg-gray-50">
            Sign in
          </Link>
        </div>

        {/* Heading */}
        <div className="text-center">
          <h1 className="text-3xl font-bold sm:text-4xl">Join Localy</h1>
          <p className="mt-2 text-sm text-gray-500">Create your account to discover and support local.</p>
        </div>

        {verificationEmail ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-[#f97316]">
              Account created. Check <span className="font-semibold">{verificationEmail}</span> to verify your account before signing in.
            </div>
            <p className="text-sm text-gray-500">If you don&apos;t see the email, check spam/junk and try again in a minute.</p>
            <Link href="/login" className="inline-block text-sm font-medium text-gray-900 underline transition hover:opacity-80">
              Back to Sign in
            </Link>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
              )}

              {/* Account type */}
              <div>
                <label className="mb-2 block text-sm text-gray-600">Account type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['user', 'business'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setAccountType(type);
                        if (type === 'user') setBusinessType('');
                      }}
                      className="rounded-lg border px-3 py-2.5 text-sm font-medium transition-all"
                      style={
                        accountType === type
                          ? { backgroundColor: ORANGE, color: '#ffffff', borderColor: ORANGE }
                          : { backgroundColor: '#ffffff', color: '#374151', borderColor: '#d1d5db' }
                      }
                    >
                      {type === 'user' ? 'Shopper' : 'Business'}
                    </button>
                  ))}
                </div>
              </div>

              {accountType === 'business' && (
                <div>
                  <label htmlFor="businessType" className="mb-2 block text-sm text-gray-600">Business type</label>
                  <select
                    id="businessType"
                    value={businessType}
                    onChange={(e) => { setBusinessType(e.target.value as 'food' | 'retail' | 'service' | ''); setFieldErrors((p) => ({ ...p, businessType: null })); }}
                    required
                    className={inputClass}
                    aria-invalid={!!fieldErrors.businessType}
                  >
                    <option value="">Select business type</option>
                    <option value="food">Food</option>
                    <option value="retail">Retail</option>
                    <option value="service">Service</option>
                  </select>
                  <FieldError message={fieldErrors.businessType} />
                </div>
              )}

              <div>
                <label htmlFor="name" className="sr-only">Full name</label>
                <input id="name" type="text" value={name} onChange={(e) => { setName(e.target.value); setFieldErrors((p) => ({ ...p, name: null })); }} required className={inputClass} placeholder="Full Name" aria-invalid={!!fieldErrors.name} />
                <FieldError message={fieldErrors.name} />
              </div>

              <div>
                <label htmlFor="username" className="sr-only">Username</label>
                <input id="username" type="text" value={username} onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')); setFieldErrors((p) => ({ ...p, username: null })); }} required className={inputClass} placeholder="Username" aria-invalid={!!fieldErrors.username} />
                <FieldError message={fieldErrors.username} />
              </div>

              <div>
                <label htmlFor="email" className="sr-only">Email address</label>
                <input id="email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setFieldErrors((p) => ({ ...p, email: null })); }} required className={inputClass} placeholder="Email Address" aria-invalid={!!fieldErrors.email} />
                <FieldError message={fieldErrors.email} />
              </div>

              <div>
                <label htmlFor="password" className="sr-only">Password</label>
                <input id="password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: null })); }} required minLength={6} className={inputClass} placeholder="Password (min 6 characters)" aria-invalid={!!fieldErrors.password} />
                <FieldError message={fieldErrors.password} />
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
                {loading ? 'Creating account…' : 'Create account'}
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
              {googleLoading ? 'Opening Google…' : 'Sign up with Google'}
            </button>
          </>
        )}
      </div>
    </AuthSplitLayout>
  );
}
