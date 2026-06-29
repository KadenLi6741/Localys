/**
 * SectionHeader — titled heading for a home-page section with an optional "See all" link.
 * Purpose: Standardises the heading row above each carousel/row on the home screen so spacing and
 *   the See-all affordance are consistent across sections.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import Link from 'next/link';

/** Reusable titled section header (title + optional "see all" link). */
export function SectionHeader({ title, seeAllHref }: { title: string; seeAllHref?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between">
      <h2 className="text-xl font-bold text-black dark:text-white sm:text-2xl">{title}</h2>
      {seeAllHref ? (
        <Link href={seeAllHref} className="text-sm font-semibold text-[#f97316] hover:underline">
          See all
        </Link>
      ) : null}
    </div>
  );
}
