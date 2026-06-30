/**
 * Route-level skeleton for /dashboard — shown while the (heavy, code-split)
 * dashboard chunk and its data load. Palette: black/white/orange.
 */
export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="mb-6 h-8 w-44 animate-pulse rounded bg-muted" />
      {/* Tab bar */}
      <div className="mb-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-24 shrink-0 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
      {/* Metric cards */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-2xl bg-muted" />
        ))}
      </div>
      {/* Chart */}
      <div className="h-72 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}
