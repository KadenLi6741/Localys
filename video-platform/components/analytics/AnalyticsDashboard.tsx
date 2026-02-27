'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useAnalytics } from '@/hooks/useAnalytics';
import { EmptyAnalytics } from './EmptyAnalytics';
import { StatCards } from './StatCards';
import { VideoPerformanceTable } from './VideoPerformanceTable';
import { PromotionActivityFeed } from './PromotionActivityFeed';

const SpendingChart = dynamic(
  () => import('./SpendingChart').then(m => ({ default: m.SpendingChart })),
  { ssr: false, loading: () => <div className="h-[250px] bg-white/5 rounded-lg animate-pulse" /> }
);

const ViewsChart = dynamic(
  () => import('./ViewsChart').then(m => ({ default: m.ViewsChart })),
  { ssr: false, loading: () => <div className="h-[250px] bg-white/5 rounded-lg animate-pulse" /> }
);

const CoinDistributionChart = dynamic(
  () => import('./CoinDistributionChart').then(m => ({ default: m.CoinDistributionChart })),
  { ssr: false, loading: () => <div className="h-[280px] bg-white/5 rounded-lg animate-pulse" /> }
);

interface AnalyticsDashboardProps {
  userId: string;
}

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, loading } = useAnalytics(isExpanded ? userId : undefined);

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-xl font-semibold mb-4"
      >
        <span>📊 Promotion Analytics</span>
        <svg
          className={`w-5 h-5 text-white/60 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="bg-white/5 border border-white/10 rounded-lg p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400" />
            </div>
          ) : !data || data.summary.totalPromotions === 0 ? (
            <EmptyAnalytics />
          ) : (
            <div className="space-y-8">
              <StatCards summary={data.summary} />
              <SpendingChart data={data.spendingOverTime} />
              <ViewsChart data={data.viewsOverTime} />
              <CoinDistributionChart data={data.coinDistribution} />
              <VideoPerformanceTable videos={data.videoPerformance} />
              <PromotionActivityFeed history={data.promotionHistory} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
