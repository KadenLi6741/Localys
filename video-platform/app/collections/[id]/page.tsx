'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, Heart, Plus, Loader2, Globe, Lock, Trash2, Pencil, Check, X, ImagePlus, Utensils,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getLocalBusinesses, type LocalBusiness } from '@/lib/supabase/featured';
import {
  getCollectionById,
  updateCollection,
  deleteCollection,
  addEntry,
  toggleCollectionLike,
  getLikedCollectionIds,
  uploadCollectionImage,
  type CollectionWithEntries,
  type CollectionEntry,
} from '@/lib/supabase/collections';
import { ComboEditor, type ComboProduct } from '@/components/collections/ComboEditor';
import { RestaurantPicker, type PickedRestaurant } from '@/components/collections/RestaurantPicker';

export default function CollectionDetailPage() {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : (params.id as string);
  const { user } = useAuth();
  const router = useRouter();

  const [collection, setCollection] = useState<CollectionWithEntries | null>(null);
  const [businesses, setBusinesses] = useState<LocalBusiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [editingDetails, setEditingDetails] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getCollectionById(id), getLocalBusinesses().catch(() => [])]).then(([c, b]) => {
      if (!active) return;
      setCollection(c);
      setBusinesses(b);
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    if (!user?.id || !collection) return;
    let active = true;
    getLikedCollectionIds(user.id).then((ids) => { if (active) setLiked(ids.includes(collection.id)); });
    return () => { active = false; };
  }, [user?.id, collection]);

  const bySlug = useMemo(() => {
    const m = new Map<string, LocalBusiness>();
    for (const b of businesses) m.set(b.slug, b);
    return m;
  }, [businesses]);

  const productsFor = (slug: string): ComboProduct[] => {
    const b = bySlug.get(slug);
    if (!b) return [];
    const seen = new Set<string>();
    const out: ComboProduct[] = [];
    for (const p of b.products) {
      if (seen.has(p.title)) continue;
      seen.add(p.title);
      out.push({ name: p.title, price: p.price });
    }
    return out;
  };

  const isOwner = !!user?.id && collection?.user_id === user.id;

  const handleAddRestaurant = async (r: PickedRestaurant) => {
    if (!collection) return;
    const { data, error } = await addEntry(collection.id, r);
    if (error || !data) return;
    setCollection({ ...collection, collection_entries: [...collection.collection_entries, data] });
    setShowPicker(false);
  };

  const patchEntry = (entryId: string, patch: Partial<CollectionEntry>) => {
    setCollection((prev) =>
      prev
        ? { ...prev, collection_entries: prev.collection_entries.map((e) => (e.id === entryId ? { ...e, ...patch } : e)) }
        : prev,
    );
  };

  const dropEntry = (entryId: string) => {
    setCollection((prev) =>
      prev ? { ...prev, collection_entries: prev.collection_entries.filter((e) => e.id !== entryId) } : prev,
    );
  };

  const handleTogglePosted = async () => {
    if (!collection) return;
    const next = !collection.is_posted;
    setCollection({ ...collection, is_posted: next });
    await updateCollection(collection.id, { is_posted: next });
  };

  const handleLike = async () => {
    if (!collection || !user?.id) return;
    const prevLiked = liked;
    setLiked(!prevLiked);
    setCollection({ ...collection, like_count: Math.max(0, collection.like_count + (prevLiked ? -1 : 1)) });
    await toggleCollectionLike(collection.id, user.id, prevLiked);
  };

  const handleDelete = async () => {
    if (!collection) return;
    if (!window.confirm('Delete this list? This cannot be undone.')) return;
    await deleteCollection(collection.id);
    router.push('/collections');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-[#f97316]" />
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4 text-center">
        <p className="text-foreground">This list isn&apos;t available.</p>
        <Link href="/collections" className="text-sm font-semibold text-[#f97316] hover:underline">Back to your lists</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <button
            onClick={handleLike}
            disabled={!user?.id}
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm font-medium text-foreground transition hover:border-[#f97316]/50 disabled:opacity-50"
          >
            <Heart className={`h-4 w-4 ${liked ? 'fill-[#f97316] text-[#f97316]' : ''}`} />
            {collection.like_count}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        {editingDetails && isOwner ? (
          <DetailsEditor
            collection={collection}
            userId={user!.id}
            onDone={(patch) => { setCollection({ ...collection, ...patch }); setEditingDetails(false); }}
            onCancel={() => setEditingDetails(false)}
          />
        ) : (
          <Header collection={collection} />
        )}

        {/* Owner controls */}
        {isOwner && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleTogglePosted}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition ${
                collection.is_posted
                  ? 'bg-[#f97316] text-white hover:opacity-90'
                  : 'border border-border text-foreground hover:border-[#f97316]/50'
              }`}
            >
              {collection.is_posted ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              {collection.is_posted ? 'Posted to homepage' : 'Post to homepage'}
            </button>
            {!editingDetails && (
              <button onClick={() => setEditingDetails(true)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:border-[#f97316]/50">
                <Pencil className="h-3.5 w-3.5" /> Edit details
              </button>
            )}
            <button onClick={handleDelete} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition hover:border-red-300 hover:text-red-500">
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}

        {/* Entries */}
        <div className="mt-6 space-y-4">
          {collection.collection_entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border py-12 text-center">
              <Utensils className="mx-auto mb-2 h-8 w-8 text-[#f97316]" />
              <p className="text-sm text-muted-foreground">
                {isOwner ? 'Add restaurants and share your order combo for each.' : 'No restaurants in this list yet.'}
              </p>
            </div>
          ) : (
            collection.collection_entries.map((entry) => (
              <ComboEditor
                key={entry.id}
                entry={entry}
                products={productsFor(entry.store_slug)}
                storeHref={bySlug.get(entry.store_slug)?.href}
                userId={user?.id ?? ''}
                readOnly={!isOwner}
                onSaved={(patch) => patchEntry(entry.id, patch)}
                onRemoved={() => dropEntry(entry.id)}
              />
            ))
          )}

          {isOwner && (
            <button
              onClick={() => setShowPicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-4 text-sm font-semibold text-muted-foreground transition hover:border-[#f97316]/50 hover:text-[#f97316]"
            >
              <Plus className="h-4 w-4" /> Add restaurant
            </button>
          )}
        </div>
      </div>

      {showPicker && (
        <RestaurantPicker
          existingSlugs={collection.collection_entries.map((e) => e.store_slug)}
          onPick={handleAddRestaurant}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}

function Header({ collection }: { collection: CollectionWithEntries }) {
  return (
    <div>
      {collection.cover_image_url ? (
        <div className="mb-4 aspect-[16/7] w-full overflow-hidden rounded-2xl bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={collection.cover_image_url} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{collection.title}</h1>
      {collection.description ? <p className="mt-1 text-muted-foreground">{collection.description}</p> : null}
      <p className="mt-2 text-sm text-muted-foreground">
        {collection.author_name ? `by ${collection.author_name} · ` : ''}
        {collection.collection_entries.length} {collection.collection_entries.length === 1 ? 'restaurant' : 'restaurants'}
      </p>
    </div>
  );
}

function DetailsEditor({
  collection,
  userId,
  onDone,
  onCancel,
}: {
  collection: CollectionWithEntries;
  userId: string;
  onDone: (patch: Partial<CollectionWithEntries>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(collection.title);
  const [description, setDescription] = useState(collection.description ?? '');
  const [cover, setCover] = useState<string | null>(collection.cover_image_url);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20';

  const handleCover = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError(null);
    const { url, error: upErr } = await uploadCollectionImage(file, userId);
    setUploading(false);
    if (upErr) { setError(upErr.message); return; }
    setCover(url);
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('A title is required'); return; }
    setSaving(true);
    setError(null);
    const patch = { title: title.trim(), description: description.trim() || null, cover_image_url: cover };
    const { error: saveErr } = await updateCollection(collection.id, patch);
    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    onDone(patch);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 aspect-[16/7] w-full overflow-hidden rounded-xl bg-muted">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover" />
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="grid h-full w-full place-items-center text-muted-foreground transition hover:text-[#f97316]"
          >
            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <span className="inline-flex items-center gap-2 text-sm"><ImagePlus className="h-5 w-5" /> Add cover photo</span>}
          </button>
        )}
      </div>
      {cover && (
        <button type="button" onClick={() => setCover(null)} className="mb-3 text-xs font-medium text-muted-foreground hover:text-red-500">
          Remove cover
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" onChange={(e) => handleCover(e.target.files?.[0] ?? null)} className="hidden" />

      <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} className={`${inputClass} mb-3`} />
      <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={300} className={`${inputClass} mb-3 resize-none`} />

      {error && <p className="mb-2 text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Save
        </button>
        <button onClick={onCancel} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted">
          <X className="h-4 w-4" /> Cancel
        </button>
      </div>
    </div>
  );
}
