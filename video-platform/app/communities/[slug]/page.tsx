'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { getCommunity, type Community } from '@/lib/utils/communities';

export default function CommunityPage() {
  const params = useParams();
  const slug = params.slug as string;
  const [community, setCommunity] = useState<Community | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    setCommunity(getCommunity(slug));
    setResolved(true);
  }, [slug]);

  if (!resolved) {
    return <div className="min-h-screen bg-background" />;
  }

  // No such community → themed 404.
  if (!community) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center text-foreground">
        <p className="text-display font-thin leading-none text-primary">404</p>
        <h1 className="mt-2 text-heading-sm font-bold">Page not found</h1>
        <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">
          This community doesn&apos;t exist. It may have been removed, or the link is wrong.
        </p>
        <div className="mt-6 flex gap-2">
          <Link href="/" className="rounded-[4px] border border-border px-4 py-2 text-body-sm font-semibold text-foreground transition-colors hover:bg-surface/60">
            Go home
          </Link>
          <Link href="/communities/new" className="rounded-[4px] bg-primary px-4 py-2 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90">
            Create a community
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-8">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Community</p>
        <h1 className="mt-1 text-heading-sm font-bold text-foreground">b/{community.slug}</h1>
        <p className="mt-1 text-body font-semibold text-foreground">{community.name}</p>
        {community.description && (
          <p className="mt-2 text-body-sm text-muted-foreground">{community.description}</p>
        )}
        <div className="mt-8 rounded-[12px] border border-border bg-card py-12 text-center">
          <p className="font-semibold text-foreground">No posts yet</p>
          <p className="mt-1 text-body-sm text-muted-foreground">Be the first to post a thread in this community.</p>
          {/* Threads are composed in the Communities feed (text post, not a video). */}
          <Link
            href="/communities"
            className="mt-4 inline-block rounded-full bg-primary px-5 py-2.5 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Create a thread
          </Link>
        </div>
      </div>
    </div>
  );
}
