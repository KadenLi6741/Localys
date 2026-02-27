'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { FloorPlanBuilder } from '@/components/floorplan/FloorPlanBuilder';
import { supabase } from '@/lib/supabase/client';

export default function FloorPlanPage() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadBusiness();
  }, [user]);

  const loadBusiness = async () => {
    if (!user) return;
    const { data } = await supabase.from('businesses').select('*').eq('owner_id', user.id).single();
    setBusiness(data);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading...</div>;
  if (!business) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">No business found</div>;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <h1 className="text-white text-2xl font-bold mb-2">{business.business_name}</h1>
        <p className="text-white/50 text-sm mb-6">Floor Plan Builder</p>

        <DashboardNav />

        <FloorPlanBuilder businessId={business.id} />
      </div>
    </div>
  );
}
