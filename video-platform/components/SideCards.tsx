'use client';

/**
 * SideCards — dismissible promo cards pinned to the left/right edges on wide screens.
 * Purpose: Surfaces gentle calls-to-action (browse local, deals, communities) without crowding the
 *   main content. Only shown on xl+ viewports, each card can be dismissed independently, and the
 *   right card rotates between promos over time. Purely promotional — no data dependencies.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X, Tag, Store, Users } from 'lucide-react';

const RIGHT_CARDS = ['deals', 'community'] as const;
type RightCard = typeof RIGHT_CARDS[number];

export function SideCards() {
  const router = useRouter();
  const [showLeft, setShowLeft] = useState(true);
  const [showRight, setShowRight] = useState(true);
  const [rightIdx, setRightIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setRightIdx((i) => i + 1);
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // If the user dismissed both cards, render nothing at all.
  if (!showLeft && !showRight) return null;

  const rightCard: RightCard = RIGHT_CARDS[rightIdx % RIGHT_CARDS.length];

  return (
    <>
      {/* Left card */}
      {showLeft && (
        <div className="hidden xl:block fixed left-4 top-[32%] w-64 z-30 pointer-events-auto">
          <div className="relative bg-white border border-gray-200 rounded-2xl shadow-lg p-5">
            <button
              onClick={() => setShowLeft(false)}
              className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>

            <p className="text-xs font-bold text-black uppercase tracking-widest mb-3 pr-8">Browse Local</p>
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mb-2">
              <Store className="h-5 w-5 text-gray-600" />
            </div>
            <p className="text-sm font-semibold text-black mb-1">Local businesses</p>
            <p className="text-xs text-black leading-relaxed mb-3">
              Discover shops, food and services near you.
            </p>
            <button
              onClick={() => router.push('/home')}
              className="w-full bg-black text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-80 transition-opacity"
            >
              Explore
            </button>
          </div>
        </div>
      )}

      {/* Right card */}
      {showRight && (
        <div className="hidden xl:block fixed right-4 top-[32%] w-64 z-30 pointer-events-auto">
          <div className="relative bg-white border border-gray-200 rounded-2xl shadow-lg p-5">
            <button
              onClick={() => setShowRight(false)}
              className="absolute top-2.5 right-2.5 text-gray-400 hover:text-gray-700 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-5 w-5" />
            </button>

            {rightCard === 'deals' ? (
              <>
                <p className="text-xs font-bold text-black uppercase tracking-widest mb-3 pr-8">Local Deals</p>
                <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center mb-2">
                  <Tag className="h-5 w-5 text-[#f97316]" />
                </div>
                <p className="text-sm font-semibold text-black mb-1">Deals near you</p>
                <p className="text-xs text-black leading-relaxed mb-3">
                  Browse coupons and offers from local businesses.
                </p>
                <button
                  onClick={() => router.push('/feed')}
                  className="w-full bg-black text-white text-sm font-semibold py-2.5 rounded-xl hover:opacity-80 transition-opacity"
                >
                  Browse Deals
                </button>
              </>
            ) : (
              <>
                <p className="text-xs font-bold text-black uppercase tracking-widest mb-3 pr-8">Communities</p>
                <div className="w-10 h-10 rounded-xl bg-[#f97316]/10 flex items-center justify-center mb-2">
                  <Users className="h-5 w-5 text-[#f97316]" />
                </div>
                <p className="text-sm font-semibold text-black mb-1">Your community</p>
                <p className="text-xs text-black leading-relaxed mb-3">
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
