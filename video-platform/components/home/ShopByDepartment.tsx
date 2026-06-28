'use client';

import { useMemo, useState } from 'react';
import { SectionHeader } from './SectionHeader';
import { Thumb } from './Thumb';
import { BusinessCard } from './BusinessCard';
import { useHomeData } from './HomeData';

/** Department label → circle icon (real /categories assets). */
const DEPT_ICON: Record<string, string> = {
  Restaurants: '/categories/restaurants.png',
  'Fast Food': '/categories/Fast-food.png',
  Bakery: '/categories/bakery.png',
  Café: '/categories/cafe.png',
  Grocery: '/categories/grocery.png',
  Convenience: '/categories/grocery.png',
  Flowers: '/categories/flower.png',
  Pets: '/categories/pet.png',
  Pharmacy: '/categories/service.png',
  'Home Services': '/categories/service.png',
  Clothing: '/categories/clothing.png',
  Toys: '/categories/toys.png',
};

/**
 * (D) Shop by department — departments are derived from the REAL business
 * categories present. Selecting one filters the real businesses shown below.
 */
export function ShopByDepartment() {
  const { businesses, loading } = useHomeData();

  const departments = useMemo(() => {
    const counts = new Map<string, number>();
    for (const b of businesses) counts.set(b.category, (counts.get(b.category) || 0) + 1);
    return [...counts.entries()].sort((a, c) => c[1] - a[1]).map(([label]) => label);
  }, [businesses]);

  const [active, setActive] = useState<string | null>(null);
  const selected = active ?? departments[0] ?? null;
  const filtered = useMemo(
    () => businesses.filter((b) => b.category === selected),
    [businesses, selected]
  );

  if (loading || departments.length === 0) return null;

  return (
    <section>
      <SectionHeader title="Shop by department" />

      <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden">
        {departments.map((label) => {
          const isActive = label === selected;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setActive(label)}
              className="group flex shrink-0 flex-col items-center gap-2"
            >
              <Thumb
                src={DEPT_ICON[label]}
                label={label}
                alt={label}
                className={`h-16 w-16 rounded-full shadow-sm transition group-hover:shadow-md sm:h-20 sm:w-20 ${
                  isActive ? 'ring-2 ring-[#f97316]' : ''
                }`}
                imgClassName="h-full w-full object-contain p-3"
              />
              <span className="text-center text-xs font-semibold text-black dark:text-white sm:text-sm">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Real businesses in the selected department */}
      <div className="mt-5 flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filtered.map((b) => <BusinessCard key={b.id} business={b} />)}
      </div>
    </section>
  );
}
