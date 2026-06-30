/**
 * Inline-SVG vote arrows for community upvote/downvote buttons.
 *
 * Used instead of an icon-library import so the arrow ALWAYS renders (no
 * dependency on a specific lucide-react export resolving under the bundler).
 * The stroke is `currentColor`, so the icon inherits the button's text color —
 * black in light mode, white in dark mode, and orange (#f97316) when active —
 * staying clearly visible in both themes. Give it a size via `className`.
 */

interface VoteArrowProps {
  className?: string;
}

export function VoteArrowUp({ className = 'h-4 w-4' }: VoteArrowProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m18 15-6-6-6 6" />
    </svg>
  );
}

export function VoteArrowDown({ className = 'h-4 w-4' }: VoteArrowProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
