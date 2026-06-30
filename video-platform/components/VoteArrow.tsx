/**
 * Reddit-style vote arrows for community upvote/downvote buttons.
 *
 * Each arrow is built from TWO pure-CSS shapes stacked in a column:
 *   1. an arrowhead — a CSS border triangle, and
 *   2. a stem — a small solid rectangle attached to the triangle's flat side,
 * so the result is a proper arrow (triangle + rectangle), like Reddit's votes.
 *
 * This uses no icon-library import, no <svg> path, and no font glyph, so the
 * arrow can never fail to render. Both shapes use `currentColor`, so the arrow
 * inherits the parent button's text colour: black in light mode, white in dark
 * mode, orange (#f97316) when that vote is active — clearly visible in both.
 */

interface VoteArrowProps {
  className?: string;
}

const wrap: React.CSSProperties = {
  display: 'inline-flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 0,
};

const head = (dir: 'up' | 'down'): React.CSSProperties => ({
  width: 0,
  height: 0,
  borderLeft: '6px solid transparent',
  borderRight: '6px solid transparent',
  ...(dir === 'up'
    ? { borderBottom: '7px solid currentColor' }
    : { borderTop: '7px solid currentColor' }),
});

const stem: React.CSSProperties = {
  width: '5px',
  height: '5px',
  backgroundColor: 'currentColor',
};

export function VoteArrowUp({ className = '' }: VoteArrowProps) {
  return (
    <span aria-hidden="true" className={className} style={wrap}>
      <span style={head('up')} />
      <span style={stem} />
    </span>
  );
}

export function VoteArrowDown({ className = '' }: VoteArrowProps) {
  return (
    <span aria-hidden="true" className={className} style={wrap}>
      <span style={stem} />
      <span style={head('down')} />
    </span>
  );
}
