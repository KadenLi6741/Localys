// Shared stub for Localys Manager sections (filled out in Phase 5B).
export function ManagerPlaceholder({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h1 className="text-heading-sm font-bold text-foreground">{title}</h1>
      <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>
      <div className="mt-6 rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
        <p className="text-body-sm font-semibold text-foreground">Coming in Phase 5B</p>
        <p className="mt-1 text-caption text-muted-foreground">This section will be built out next.</p>
      </div>
    </div>
  );
}
