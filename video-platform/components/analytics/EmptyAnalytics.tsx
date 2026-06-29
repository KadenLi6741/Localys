'use client';

/**
 * EmptyAnalytics — empty-state shown when a creator has no promotion data yet.
 * Purpose: Replaces the charts with a friendly prompt explaining how to generate analytics (promote
 *   a video), so the dashboard never looks broken when there's nothing to plot.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

export function EmptyAnalytics() {
  return (
    <div className="text-center py-8">
      <p className="text-4xl mb-4"></p>
      <p className="text-white/60 font-medium">No promotion analytics yet</p>
      <p className="text-white/40 text-sm mt-2">
        Promote your videos with coins to see performance data here
      </p>
    </div>
  );
}
