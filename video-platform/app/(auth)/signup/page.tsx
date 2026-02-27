'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/lib/supabase/auth';
import TurnstileWidget from '@/components/TurnstileWidget';

const DEFAULT_LOCAL_TURNSTILE_SITE_KEY = '1x00000000000000000000AA';

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

export default function SignUpPage() {
  const router = useRouter();
  const siteKey = resolveTurnstileSiteKey();
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<'business' | 'user'>('user');
  const [businessType, setBusinessType] = useState<'food' | 'retail' | 'service' | ''>('');
  const [error, setError] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);

  const resetTurnstile = () => {
    setTurnstileToken(null);
    setTurnstileResetKey((prev) => prev + 1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (accountType === 'business' && !businessType) {
      setError('Please select a business type');
      return;
    }

    if (!turnstileToken) {
      setError('Please wait for the security check to complete.');
      return;
    }

    setLoading(true);

    const verified = await verifyTurnstile(turnstileToken);
    if (!verified) {
      setError('Security check failed. Please try again.');
      resetTurnstile();
      setLoading(false);
      return;
    }

    const { data, error: signUpError } = await signUp({
      email,
      password,
      name,
      username,
      accountType,
      businessType: accountType === 'business' && businessType ? businessType : undefined,
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
    <div className="min-h-screen bg-black text-white flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Localy</h1>
          <p className="text-white/60">Create your account</p>
        </div>

        {verificationEmail ? (
          <div className="space-y-6">
            <div className="bg-green-500/20 border border-green-500 text-green-200 px-4 py-3 rounded-lg">
              Account created. Check <span className="font-semibold">{verificationEmail}</span> to verify your account before signing in.
            </div>
            <p className="text-white/70 text-sm">
              If you don&apos;t see the email, check spam/junk and try again in a minute.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

          <div>
            <label className="block text-sm font-medium mb-2">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAccountType('user');
                  setBusinessType('');
                }}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  accountType === 'user'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                USER
              </button>
              <button
                type="button"
                onClick={() => setAccountType('business')}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                  accountType === 'business'
                    ? 'bg-blue-500 text-white'
                    : 'bg-white/10 text-gray-300 hover:bg-white/20'
                }`}
              >
                BUSINESS
              </button>
            </div>
          </div>

          {accountType === 'business' && (
            <div>
              <label htmlFor="businessType" className="block text-sm font-medium mb-2">
                Business Type
              </label>
              <select
                id="businessType"
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value as 'food' | 'retail' | 'service' | '')}
                required
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              >
                <option value="">Select business type</option>
                <option value="food">Food</option>
                <option value="retail">Retail</option>
                <option value="service">Service</option>
              </select>
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-2">
              Full Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium mb-2">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              placeholder="johndoe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/20 transition-all duration-200"
              placeholder="••••••••"
            />
            <p className="text-xs text-white/40 mt-1">At least 6 characters</p>
          </div>

          <TurnstileWidget
            siteKey={siteKey}
            onVerify={setTurnstileToken}
            onExpire={() => setTurnstileToken(null)}
            theme="dark"
            resetKey={turnstileResetKey}
          />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold py-3 rounded-lg disabled:bg-white/20 disabled:text-white/40 disabled:cursor-not-allowed hover:bg-white/90 active:scale-98 transition-all duration-200"
            >
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        )}

        <p className="text-center text-white/60">
          Already have an account?{' '}
          <Link href="/login" className="text-white hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
