const STATS = [
  { label: "Today's orders", value: '—' },
  { label: 'Profile views', value: '—' },
  { label: 'Avg. rating', value: '—' },
  { label: 'Revenue (test)', value: '—' },
];

export default function ManagerDashboard() {
  return (
    <div>
      <h1 className="text-heading-sm font-bold text-foreground">Dashboard</h1>
      <p className="mt-1 text-body-sm text-muted-foreground">Overview of your business on Localys.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-[16px] border border-border bg-card p-5 shadow-soft">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="mt-2 text-heading-sm font-bold text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
        <p className="text-body-sm font-semibold text-foreground">Live metrics coming in Phase 5B</p>
        <p className="mt-1 text-caption text-muted-foreground">Real orders, views, reviews and trends will populate here.</p>
      </div>
    </div>
  );
}
