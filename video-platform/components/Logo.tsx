/**
 * Logo — the shared Localy brand mark (map-pin icon + wordmark).
 * Purpose: Provides one reusable, consistently-styled logo so every screen (header, auth pages,
 *   nav) shows the same brand. Centralising it means a single edit changes the logo everywhere.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import Link from 'next/link';
import { MapPin } from 'lucide-react';

/**
 * The single Localys logo used across the whole app (the one from the login page).
 * Colors via `currentColor` — set the color with `className` (works in light & dark).
 * Pass `href={null}` to render a non-link wordmark (e.g. as a page header).
 *
 * Why two render paths: when used as a page heading we must NOT nest a link, so href=null
 * returns a plain <span>; otherwise it wraps in a Next <Link> back to the chosen route.
 */
export function Logo({
  href = '/',
  className = '',
  iconClassName = 'h-6 w-6',
  textClassName = 'text-xl',
  showText = true,
}: {
  href?: string | null;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}) {
  const inner = (
    <>
      <MapPin className={iconClassName} strokeWidth={1.5} aria-hidden />
      {showText && <span className={`font-semibold tracking-wide ${textClassName}`}>Localy</span>}
    </>
  );
  const cls = `inline-flex items-center gap-2 ${className}`;
  if (href === null) {
    return <span className={cls} aria-label="Localy">{inner}</span>;
  }
  return (
    <Link href={href} className={cls} aria-label="Localy home">
      {inner}
    </Link>
  );
}
