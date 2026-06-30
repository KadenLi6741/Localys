'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  MapPin,
  X,
  Users,
  ChevronRight,
  ChevronLeft,
  MessageCircle,
  Send,
} from 'lucide-react';
import {
  EVENT_TYPES,
  EventType,
  LocalEvent,
  EventComment,
  getAllEvents,
  getInterestedIds,
  toggleInterested,
  getCommentsForEvent,
  addCommentToEvent,
} from '@/lib/events';
import { getCurrentUser } from '@/lib/supabase/auth';

type DateFilter = 'All' | 'Today' | 'This Week' | 'Upcoming';
const DATE_FILTERS: DateFilter[] = ['All', 'Today', 'This Week', 'Upcoming'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Stable per-day key for grouping events. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/** Short relative label for comment timestamps. */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function EventsPage() {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>('All');
  const [typeFilter, setTypeFilter] = useState<EventType | 'All'>('All');
  const [selected, setSelected] = useState<LocalEvent | null>(null);
  const [dayList, setDayList] = useState<Date | null>(null);
  // First day of the month currently shown on the calendar.
  const [viewMonth, setViewMonth] = useState<Date>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [viewerName, setViewerName] = useState<string | null>(null);

  // Load seeded + owner-created events and saved RSVPs (client-side for the demo).
  useEffect(() => {
    setEvents(getAllEvents());
    setInterested(new Set(getInterestedIds()));
    getCurrentUser()
      .then(({ user }) => {
        if (!user) return;
        const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
        const name =
          (meta.name as string) ||
          (meta.username as string) ||
          (user.email ? user.email.split('@')[0] : null);
        setViewerName(name ?? null);
      })
      .catch(() => setViewerName(null));
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    const weekAhead = new Date();
    weekAhead.setDate(weekAhead.getDate() + 7);

    return events.filter((e) => {
      const start = new Date(e.startsAt);
      if (typeFilter !== 'All' && e.type !== typeFilter) return false;
      if (dateFilter === 'Today' && !isSameDay(start, now)) return false;
      if (dateFilter === 'This Week' && (start < new Date(now.toDateString()) || start > weekAhead)) return false;
      if (dateFilter === 'Upcoming' && start < new Date(now.toDateString())) return false;
      return true;
    });
  }, [events, dateFilter, typeFilter]);

  // Group filtered events by calendar day for fast lookup.
  const eventsByDay = useMemo(() => {
    const map = new Map<string, LocalEvent[]>();
    for (const e of filtered) {
      const key = dayKey(new Date(e.startsAt));
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    for (const list of map.values()) {
      list.sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    }
    return map;
  }, [filtered]);

  // Build the grid of day-cells (full weeks) for the viewed month.
  const cells = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const total = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const start = new Date(year, month, 1 - firstWeekday);
    return Array.from({ length: total }, (_, i) => {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      return { date, inMonth: date.getMonth() === month };
    });
  }, [viewMonth]);

  // Filtered events for THIS month, grouped + sorted, for the mobile agenda.
  const agenda = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const inMonth = filtered
      .filter((e) => {
        const d = new Date(e.startsAt);
        return d.getFullYear() === year && d.getMonth() === month;
      })
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    const groups: { date: Date; items: LocalEvent[] }[] = [];
    for (const e of inMonth) {
      const d = new Date(e.startsAt);
      const last = groups[groups.length - 1];
      if (last && isSameDay(last.date, d)) last.items.push(e);
      else groups.push({ date: d, items: [e] });
    }
    return groups;
  }, [filtered, viewMonth]);

  const handleToggleInterest = (e: LocalEvent) => {
    const active = toggleInterested(e.id);
    setInterested((prev) => {
      const next = new Set(prev);
      if (active) next.add(e.id);
      else next.delete(e.id);
      return next;
    });
  };

  const interestedCount = (e: LocalEvent) =>
    e.interestedCount + (interested.has(e.id) ? 1 : 0);

  const today = new Date();
  const monthLabel = viewMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goPrev = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const goNext = () => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));
  const goToday = () => setViewMonth(new Date(today.getFullYear(), today.getMonth(), 1));

  const openEvent = (e: LocalEvent) => {
    setDayList(null);
    setSelected(e);
  };

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f97316]/10">
              <CalendarDays className="h-5 w-5 text-[#f97316]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Local Events</h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-[#f97316]" /> Happening near you · within 5 km
              </p>
            </div>
          </div>

          {/* Date filters */}
          <div className="mt-5 flex flex-wrap gap-2">
            {DATE_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  dateFilter === f
                    ? 'bg-[#f97316] text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Type filters */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setTypeFilter('All')}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                typeFilter === 'All'
                  ? 'bg-[#f97316] text-white'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              All types
            </button>
            {EVENT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setTypeFilter(t)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  typeFilter === t
                    ? 'bg-[#f97316] text-white'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
        {/* Month navigation */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground">{monthLabel}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={goToday}
              className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-[#f97316] hover:text-[#f97316]"
            >
              Today
            </button>
            <button
              onClick={goPrev}
              aria-label="Previous month"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-[#f97316] hover:text-[#f97316]"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={goNext}
              aria-label="Next month"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:border-[#f97316] hover:text-[#f97316]"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Grid view (sm and up) */}
        <div className="hidden overflow-hidden rounded-2xl border border-border bg-card sm:block">
          {/* Weekday header */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/40">
            {WEEKDAYS.map((d) => (
              <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {d}
              </div>
            ))}
          </div>
          {/* Day cells */}
          <div className="grid grid-cols-7">
            {cells.map(({ date, inMonth }, i) => {
              const dayEvents = eventsByDay.get(dayKey(date)) ?? [];
              const isToday = isSameDay(date, today);
              const shown = dayEvents.slice(0, 2);
              const extra = dayEvents.length - shown.length;
              return (
                <div
                  key={i}
                  className={`flex min-h-[96px] flex-col gap-1 border-b border-r border-border p-1.5 last:border-r-0 [&:nth-child(7n)]:border-r-0 ${
                    inMonth ? 'bg-card' : 'bg-muted/30'
                  }`}
                >
                  <div className="flex justify-end">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isToday
                          ? 'bg-[#f97316] text-white'
                          : inMonth
                          ? 'text-foreground'
                          : 'text-muted-foreground'
                      }`}
                    >
                      {date.getDate()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    {shown.map((e) => (
                      <button
                        key={e.id}
                        type="button"
                        onClick={() => openEvent(e)}
                        title={`${e.title} · ${formatTime(e.startsAt)}`}
                        className="group flex flex-col rounded-md border-l-2 border-[#f97316] bg-[#f97316]/10 px-1.5 py-1 text-left transition-colors hover:bg-[#f97316]/20"
                      >
                        <span className="truncate text-[11px] font-semibold leading-tight text-foreground group-hover:text-[#f97316]">
                          {e.title}
                        </span>
                        <span className="truncate text-[10px] leading-tight text-[#f97316]">{e.type}</span>
                      </button>
                    ))}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={() => setDayList(date)}
                        className="rounded-md px-1.5 py-0.5 text-left text-[10px] font-semibold text-[#f97316] hover:underline"
                      >
                        +{extra} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Agenda view (mobile) */}
        <div className="sm:hidden">
          {agenda.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-4">
              {agenda.map(({ date, items }) => {
                const isToday = isSameDay(date, today);
                return (
                  <div key={dayKey(date)}>
                    <div className="mb-1.5 flex items-center gap-2">
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                          isToday ? 'bg-[#f97316] text-white' : 'bg-muted text-foreground'
                        }`}
                      >
                        {date.getDate()}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {date.toLocaleDateString('en-US', { weekday: 'long' })}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {items.map((e) => (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => openEvent(e)}
                          className="flex w-full items-center gap-3 rounded-xl border-l-2 border-[#f97316] bg-card px-3 py-2.5 text-left shadow-sm transition-colors hover:bg-[#f97316]/5"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              {formatTime(e.startsAt)} · {e.businessName}
                            </p>
                          </div>
                          <span className="shrink-0 rounded-full bg-[#f97316]/10 px-2 py-0.5 text-[10px] font-semibold text-[#f97316]">
                            {e.type}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {filtered.length === 0 && (
          <div className="mt-4 hidden sm:block">
            <EmptyState />
          </div>
        )}
      </div>

      {/* Day list popover (when a day has more events than fit) */}
      {dayList && (
        <DayListModal
          date={dayList}
          events={eventsByDay.get(dayKey(dayList)) ?? []}
          onOpenEvent={openEvent}
          onClose={() => setDayList(null)}
        />
      )}

      {selected && (
        <EventDetailModal
          event={selected}
          interested={interested.has(selected.id)}
          interestedCount={interestedCount(selected)}
          viewerName={viewerName}
          onToggleInterest={() => handleToggleInterest(selected)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ── Empty state ── */

function EmptyState() {
  return (
    <div className="rounded-2xl border border-border bg-card p-12 text-center">
      <CalendarDays className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
      <p className="font-semibold text-foreground">No events match your filters</p>
      <p className="mt-1 text-sm text-muted-foreground">Try a different date range, type, or month.</p>
    </div>
  );
}

/* ── Type badge ── */

function TypeBadge({ type }: { type: EventType }) {
  return (
    <span className="inline-flex items-center rounded-full bg-[#f97316]/10 px-2.5 py-1 text-[11px] font-semibold text-[#f97316]">
      {type}
    </span>
  );
}

/* ── Day list modal (events on a single day) ── */

function DayListModal({
  date,
  events,
  onOpenEvent,
  onClose,
}: {
  date: Date;
  events: LocalEvent[];
  onOpenEvent: (e: LocalEvent) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full rounded-t-2xl bg-card p-5 shadow-2xl sm:max-w-md sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">
            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="space-y-2">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              onClick={() => onOpenEvent(e)}
              className="flex w-full items-center gap-3 rounded-xl border-l-2 border-[#f97316] bg-background px-3 py-2.5 text-left transition-colors hover:bg-[#f97316]/5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{e.title}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {formatTime(e.startsAt)} · {e.businessName}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-[#f97316]/10 px-2 py-0.5 text-[10px] font-semibold text-[#f97316]">
                {e.type}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Detail modal ── */

function EventDetailModal({
  event,
  interested,
  interestedCount,
  viewerName,
  onToggleInterest,
  onClose,
}: {
  event: LocalEvent;
  interested: boolean;
  interestedCount: number;
  viewerName: string | null;
  onToggleInterest: () => void;
  onClose: () => void;
}) {
  const [comments, setComments] = useState<EventComment[]>([]);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    setComments(getCommentsForEvent(event.id));
  }, [event.id]);

  const handlePost = () => {
    const message = draft.trim();
    if (!message || !viewerName) return;
    const added = addCommentToEvent(event.id, viewerName, message);
    setComments((prev) => [...prev, added]); // optimistic, newest at the bottom
    setDraft('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div className="relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl">
        {/* Image */}
        <div className="relative h-44 w-full shrink-0 bg-muted">
          {event.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.imageUrl}
              alt={event.title}
              className="h-full w-full object-cover"
              onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white transition hover:bg-black/60"
          >
            <X className="h-5 w-5" />
          </button>
          <div className="absolute left-3 top-3">
            <TypeBadge type={event.type} />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-sm font-semibold text-[#f97316]">{event.businessName}</p>
          <h2 id="event-detail-title" className="mt-0.5 text-xl font-bold text-foreground">{event.title}</h2>

          <div className="mt-3 flex flex-col gap-1.5 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-[#f97316]" /> {formatDateTime(event.startsAt)}
            </span>
            {typeof event.distanceKm === 'number' && (
              <span className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#f97316]" /> {event.distanceKm.toFixed(1)} km away · within 5 km
              </span>
            )}
          </div>

          {event.promoDetails && (
            <p className="mt-4 rounded-xl bg-[#f97316]/10 px-3 py-2 text-sm font-semibold text-[#f97316]">
              {event.promoDetails}
            </p>
          )}

          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{event.description}</p>

          {event.businessSlug && (
            <Link
              href={`/profile/${event.businessSlug}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[#f97316] hover:underline"
            >
              View {event.businessName} <ChevronRight className="h-4 w-4" />
            </Link>
          )}

          {/* Comments */}
          <div className="mt-6 border-t border-border pt-4">
            <p className="mb-3 inline-flex items-center gap-2 text-sm font-bold text-foreground">
              <MessageCircle className="h-4 w-4 text-[#f97316]" />
              Comments
              <span className="text-xs font-medium text-muted-foreground">({comments.length})</span>
            </p>

            <div className="space-y-3">
              {comments.map((c) => (
                <div key={c.id} className="flex gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f97316]/10 text-xs font-bold text-[#f97316]">
                    {c.author.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">{c.author}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(c.createdAt)}</span>
                    </div>
                    <p className="text-sm leading-snug text-muted-foreground">{c.message}</p>
                  </div>
                </div>
              ))}
              {comments.length === 0 && (
                <p className="text-sm text-muted-foreground">Be the first to comment.</p>
              )}
            </div>

            {/* Add comment */}
            {viewerName ? (
              <div className="mt-4 flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); }
                  }}
                  rows={1}
                  placeholder="Add a comment…"
                  className="min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]/30"
                />
                <button
                  type="button"
                  onClick={handlePost}
                  disabled={!draft.trim()}
                  aria-label="Post comment"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f97316] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <p className="mt-4 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-muted-foreground">
                <Link href="/login" className="font-semibold text-[#f97316] hover:underline">Log in</Link> to join the conversation.
              </p>
            )}
          </div>
        </div>

        {/* Sticky action footer */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-t border-border p-4">
          <span className="text-sm text-muted-foreground">{interestedCount} interested</span>
          <button
            type="button"
            onClick={onToggleInterest}
            aria-pressed={interested}
            className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2 text-sm font-semibold transition-colors ${
              interested
                ? 'bg-[#f97316] text-white'
                : 'border border-[#f97316] text-[#f97316] hover:bg-[#f97316]/10'
            }`}
          >
            <Users className="h-4 w-4" />
            {interested ? "I'm Interested" : 'Interested?'}
          </button>
        </div>
      </div>
    </div>
  );
}
