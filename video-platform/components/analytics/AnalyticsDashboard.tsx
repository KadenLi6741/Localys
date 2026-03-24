'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAnalytics } from '@/hooks/useAnalytics';
import { EmptyAnalytics } from './EmptyAnalytics';
import { StatCards } from './StatCards';
import { VideoPerformanceTable } from './VideoPerformanceTable';
import { PromotionActivityFeed } from './PromotionActivityFeed';

const SpendingChart = dynamic(
  () => import('./SpendingChart').then(m => ({ default: m.SpendingChart })),
  { ssr: false, loading: () => <div className="h-[250px] bg-[var(--glass-bg-subtle)] rounded-lg animate-pulse" /> }
);

const ViewsChart = dynamic(
  () => import('./ViewsChart').then(m => ({ default: m.ViewsChart })),
  { ssr: false, loading: () => <div className="h-[250px] bg-[var(--glass-bg-subtle)] rounded-lg animate-pulse" /> }
);

const CoinDistributionChart = dynamic(
  () => import('./CoinDistributionChart').then(m => ({ default: m.CoinDistributionChart })),
  { ssr: false, loading: () => <div className="h-[280px] bg-[var(--glass-bg-subtle)] rounded-lg animate-pulse" /> }
);

interface AnalyticsDashboardProps {
  userId: string;
}

export function AnalyticsDashboard({ userId }: AnalyticsDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, loading } = useAnalytics(isExpanded ? userId : undefined);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContentHeight(entry.contentRect.height);
        }
      });
      observer.observe(contentRef.current);
      return () => observer.disconnect();
    } else {
      setContentHeight(0);
    }
  }, [isExpanded, loading, data]);

  return (
    <div className="mb-8">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between bg-[#242420] border border-[#3A3A34] rounded-2xl px-5 py-4 transition-all duration-200 hover:border-[#F5A623] hover:scale-[1.02]"
      >
        <span className="text-[18px] font-semibold text-[var(--color-cream)]">Promotion Analytics</span>
        <svg
          className={`w-5 h-5 text-[#F5A623] transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{ maxHeight: isExpanded ? contentHeight + 32 : 0 }}
      >
        <div ref={contentRef} className="bg-[#242420] border border-t-0 border-[#3A3A34] rounded-b-2xl p-6 -mt-2">
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
      </div>
    </div>
  );
}
