'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Video, Users, MessageCircle, ShoppingCart, type LucideIcon } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';
import { useUnreadMessages } from '@/contexts/UnreadMessagesContext';
import { cn } from '@/lib/utils';

type BottomNavItem = { href: string; label: string; icon: LucideIcon; badge?: 'messages' | 'cart' };

/**
 * Mobile / tablet bottom navigation (below lg). Mirrors the desktop sidebar's
 * five primary destinations so the immersive home feed keeps reachable nav
 * even though it overlays the header. Active destination is orange.
 */
export function AppBottomNav() {
  const pathname = usePathname();
  const { getCartCount } = useCart();
  const { unreadMessages } = useUnreadMessages();
  const cartCount = getCartCount();

  if (pathname === '/login' || pathname === '/signup' || pathname === '/reset-password') return null;

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname?.startsWith(href));

  const navItems: BottomNavItem[] = [
    { href: '/', label: 'Home', icon: Home },
    { href: '/explore', label: 'Explore', icon: Video },
    { href: '/communities', label: 'Communities', icon: Users },
    { href: '/chats', label: 'Messages', icon: MessageCircle, badge: 'messages' },
    { href: '/cart', label: 'Cart', icon: ShoppingCart, badge: 'cart' },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-card/95 px-2 py-2 backdrop-blur-md lg:hidden"
      aria-label="Primary"
    >
      {navItems.map((item) => {
        const active = isActive(item.href);
        const Icon = item.icon;
        const count = item.badge === 'messages' ? unreadMessages : item.badge === 'cart' ? cartCount : 0;

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-label={item.label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex flex-1 flex-col items-center gap-1 rounded-[4px] py-1 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className="relative">
              <Icon className="h-6 w-6" aria-hidden="true" />
              {count > 0 && (
                <span className="absolute -right-2 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-[4px] bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                  {count > 9 ? '9+' : count}
                </span>
              )}
            </span>
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
