'use client';

import { useState, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useFinancialAnalytics } from '@/hooks/useFinancialAnalytics';
import { FinancialStatCards } from './FinancialStatCards';
import { TopSellingItemsChart } from './TopSellingItemsChart';
import { QuickStatsRow } from './QuickStatsRow';

const RevenueChart = dynamic(
  () => import('./RevenueChart').then(m => ({ default: m.RevenueChart })),
  { ssr: false, loading: () => <div className="h-[250px] bg-[#F5A623]/5 rounded-lg animate-pulse" /> }
);

const OrdersBreakdownChart = dynamic(
  () => import('./OrdersBreakdownChart').then(m => ({ default: m.OrdersBreakdownChart })),
  { ssr: false, loading: () => <div className="h-[260px] bg-[#F5A623]/5 rounded-lg animate-pulse" /> }
);

const VideoConversionChart = dynamic(
  () => import('./VideoConversionChart').then(m => ({ default: m.VideoConversionChart })),
  { ssr: false, loading: () => <div className="h-[250px] bg-[#F5A623]/5 rounded-lg animate-pulse" /> }
);

interface FinancialOverviewProps {
  userId: string;
}

export function FinancialOverview({ userId }: FinancialOverviewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, loading } = useFinancialAnalytics(isExpanded ? userId : undefined);
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
        className="w-full flex items-center justify-between bg-[#242420] border border-[#3A3A34] rounded-2xl px-5 py-4 transition-colors duration-200 hover:bg-[#2E2E28]"
      >
        <span className="text-[18px] font-semibold text-[#F5F0E8]">📊 Financial Overview</span>
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
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-20 bg-[#F5A623]/5 rounded-xl animate-pulse" />
                ))}
              </div>
              <div className="h-[250px] bg-[#F5A623]/5 rounded-lg animate-pulse" />
              <div className="h-[260px] bg-[#F5A623]/5 rounded-lg animate-pulse" />
            </div>
          ) : !data || data.summary.totalOrders === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#9E9A90] text-lg mb-2">No order data yet</p>
              <p className="text-[#9E9A90]/60 text-sm">
                Financial analytics will appear here once customers place orders.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              <FinancialStatCards summary={data.summary} />
              <RevenueChart data={data.revenueOverTime} />
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <OrdersBreakdownChart data={data.ordersBreakdown} />
                <TopSellingItemsChart data={data.topSellingItems} />
              </div>
              <VideoConversionChart data={data.videoConversions} />
              <QuickStatsRow stats={data.quickStats} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
