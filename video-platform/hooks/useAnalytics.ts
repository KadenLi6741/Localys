'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAnalyticsSummary,
  getPromotionHistory,
  getPromotedVideoStats,
  getSpendingTimeline,
  getVideoViewsTimeline,
} from '@/lib/supabase/analytics';
import type {
  AnalyticsData,
  SpendingDataPoint,
  ViewsDataPoint,
  VideoPerformance,
  CoinDistribution,
  PromotionEntry,
} from '@/models/Analytics';

function aggregateSpendingByDate(raw: { coins_spent: number; created_at: string }[]): SpendingDataPoint[] {
  const map = new Map<string, number>();
  raw.forEach(item => {
    const date = item.created_at.substring(0, 10);
    map.set(date, (map.get(date) || 0) + item.coins_spent);
  });
  return Array.from(map.entries())
    .map(([date, coinsSpent]) => ({ date, coinsSpent }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function aggregateViewsByDate(
  raw: { created_at: string }[],
  promotionDates: Set<string>
): ViewsDataPoint[] {
  const map = new Map<string, number>();
  raw.forEach(item => {
    const date = item.created_at.substring(0, 10);
    map.set(date, (map.get(date) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([date, views]) => ({ date, views, promoted: promotionDates.has(date) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function useAnalytics(userId: string | undefined) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [summaryRes, historyRes, videoStatsRes, spendingRes, viewsRes] = await Promise.all([
        getAnalyticsSummary(userId),
        getPromotionHistory(userId),
        getPromotedVideoStats(userId),
        getSpendingTimeline(userId),
        getVideoViewsTimeline(userId),
      ]);

      if (!summaryRes.data) {
        setError('Failed to load analytics data');
        setLoading(false);
        return;
      }

      // Build promotion dates set for marking on views chart
      const promotionDates = new Set<string>(
        (spendingRes.data || []).map((item: { created_at: string }) => item.created_at.substring(0, 10))
      );

      // Aggregate spending by date
      const spendingOverTime = aggregateSpendingByDate(spendingRes.data || []);

      // Aggregate views by date
      const viewsOverTime = aggregateViewsByDate(viewsRes.data || [], promotionDates);

      // Map promoted video stats
      const videoPerformance: VideoPerformance[] = (videoStatsRes.data || []).map((v: {
        id: string;
        caption: string;
        thumbnail_url: string | null;
        view_count: number;
        boost_value: number;
        coins_spent_on_promotion: number;
        last_promoted_at: string | null;
        created_at: string;
      }) => ({
        videoId: v.id,
        title: v.caption || 'Untitled Video',
        thumbnailUrl: v.thumbnail_url || undefined,
        totalCoinsSpent: v.coins_spent_on_promotion || 0,
        totalViews: v.view_count || 0,
        boostValue: v.boost_value || 1,
        viewsPerCoin: (v.coins_spent_on_promotion || 0) > 0
          ? Math.round(((v.view_count || 0) / v.coins_spent_on_promotion) * 10) / 10
          : 0,
        lastPromotedAt: v.last_promoted_at,
        createdAt: v.created_at,
      }));

      // Compute coin distribution
      const totalSpent = videoPerformance.reduce((sum, v) => sum + v.totalCoinsSpent, 0);
      const coinDistribution: CoinDistribution[] = videoPerformance.map(v => ({
        videoId: v.videoId,
        title: v.title.length > 20 ? v.title.substring(0, 20) + '...' : v.title,
        coinsSpent: v.totalCoinsSpent,
        percentage: totalSpent > 0 ? Math.round((v.totalCoinsSpent / totalSpent) * 100) : 0,
      }));

      // Map promotion history entries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const promotionHistory: PromotionEntry[] = (historyRes.data || []).map((item: any) => {
        const video = Array.isArray(item.videos) ? item.videos[0] : item.videos;
        return {
          id: item.id,
          videoId: item.video_id,
          videoTitle: video?.caption || 'Untitled Video',
          coinsSpent: item.coins_spent,
          previousBoost: item.previous_boost,
          newBoost: item.new_boost,
          createdAt: item.created_at,
        };
      });

      setData({
        summary: summaryRes.data,
        spendingOverTime,
        viewsOverTime,
        videoPerformance,
        coinDistribution,
        promotionHistory,
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
