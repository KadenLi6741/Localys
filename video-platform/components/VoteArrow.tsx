/**
 * Vote arrows for community upvote/downvote buttons.
 *
 * Drawn as CSS BORDER TRIANGLES — the most bulletproof method possible. There
 * is no icon-library import, no <svg> path, and no font glyph involved, so the
 * arrow cannot fail to render because of a missing export, an svg sizing quirk,
 * or a font that lacks a triangle character. The triangle is produced purely
 * from the CSS box model (a zero-size box with thick coloured borders).
 *
 *  - Colour is `currentColor`, so the arrow inherits the parent button's text
 *    colour: black in light mode, white in dark mode, orange (#f97316) when that
 *    vote is active — clearly visible in both themes.
 *  - Sizes are explicit pixel borders (inline style beats any utility class), so
 *    the triangle is always a visible, fixed size.
 */

interface VoteArrowProps {
  className?: string;
}

export function VoteArrowUp({ className = '' }: VoteArrowProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderBottom: '9px solid currentColor',
      }}
    />
  );
}

export function VoteArrowDown({ className = '' }: VoteArrowProps) {
  return (
    <span
      aria-hidden="true"
      className={className}
      style={{
        display: 'inline-block',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
        borderTop: '9px solid currentColor',
      }}
    />
  );
}
