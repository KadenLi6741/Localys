'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import type {
  FinancialData,
  FinancialSummary,
  RevenueDataPoint,
  OrdersBreakdown,
  TopSellingItem,
  VideoConversion,
  QuickStats,
} from '@/models/Analytics';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function useFinancialAnalytics(userId: string | undefined) {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);

    try {
      const [
        salesRes,
        videosRes,
      ] = await Promise.all([
        supabase
          .from('item_purchases')
          .select('id, item_name, price, status, purchased_at, buyer_id, item_id')
          .eq('seller_id', userId)
          .order('purchased_at', { ascending: true }),
        supabase
          .from('videos')
          .select('id, caption, view_count, business_id')
          .eq('user_id', userId),
      ]);

      if (salesRes.error) throw salesRes.error;
      if (videosRes.error) throw videosRes.error;

      const sales = salesRes.data || [];
      const videos = videosRes.data || [];

      // --- Summary ---
      const completedStatuses = ['completed', 'paid'];
      const completed = sales.filter(s => completedStatuses.includes(s.status));
      const cancelled = sales.filter(s => s.status === 'cancelled');
      const totalRevenue = completed.reduce((sum, s) => sum + Number(s.price), 0);

      const summary: FinancialSummary = {
        totalRevenue,
        totalOrders: sales.length,
        completedOrders: completed.length,
        cancelledOrders: cancelled.length,
      };

      // --- Revenue Over Time ---
      const revenueByDate: Record<string, number> = {};
      completed.forEach(s => {
        const date = s.purchased_at?.substring(0, 10) || '';
        if (date) {
          revenueByDate[date] = (revenueByDate[date] || 0) + Number(s.price);
        }
      });
      const revenueOverTime: RevenueDataPoint[] = Object.entries(revenueByDate)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, revenue]) => ({ date, revenue: Math.round(revenue * 100) / 100 }));

      // --- Orders Breakdown ---
      const statusCounts: Record<string, number> = {};
      sales.forEach(s => {
        const status = s.status || 'unknown';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      const STATUS_COLORS: Record<string, string> = {
        completed: '#6BAF7A',
        paid: '#6BAF7A',
        pending: '#1B5EA8',
        cancelled: '#E05C3A',
        failed: '#E05C3A',
      };
      const ordersBreakdown: OrdersBreakdown[] = Object.entries(statusCounts).map(
        ([status, count]) => ({
          status: status.charAt(0).toUpperCase() + status.slice(1),
          count,
          color: STATUS_COLORS[status] || '#9E9A90',
        })
      );

      // --- Top Selling Items ---
      const itemCounts: Record<string, number> = {};
      completed.forEach(s => {
        if (s.item_name) {
          itemCounts[s.item_name] = (itemCounts[s.item_name] || 0) + 1;
        }
      });
      const topSellingItems: TopSellingItem[] = Object.entries(itemCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 8)
        .map(([itemName, unitsSold]) => ({ itemName, unitsSold }));

      // --- Video Conversions ---
      // Count orders per video via item_id → menu_items → user's videos (approximate by business)
      const videoOrderCounts: Record<string, number> = {};
      // We approximate: for business owners, all sales count toward their videos
      // Group by item_id to roughly map to business videos
      const videoConversions: VideoConversion[] = videos
        .filter(v => (v.view_count || 0) > 0)
        .sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
        .slice(0, 5)
        .map(v => ({
          videoId: v.id,
          caption: v.caption || 'Untitled',
          views: v.view_count || 0,
          orders: Math.round(completed.length / Math.max(videos.length, 1)),
        }));

      // Distribute actual orders across top videos proportionally by views
      const totalViews = videoConversions.reduce((s, v) => s + v.views, 0);
      if (totalViews > 0 && completed.length > 0) {
        videoConversions.forEach(v => {
          v.orders = Math.round((v.views / totalViews) * completed.length);
        });
      }

      // --- Quick Stats ---
      const averageOrderValue = completed.length > 0
        ? Math.round((totalRevenue / completed.length) * 100) / 100
        : 0;

      // Best selling day
      const dayCounts: Record<number, number> = {};
      completed.forEach(s => {
        if (s.purchased_at) {
          const day = new Date(s.purchased_at).getDay();
          dayCounts[day] = (dayCounts[day] || 0) + 1;
        }
      });
      let bestDay = 0;
      let bestDayCount = 0;
      Object.entries(dayCounts).forEach(([day, count]) => {
        if (count > bestDayCount) {
          bestDay = Number(day);
          bestDayCount = count;
        }
      });
      const bestSellingDay = completed.length > 0 ? DAY_NAMES[bestDay] : 'N/A';

      // Return rate
      const buyerCounts: Record<string, number> = {};
      completed.forEach(s => {
        if (s.buyer_id) {
          buyerCounts[s.buyer_id] = (buyerCounts[s.buyer_id] || 0) + 1;
        }
      });
      const totalCustomers = Object.keys(buyerCounts).length;
      const returningCustomers = Object.values(buyerCounts).filter(c => c > 1).length;
      const returnRate = totalCustomers > 0
        ? Math.round((returningCustomers / totalCustomers) * 100)
        : 0;

      // Revenue change: this month vs last month
      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().substring(0, 10);
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().substring(0, 10);
      let thisMonthRevenue = 0;
      let lastMonthRevenue = 0;
      completed.forEach(s => {
        const date = s.purchased_at?.substring(0, 10) || '';
        if (date >= thisMonthStart) {
          thisMonthRevenue += Number(s.price);
        } else if (date >= lastMonthStart && date < thisMonthStart) {
          lastMonthRevenue += Number(s.price);
        }
      });
      const revenueChangePercent = lastMonthRevenue > 0
        ? Math.round(((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100)
        : thisMonthRevenue > 0 ? 100 : 0;

      const quickStats: QuickStats = {
        averageOrderValue,
        bestSellingDay,
        returnRate,
        revenueChangePercent,
      };

      setData({
        summary,
        revenueOverTime,
        ordersBreakdown,
        topSellingItems,
        videoConversions,
        quickStats,
      });
    } catch (err: any) {
      console.error('Financial analytics error:', err);
      setError(err.message || 'Failed to load financial data');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}
