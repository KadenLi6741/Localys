'use client';

import { useState, useEffect } from 'react';
import { promoteVideo } from '@/lib/supabase/videos';
import { useAuth } from '@/contexts/AuthContext';

const MIN_COINS = 10;
const MAX_COINS = 500;

interface PromotionModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  userCoins: number;
  onSuccess?: (newBoost: number, coinsSpent: number, remainingCoins: number) => void;
}

export function PromotionModal({ isOpen, onClose, videoId, userCoins, onSuccess }: PromotionModalProps) {
  const { user } = useAuth();
  const [coinsToSpend, setCoinsToSpend] = useState(50);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [estimatedBoost, setEstimatedBoost] = useState(2);
  const isPreviewMode = videoId === 'temp';

  // Cap the max coins at user's balance
  const maxCoinsAllowed = Math.min(MAX_COINS, userCoins);

  useEffect(() => {
    // Calculate estimated boost (10 coins = 2 boost)
    const boost = (coinsToSpend * 0.2);
    setEstimatedBoost(Math.round(boost * 10) / 10);
  }, [coinsToSpend]);

  const handlePromote = async () => {
    if (!user || !videoId || isPreviewMode) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: promoteError } = await promoteVideo(user.id, videoId, coinsToSpend);

      if (promoteError) {
        setError(promoteError.message || 'Failed to promote video');
        return;
      }

      if (data) {
        onSuccess?.(data.newBoost, coinsToSpend, data.remainingCoins);
        onClose();
      }
    } catch (err) {
      setError('An error occurred while promoting the video');
      console.error('Promotion error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const canAfford = userCoins >= coinsToSpend;
  const sliderValue = ((coinsToSpend - MIN_COINS) / (maxCoinsAllowed - MIN_COINS)) * 100;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-black border border-white/20 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Promote Video</h2>
          <button
            onClick={onClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Coin Balance */}
        <div className="mb-6 p-3 bg-white/5 border border-white/10 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-white/80">Your Coins</span>
            <span className="text-2xl font-bold text-yellow-400">{userCoins}</span>
          </div>
        </div>

        {/* Slider */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <label className="text-white text-sm font-semibold">Coins to Spend</label>
            <span className="text-yellow-400 font-bold">{coinsToSpend}</span>
          </div>
          <input
            type="range"
            min={MIN_COINS}
            max={maxCoinsAllowed}
            value={coinsToSpend}
            onChange={(e) => setCoinsToSpend(Number(e.target.value))}
            disabled={loading}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer accent-yellow-400"
          />
          <div className="flex justify-between text-xs text-white/50 mt-1">
            <span>{MIN_COINS}</span>
            <span>{maxCoinsAllowed}</span>
          </div>
        </div>

        {/* Quick Select Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[10, 50, 100].map((amount) => (
            <button
              key={amount}
              onClick={() => setCoinsToSpend(amount)}
              disabled={loading || amount > userCoins}
              className={`py-2 rounded-lg font-semibold transition-all ${
                coinsToSpend === amount
                  ? 'bg-yellow-500 text-black'
                  : amount > userCoins
                  ? 'bg-white/5 text-white/50 cursor-not-allowed'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {amount}
            </button>
          ))}
        </div>

        {/* Estimated Boost */}
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="text-sm text-white/80 mb-1">Estimated Boost Increase</div>
          <div className="text-3xl font-bold text-blue-400">+{estimatedBoost}</div>
          <div className="text-xs text-white/60 mt-2">
            Videos with higher boost appear more often in the feed
          </div>
        </div>

        {/* Boost Tiers Info */}
        <div className="mb-6 space-y-2 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <span className="w-16">10-50 coins</span>
            <div className="flex-1 h-2 bg-white/10 rounded" style={{ width: '20%' }} />
            <span>Small boost</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="w-16">50-250 coins</span>
            <div className="flex-1 h-2 bg-white/10 rounded" style={{ width: '60%' }} />
            <span>Big boost</span>
          </div>
          <div className="flex items-center gap-2 text-white/70">
            <span className="w-16">250-500 coins</span>
            <div className="flex-1 h-2 bg-white/10 rounded" style={{ width: '100%' }} />
            <span>Max boost</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Not Enough Coins Warning */}
        {!canAfford && !isPreviewMode && (
          <div className="mb-4 p-3 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-yellow-200 text-sm">
            You need {coinsToSpend - userCoins} more coins
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
          >
            Close
          </button>
          {!isPreviewMode && (
            <button
              onClick={handlePromote}
              disabled={loading || !canAfford}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                canAfford
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                  : 'bg-gray-600 text-gray-300 cursor-not-allowed'
              } disabled:opacity-50`}
            >
              {loading ? 'Promoting...' : `Promote (${coinsToSpend} coins)`}
            </button>
          )}
        </div>

        {/* Info Footer */}
        <div className="mt-4 text-xs text-white/50 text-center">
          Remaining after: <span className="text-white/80">{Math.max(0, userCoins - coinsToSpend)} coins</span>
        </div>
      </div>
    </div>
  );
}
