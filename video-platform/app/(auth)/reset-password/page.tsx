'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { updatePassword } from '@/lib/supabase/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    const { error: updateError } = await updatePassword(newPassword);

    if (updateError) {
      setError(updateError.message || 'Failed to update password');
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-2">Localy</h1>
          <p className="text-[var(--text-tertiary)]">Set your new password</p>
        </div>

        {success ? (
          <div className="space-y-6">
            <div className="bg-success/10 border border-success text-success px-4 py-3 rounded-[4px]">
              Password updated successfully. Redirecting to sign in...
            </div>
          </div>
        ) : !ready ? (
          <div className="space-y-6">
            <div className="bg-surface border border-border text-muted-foreground px-4 py-3 rounded-[4px] text-center">
              Verifying your reset link...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-[4px]">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                New Password
              </label>
              <input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-[4px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-surface-2 focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full bg-surface border border-border rounded-[4px] px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:bg-surface-2 focus:ring-2 focus:ring-primary/30 transition-all duration-200"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground font-bold py-3 rounded-[4px] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-primary/90 active:scale-[0.98] transition-colors"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
