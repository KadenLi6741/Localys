'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import {
  BusinessCollection,
  getCollectionBySlug,
  likeCollection,
  unlikeCollection,
} from '@/lib/supabase/collections';

export default function CollectionDetailPage() {
  return (
    <ProtectedRoute>
      <CollectionDetailContent />
    </ProtectedRoute>
  );
}

function CollectionDetailContent() {
  const params = useParams();
  const slug = params.slug as string;
  const { user } = useAuth();
  const [collection, setCollection] = useState<BusinessCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [likeLoading, setLikeLoading] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    let mounted = true;
    setLoading(true);

    getCollectionBySlug(slug, user?.id).then(({ data }) => {
      if (!mounted) return;
      setCollection(data);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [slug, user?.id]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const shareCollection = async () => {
    if (!collection) return;
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

  const toggleLike = async () => {
    if (!collection || !user || likeLoading) return;

    if (collection.id.startsWith('fallback-')) {
      setCollection({
        ...collection,
        viewer_has_liked: !collection.viewer_has_liked,
        likes_count: collection.viewer_has_liked
          ? Math.max(0, collection.likes_count - 1)
          : collection.likes_count + 1,
      });
      setToast('Run the collection SQL to save likes for everyone.');
      return;
    }

    const wasLiked = collection.viewer_has_liked;
    setLikeLoading(true);
    setCollection({
      ...collection,
      viewer_has_liked: !wasLiked,
      likes_count: wasLiked ? Math.max(0, collection.likes_count - 1) : collection.likes_count + 1,
    });

    const { error } = wasLiked
      ? await unlikeCollection(collection.id, user.id)
      : await likeCollection(collection.id, user.id);

    if (error) {
      setCollection(collection);
      setToast('Could not update like.');
    }

    setLikeLoading(false);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1A1A18] text-[#C5BFB3]">
        Loading collection...
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1A1A18] px-4 text-center text-[#F5F0E8]">
        <div>
          <h1 className="text-3xl font-bold">Collection not found</h1>
          <p className="mt-3 text-[#C5BFB3]">This collection may be private or no longer available.</p>
          <Link href="/collections" className="mt-6 inline-flex min-h-12 items-center rounded-lg bg-[#F5A623] px-5 font-bold text-[#1A1A18]">
            Browse collections
          </Link>
        </div>
      </div>
    );
  }

  const businesses = collection.businesses || [];

  return (
    <div className="min-h-screen bg-[#1A1A18] px-4 py-8 text-[#F5F0E8] sm:px-6 lg:px-10">
      {toast && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-lg bg-[#6BAF7A] px-5 py-3 text-sm font-bold text-[#1A1A18] shadow-xl">
          {toast}
        </div>
      )}

      <div className="mx-auto w-full max-w-7xl">
        <Link href="/collections" className="inline-flex items-center gap-2 text-sm font-bold text-[#F5A623] hover:text-[#ffc15a]">
          <ArrowLeftIcon />
          Collections
        </Link>

        <header className="mt-5 overflow-hidden rounded-2xl border border-[#3A3A34] bg-[#242420] shadow-2xl shadow-black/20">
          <div className={`h-44 bg-gradient-to-br sm:h-56 ${collection.image_class || 'from-[#3A3A34] via-[#6BAF7A] to-[#F5A623]'}`} />
          <div className="grid gap-6 p-5 md:grid-cols-[1fr_auto] md:p-7">
            <div>
              <p className="text-sm font-bold text-[#F5A623]">
                By {collection.owner_name || 'Localys curator'}
              </p>
              <h1 className="mt-2 text-4xl font-bold leading-tight text-[#F5F0E8] sm:text-5xl">
                {collection.title}
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-[#C5BFB3]">
                {collection.description || 'A shareable list of local businesses.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-2 text-sm font-bold text-[#C5BFB3]">
                <span className="rounded-full bg-[#1A1A18] px-3 py-2">{businesses.length || collection.businesses_count} businesses</span>
                <span className="rounded-full bg-[#1A1A18] px-3 py-2">{collection.likes_count} likes</span>
              </div>
            </div>

            <div className="flex gap-3 md:flex-col">
              <button
                type="button"
                onClick={toggleLike}
                disabled={likeLoading}
                className={`inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border px-5 font-bold md:flex-none ${
                  collection.viewer_has_liked
                    ? 'border-[#F5A623] bg-[#F5A623] text-[#1A1A18]'
                    : 'border-[#3A3A34] bg-[#1A1A18] text-[#F5F0E8] hover:border-[#F5A623]'
                }`}
              >
                <HeartIcon filled={collection.viewer_has_liked} />
                {collection.viewer_has_liked ? 'Liked' : 'Like'}
              </button>
              <button
                type="button"
                onClick={shareCollection}
                className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-[#3A3A34] bg-[#1A1A18] px-5 font-bold text-[#F5F0E8] hover:border-[#F5A623] hover:text-[#F5A623] md:flex-none"
              >
                <ShareIcon />
                Share
              </button>
            </div>
          </div>
        </header>

        <section className="py-8">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Businesses in this collection</h2>
            <Link href="/search" className="text-sm font-bold text-[#F5A623] hover:text-[#ffc15a]">
              Add from search
            </Link>
          </div>

          {businesses.length === 0 ? (
            <div className="rounded-2xl border border-[#3A3A34] bg-[#242420] p-8 text-center text-[#C5BFB3]">
              No businesses have been added yet.
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {businesses.map((business, index) => (
                <article
                  key={`${business.id}-${index}`}
                  className="grid gap-4 rounded-2xl border border-[#3A3A34] bg-[#242420] p-5 shadow-lg shadow-black/10 sm:grid-cols-[4.5rem_1fr]"
                >
                  {business.profile_picture_url ? (
                    <img
                      src={business.profile_picture_url}
                      alt={business.full_name || business.username || 'Business'}
                      className="h-18 w-18 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="grid h-18 w-18 place-items-center rounded-xl bg-[#F5A623]/10 text-[#F5A623]">
                      <StoreIcon />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold text-[#F5F0E8]">
                          {business.full_name || business.username || 'Local business'}
                        </h3>
                        <p className="mt-1 text-sm capitalize text-[#F5A623]">{business.type || 'business'}</p>
                      </div>
                      <Link
                        href={`/profile/${business.username || business.id}`}
                        className="shrink-0 rounded-lg bg-[#F5A623] px-3 py-2 text-sm font-bold text-[#1A1A18] hover:bg-[#ffc15a]"
                      >
                        View
                      </Link>
                    </div>
                    {business.bio && (
                      <p className="mt-3 text-sm leading-6 text-[#C5BFB3]">{business.bio}</p>
                    )}
                    {business.note && (
                      <p className="mt-3 rounded-lg border border-[#3A3A34] bg-[#1A1A18] px-3 py-2 text-sm leading-6 text-[#C5BFB3]">
                        {business.note}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
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

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg className="h-5 w-5" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />
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

function StoreIcon() {
  return (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 10h16l-1-5H5l-1 5Zm1 0v9h14v-9M9 19v-5h6v5" />
    </svg>
  );
}
