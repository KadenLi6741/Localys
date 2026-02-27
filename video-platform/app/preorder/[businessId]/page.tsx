'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { PreOrderMenuBrowser } from '@/components/preorder/PreOrderMenuBrowser';
import { CartSummaryBar } from '@/components/preorder/CartSummaryBar';
import { CartDrawer } from '@/components/preorder/CartDrawer';
import type { CartItem } from '@/models/PreOrder';
import { supabase } from '@/lib/supabase/client';

export default function PreOrderPage({ params }: { params: Promise<{ businessId: string }> }) {
  const [businessId, setBusinessId] = useState<string>('');
  const [business, setBusiness] = useState<any>(null);
  const [ownerId, setOwnerId] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    params.then((p) => {
      setBusinessId(p.businessId);
      loadBusiness(p.businessId);
    });
  }, [params]);

  const loadBusiness = async (bizId: string) => {
    const { data } = await supabase
      .from('businesses')
      .select('id, business_name, owner_id, upfront_payment_pct')
      .eq('id', bizId)
      .single();
    if (data) {
      setBusiness(data);
      setOwnerId(data.owner_id);
    }
    setLoading(false);
  };

  const handleCheckout = () => {
    if (!user) {
      router.push('/login');
      return;
    }
    const cartData = encodeURIComponent(JSON.stringify(cart));
    router.push(`/preorder/${businessId}/checkout?cart=${cartData}`);
  };

  if (loading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Loading...</div>;
  }

  if (!business) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-white/40">Restaurant not found</div>;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button onClick={() => router.back()} className="text-white/40 hover:text-white/80 text-sm mb-4 transition-colors">
          &larr; Back
        </button>

        <div className="mb-6">
          <h1 className="text-white text-2xl font-bold">{business.business_name}</h1>
          <p className="text-white/50 text-sm mt-1">Pre-order your meal</p>
        </div>

        <PreOrderMenuBrowser businessOwnerId={ownerId} cart={cart} onCartUpdate={setCart} />

        <CartSummaryBar cart={cart} onCheckout={handleCheckout} />
        <CartDrawer cart={cart} onCartUpdate={setCart} open={drawerOpen} onClose={() => setDrawerOpen(false)} />

        {cart.length > 0 && <div className="h-20" />}
      </div>
    </div>
  );
}
