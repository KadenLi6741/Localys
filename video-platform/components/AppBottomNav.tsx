'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppBottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }

    return pathname?.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[var(--border-color)] bg-[var(--surface-overlay)] backdrop-blur-md">
      <div className="flex items-center justify-around py-3">
        <NavItem href="/" label="Home" active={isActive('/')} icon={
          <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
        } fillIcon />
        <NavItem href="/search" label="Search" active={isActive('/search')} icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        } />
        <Link href="/upload" className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-105 active:scale-95" aria-label="Upload video">
          <div className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${isActive('/upload') ? 'bg-[var(--foreground)]' : 'bg-[var(--surface-2)]'}`}>
            <svg className={`h-6 w-6 ${isActive('/upload') ? 'text-[var(--background)]' : 'text-[var(--foreground)]'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </Link>
        <NavItem href="/chats" label="Chats" active={isActive('/chats')} icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        } />
        <NavItem href="/profile" label="Profile" active={isActive('/profile')} icon={
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        } />
      </div>
    </nav>
  );
}

function NavItem({ href, label, active, icon, fillIcon = false }: { href: string; label: string; active: boolean; icon: React.ReactNode; fillIcon?: boolean }) {
  const toneClass = active ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)]';

  return (
    <Link href={href} className="flex flex-col items-center gap-1 transition-transform duration-200 hover:scale-105 active:scale-95">
      <svg className={`h-6 w-6 ${toneClass}`} fill={fillIcon ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
        {icon}
      </svg>
      <span className={`text-xs ${toneClass}`}>{label}</span>
    </Link>
  );
}
