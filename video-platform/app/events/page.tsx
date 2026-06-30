'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, MapPin, X, Users, Clock, ChevronRight } from 'lucide-react';
import {
  EVENT_TYPES,
  EventType,
  LocalEvent,
  getAllEvents,
  getInterestedIds,
  toggleInterested,
} from '@/lib/events';

type DateFilter = 'Today' | 'This Week' | 'Upcoming';
const DATE_FILTERS: DateFilter[] = ['Today', 'This Week', 'Upcoming'];

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const day = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${day} · ${time}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [interested, setInterested] = useState<Set<string>>(new Set());
  const [dateFilter, setDateFilter] = useState<DateFilter>('Upcoming');
  const [typeFilter, setTypeFilter] = useState<EventType | 'All'>('All');
  const [selected, setSelected] = useState<LocalEvent | null>(null);

  // Load seeded + owner-created events and saved RSVPs (client-side for the demo).
  useEffect(() => {
    setEvents(getAllEvents());
    setInterested(new Set(getInterestedIds()));
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
      return true;
    });
  }, [events, dateFilter, typeFilter]);

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

      {/* Feed */}
      <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-6">
        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center">
            <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold text-foreground">No events match your filters</p>
            <p className="text-sm text-muted-foreground mt-1">Try a different date range or type.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                interested={interested.has(e.id)}
                interestedCount={interestedCount(e)}
                onToggleInterest={() => handleToggleInterest(e)}
                onOpen={() => setSelected(e)}
              />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <EventDetailModal
          event={selected}
          interested={interested.has(selected.id)}
          interestedCount={interestedCount(selected)}
          onToggleInterest={() => handleToggleInterest(selected)}
          onClose={() => setSelected(null)}
        />
      )}
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

/* ── Event card ── */

function EventCard({
  event,
  interested,
  interestedCount,
  onToggleInterest,
  onOpen,
}: {
  event: LocalEvent;
  interested: boolean;
  interestedCount: number;
  onToggleInterest: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      {/* Image (clickable to open detail) */}
      <button
        type="button"
        onClick={onOpen}
        className="relative block h-40 w-full overflow-hidden bg-muted text-left"
        aria-label={`Open ${event.title}`}
      >
        {event.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(ev) => { (ev.target as HTMLImageElement).style.display = 'none'; }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CalendarDays className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <TypeBadge type={event.type} />
        </div>
      </button>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold text-muted-foreground truncate">{event.businessName}</p>
        <button type="button" onClick={onOpen} className="mt-0.5 text-left">
          <h3 className="text-base font-bold text-foreground leading-snug line-clamp-2 hover:text-[#f97316] transition-colors">
            {event.title}
          </h3>
        </button>

        <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> {formatDateTime(event.startsAt)}
          </span>
        </div>
        {typeof event.distanceKm === 'number' && (
          <span className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-[#f97316]" /> {event.distanceKm.toFixed(1)} km away
          </span>
        )}

        <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{event.description}</p>

        {event.promoDetails && (
          <p className="mt-2 rounded-lg bg-[#f97316]/10 px-2.5 py-1.5 text-xs font-semibold text-[#f97316]">
            {event.promoDetails}
          </p>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onToggleInterest}
            aria-pressed={interested}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
              interested
                ? 'bg-[#f97316] text-white'
                : 'border border-[#f97316] text-[#f97316] hover:bg-[#f97316]/10'
            }`}
          >
            <Users className="h-4 w-4" />
            {interested ? 'Interested' : 'Interested?'}
          </button>
          <span className="text-xs text-muted-foreground">{interestedCount} interested</span>
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
  onToggleInterest,
  onClose,
}: {
  event: LocalEvent;
  interested: boolean;
  interestedCount: number;
  onToggleInterest: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="event-detail-title"
    >
      <div className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:max-w-lg sm:rounded-2xl">
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
