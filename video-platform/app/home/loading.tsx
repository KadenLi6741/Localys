/**
 * Route-level skeleton for /home — instant feedback while feed/business data
 * loads. Renders a couple of carousel rows of placeholder cards.
 */
export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-background p-4 lg:p-8">
      <div className="mb-6 h-9 w-48 animate-pulse rounded bg-muted" />
      {Array.from({ length: 2 }).map((_, row) => (
        <div key={row} className="mb-8">
          <div className="mb-3 h-5 w-56 animate-pulse rounded bg-muted" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 w-36 shrink-0 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
