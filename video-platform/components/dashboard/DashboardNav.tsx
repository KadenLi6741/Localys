'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/orders', label: 'Orders' },
  { href: '/dashboard/floor-plan', label: 'Floor Plan' },
  { href: '/dashboard/settings', label: 'Settings' },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 p-1 bg-white/5 border border-white/10 rounded-lg mb-6">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 text-center py-2.5 px-4 rounded-md text-sm font-medium transition-colors ${
              isActive ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
