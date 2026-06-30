'use client';

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * ReservationForm — booking UI styled after the "online reservation" reference:
 * a month calendar (date), a circular guests stepper, time-slot pills, and a
 * comments box. Palette: black / white / #f97316 only; light + dark friendly.
 *
 * Controlled via `value`/`onChange`. The parent owns validation. Date + time are
 * the required fields; party size defaults to 2 so a sensible value is always set.
 */

export interface ReservationValue {
  /** Selected calendar day (date only; combined with `time` at submit). */
  date: Date | null;
  /** Party size (>= 1). */
  party: number;
  /** Selected time slot, "HH:MM" 24h, or null. */
  time: string | null;
  /** Free-text special requests. */
  comments: string;
}

interface ReservationFormProps {
  value: ReservationValue;
  onChange: (next: ReservationValue) => void;
}

// MOCK availability — wire to a real availability query later.
const MIN_PARTY = 1;
const MAX_PARTY = 20;
/** Bookable time slots (mock): 11:00–21:00 every 30 minutes. */
const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 11; h <= 21; h++) {
    out.push(`${String(h).padStart(2, '0')}:00`);
    if (h !== 21) out.push(`${String(h).padStart(2, '0')}:30`);
  }
  return out;
})();

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function sameDay(a: Date | null, b: Date | null): boolean {
  return !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function ReservationForm({ value, onChange }: ReservationFormProps) {
  const today = startOfDay(new Date());
  const initialMonth = value.date ?? today;
  const [viewYear, setViewYear] = useState(initialMonth.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialMonth.getMonth());
  // First guest shown in the 6-wide window (reference shows a sliding range).
  const [guestBase, setGuestBase] = useState(() => Math.max(MIN_PARTY, Math.min(value.party - 2, MAX_PARTY - 5)));
  // First time-slot index shown in the visible window.
  const [timeBase, setTimeBase] = useState(() => {
    const i = value.time ? TIME_SLOTS.indexOf(value.time) : 0;
    return Math.max(0, Math.min(i, TIME_SLOTS.length - 3));
  });

  const set = (patch: Partial<ReservationValue>) => onChange({ ...value, ...patch });

  // Calendar grid: leading blanks + each day of the month.
  const cells = useMemo(() => {
    const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) arr.push(null);
    for (let d = 1; d <= daysInMonth; d++) arr.push(new Date(viewYear, viewMonth, d));
    return arr;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    const m = viewMonth - 1;
    if (m < 0) { setViewMonth(11); setViewYear((y) => y - 1); } else setViewMonth(m);
  };
  const nextMonth = () => {
    const m = viewMonth + 1;
    if (m > 11) { setViewMonth(0); setViewYear((y) => y + 1); } else setViewMonth(m);
  };
  // Don't allow paging earlier than the current month.
  const atCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth();

  const guestWindow = Array.from({ length: 6 }, (_, i) => guestBase + i).filter((n) => n <= MAX_PARTY);
  const timeWindow = TIME_SLOTS.slice(timeBase, timeBase + 3);

  const arrowBtn =
    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-600 transition-colors hover:border-[#f97316] hover:text-[#f97316] disabled:opacity-30 disabled:hover:border-gray-300 disabled:hover:text-gray-600 dark:border-white/20 dark:text-gray-300';

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-white/10">
      {/* Header bar */}
      <div className="bg-black px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-wide text-white">Online reservation</p>
      </div>

      <div className="p-4">
        {/* Calendar */}
        <div className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={prevMonth} disabled={atCurrentMonth} className={arrowBtn} aria-label="Previous month">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-base font-bold text-gray-900 dark:text-white">{MONTHS[viewMonth]} {viewYear}</p>
            <button type="button" onClick={nextMonth} className={arrowBtn} aria-label="Next month">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{w}</div>
            ))}
            {cells.map((day, i) => {
              if (!day) return <div key={`b-${i}`} />;
              const isPast = day < today;
              const isSelected = sameDay(day, value.date);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  disabled={isPast}
                  onClick={() => set({ date: day })}
                  className={[
                    'mx-auto flex h-9 w-9 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-[#f97316] text-white'
                      : isPast
                        ? 'cursor-not-allowed text-gray-300 dark:text-gray-600'
                        : 'text-gray-800 hover:bg-[#f97316]/10 dark:text-gray-200',
                  ].join(' ')}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* Guests */}
        <div className="mb-5 border-t border-gray-100 pt-4 dark:border-white/10">
          <p className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Guests</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setGuestBase((b) => Math.max(MIN_PARTY, b - 1))}
              disabled={guestBase <= MIN_PARTY}
              className={arrowBtn}
              aria-label="Fewer guest options"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-1 items-center justify-between gap-1.5">
              {guestWindow.map((n) => {
                const active = value.party === n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => set({ party: n })}
                    aria-pressed={active}
                    className={[
                      'flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition-colors',
                      active
                        ? 'border-[#f97316] bg-[#f97316] text-white'
                        : 'border-gray-300 text-gray-700 hover:border-[#f97316] dark:border-white/20 dark:text-gray-200',
                    ].join(' ')}
                  >
                    {n}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setGuestBase((b) => Math.min(MAX_PARTY - 5, b + 1))}
              disabled={guestBase >= MAX_PARTY - 5}
              className={arrowBtn}
              aria-label="More guest options"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">Party of {value.party}</p>
        </div>

        {/* Time */}
        <div className="mb-5 border-t border-gray-100 pt-4 dark:border-white/10">
          <p className="mb-2 text-sm font-bold text-gray-900 dark:text-white">Time</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTimeBase((b) => Math.max(0, b - 1))}
              disabled={timeBase <= 0}
              className={arrowBtn}
              aria-label="Earlier times"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex flex-1 items-center gap-2">
              {timeWindow.map((t) => {
                const active = value.time === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => set({ time: t })}
                    aria-pressed={active}
                    className={[
                      'flex-1 rounded-lg py-2.5 text-center text-sm font-bold tabular-nums transition-colors',
                      active
                        ? 'bg-[#f97316] text-white'
                        : 'border border-gray-300 text-gray-700 hover:border-[#f97316] hover:text-[#f97316] dark:border-white/20 dark:text-gray-200',
                    ].join(' ')}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setTimeBase((b) => Math.min(TIME_SLOTS.length - 3, b + 1))}
              disabled={timeBase >= TIME_SLOTS.length - 3}
              className={arrowBtn}
              aria-label="Later times"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Comments */}
        <div className="border-t border-gray-100 pt-4 dark:border-white/10">
          <label htmlFor="res-comments" className="mb-2 block text-sm font-bold text-gray-900 dark:text-white">
            Special comments
          </label>
          <textarea
            id="res-comments"
            value={value.comments}
            onChange={(e) => set({ comments: e.target.value })}
            maxLength={300}
            rows={3}
            placeholder="Allergies, seating preference, special occasion…"
            className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-[#f97316] focus:outline-none focus:ring-1 focus:ring-[#f97316]/30 dark:border-white/20 dark:bg-transparent dark:text-white"
          />
          <p className="mt-1 text-right text-[11px] text-gray-400">{value.comments.length}/300</p>
        </div>
      </div>
    </div>
  );
}

/** Combine a selected calendar day + "HH:MM" into a single ISO datetime string. */
export function combineReservationDateTime(date: Date | null, time: string | null): string | null {
  if (!date || !time) return null;
  const [h, m] = time.split(':').map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0);
  return d.toISOString();
}
