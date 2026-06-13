'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { createCommunity, slugify } from '@/lib/utils/communities';

export default function NewCommunityPage() {
  return (
    <ProtectedRoute>
      <NewCommunityForm />
    </ProtectedRoute>
  );
}

function NewCommunityForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const preview = slugify(name);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const created = createCommunity(name, description);
    if (!created) {
      setError(preview ? 'A community with that name already exists.' : 'Please enter a valid community name.');
      return;
    }
    router.push(`/communities/${created.slug}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-xl px-4 py-10 lg:px-8">
        <h1 className="text-heading-sm font-bold text-foreground">Create a community</h1>
        <p className="mt-1 text-body-sm text-muted-foreground">
          Start a space for people to share and discover local businesses.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div>
            <label htmlFor="cname" className="mb-1.5 block text-body-sm font-semibold text-foreground">
              Community name
            </label>
            <input
              id="cname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              placeholder="e.g. Coffee Shops"
              className="w-full rounded-[4px] border border-border bg-surface px-4 py-3 text-body-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
            {preview && <p className="mt-1 text-caption text-muted-foreground">URL: b/{preview}</p>}
          </div>

          <div>
            <label htmlFor="cdesc" className="mb-1.5 block text-body-sm font-semibold text-foreground">
              Description
            </label>
            <textarea
              id="cdesc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What is this community about?"
              className="w-full resize-none rounded-[4px] border border-border bg-surface px-4 py-3 text-body-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          {error && (
            <p className="rounded-[4px] border border-destructive bg-destructive/10 px-4 py-2 text-body-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-[4px] border border-border px-4 py-2 text-body-sm font-semibold text-muted-foreground transition-colors hover:bg-surface/60 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!preview}
              className="rounded-[4px] bg-primary px-5 py-2 text-body-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-40"
            >
              Create community
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
