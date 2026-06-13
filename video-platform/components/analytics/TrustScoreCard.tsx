'use client';

import { useEffect, useMemo, useState } from 'react';
import { calculateTrustScore } from '@/lib/utils/trust';
import { getBusinessTrustScoreSnapshot } from '@/lib/supabase/trust';
import type { BusinessTrustScoreSnapshot } from '@/models/Trust';

interface TrustScoreCardProps {
  userId: string;
  isBusinessProfile?: boolean;
}

const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

export function TrustScoreCard({ userId, isBusinessProfile = true }: TrustScoreCardProps) {
  const [snapshot, setSnapshot] = useState<BusinessTrustScoreSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [simulatedFlagCount, setSimulatedFlagCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const loadTrustScore = async () => {
      setLoading(true);
      setError(null);

      const { data, error: loadError } = await getBusinessTrustScoreSnapshot(userId);

      if (cancelled) {
        return;
      }

      if (loadError || !data) {
        setSnapshot(null);
        setError(loadError?.message || 'Unable to load trust score right now.');
      } else {
        setSnapshot(data);
      }

      setLoading(false);
    };

    loadTrustScore();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const effectiveSnapshot = useMemo(() => {
    if (!snapshot) {
      return null;
    }

    // Dev-mode simulation stays local so we can test warning states and score
    // changes without inserting irreversible fraud records.
    if (!IS_DEVELOPMENT || simulatedFlagCount === 0) {
      return snapshot;
    }

    const metrics = {
      ...snapshot.metrics,
      activeFraudFlags: snapshot.metrics.activeFraudFlags + simulatedFlagCount,
    };

    return {
      ...snapshot,
      metrics,
      result: calculateTrustScore(metrics),
      suspiciousActivityDetected: true,
      warningMessage: `Suspicious activity detected: ${metrics.activeFraudFlags} active flag${metrics.activeFraudFlags === 1 ? '' : 's'} found.`,
    };
  }, [simulatedFlagCount, snapshot]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6 animate-pulse">
        <div className="h-5 bg-gray-200 rounded w-32 mb-4" />
        <div className="h-12 bg-gray-200 rounded w-40 mb-6" />
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-4/5" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-2">Trust Score</h3>
        <p className="text-sm text-red-600">{error}</p>
        <p className="text-sm text-[#6B6B66] mt-2">
          Run the latest Supabase migrations if this business has not been upgraded yet.
        </p>
      </div>
    );
  }

  if (!effectiveSnapshot) {
    return null;
  }

  const { metrics, result, suspiciousActivityDetected, warningMessage } = effectiveSnapshot;
  const scoreColorClass = {
    green: 'text-green-600',
    yellow: 'text-amber-600',
    red: 'text-red-600',
  }[result.color];
  const scoreRingClass = {
    green: 'border-green-200 bg-green-50',
    yellow: 'border-amber-200 bg-amber-50',
    red: 'border-red-200 bg-red-50',
  }[result.color];

  return (
    <div className="bg-white border border-[#E8E8E4] rounded-2xl p-6 shadow-sm">
      {warningMessage && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-700">{warningMessage}</p>
        </div>
      )}

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#1A1A1A]">Trust Score</h3>
          <p className="text-sm text-[#6B6B66] mt-1">
            Reliability score based on verification, ratings, orders, response time, and fraud signals.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex h-24 w-24 items-center justify-center rounded-full border-4 ${scoreRingClass}`}>
            <span className={`text-3xl font-bold ${scoreColorClass}`}>{result.score}</span>
          </div>
          <div>
            <p className="text-sm text-[#6B6B66]">Current status</p>
            <p className={`text-xl font-semibold ${scoreColorClass}`}>{result.label}</p>
            <p className="text-sm text-[#6B6B66] mt-1">{result.score}/100</p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <MetricPill
          label="Verification"
          value={metrics.isVerified ? 'Verified' : metrics.verificationStatus}
          helper={`Up to 30 points`}
        />
        <MetricPill
          label="Average rating"
          value={metrics.avgRating === null ? 'No ratings' : `${metrics.avgRating.toFixed(1)}/5`}
          helper={`${metrics.reviewCount} review${metrics.reviewCount === 1 ? '' : 's'}`}
        />
        <MetricPill
          label="Order completion"
          value={metrics.orderCompletionRate === null ? 'No orders' : `${metrics.orderCompletionRate}%`}
          helper={`${metrics.completedOrders}/${metrics.totalOrders} completed`}
        />
        <MetricPill
          label="Response time"
          value={metrics.avgResponseTimeMinutes === null ? 'No data' : `~${metrics.avgResponseTimeMinutes} min`}
          helper={metrics.responseTimeLabel}
        />
        <MetricPill
          label="Fraud flags"
          value={metrics.activeFraudFlags === 0 ? 'None' : `${metrics.activeFraudFlags} active`}
          helper={suspiciousActivityDetected ? 'Needs review' : 'Healthy'}
          danger={metrics.activeFraudFlags > 0}
        />
      </div>

      {isBusinessProfile && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-3">Score Breakdown</h4>
          <div className="space-y-3">
            {result.breakdown.map((item) => (
              <div key={item.key} className="rounded-xl border border-[#ECEBE5] px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[#1A1A1A]">{item.label}</p>
                    <p className="text-sm text-[#6B6B66]">{item.detail}</p>
                  </div>
                  <span className={`text-sm font-semibold ${item.points < 0 ? 'text-red-600' : item.points > 0 ? 'text-green-600' : 'text-[#6B6B66]'}`}>
                    {item.points > 0 ? '+' : ''}
                    {formatPoints(item.points)}
                    <span className="text-[#6B6B66]">/{item.maxPoints}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {IS_DEVELOPMENT && (
        <div className="mt-6 rounded-xl border border-dashed border-[#D8D5CC] bg-[#FAF8F2] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1A1A1A]">Development Demo</p>
              <p className="text-sm text-[#6B6B66]">
                Simulate suspicious activity without changing production data.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setSimulatedFlagCount((count) => count + 1)}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
              >
                Simulate Suspicious Activity
              </button>
              <button
                type="button"
                onClick={() => setSimulatedFlagCount(0)}
                disabled={simulatedFlagCount === 0}
                className="rounded-lg border border-[#D8D5CC] bg-white px-4 py-2 text-sm font-medium text-[#1A1A1A] transition-colors hover:bg-[#F5F3EC] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricPill({
  label,
  value,
  helper,
  danger = false,
}: {
  label: string;
  value: string;
  helper: string;
  danger?: boolean;
}) {
  return (
    <div className={`rounded-xl border px-4 py-3 ${danger ? 'border-red-200 bg-red-50' : 'border-[#ECEBE5] bg-[#FAF8F2]'}`}>
      <p className="text-xs font-semibold uppercase tracking-wide text-[#6B6B66]">{label}</p>
      <p className={`mt-2 text-base font-semibold ${danger ? 'text-red-700' : 'text-[#1A1A1A]'}`}>{value}</p>
      <p className="mt-1 text-sm text-[#6B6B66]">{helper}</p>
    </div>
  );
}

function formatPoints(points: number) {
  return Number.isInteger(points) ? points.toString() : points.toFixed(1);
}
