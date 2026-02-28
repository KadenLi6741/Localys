'use client';

import type { VideoPerformance } from '@/models/Analytics';

interface VideoPerformanceTableProps {
  videos: VideoPerformance[];
}

export function VideoPerformanceTable({ videos }: VideoPerformanceTableProps) {
  if (videos.length === 0) {
    return null;
  }

  const sorted = [...videos].sort((a, b) => b.viewsPerCoin - a.viewsPerCoin);

  return (
    <div>
      <h4 className="text-sm font-semibold text-white/80 mb-3">🎬 Video Performance</h4>
      <div className="space-y-3">
        {sorted.map((video, index) => (
          <div
            key={video.videoId}
            className="bg-black border border-white/10 rounded-lg overflow-hidden hover:border-white/20 transition-all duration-200"
          >
            <div className="flex gap-4 p-4">
              <div className="flex-shrink-0 w-14 h-14 bg-white/5 rounded-lg flex items-center justify-center relative">
                {video.thumbnailUrl ? (
                  <img
                    src={video.thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-2xl">🎬</span>
                )}
                {index === 0 && videos.length > 1 && (
                  <span className="absolute -top-1 -right-1 text-xs">🏆</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-white truncate">{video.title}</h4>
                <div className="flex gap-3 mt-2 text-xs flex-wrap">
                  <span className="text-yellow-400">🪙 {video.totalCoinsSpent} spent</span>
                  <span className="text-blue-400">👁️ {video.totalViews.toLocaleString()} views</span>
                  <span className="text-green-400">📈 {video.viewsPerCoin} views/coin</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/50 rounded px-2 py-0.5">
                  <span className="text-xs text-yellow-300">🚀 Boost: {video.boostValue.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
