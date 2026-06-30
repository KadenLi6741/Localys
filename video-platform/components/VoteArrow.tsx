/**
 * Vote arrows for community upvote/downvote buttons.
 *
 * Rendered as TEXT GLYPHS (geometric triangles), not an icon-library import and
 * not an <svg>. The vote count text in the same pill always renders, so a text
 * glyph is the most reliable way to guarantee the arrow shows too — it can't
 * fail to import, can't collapse to a zero-size <svg> box, and isn't affected by
 * any svg-specific CSS.
 *
 * Details that keep it correct:
 *  - U+25B2 / U+25BC (BLACK UP/DOWN-POINTING TRIANGLE) + U+FE0E (variation
 *    selector-15) force TEXT presentation, so they never render as an emoji.
 *  - Color comes from the parent button's text color (currentColor), so the
 *    arrow is black in light mode, white in dark mode, and orange (#f97316)
 *    when that vote is active — clearly visible in both themes.
 *  - Explicit font-size + line-height so the glyph is always a visible size.
 */

interface VoteArrowProps {
  className?: string;
}

const BASE =
  'inline-flex items-center justify-center leading-none select-none font-normal';

export function VoteArrowUp({ className = 'h-4 w-4' }: VoteArrowProps) {
  return (
    <span
      aria-hidden="true"
      className={`${BASE} ${className}`}
      style={{ fontSize: '1rem', lineHeight: 1 }}
    >
      {'▲︎'}
    </span>
  );
}

export function VoteArrowDown({ className = 'h-4 w-4' }: VoteArrowProps) {
  return (
    <span
      aria-hidden="true"
      className={`${BASE} ${className}`}
      style={{ fontSize: '1rem', lineHeight: 1 }}
    >
      {'▼︎'}
    </span>
  );
}
