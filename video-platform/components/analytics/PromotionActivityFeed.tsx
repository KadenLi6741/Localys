'use client';

import { useState } from 'react';
import type { PromotionEntry } from '@/models/Analytics';

interface PromotionActivityFeedProps {
  history: PromotionEntry[];
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;

  return new Date(dateStr).toLocaleDateString();
}

export function PromotionActivityFeed({ history }: PromotionActivityFeedProps) {
  const [showAll, setShowAll] = useState(false);

  if (history.length === 0) {
    return null;
  }

  const displayed = showAll ? history : history.slice(0, 5);

  return (
    <div>
      <h4 className="text-sm font-semibold text-white/80 mb-3">🚀 Recent Promotions</h4>
      <div className="space-y-0">
        {displayed.map((entry) => (
          <div
            key={entry.id}
            className="flex gap-3 items-start py-3 border-b border-white/5 last:border-b-0"
          >
            <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-sm">🚀</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white">
                Spent <span className="text-yellow-400 font-semibold">{entry.coinsSpent} coins</span> on{' '}
                <span className="text-blue-400">&quot;{entry.videoTitle}&quot;</span>
              </p>
              <p className="text-xs text-white/40 mt-1">
                Boost: {entry.previousBoost.toFixed(1)} → {entry.newBoost.toFixed(1)}
              </p>
              <p className="text-xs text-white/30 mt-0.5">{relativeTime(entry.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
      {history.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-blue-400 text-sm mt-3 py-2 hover:text-blue-300 transition-colors"
        >
          {showAll ? 'Show less' : `Show all (${history.length})`}
        </button>
      )}
    </div>
  );
}
