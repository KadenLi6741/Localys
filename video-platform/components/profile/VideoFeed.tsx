'use client';

import { PostedVideos } from '@/components/PostedVideos';

type ProfileSurfaceTheme = 'light' | 'dark';

interface VideoFeedProps {
  userId: string;
  isOwnProfile: boolean;
  title?: string;
  theme?: ProfileSurfaceTheme;
  className?: string;
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

export function VideoFeed({
  userId,
  isOwnProfile,
  title = 'Videos',
  theme = 'light',
  className = '',
}: VideoFeedProps) {
  const themeClasses = getThemeClasses(theme);

  return (
    <section className={className}>
      <h3 className={`text-xl font-semibold mb-4 ${themeClasses.title}`}>{title}</h3>
      <div className={`${themeClasses.panel} rounded-lg p-6`}>
        <PostedVideos userId={userId} isOwnProfile={isOwnProfile} />
      </div>
    </section>
  );
}

