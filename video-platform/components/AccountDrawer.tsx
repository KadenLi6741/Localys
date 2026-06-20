'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ClipboardList,
  Heart,
  Wallet,
  Tag,
  Users,
  HelpCircle,
  UserPlus,
  Store,
  ArrowLeftRight,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';

interface DrawerProfile {
  username: string | null;
  full_name: string | null;
  profile_picture_url: string | null;
  type: string | null;
}

/**
 * Slide-out LEFT account drawer (opened by the header hamburger). COEXISTS with
 * the persistent nav rail — the rail is for navigation, this drawer is the
 * account menu (Uber-Eats-style). Backdrop + Esc + close button come from the
 * Sheet primitive; account-type row adapts to customer vs. business.
 *
 * NOTE: the account-type destinations point at the existing `/dashboard` for now;
 * Phase 5 reroutes them to the dedicated `/manager` onboarding + Localys Manager.
 */
export function AccountDrawer({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [profile, setProfile] = useState<DrawerProfile | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  // Read-only profile fetch (name/avatar + business type) when the drawer opens.
  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    supabase
      .from('profiles')
      .select('username, full_name, profile_picture_url, type')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (!cancelled) {
          setProfile(data as DrawerProfile | null);
          setAvatarError(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  const isBusiness = profile?.type != null;
  const name = profile?.full_name || profile?.username || user?.email || 'Your account';
  const initial = name.charAt(0).toUpperCase();

  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };

  const handleSignOut = async () => {
    onOpenChange(false);
    await signOut();
    router.push('/login');
  };

  const items: { label: string; icon: LucideIcon; href: string }[] = [
    { label: 'Order History', icon: ClipboardList, href: '/orders' },
    { label: 'Favorites', icon: Heart, href: '/profile' },
    { label: 'Wallet / Coins', icon: Wallet, href: '/rewards' },
    { label: 'Promotions / Coupons', icon: Tag, href: '/rewards' },
    { label: 'Communities', icon: Users, href: '/communities' },
    { label: 'Help', icon: HelpCircle, href: '/info#help' },
    { label: 'Invite friends', icon: UserPlus, href: '/rewards' },
  ];

  const rowCls =
    'flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-body-sm font-semibold text-foreground transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[300px] gap-0 rounded-r-[20px] p-0 data-[state=open]:animate-[drawerInLeft_0.25s_ease-out]"
      >
        <SheetTitle className="sr-only">Account menu</SheetTitle>

        {/* Header: avatar + name + manage account */}
        <button
          type="button"
          onClick={() => go('/profile')}
          className="flex items-center gap-3 border-b border-border p-5 text-left transition-colors hover:bg-surface"
        >
          <span className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-body font-bold text-foreground">
            <span aria-hidden="true">{initial}</span>
            {profile?.profile_picture_url && !avatarError && (
              <Image
                src={profile.profile_picture_url}
                alt=""
                width={48}
                height={48}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => setAvatarError(true)}
                unoptimized
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-body font-bold text-foreground">{name}</span>
            <span className="text-caption font-semibold text-primary">Manage account</span>
          </span>
        </button>

        {/* Account items */}
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Account">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.label} type="button" onClick={() => go(it.href)} className={rowCls}>
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                {it.label}
              </button>
            );
          })}

          <div className="my-2 h-px bg-border" aria-hidden="true" />

          {/* Account-type action (customer vs business) */}
          {isBusiness ? (
            <button type="button" onClick={() => go('/dashboard')} className={rowCls}>
              <ArrowLeftRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              Switch to Localys Manager
            </button>
          ) : (
            <button type="button" onClick={() => go('/dashboard')} className={rowCls}>
              <Store className="h-5 w-5 shrink-0" aria-hidden="true" />
              Create a business account
            </button>
          )}

          <button type="button" onClick={handleSignOut} className={cn(rowCls, 'text-destructive hover:text-destructive')}>
            <LogOut className="h-5 w-5 shrink-0" aria-hidden="true" />
            Sign out
          </button>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
