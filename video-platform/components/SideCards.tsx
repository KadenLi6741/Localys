'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { X, RefreshCw, Tag, Store, Users } from 'lucide-react';

interface SideCardsProps {
  userId: string;
}

interface LastOrder {
  item_name: string;
  item_id: string;
  seller_id: string;
  price: number;
}

const LEFT_CARDS = ['order', 'browse'] as const;
const RIGHT_CARDS = ['deals', 'community'] as const;
type LeftCard = typeof LEFT_CARDS[number];
type RightCard = typeof RIGHT_CARDS[number];

export function SideCards({ userId }: SideCardsProps) {
  const router = useRouter();
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [lastOrder, setLastOrder] = useState<LastOrder | null>(null);
  const [leftIdx, setLeftIdx] = useState(0);
  const [rightIdx, setRightIdx] = useState(0);

  useEffect(() => {
    supabase
      .from('item_purchases')
      .select('item_name, item_id, seller_id, price')
      .eq('buyer_id', userId)
      .order('purchased_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => { if (data) setLastOrder(data as LastOrder); });
  }, [userId]);

  useEffect(() => {
    const id = setInterval(() => {
      setLeftIdx((i) => i + 1);
      setRightIdx((i) => i + 1);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  if (!showLeft && !showRight) return null;

  const leftCard: LeftCard = LEFT_CARDS[leftIdx % LEFT_CARDS.length];
  const rightCard: RightCard = RIGHT_CARDS[rightIdx % RIGHT_CARDS.length];

  const showOrderCard = leftCard === 'order' && !!lastOrder;

  return (
    <>
      {/* Left card */}
      {showLeft && (
        <div className="hidden xl:block fixed left-4 top-[32%] w-64 z-30 pointer-events-auto">
          <div className="relative bg-card border border-border rounded-2xl shadow-lg p-5">
            <button
              onClick={() => setShowLeft(false)}
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>

            {showOrderCard ? (
              <>
                <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 pr-8">Order Again</p>
                <p className="text-sm font-semibold text-foreground mb-0.5 line-clamp-2 leading-snug">
                  {lastOrder!.item_name}
                </p>
                <p className="text-[#f97316] font-bold text-base mb-3">${lastOrder!.price.toFixed(2)}</p>
                <button
                  onClick={() =>
                    router.push(
                      `/checkout?itemId=${lastOrder!.item_id}&itemName=${encodeURIComponent(lastOrder!.item_name)}&itemPrice=${lastOrder!.price}&sellerId=${lastOrder!.seller_id}&buyerId=${userId}`
                    )
                  }
                  className="w-full bg-[#f97316] text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Re-order
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 pr-8">Browse Local</p>
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-2">
                  <Store className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Local businesses</p>
                <p className="text-xs text-foreground leading-relaxed mb-3">
                  Discover shops, food and services near you.
                </p>
                <button
                  onClick={() => router.push('/home')}
                  className="w-full bg-foreground text-background text-sm font-semibold py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                >
                  Explore
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Right card */}
      {showRight && (
        <div className="hidden xl:block fixed right-4 top-[32%] w-64 z-30 pointer-events-auto">
          <div className="relative bg-card border border-border rounded-2xl shadow-lg p-5">
            <button
              onClick={() => setShowRight(false)}
              className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>

            {rightCard === 'deals' ? (
              <>
                <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 pr-8">Local Deals</p>
                <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center mb-2">
                  <Tag className="h-5 w-5 text-[#f97316]" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Deals near you</p>
                <p className="text-xs text-foreground leading-relaxed mb-3">
                  Browse coupons and offers from local businesses.
                </p>
                <button
                  onClick={() => router.push('/feed')}
                  className="w-full bg-foreground text-background text-sm font-semibold py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                >
                  Browse Deals
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-foreground uppercase tracking-widest mb-3 pr-8">Communities</p>
                <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-[#f97316]" />
                </div>
                <p className="text-sm font-semibold text-foreground mb-1">Your community</p>
                <p className="text-xs text-foreground leading-relaxed mb-3">
                  Connect with locals and share your finds.
                </p>
                <button
                  onClick={() => router.push('/communities')}
                  className="w-full bg-[#f97316] text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-90 transition-opacity"
                >
                  Join Discussion
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
