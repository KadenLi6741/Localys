'use client';

/**
 * CursorOrb — a soft glowing dot that follows the mouse for a polished, premium feel.
 * Purpose: Purely decorative cursor accent. It tracks pointer movement and is disabled on
 *   touch devices (where there is no hovering cursor), so it never interferes with mobile use.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { useEffect, useRef } from 'react';

// Renders the follow-the-cursor orb. No props — it wires up its own global mouse listener.
export function CursorOrb() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Only enable on devices with a fine pointer (mouse/trackpad); skip on touchscreens.
    const mq = window.matchMedia('(pointer: fine)');
    if (!mq.matches) return;

    // Move the orb to the cursor on every mouse move; written via style for performance (no re-render).

    const handleMouseMove = (e: MouseEvent) => {
      if (orbRef.current) {
        orbRef.current.style.left = `${e.clientX}px`;
        orbRef.current.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return <div ref={orbRef} className="cursor-orb" aria-hidden="true" />;
}
