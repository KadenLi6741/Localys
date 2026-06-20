'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  MessageSquare,
  FileText,
  UtensilsCrossed,
  ShoppingBag,
  Megaphone,
  CreditCard,
  Settings,
  ArrowLeftRight,
  Store,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

const NAV: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/manager', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/manager/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/manager/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/manager/content', label: 'Content', icon: FileText },
  { href: '/manager/menu', label: 'Menu / Products', icon: UtensilsCrossed },
  { href: '/manager/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/manager/marketing', label: 'Marketing', icon: Megaphone },
  { href: '/manager/payments', label: 'Payments', icon: CreditCard },
  { href: '/manager/settings', label: 'Settings', icon: Settings },
];

/**
 * Localys Manager shell — a DISTINCT pro-dashboard chrome (own fixed top bar +
 * left nav rail), built from the same Localys tokens. Guards access: a logged-in
 * user with no business is sent to onboarding (/business/new).
 */
export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();
  const [bizName, setBizName] = useState<string | null>(null);
  const [state, setState] = useState<'checking' | 'ok'>('checking');

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    let cancelled = false;
    supabase
      .from('businesses')
      .select('business_name')
      .eq('owner_id', user.id)
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        if (data && data.length > 0) {
          setBizName(data[0].business_name as string);
          setState('ok');
        } else {
          router.replace('/business/new'); // no business yet → onboarding
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, loading, router]);

  if (state !== 'ok') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-body-sm text-muted-foreground">
        Loading Localys Manager…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Manager top bar */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-card px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Store className="h-4 w-4" aria-hidden="true" />
          </span>
          <span className="text-body font-extrabold tracking-tight text-foreground" style={{ fontFamily: 'var(--font-wordmark)' }}>
            Localys<span className="text-primary">.</span> <span className="font-bold text-muted-foreground">Manager</span>
          </span>
          {bizName && <span className="ml-1 hidden truncate text-body-sm text-muted-foreground sm:inline">· {bizName}</span>}
        </div>
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border px-4 py-1.5 text-body-sm font-semibold text-foreground transition-colors hover:bg-surface"
        >
          <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
          <span className="hidden sm:inline">Switch to Customer view</span>
          <span className="sm:hidden">Customer</span>
        </Link>
      </header>

      {/* Left nav rail (desktop); horizontal scroll on mobile */}
      <aside className="fixed bottom-0 left-0 top-14 z-20 hidden w-[224px] overflow-y-auto border-r border-border bg-card p-3 md:block">
        <nav className="flex flex-col gap-0.5" aria-label="Localys Manager">
          {NAV.map((n) => {
            const Icon = n.icon;
            const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  'flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-body-sm font-semibold transition-colors',
                  active ? 'bg-surface text-primary' : 'text-foreground hover:bg-surface',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {n.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile nav: horizontal scroll under the top bar */}
      <nav className="fixed inset-x-0 top-14 z-20 flex gap-2 overflow-x-auto border-b border-border bg-card px-3 py-2 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Localys Manager">
        {NAV.map((n) => {
          const active = n.exact ? pathname === n.href : pathname?.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                'shrink-0 rounded-full px-3.5 py-1.5 text-caption font-semibold transition-colors',
                active ? 'bg-foreground text-background' : 'bg-surface text-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <div id="main-content" className="pt-[6.5rem] md:pl-[224px] md:pt-14">
        <div className="mx-auto max-w-[1100px] p-5 lg:p-8">{children}</div>
      </div>
    </div>
  );
}
