'use client';

import { useEffect, useRef, useMemo } from 'react';

const PARTICLE_COUNT = 12;

interface Particle {
  x: number;
  y: number;
  size: number;
  color: string;
  duration: number;
  delay: number;
}

function generateParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 12,
      color: i % 3 === 0 ? 'rgba(107, 175, 122, 0.10)' : 'rgba(245, 166, 35, 0.15)',
      duration: 15 + Math.random() * 10,
      delay: Math.random() * -20,
    });
  }
  return particles;
}

export function ParticleBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const particles = useMemo(() => generateParticles(), []);
  const mouseRef = useRef({ x: 50, y: 50 });

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = {
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      };
      if (containerRef.current) {
        containerRef.current.style.setProperty('--mouse-x', `${mouseRef.current.x}%`);
        containerRef.current.style.setProperty('--mouse-y', `${mouseRef.current.y}%`);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="particle-bg"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
        ['--mouse-x' as string]: '50%',
        ['--mouse-y' as string]: '50%',
      }}
    >
      {/* Ambient gradient blobs */}
      <div
        className="ambient-blob"
        style={{
          position: 'absolute',
          top: '-10%',
          right: '-10%',
          width: '50%',
          height: '50%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)',
          animation: 'ambientPulse 8s ease-in-out infinite',
          filter: 'blur(40px)',
        }}
      />
      <div
        className="ambient-blob"
        style={{
          position: 'absolute',
          bottom: '-10%',
          left: '-10%',
          width: '50%',
          height: '50%',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(107,175,122,0.05) 0%, transparent 70%)',
          animation: 'ambientPulse 10s ease-in-out 2s infinite',
          filter: 'blur(40px)',
        }}
      />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div
          key={i}
          className="particle"
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: p.color,
            animation: `particleFloat ${p.duration}s ease-in-out ${p.delay}s infinite`,
            transition: 'translate 2s ease-out',
            translate: `calc((var(--mouse-x) - 50%) * ${0.05 + i * 0.01}) calc((var(--mouse-y) - 50%) * ${0.05 + i * 0.01})`,
          }}
        />
      ))}
    </div>
  );
}
