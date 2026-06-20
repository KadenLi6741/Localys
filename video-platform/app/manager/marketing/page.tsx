'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { PromotionModal } from '@/components/PromotionModal';
import { getUserCoins } from '@/lib/supabase/profiles';
import { getOwnerPromotableVideos, type PromotableVideo } from '@/lib/supabase/manager';
import { ManagerHeader, StatCard, Panel, EmptyState, LoadingRow } from '../_components/ui';

export default function ManagerMarketing() {
  const { user } = useAuth();
  const [coins, setCoins] = useState(0);
  const [videos, setVideos] = useState<PromotableVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [promoteId, setPromoteId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: balance }, vids] = await Promise.all([
        getUserCoins(user.id),
        getOwnerPromotableVideos(user.id),
      ]);
      if (!cancelled) {
        setCoins(balance ?? 0);
        setVideos(vids);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSuccess = (newBoost: number, _coinsSpent: number, remainingCoins: number) => {
    setCoins(remainingCoins);
    setVideos((prev) =>
      prev.map((v) =>
        v.id === promoteId
          ? { ...v, boost_value: newBoost, coins_spent_on_promotion: (v.coins_spent_on_promotion ?? 0) + _coinsSpent }
          : v,
      ),
    );
  };

  const totalSpent = videos.reduce((s, v) => s + (v.coins_spent_on_promotion ?? 0), 0);
  const promotedCount = videos.filter((v) => (v.coins_spent_on_promotion ?? 0) > 0).length;

  return (
    <div>
      <ManagerHeader
        title="Marketing / Advertise"
        description="Boost your videos so more locals discover your business on Localys."
        action={
          <Link
            href="/buy-coins"
            className="rounded-full bg-primary px-5 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Buy coins
          </Link>
        }
      />

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Coin balance" value={coins.toLocaleString()} accent />
        <StatCard label="Coins advertised" value={totalSpent.toLocaleString()} />
        <StatCard label="Promoted videos" value={promotedCount.toLocaleString()} />
      </div>

      <Panel title="Advertise on Localys" className="mt-6">
        <p className="text-body-sm text-muted-foreground">
          Spend coins to boost a video. Boosted videos appear more often in the customer Explore feed, driving more
          views to your storefront. Coins use Stripe test mode for the demo.
        </p>
      </Panel>

      <div className="mt-6">
        {loading ? (
          <LoadingRow label="Loading your videos…" />
        ) : videos.length === 0 ? (
          <EmptyState
            title="No videos to advertise yet"
            description="Upload a video first, then promote it here to reach more local customers."
            action={
              <Link
                href="/upload"
                className="rounded-full bg-primary px-5 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Upload video
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {videos.map((v) => {
              const boost = v.boost_value ?? 1;
              const spent = v.coins_spent_on_promotion ?? 0;
              return (
                <Panel key={v.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="truncate text-body-sm font-semibold text-foreground">
                        {v.caption || 'Untitled video'}
                      </p>
                      <p className="mt-1 text-caption text-muted-foreground">
                        {v.view_count.toLocaleString()} views · boost {boost.toFixed(1)} · {spent} coins spent
                      </p>
                    </div>
                    <button
                      onClick={() => setPromoteId(v.id)}
                      className="shrink-0 rounded-full bg-primary px-5 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Promote
                    </button>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}
      </div>

      {promoteId && (
        <PromotionModal
          isOpen={!!promoteId}
          onClose={() => setPromoteId(null)}
          videoId={promoteId}
          userCoins={coins}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
