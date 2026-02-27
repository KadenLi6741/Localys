'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { DashboardOverviewCards } from '@/components/dashboard/DashboardOverviewCards';
import { OrderQueue } from '@/components/dashboard/OrderQueue';
import { supabase } from '@/lib/supabase/client';

export default function DashboardPage() {
  const [business, setBusiness] = useState<any>(null);
  const [stats, setStats] = useState({ activeOrders: 0, todayRevenue: 0, occupancyRate: 0 });
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) loadDashboard();
  }, [user]);

  const loadDashboard = async () => {
    if (!user) return;

    const { data: biz } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (!biz) {
      setLoading(false);
      return;
    }
    setBusiness(biz);

    // Get active orders count
    const { count: activeCount } = await supabase
      .from('preorders')
      .select('*', { count: 'exact', head: true })
      .eq('business_id', biz.id)
      .in('status', ['confirmed', 'preparing', 'ready', 'arrived']);

    // Get today's revenue
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: todayOrders } = await supabase
      .from('preorders')
      .select('amount_paid')
      .eq('business_id', biz.id)
      .gte('created_at', todayStart.toISOString())
      .in('status', ['confirmed', 'preparing', 'ready', 'arrived', 'completed']);

    const todayRevenue = (todayOrders || []).reduce((sum: number, o: any) => sum + Number(o.amount_paid || 0), 0);

    // Get table occupancy
    const { data: allTables } = await supabase
      .from('restaurant_tables')
      .select('status')
      .eq('business_id', biz.id);

    const totalTables = allTables?.length || 0;
    const occupiedTables = allTables?.filter((t: any) => t.status === 'occupied' || t.status === 'reserved').length || 0;
    const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    setStats({ activeOrders: activeCount || 0, todayRevenue, occupancyRate });
    setLoading(false);
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading dashboard...</div>;
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">No business account found</p>
          <button onClick={() => router.push('/profile')} className="text-green-400 hover:text-green-300 text-sm">Go to Profile</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">{business.business_name}</h1>
            <p className="text-white/50 text-sm">Restaurant Dashboard</p>
          </div>
          <button onClick={() => router.push('/profile')} className="text-white/40 hover:text-white/80 text-sm transition-colors">&larr; Profile</button>
        </div>

        <DashboardNav />
        <DashboardOverviewCards {...stats} />

        <div>
          <h2 className="text-white font-semibold text-lg mb-4">Recent Orders</h2>
          <OrderQueue businessId={business.id} />
        </div>
      </div>
    </div>
  );
}
