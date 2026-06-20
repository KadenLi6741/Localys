'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getOwnerVideos,
  getOwnerThreads,
  deleteOwnerVideo,
  deleteOwnerThread,
  updateOwnerVideoCaption,
  updateOwnerThreadText,
  type OwnerVideo,
  type OwnerThread,
} from '@/lib/supabase/manager';
import { ManagerHeader, Panel, EmptyState, LoadingRow, timeAgo } from '../_components/ui';

type Tab = 'videos' | 'threads';

export default function ManagerContent() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('videos');
  const [videos, setVideos] = useState<OwnerVideo[]>([]);
  const [threads, setThreads] = useState<OwnerThread[]>([]);
  const [loading, setLoading] = useState(true);

  // inline edit + delete-confirm state
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [v, t] = await Promise.all([getOwnerVideos(user.id), getOwnerThreads(user.id)]);
      if (!cancelled) {
        setVideos(v);
        setThreads(t);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const startEdit = (id: string, value: string) => {
    setEditId(id);
    setEditValue(value);
  };

  const saveVideo = async (id: string) => {
    setBusy(true);
    await updateOwnerVideoCaption(id, editValue.trim());
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, caption: editValue.trim() } : v)));
    setBusy(false);
    setEditId(null);
  };

  const saveThread = async (id: string) => {
    const value = editValue.trim();
    if (value.length < 2) return;
    setBusy(true);
    await updateOwnerThreadText(id, value);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, text: value } : t)));
    setBusy(false);
    setEditId(null);
  };

  const removeVideo = async (id: string) => {
    setBusy(true);
    await deleteOwnerVideo(id);
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setBusy(false);
    setConfirmId(null);
  };

  const removeThread = async (id: string) => {
    setBusy(true);
    await deleteOwnerThread(id);
    setThreads((prev) => prev.filter((t) => t.id !== id));
    setBusy(false);
    setConfirmId(null);
  };

  const newButton =
    tab === 'videos' ? (
      <Link
        href="/upload"
        className="rounded-full bg-primary px-5 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        Upload video
      </Link>
    ) : (
      <Link
        href="/communities"
        className="rounded-full bg-primary px-5 py-2 text-body-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        New post
      </Link>
    );

  return (
    <div>
      <ManagerHeader
        title="Content"
        description="Manage the videos and posts your business shows in the customer app."
        action={newButton}
      />

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        {(['videos', 'threads'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-body-sm font-semibold capitalize transition-colors ${
              tab === t ? 'bg-foreground text-background' : 'bg-surface text-foreground hover:bg-secondary'
            }`}
            aria-pressed={tab === t}
          >
            {t === 'videos' ? `Videos (${videos.length})` : `Posts (${threads.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingRow label="Loading your content…" />
      ) : tab === 'videos' ? (
        videos.length === 0 ? (
          <EmptyState
            title="No videos yet"
            description="Videos you upload appear in the customer Explore feed."
            action={newButton}
          />
        ) : (
          <div className="space-y-3">
            {videos.map((v) => (
              <Panel key={v.id}>
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-[10px] bg-surface">
                    {v.thumbnail_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={v.thumbnail_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span aria-hidden="true">🎬</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {editId === v.id ? (
                      <div>
                        <input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-full rounded-[10px] border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          placeholder="Caption"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => saveVideo(v.id)}
                            disabled={busy}
                            className="rounded-full bg-primary px-4 py-1.5 text-caption font-semibold text-primary-foreground disabled:opacity-50"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="rounded-full bg-surface px-4 py-1.5 text-caption font-semibold text-foreground"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-body-sm font-semibold text-foreground">
                          {v.caption || 'Untitled video'}
                        </p>
                        <p className="mt-1 text-caption text-muted-foreground">
                          {v.view_count.toLocaleString()} views · {timeAgo(v.created_at)}
                        </p>
                      </>
                    )}
                  </div>
                  {editId !== v.id && (
                    <ItemActions
                      onEdit={() => startEdit(v.id, v.caption ?? '')}
                      confirming={confirmId === v.id}
                      onAskDelete={() => setConfirmId(v.id)}
                      onCancelDelete={() => setConfirmId(null)}
                      onConfirmDelete={() => removeVideo(v.id)}
                      busy={busy}
                    />
                  )}
                </div>
              </Panel>
            ))}
          </div>
        )
      ) : threads.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Posts you create in Communities appear here and in the customer feed."
          action={newButton}
        />
      ) : (
        <div className="space-y-3">
          {threads.map((t) => (
            <Panel key={t.id}>
              {editId === t.id ? (
                <div>
                  <textarea
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    rows={3}
                    className="w-full resize-none rounded-[10px] border border-border bg-background px-3 py-2 text-body-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => saveThread(t.id)}
                      disabled={busy}
                      className="rounded-full bg-primary px-4 py-1.5 text-caption font-semibold text-primary-foreground disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="rounded-full bg-surface px-4 py-1.5 text-caption font-semibold text-foreground"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-body-sm text-foreground">{t.text}</p>
                    <p className="mt-1 text-caption text-muted-foreground">{timeAgo(t.created_at)}</p>
                  </div>
                  <ItemActions
                    onEdit={() => startEdit(t.id, t.text)}
                    confirming={confirmId === t.id}
                    onAskDelete={() => setConfirmId(t.id)}
                    onCancelDelete={() => setConfirmId(null)}
                    onConfirmDelete={() => removeThread(t.id)}
                    busy={busy}
                  />
                </div>
              )}
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}

function ItemActions({
  onEdit,
  confirming,
  onAskDelete,
  onCancelDelete,
  onConfirmDelete,
  busy,
}: {
  onEdit: () => void;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
  busy: boolean;
}) {
  if (confirming) {
    return (
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={onConfirmDelete}
          disabled={busy}
          className="rounded-full bg-destructive px-3 py-1.5 text-caption font-semibold text-white disabled:opacity-50"
        >
          Delete
        </button>
        <button
          onClick={onCancelDelete}
          className="rounded-full bg-surface px-3 py-1.5 text-caption font-semibold text-foreground"
        >
          Cancel
        </button>
      </div>
    );
  }
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button onClick={onEdit} className="text-caption font-semibold text-muted-foreground hover:text-foreground">
        Edit
      </button>
      <button onClick={onAskDelete} className="text-caption font-semibold text-muted-foreground hover:text-destructive">
        Delete
      </button>
    </div>
  );
}
