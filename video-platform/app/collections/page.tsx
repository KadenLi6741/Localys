'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getFeaturedCollections, BusinessCollection } from '@/lib/supabase/collections';

export default function CollectionsPage() {
  return (
    <ProtectedRoute>
      <CollectionsContent />
    </ProtectedRoute>
  );
}

function CollectionsContent() {
  const { user } = useAuth();
  const [collections, setCollections] = useState<BusinessCollection[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let mounted = true;

    getFeaturedCollections(user?.id, 24).then(({ data }) => {
      if (!mounted) return;
      setCollections(data || []);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const shareCollection = async (collection: BusinessCollection) => {
    const url = `${window.location.origin}/collections/${collection.slug}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: collection.title, text: collection.description || undefined, url });
      } else {
        await navigator.clipboard.writeText(url);
        setToast('Collection link copied.');
      }
    } catch {
      setToast('Could not share this collection.');
    }
  };

  return (
    <div className="min-h-screen bg-[#1A1A18] px-4 py-8 text-[#F5F0E8] sm:px-6 lg:px-10">
      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg bg-[#6BAF7A] px-5 py-3 text-sm font-bold text-[#1A1A18] shadow-xl">
          {toast}
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl">
        <header className="flex flex-col gap-5 border-b border-[#3A3A34] pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/feed" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5A623] hover:text-[#ffc15a]">
              <ArrowLeftIcon />
              Home
            </Link>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight text-[#F5F0E8] sm:text-5xl">
              Community collections
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#C5BFB3]">
              Shareable lists of local businesses, curated by people who know the neighborhood.
            </p>
          </div>

          <Link
            href="/search"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#F5A623] px-5 font-bold text-[#1A1A18] hover:bg-[#ffc15a]"
          >
            Find businesses
            <ArrowRightIcon />
          </Link>
        </header>

        {loading ? (
          <div className="grid min-h-80 place-items-center text-[#C5BFB3]">Loading collections...</div>
        ) : (
          <div className="grid gap-5 py-8 md:grid-cols-2 xl:grid-cols-3">
            {collections.map((collection) => (
              <article
                key={collection.id}
                className="overflow-hidden rounded-2xl border border-[#3A3A34] bg-[#242420] shadow-lg shadow-black/10"
              >
                <Link href={`/collections/${collection.slug}`} className="block hover:opacity-95">
                  <div className={`h-36 bg-gradient-to-br ${collection.image_class || 'from-[#3A3A34] via-[#6BAF7A] to-[#F5A623]'}`} />
                </Link>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link href={`/collections/${collection.slug}`} className="text-xl font-bold text-[#F5F0E8] hover:text-[#F5A623]">
                        {collection.title}
                      </Link>
                      <p className="mt-1 text-sm text-[#9E9A90]">
                        By {collection.owner_name || 'Localys curator'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => shareCollection(collection)}
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-[#3A3A34] text-[#F5F0E8] hover:border-[#F5A623] hover:text-[#F5A623]"
                      aria-label={`Share ${collection.title}`}
                    >
                      <ShareIcon />
                    </button>
                  </div>

                  <p className="mt-4 min-h-14 text-sm leading-6 text-[#C5BFB3]">
                    {collection.description || 'A local business list worth saving for later.'}
                  </p>

                  <div className="mt-5 flex items-center justify-between gap-3 text-sm font-bold text-[#C5BFB3]">
                    <span>{collection.businesses_count} {collection.businesses_count === 1 ? 'business' : 'businesses'}</span>
                    <span className="inline-flex items-center gap-1 text-[#F5A623]">
                      <HeartIcon filled={collection.viewer_has_liked} />
                      {collection.likes_count}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 12H5m6 6-6-6 6-6" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.7 13.3a3 3 0 1 0 0-2.6m0 2.6 6.6 3.4m-6.6-6 6.6-3.4m0 0a3 3 0 1 0 0-.1m0 9.5a3 3 0 1 0 0-.1" />
    </svg>
  );
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-4 w-4" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
    </svg>
  );
}
