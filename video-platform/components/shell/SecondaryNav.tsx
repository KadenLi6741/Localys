'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Users, MessageCircle } from 'lucide-react';

const items = [
  { href: '/home', label: 'Home', icon: Home },
  { href: '/feed', label: 'Discover', icon: Compass },
  { href: '/communities', label: 'Communities', icon: Users },
  { href: '/chats', label: 'Messages', icon: MessageCircle },
];

/** Secondary nav: 4 items left-aligned, Home is the default. No filters. */
export function SecondaryNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    href === '/home' ? pathname === '/home' : pathname?.startsWith(href);

  return (
    <nav className="sticky top-[var(--header-h,64px)] z-30 border-b border-gray-200 bg-white/95 backdrop-blur dark:border-gray-800 dark:bg-[#1A1A18]/95">
      <div className="mx-auto flex max-w-7xl items-center px-2 sm:px-6">
        <div className="flex items-center">
          {items.map(({ href, label, icon: Icon }) => {
            const active = isActive(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition sm:px-5 ${
                  active
                    ? 'border-[#f97316] text-[#f97316]'
                    : 'border-transparent text-black hover:text-[#f97316] dark:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
