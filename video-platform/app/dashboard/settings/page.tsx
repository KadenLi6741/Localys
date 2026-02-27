'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ensureUserBusiness } from '@/lib/supabase/profiles';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { PaymentSettingsForm } from '@/components/dashboard/PaymentSettingsForm';

export default function DashboardSettingsPage() {
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) loadBusiness();
  }, [user]);

  const loadBusiness = async () => {
    if (!user) return;
    const { data, error } = await ensureUserBusiness(user.id);
    setBusiness(data);
    setLoading(false);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading...</div>;
  if (!business) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">No business found</div>;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-white text-2xl font-bold mb-2">{business.business_name}</h1>
        <p className="text-white/50 text-sm mb-6">Settings</p>

        <DashboardNav />

        <PaymentSettingsForm businessId={business.id} />
      </div>
    </div>
  );
}
