/**
 * Route-level skeleton for /profile — shown instantly on navigation while the
 * page chunk + data load, replacing a blank flash. Palette: black/white/orange.
 */
export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 px-4 py-4 backdrop-blur-md lg:px-12">
        <div className="h-7 w-28 animate-pulse rounded bg-muted" />
      </div>
      <div className="mx-auto w-full max-w-3xl px-4 py-8 lg:px-12">
        {/* Header */}
        <div className="mb-5 flex items-center gap-5">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-6 w-40 animate-pulse rounded bg-muted" />
            <div className="h-4 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        {/* Cards */}
        <div className="space-y-3">
          <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          <div className="h-24 animate-pulse rounded-2xl bg-muted" />
          <div className="h-40 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    </div>
  );
}
