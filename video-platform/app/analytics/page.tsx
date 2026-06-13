'use client';

import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { AnalyticsDashboard, TrustScoreCard } from '@/components/analytics';
import { FinancialOverview } from '@/components/analytics/FinancialOverview';
import Link from 'next/link';

function AnalyticsContent() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-transparent text-[var(--text-primary)] p-4">
      <div className="w-full px-4 lg:px-12">
        <div className="mb-6">
          <Link href="/profile" className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] mb-4 inline-flex items-center gap-2">
            ← Back to Profile
          </Link>
          <h1 className="text-2xl font-bold mt-2">Analytics</h1>
        </div>

        <div className="mb-8">
          <TrustScoreCard userId={user.id} />
        </div>

        <div className="mb-8">
          <AnalyticsDashboard userId={user.id} />
        </div>

        <div className="mb-8">
          <FinancialOverview userId={user.id} />
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  );
}
