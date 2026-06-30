'use client';

/**
 * MyEventsPanel — business-owner event manager (dashboard).
 *
 * Create / edit / delete events that surface on the customer Events page for
 * this business. Persists client-side (optimistic + localStorage) for the demo.
 * // MOCK events data — wire to Supabase later (see lib/events.ts).
 */

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Plus, Pencil, Trash2, X } from 'lucide-react';
import {
  EVENT_TYPES,
  EventType,
  LocalEvent,
  getEventsForBusiness,
  addEvent,
  updateEvent,
  deleteEvent,
  newEventId,
} from '@/lib/events';

interface MyEventsPanelProps {
  businessId?: string;
  businessName?: string;
  businessImage?: string | null;
}

interface FormState {
  title: string;
  type: EventType;
  startsAt: string; // datetime-local value
  description: string;
  imageUrl: string;
  promoDetails: string;
}

/** Slug derived from the business name so events can link back to the profile. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Default the start to tomorrow at 6pm, formatted for <input type="datetime-local">. */
function defaultStart(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(18, 0, 0, 0);
  // Strip seconds/timezone for the local input value (YYYY-MM-DDTHH:mm).
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const emptyForm = (): FormState => ({
  title: '',
  type: 'Promotion',
  startsAt: defaultStart(),
  description: '',
  imageUrl: '',
  promoDetails: '',
});

export function MyEventsPanel({ businessId, businessName, businessImage }: MyEventsPanelProps) {
  // Gracefully handle demo/local business ids — never crash.
  const bizId = businessId || 'demo-business';
  const bizName = businessName || 'Your Business';

  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEvents(getEventsForBusiness(bizId));
  }, [bizId]);

  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
    [events],
  );

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setError(null);
    setShowForm(true);
  };

  const openEdit = (e: LocalEvent) => {
    setEditingId(e.id);
    setForm({
      title: e.title,
      type: e.type,
      startsAt: isoToLocalInput(e.startsAt),
      description: e.description,
      imageUrl: e.imageUrl || '',
      promoDetails: e.promoDetails || '',
    });
    setError(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setError(null);
  };

  const handleSave = () => {
    const title = form.title.trim();
    if (!title) { setError('Please add an event title.'); return; }
    if (!form.startsAt) { setError('Please choose a date and time.'); return; }
    if (!form.description.trim()) { setError('Please add a short description.'); return; }

    const startsAt = new Date(form.startsAt).toISOString();
    const base = {
      businessId: bizId,
      businessName: bizName,
      businessSlug: toSlug(bizName),
      title,
      type: form.type,
      startsAt,
      description: form.description.trim(),
      imageUrl: form.imageUrl.trim() || businessImage || undefined,
      promoDetails: form.promoDetails.trim() || undefined,
    };

    if (editingId) {
      const next = updateEvent(editingId, base);
      setEvents(next.filter((e) => e.businessId === bizId));
    } else {
      const next = addEvent({
        ...base,
        id: newEventId(),
        interestedCount: 0,
        distanceKm: undefined,
        createdByUser: true,
      });
      setEvents(next.filter((e) => e.businessId === bizId));
    }
    closeForm();
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Delete this event? This cannot be undone.')) return;
    const next = deleteEvent(id);
    setEvents(next.filter((e) => e.businessId === bizId));
  };

  const inputClass =
    'w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]/30';

  return (
    <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f97316]/10">
            <CalendarDays className="h-4 w-4 text-[#f97316]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">My Events</p>
            <p className="text-[11px] text-muted-foreground">Shown to customers on the Events page</p>
          </div>
        </div>
        {!showForm && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#f97316] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> New Event
          </button>
        )}
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <div className="mb-5 rounded-2xl border border-border bg-background p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">{editingId ? 'Edit event' : 'Create event'}</p>
            <button onClick={closeForm} aria-label="Cancel" className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Title</label>
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Summer Tasting Night"
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as EventType })}
                  className={inputClass}
                >
                  {EVENT_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Date &amp; time</label>
                <input
                  type="datetime-local"
                  value={form.startsAt}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's happening, and why should customers come?"
                rows={3}
                className={`${inputClass} resize-none`}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Image URL (optional)</label>
              <input
                value={form.imageUrl}
                onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                placeholder="https://… or /stores/your-store/banner.jpg"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Promo details (optional)</label>
              <input
                value={form.promoDetails}
                onChange={(e) => setForm({ ...form, promoDetails: e.target.value })}
                placeholder="e.g. 20% off all platters"
                className={inputClass}
              />
            </div>

            {error && <p role="alert" className="text-xs font-medium text-red-500">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                onClick={closeForm}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded-xl bg-[#f97316] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                {editingId ? 'Save changes' : 'Create event'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event list */}
      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center">
          <CalendarDays className="mx-auto mb-2 h-7 w-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No events yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Create your first event to reach nearby customers.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((e) => (
            <div key={e.id} className="flex items-center gap-3 rounded-xl border border-border bg-background p-3">
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {e.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={e.imageUrl}
                    alt={e.title}
                    className="h-full w-full object-cover"
                    onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                  <span className="shrink-0 rounded-full bg-[#f97316]/10 px-2 py-0.5 text-[10px] font-semibold text-[#f97316]">{e.type}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {new Date(e.startsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ·{' '}
                  {new Date(e.startsAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => openEdit(e)}
                  aria-label="Edit event"
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(e.id)}
                  aria-label="Delete event"
                  className="rounded-lg p-2 text-red-500 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
