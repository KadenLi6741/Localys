'use client';

import { MenuList } from '@/components/MenuList';

type ProfileSurfaceTheme = 'light' | 'dark';

interface ServicesPanelProps {
  userId: string;
  businessId?: string;
  businessName?: string;
  isOwnProfile: boolean;
  title?: string;
  theme?: ProfileSurfaceTheme;
  className?: string;
  stickyDesktop?: boolean;
}

function getThemeClasses(theme: ProfileSurfaceTheme) {
  if (theme === 'dark') {
    return {
      title: 'text-[var(--color-cream)]',
      panel: 'bg-[var(--color-charcoal-light)] border border-[var(--color-charcoal-lighter-plus)]',
    };
  }

  return {
    title: 'text-[#1A1A1A]',
    panel: 'bg-[var(--glass-bg-subtle)] border border-[var(--glass-border)]',
  };
}

export function ServicesPanel({
  userId,
  businessId,
  businessName,
  isOwnProfile,
  title = 'Services',
  theme = 'light',
  className = '',
  stickyDesktop = false,
}: ServicesPanelProps) {
  const themeClasses = getThemeClasses(theme);
  const stickyClass = stickyDesktop ? 'lg:sticky lg:top-24 lg:self-start' : '';

  return (
    <aside className={`${stickyClass} ${className}`.trim()}>
      <h3 className={`text-xl font-semibold mb-4 ${themeClasses.title}`}>{title}</h3>
      <div className={`${themeClasses.panel} rounded-lg p-6`}>
        <MenuList
          userId={userId}
          businessId={businessId}
          businessName={businessName}
          isOwnProfile={isOwnProfile}
        />
      </div>
    </aside>
  );
}

