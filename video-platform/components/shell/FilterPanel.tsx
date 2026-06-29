'use client';

import { Star } from 'lucide-react';

export interface Filters {
  maxDistanceKm: number;
  category: string; // '' = any
  minRating: number; // 0 = any
  openNow: boolean;
  maxPrice: number;
  dealsOnly: boolean;
}

export const DEFAULT_FILTERS: Filters = {
  maxDistanceKm: 10,
  category: '',
  minRating: 0,
  openNow: false,
  maxPrice: 100,
  dealsOnly: false,
};

const CATEGORIES = ['Restaurants', 'Bakery', 'Café', 'Grocery', 'Flowers', 'Services', 'Pets'];

/**
 * Reusable filter panel (black/white + orange accent). Used by the secondary-nav
 * Filters button AND the header search dropdown. Fully controlled via value/onChange.
 */
export function FilterPanel({
  value,
  onChange,
  onReset,
}: {
  value: Filters;
  onChange: (next: Filters) => void;
  onReset?: () => void;
}) {
  const set = <K extends keyof Filters>(key: K, v: Filters[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-5 text-black! dark:text-white!">
      {/* Distance slider */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="f-distance" className="text-sm font-semibold text-black! dark:text-white!">Max distance</label>
          <span className="text-sm font-bold text-[#f97316]">{value.maxDistanceKm} km</span>
        </div>
        <input
          id="f-distance"
          type="range"
          min={1}
          max={50}
          value={value.maxDistanceKm}
          onChange={(e) => set('maxDistanceKm', Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-[#f97316] dark:bg-gray-700"
        />
      </div>

      {/* Category chips */}
      <div>
        <p className="mb-1.5 text-sm font-semibold text-black! dark:text-white!">Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const active = value.category === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => set('category', active ? '' : c)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  active
                    ? 'border-[#f97316] bg-[#f97316] text-white'
                    : 'border-border text-black! dark:text-white! hover:border-[#f97316]'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Min rating */}
      <div>
        <p className="mb-1.5 text-sm font-semibold text-black! dark:text-white!">Minimum rating</p>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} stars and up`}
              onClick={() => set('minRating', value.minRating === n ? 0 : n)}
              className="p-0.5"
            >
              <Star className={`h-5 w-5 ${n <= value.minRating ? 'fill-[#f97316] text-[#f97316]' : 'text-black dark:text-gray-300'}`} />
            </button>
          ))}
          {value.minRating > 0 && (
            <button type="button" onClick={() => set('minRating', 0)} className="ml-2 text-xs font-semibold text-black! dark:text-white! underline">
              Any
            </button>
          )}
        </div>
      </div>

      {/* Max price */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="f-price" className="text-sm font-semibold text-black! dark:text-white!">Max price</label>
          <span className="text-sm font-bold text-[#f97316]">${value.maxPrice}</span>
        </div>
        <input
          id="f-price"
          type="range"
          min={5}
          max={200}
          step={5}
          value={value.maxPrice}
          onChange={(e) => set('maxPrice', Number(e.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-[#f97316] dark:bg-gray-700"
        />
      </div>

      {/* Toggles */}
      <div className="flex flex-col gap-2 pl-3">
        <label className="flex cursor-pointer items-center justify-between text-sm font-semibold text-black! dark:text-white!">
          Open now
          <input type="checkbox" checked={value.openNow} onChange={(e) => set('openNow', e.target.checked)} className="h-4 w-4 m-0 shrink-0 self-center align-middle accent-[#f97316]" />
        </label>
        <label className="flex cursor-pointer items-center justify-between text-sm font-semibold text-black! dark:text-white!">
          Deals only
          <input type="checkbox" checked={value.dealsOnly} onChange={(e) => set('dealsOnly', e.target.checked)} className="h-4 w-4 m-0 shrink-0 self-center align-middle accent-[#f97316]" />
        </label>
      </div>

      {onReset && (
        <button type="button" onClick={onReset} className="w-full rounded-full border border-border py-2 text-sm font-semibold text-black! dark:text-white! transition hover:bg-muted">
          Reset filters
        </button>
      )}
    </div>
  );
}
