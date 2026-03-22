'use client';

import { useEffect, useRef } from 'react';

export function CursorOrb() {
  const orbRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)');
    if (!mq.matches) return;

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
