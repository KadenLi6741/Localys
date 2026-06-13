'use client';

import { useState, useEffect } from 'react';
import { getTrustMetrics } from '@/lib/supabase/trust';
import type { TrustMetrics } from '@/models/Trust';

interface TrustMetricsBadgeProps {
  /** Business owner's user ID */
  userId: string;
  /** Optional: compact mode for chat headers */
  compact?: boolean;
}

/**
 * Displays trust indicators: response time, last active, completion rate.
 * - On business profile pages: full card display
 * - In chat headers: compact single-line
 */
export function TrustMetricsBadge({ userId, compact = false }: TrustMetricsBadgeProps) {
  const [metrics, setMetrics] = useState<TrustMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const { data } = await getTrustMetrics(userId);
      if (!cancelled) {
        setMetrics(data);
        setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return compact ? null : (
      <div className="flex gap-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex-1 h-16 bg-[var(--color-charcoal-light)] rounded-lg" />
        ))}
      </div>
    );
  }

  if (!metrics) return null;

  // Compact mode: single line for chat headers
  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs text-[var(--color-cream)]/60">
        {metrics.avgResponseTimeMinutes !== null && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {metrics.responseTimeLabel}
          </span>
        )}
        <span className="flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${
            metrics.lastActiveLabel === 'Active now' ? 'bg-green-400' : 'bg-gray-400'
          }`} />
          {metrics.lastActiveLabel}
        </span>
      </div>
    );
  }

  // Full mode: card grid for business profiles
  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Response Time */}
      <div className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-3 text-center">
        <svg className="w-5 h-5 mx-auto mb-1.5 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-[var(--color-cream)]/60 mb-0.5">Response</p>
        <p className="text-sm font-semibold text-[var(--color-cream)]">
          {metrics.avgResponseTimeMinutes !== null
            ? `~${metrics.avgResponseTimeMinutes}m`
            : '—'}
        </p>
      </div>

      {/* Last Active */}
      <div className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-3 text-center">
        <div className="flex justify-center mb-1.5">
          <span className={`w-3 h-3 rounded-full ${
            metrics.lastActiveLabel === 'Active now' || metrics.lastActiveLabel === 'Active just now'
              ? 'bg-green-400 animate-pulse'
              : 'bg-gray-400'
          }`} />
        </div>
        <p className="text-xs text-[var(--color-cream)]/60 mb-0.5">Activity</p>
        <p className="text-sm font-semibold text-[var(--color-cream)]">
          {metrics.lastActiveLabel}
        </p>
      </div>

      {/* Order Completion */}
      <div className="bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)] rounded-lg p-3 text-center">
        <svg className="w-5 h-5 mx-auto mb-1.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs text-[var(--color-cream)]/60 mb-0.5">Completion</p>
        <p className="text-sm font-semibold text-[var(--color-cream)]">
          {metrics.orderCompletionRate !== null
            ? `${metrics.orderCompletionRate}%`
            : 'No orders yet'}
        </p>
      </div>
    </div>
  );
}
