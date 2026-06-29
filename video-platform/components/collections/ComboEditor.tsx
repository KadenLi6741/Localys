'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { Trash2, ImagePlus, X, Check, Loader2, ExternalLink } from 'lucide-react';
import {
  updateEntry,
  removeEntry,
  uploadCollectionImage,
  type CollectionEntry,
  type ComboItem,
} from '@/lib/supabase/collections';

export interface ComboProduct {
  name: string;
  price: number;
}

/**
 * Per-restaurant order-combo editor (owner) or read-only display (visitor).
 * Owns its draft state; persists via updateEntry and reports back through onSaved.
 */
export function ComboEditor({
  entry,
  products,
  storeHref,
  userId,
  readOnly = false,
  onSaved,
  onRemoved,
}: {
  entry: CollectionEntry;
  products: ComboProduct[];
  storeHref?: string;
  userId: string;
  readOnly?: boolean;
  onSaved?: (patch: Partial<CollectionEntry>) => void;
  onRemoved?: () => void;
}) {
  const [title, setTitle] = useState(entry.combo_title ?? '');
  const [body, setBody] = useState(entry.combo_body ?? '');
  const [items, setItems] = useState<ComboItem[]>(entry.combo_items);
  const [images, setImages] = useState<string[]>(entry.combo_image_urls);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const toggleItem = (p: ComboProduct) => {
    setItems((prev) =>
      prev.some((i) => i.name === p.name)
        ? prev.filter((i) => i.name !== p.name)
        : [...prev, { name: p.name, price: p.price }],
    );
    setSaved(false);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    const urls: string[] = [];
    for (const file of Array.from(files).slice(0, 4)) {
      const { url, error: upErr } = await uploadCollectionImage(file, userId);
      if (upErr) { setError(upErr.message); continue; }
      if (url) urls.push(url);
    }
    if (urls.length) setImages((prev) => [...prev, ...urls]);
    setUploading(false);
    setSaved(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeImage = (url: string) => {
    setImages((prev) => prev.filter((u) => u !== url));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const patch = {
      combo_title: title.trim() || null,
      combo_body: body.trim() || null,
      combo_items: items,
      combo_image_urls: images,
    };
    const { error: saveErr } = await updateEntry(entry.id, patch);
    setSaving(false);
    if (saveErr) { setError(saveErr.message); return; }
    setSaved(true);
    onSaved?.(patch);
    window.setTimeout(() => setSaved(false), 1500);
  };

  const handleRemove = async () => {
    if (!window.confirm(`Remove ${entry.restaurant_name} from this list?`)) return;
    const { error: rmErr } = await removeEntry(entry.id);
    if (rmErr) { setError(rmErr.message); return; }
    onRemoved?.();
  };

  // ---- Read-only display (visitor viewing a posted list) ----
  if (readOnly) {
    const hasCombo = entry.combo_title || entry.combo_body || entry.combo_items.length || entry.combo_image_urls.length;
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <RestaurantHeader entry={entry} storeHref={storeHref} />
        {hasCombo ? (
          <div className="mt-3 space-y-3">
            {entry.combo_title ? <p className="font-semibold text-foreground">{entry.combo_title}</p> : null}
            {entry.combo_body ? <p className="text-sm text-muted-foreground">{entry.combo_body}</p> : null}
            {entry.combo_items.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {entry.combo_items.map((i) => (
                  <span key={i.name} className="rounded-full bg-[#f97316]/10 px-2.5 py-1 text-xs font-medium text-[#f97316]">
                    {i.name}{typeof i.price === 'number' ? ` · $${i.price.toFixed(2)}` : ''}
                  </span>
                ))}
              </div>
            )}
            {entry.combo_image_urls.length > 0 && (
              <div className="flex gap-2 overflow-x-auto">
                {entry.combo_image_urls.map((url) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={url} src={url} alt="" className="h-28 w-28 shrink-0 rounded-xl object-cover" />
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">No combo shared yet.</p>
        )}
      </div>
    );
  }

  // ---- Editable (owner) ----
  const inputClass =
    'w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-[#f97316] focus:outline-none focus:ring-2 focus:ring-[#f97316]/20';

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <RestaurantHeader entry={entry} storeHref={storeHref} />
        <button
          type="button"
          onClick={handleRemove}
          aria-label="Remove restaurant"
          className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 space-y-3">
        <input
          value={title}
          onChange={(e) => { setTitle(e.target.value); setSaved(false); }}
          placeholder="Combo name — e.g. My go-to lunch"
          className={inputClass}
          maxLength={80}
        />
        <textarea
          value={body}
          onChange={(e) => { setBody(e.target.value); setSaved(false); }}
          placeholder="What to order and why people will love it…"
          rows={3}
          className={`${inputClass} resize-none`}
          maxLength={500}
        />

        {products.length > 0 && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Tap items in this order</p>
            <div className="flex flex-wrap gap-1.5">
              {products.slice(0, 24).map((p) => {
                const on = items.some((i) => i.name === p.name);
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => toggleItem(p)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                      on
                        ? 'border-[#f97316] bg-[#f97316] text-white'
                        : 'border-border bg-card text-foreground hover:border-[#f97316]/50'
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Images */}
        <div className="flex flex-wrap items-center gap-2">
          {images.map((url) => (
            <div key={url} className="relative h-20 w-20 overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(url)}
                aria-label="Remove image"
                className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-black/60 text-white"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="grid h-20 w-20 place-items-center rounded-xl border-2 border-dashed border-border text-muted-foreground transition hover:border-[#f97316]/50 hover:text-[#f97316] disabled:opacity-50"
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? 'Saved' : 'Save combo'}
        </button>
      </div>
    </div>
  );
}

function RestaurantHeader({ entry, storeHref }: { entry: CollectionEntry; storeHref?: string }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-muted">
        {entry.restaurant_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={entry.restaurant_image_url} alt="" className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{entry.restaurant_name}</p>
        {storeHref ? (
          <Link href={storeHref} className="inline-flex items-center gap-1 text-xs font-medium text-[#f97316] hover:underline">
            View store <ExternalLink className="h-3 w-3" />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
