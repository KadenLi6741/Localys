'use client';

/**
 * ShopByDepartment — the circular category shortcuts row on the home page.
 * Purpose: Lets users browse by department (Restaurants, Grocery, Beauty, …). Each circle links to
 *   that category page; an "Others" circle uses a drawn dot-grid icon. Department list and styling
 *   are defined statically here.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import Link from 'next/link';
import { SectionHeader } from './SectionHeader';

type Dept =
  | { name: string; src: string; href: string; pos?: string; icon?: never }
  | { name: string; icon: true; href: string; src?: never; pos?: never };

// Departments that are PNGs with transparent backgrounds — circle uses bg-white.
const WHITE_BG = new Set(['Beauty', 'Bakery', 'Flowers', 'Home Services', 'Pets', 'Restaurants', 'Toys']);

const DEPARTMENTS: Dept[] = [
  { name: 'Restaurants',   src: '/Shop%20by%20department/Restaurants1.png',     href: '/category/restaurants' },
  { name: 'Grocery',       src: '/Shop%20by%20department/Grocery.jpg',          href: '/category/grocery' },
  { name: 'Beauty',        src: '/Shop%20by%20department/beauty1.png',          href: '/category/beauty' },
  { name: 'Personal Care', src: '/Shop%20by%20department/Personal%20care.jpg',  href: '/category/personal-care' },
  { name: 'Health',        src: '/Shop%20by%20department/Health.jpg',           href: '/category/health' },
  { name: 'Bakery',        src: '/Shop%20by%20department/bakery1.png',          href: '/category/restaurants' },
  { name: 'Flowers',       src: '/Shop%20by%20department/Flowers1.png',         href: '/category/flowers' },
  { name: 'Pets',          src: '/Shop%20by%20department/Pets.png',             href: '/category/pets' },
  { name: 'Home Services', src: '/Shop%20by%20department/Services1.png',        href: '/category/home-services', pos: 'right center' },
  { name: 'Toys',          src: '/Shop%20by%20department/Toys1.png',            href: '/category/flowers' },
  { name: 'Others',        icon: true,                                           href: '/category/others' },
];

/** 3×3 dot-grid "more" icon for the Others department circle. */
function OthersIcon() {
  return (
    <svg
      viewBox="0 0 72 72"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
      aria-hidden
    >
      <rect width="72" height="72" fill="#111111" />
      {[18, 36, 54].flatMap((cx) =>
        [18, 36, 54].map((cy) => (
          <circle
            key={`${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="6"
            fill={cx === 36 && cy === 36 ? '#f97316' : 'white'}
          />
        ))
      )}
    </svg>
  );
}

export function ShopByDepartment() {
  return (
    <section>
      <SectionHeader title="Shop by department" seeAllHref="/feed" />
      <div className="flex gap-5 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-8 [&::-webkit-scrollbar]:hidden">
        {DEPARTMENTS.map((dept) => {
          const bg = dept.icon ? 'bg-[#111111]' : WHITE_BG.has(dept.name) ? 'bg-white' : 'bg-gray-100';
          return (
            <Link
              key={dept.name}
              href={dept.href}
              className="group flex shrink-0 flex-col items-center gap-2"
            >
              <div
                className={`h-[72px] w-[72px] overflow-hidden rounded-full ring-2 ring-transparent transition-all duration-200 group-hover:ring-[#f97316] sm:h-[88px] sm:w-[88px] ${bg}`}
              >
                {dept.icon ? (
                  <OthersIcon />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={dept.src}
                    alt={dept.name}
                    className="h-full w-full object-cover"
                    style={dept.pos ? { objectPosition: dept.pos } : undefined}
                  />
                )}
              </div>
              <span className="w-20 text-center text-[11px] font-semibold leading-tight text-black dark:text-white sm:w-24 sm:text-xs">
                {dept.name}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
