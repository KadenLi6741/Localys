'use client';

import Link from 'next/link';
import { Lock } from 'lucide-react';

/**
 * Small reusable lock used to gate Premium-only controls. Shows a
 * "Localy Premium · $5/mo" badge, a short reason, and an Upgrade button that
 * links to the Premium page. Black/white/orange only.
 */
export function PremiumLock({
  title = 'Premium feature',
  description,
  className = '',
}: {
  title?: string;
  description?: string;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#f97316]/40 bg-[#f97316]/5 p-4 ${className}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#f97316]/15">
          <Lock className="h-4 w-4 text-[#f97316]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <span className="rounded-full bg-[#f97316] px-2 py-0.5 text-[11px] font-semibold text-white">
              Localy Premium · $5/mo
            </span>
          </div>
          {description && (
            <p className="mt-1 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <Link
          href="/premium"
          className="shrink-0 rounded-xl bg-[#f97316] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
        >
          Upgrade
        </Link>
      </div>
    </div>
  );
}

/** Inline "Localy Premium · $5/mo" pill for compact placements. */
export function PremiumBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-[#f97316] px-2 py-0.5 text-[11px] font-semibold text-white ${className}`}
    >
      <Lock className="h-3 w-3" />
      Localy Premium · $5/mo
    </span>
  );
}
