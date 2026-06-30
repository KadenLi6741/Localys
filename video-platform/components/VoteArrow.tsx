/**
 * Inline-SVG vote arrows for community upvote/downvote buttons.
 *
 * Used instead of an icon-library import so the arrow ALWAYS renders (no
 * dependency on a specific lucide-react export resolving under the bundler).
 *
 * Rendering choices that make it bulletproof:
 *  - FILLED triangle (`fill="currentColor"`), not a thin stroke — far more
 *    visible at small sizes and independent of stroke rendering.
 *  - Explicit `width`/`height` attributes so the icon can never collapse to a
 *    zero-size box even if the utility classes don't apply; `className` (e.g.
 *    `h-4 w-4`) still overrides for sizing.
 *  - `currentColor` so the arrow inherits the button's text color — black in
 *    light mode, white in dark mode, orange (#f97316) when that vote is active.
 */

interface VoteArrowProps {
  className?: string;
}

export function VoteArrowUp({ className = 'h-4 w-4' }: VoteArrowProps) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 4 L21 19 L3 19 Z" />
    </svg>
  );
}

export function VoteArrowDown({ className = 'h-4 w-4' }: VoteArrowProps) {
  return (
    <svg
      className={className}
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M3 5 L21 5 L12 20 Z" />
    </svg>
  );
}
