'use client';

import { useRef } from 'react';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import { SectionHeader } from './SectionHeader';

/**
 * Reusable horizontal carousel: section title + scrollable track + arrow buttons.
 * Used by every product row on Home (deals, trending, other businesses, ranked).
 */
export function CarouselRow({
  title,
  seeAllHref,
  children,
}: {
  title: string;
  seeAllHref?: string;
  children: React.ReactNode;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.8), behavior: 'smooth' });
  };

  return (
    <section className="relative">
      <SectionHeader title={title} seeAllHref={seeAllHref} />

      {/* Left arrow (appears once scrolled; kept simple — always rendered) */}
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scrollBy(-1)}
        className="absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 place-items-center rounded-full border border-gray-200 bg-white/95 p-2 text-gray-700 shadow-md transition hover:bg-white md:grid dark:border-gray-700 dark:bg-gray-900/95 dark:text-gray-200"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>

      <div
        ref={trackRef}
        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>

      {/* Right arrow */}
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scrollBy(1)}
        className="absolute right-0 top-1/2 z-10 grid -translate-y-1/2 place-items-center rounded-full border border-gray-200 bg-white/95 p-2 text-black shadow-md transition hover:bg-white dark:border-gray-700 dark:bg-gray-900/95 dark:text-white"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </section>
  );
}
