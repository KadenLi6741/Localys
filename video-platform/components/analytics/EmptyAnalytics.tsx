'use client';

export function EmptyAnalytics() {
  return (
    <div className="text-center py-8">
      <p className="text-[var(--text-tertiary)] font-medium">No promotion analytics yet</p>
      <p className="text-[var(--text-muted)] text-sm mt-2">
        Promote your videos with coins to see performance data here
      </p>
    </div>
  );
}
