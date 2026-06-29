'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPasswordForEmail, signInWithGoogle, applyVerifiedSession } from '@/lib/supabase/auth';
import TurnstileWidget from '@/components/TurnstileWidget';
import AuthSplitLayout from '@/components/auth/AuthSplitLayout';
import { FieldError } from '@/components/forms/FieldError';
import { validateRequired, validateEmail, isValidEmail } from '@/lib/utils/validation';

const ORANGE = '#f97316';
const DEFAULT_LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

function isTurnstileEnabled(): boolean {
  if (process.env.NODE_ENV === 'production') {
    return true;
  }
  // Default ON so the Cloudflare bot check is visible on sign-in during dev too
  // (localhost falls back to Cloudflare's always-passing test key). Only hidden
  // when explicitly disabled.
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
  'w-full rounded-lg border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground transition focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20';

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
        <div className="flex min-h-screen items-center justify-center bg-background px-4 text-muted-foreground">Loading login…</div>
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
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string | null; password?: string | null }>({});
  const [error, setError] = useState(oauthError ? 'Google sign-in was cancelled or failed. Please try again.' : '');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  // Email verification-code step (shown after a correct email + password).
  const [stage, setStage] = useState<'login' | 'code'>('login');
  const [ticket, setTicket] = useState('');
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [codeNote, setCodeNote] = useState('');
  const [codeLoading, setCodeLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

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

    // Validate inputs before attempting sign-in. The identifier may be an email
    // or a username, so only enforce email format when it looks like an email.
    const identifierError =
      validateRequired(identifier, 'Email or username') ||
      (identifier.includes('@') && !isValidEmail(identifier) ? 'Enter a valid email address.' : null);
    const passwordError = validateRequired(password, 'Password');
    setFieldErrors({ identifier: identifierError, password: passwordError });
    if (identifierError || passwordError) return;

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    setLoading(true);

    // Password is checked server-side first. On success we do NOT log in yet —
    // an email code (or the 77777 backup) is required on the next screen.
    try {
      const res = await fetch('/api/auth/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'send',
          email: identifier.trim().toLowerCase(),
          password,
          captchaToken: turnstileEnabled ? turnstileToken ?? undefined : undefined,
        }),
      });
      const result = await res.json();

      if (!res.ok || !result.ticket) {
        setError(result.error || 'Failed to sign in');
        resetTurnstile();
        setLoading(false);
        return;
      }

      setTicket(result.ticket);
      setCode('');
      setCodeError('');
      setCodeNote(
        result.sent
          ? 'We emailed a 6-digit code to your email address.'
          : 'Could not send the email — enter your backup code 77777 to continue.',
      );
      setStage('code');
      setLoading(false);
    } catch {
      setError('Failed to sign in. Please try again.');
      resetTurnstile();
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setCodeError('');

    // Do NOT gate on a 6-digit shape here: the backup code 77777 is 5 digits and
    // must never be blocked client-side. Only block an empty entry; the server
    // decides what is valid (and always accepts 77777).
    const entered = code.trim();
    if (!entered) {
      setCodeError('Enter your code, or use your backup code 77777.');
      return;
    }

    setCodeLoading(true);
    try {
      const res = await fetch('/api/auth/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'verify', ticket, code: code.trim() }),
      });
      const result = await res.json();

      if (!res.ok || !result.access_token) {
        setCodeError(result.error || 'Incorrect code, try again or use your backup code.');
        setCodeLoading(false);
        return;
      }

      // Valid code — now actually establish the session and enter the app.
      const { error: sessionError } = await applyVerifiedSession(result.access_token, result.refresh_token);
      if (sessionError) {
        setCodeError(sessionError.message || 'Could not complete sign-in. Please try again.');
        setCodeLoading(false);
        return;
      }

      router.push(isEmailVerified ? '/onboarding' : '/home');
      router.refresh();
    } catch {
      setCodeError('Could not verify the code. Please try again.');
      setCodeLoading(false);
    }
  };

  const handleResendCode = async () => {
    setCodeError('');
    setCodeNote('');
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/login-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'resend', ticket, email: identifier.trim().toLowerCase() }),
      });
      const result = await res.json();

      if (!res.ok || !result.ticket) {
        setCodeError(result.error || 'Could not resend the code. Use your backup code if needed.');
        setResendLoading(false);
        return;
      }

      setTicket(result.ticket);
      setCodeNote(
        result.sent
          ? 'A new code is on its way to your email.'
          : 'Could not send the email — enter your backup code 77777 to continue.',
      );
      setResendLoading(false);
    } catch {
      setCodeError('Could not resend the code. Use your backup code if needed.');
      setResendLoading(false);
    }
  };

  const backToLoginFromCode = () => {
    setStage('login');
    setCode('');
    setCodeError('');
    setCodeNote('');
    setTicket('');
    resetTurnstile();
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (turnstileEnabled && !turnstileToken) {
      setError('Please complete the security check.');
      return;
    }

    const normalizedIdentifier = identifier.trim();
    const emailError = validateEmail(normalizedIdentifier);
    if (emailError) {
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

  // ----- Email verification-code mode (after correct email + password) -----
  if (stage === 'code') {
    return (
      <AuthSplitLayout>
        <div className="space-y-6 text-gray-900">
          <div className="text-center">
            <h1 className="text-3xl font-bold">Enter your verification code</h1>
            <p className="mt-2 text-sm text-gray-500">Enter the verification code we emailed you to finish signing in.</p>
          </div>

          <form onSubmit={handleVerifyCode} className="space-y-5">
            {codeNote && (
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-center text-[#f97316]">
                {codeNote}
              </div>
            )}
            {codeError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{codeError}</div>
            )}

            <div>
              <label htmlFor="login-code" className="sr-only">6-digit verification code</label>
              <input
                id="login-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodeError(''); }}
                required
                autoFocus
                className={`${inputClass} text-center text-2xl font-bold tracking-[0.5em]`}
                placeholder="------"
              />
            </div>

            <button
              type="submit"
              disabled={codeLoading}
              className="w-full rounded-lg py-3 font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: ORANGE }}
            >
              {codeLoading ? 'Verifying…' : 'Verify'}
            </button>

            <div className="flex items-center justify-between text-sm">
              <button type="button" onClick={backToLoginFromCode} className="font-medium text-gray-500 transition hover:text-gray-900">
                Back to Sign in
              </button>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={resendLoading}
                className="font-semibold text-[#f97316] transition hover:opacity-70 disabled:opacity-50"
              >
                {resendLoading ? 'Resending…' : 'Resend code'}
              </button>
            </div>
          </form>
        </div>
      </AuthSplitLayout>
    );
  }

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
              <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-center text-[#f97316]">
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
          <h1 className="text-3xl font-bold sm:text-4xl">Sign in to Localy</h1>
          <p className="mt-2 text-sm text-gray-500">Welcome back — enter your details to continue.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isEmailVerified && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-center text-[#f97316]">
              Email verified. Please sign in to continue.
            </div>
          )}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input id="email" type="email" value={identifier} onChange={(e) => { setIdentifier(e.target.value); setFieldErrors((p) => ({ ...p, identifier: null })); }} required className={inputClass} placeholder="Email Address" aria-invalid={!!fieldErrors.identifier} />
            <FieldError message={fieldErrors.identifier} />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => { setPassword(e.target.value); setFieldErrors((p) => ({ ...p, password: null })); }} required className={inputClass} placeholder="Password" aria-invalid={!!fieldErrors.password} />
            <FieldError message={fieldErrors.password} />
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
