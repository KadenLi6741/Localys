'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { OrderQueue } from '@/components/dashboard/OrderQueue';
import { QRScanner } from '@/components/dashboard/QRScanner';
import { supabase } from '@/lib/supabase/client';

export default function DashboardOrdersPage() {
  const [business, setBusiness] = useState<any>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
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

  const handleScanResult = (result: any) => {
    setShowScanner(false);
    setScanResult(result);
    setTimeout(() => setScanResult(null), 5000);
  };

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading...</div>;
  if (!business) return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">No business found</div>;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-white text-2xl font-bold mb-2">{business.business_name}</h1>
        <p className="text-white/50 text-sm mb-6">Order Management</p>

        <DashboardNav />

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-lg">Orders</h2>
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 rounded-lg text-green-300 text-sm font-medium transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
            </svg>
            Scan QR Code
          </button>
        </div>

        {scanResult && (
          <div className="mb-4 p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
            <p className="text-green-300 font-semibold">Customer checked in!</p>
            <p className="text-green-300/70 text-sm">
              Order {scanResult.preorder?.order_code} - {scanResult.preorder?.customer?.full_name || 'Customer'}
            </p>
          </div>
        )}

        <OrderQueue businessId={business.id} />

        {showScanner && (
          <QRScanner businessId={business.id} onScanResult={handleScanResult} onClose={() => setShowScanner(false)} />
        )}
      </div>
    </div>
  );
}
