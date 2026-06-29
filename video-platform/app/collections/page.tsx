'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Loader2, ListPlus } from 'lucide-react';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { getProfileByUserId } from '@/lib/supabase/profiles';
import {
  getMyCollections,
  createCollection,
  type CollectionWithEntries,
} from '@/lib/supabase/collections';
import { CollectionCard } from '@/components/collections/CollectionCard';

export default function CollectionsPage() {
  return (
    <ProtectedRoute>
      <CollectionsContent />
    </ProtectedRoute>
  );
}

function CollectionsContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [collections, setCollections] = useState<CollectionWithEntries[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    getMyCollections(user.id).then((c) => { if (active) { setCollections(c); setLoading(false); } });
    return () => { active = false; };
  }, [user?.id]);

  const handleCreate = async () => {
    if (!user?.id || !title.trim()) return;
    setCreating(true);
    setError(null);
    const { data: profile } = await getProfileByUserId(user.id);
    const authorName =
      (profile as { full_name?: string; username?: string } | null)?.full_name ||
      (profile as { username?: string } | null)?.username ||
      'Localy member';
    const { data, error: createErr } = await createCollection(user.id, authorName, { title: title.trim() });
    setCreating(false);
    if (createErr || !data) { setError(createErr?.message || 'Could not create list'); return; }
    router.push(`/collections/${data.id}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 lg:px-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Lists</h1>
            <p className="text-sm text-muted-foreground">Curate restaurants and share your go-to order combos.</p>
          </div>
          <button
            onClick={() => setShowForm((s) => !s)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New list
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-8">
        {showForm && (
          <div className="mb-6 rounded-2xl border border-border bg-card p-4">
            <label className="mb-1.5 block text-sm font-medium text-foreground">List name</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                autoFocus
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                placeholder="e.g. Best date-night spots"
                maxLength={80}
                className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Create
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-[#f97316]" />
          </div>
        ) : collections.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-16 text-center">
            <ListPlus className="mb-3 h-10 w-10 text-[#f97316]" />
            <p className="font-semibold text-foreground">No lists yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Create a list, add your favourite restaurants, and share the exact combo to order at each one.
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> New list
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {collections.map((c) => (
              <CollectionCard key={c.id} collection={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
