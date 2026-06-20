'use client';

import { cn } from '@/lib/utils';

/** Page heading used at the top of every Manager section. */
export function ManagerHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-heading-sm font-bold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** A single metric tile. */
export function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-[16px] border border-border bg-card p-5 shadow-soft">
      <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn('mt-2 text-heading-sm font-bold', accent ? 'text-primary' : 'text-foreground')}>{value}</p>
      {hint && <p className="mt-1 text-caption text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Generic panel/card with an optional title. */
export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('rounded-[16px] border border-border bg-card p-5 shadow-soft', className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-body font-bold text-foreground">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

/** Centered empty/placeholder state inside a section. */
export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[16px] border border-dashed border-border bg-card p-10 text-center">
      <p className="text-body-sm font-semibold text-foreground">{title}</p>
      {description && <p className="mx-auto mt-1 max-w-md text-caption text-muted-foreground">{description}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/** Small spinner row for loading states. */
export function LoadingRow({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-12 text-body-sm text-muted-foreground">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-primary" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Read-only star rating. */
export function Stars({ value, size = 14 }: { value: number; size?: number }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <svg
          key={n}
          width={size}
          height={size}
          viewBox="0 0 20 20"
          className={n <= full ? 'text-primary' : 'text-border'}
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M10 1.5l2.6 5.27 5.82.85-4.21 4.1.99 5.79L10 15.78 4.8 17.5l.99-5.79L1.58 7.62l5.82-.85L10 1.5z" />
        </svg>
      ))}
    </span>
  );
}

/** Human-friendly relative time. */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
