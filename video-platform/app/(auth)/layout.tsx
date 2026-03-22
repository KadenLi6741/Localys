'use client';

import dynamic from 'next/dynamic';

const ParticleBackground = dynamic(
  () => import('@/components/ParticleBackground').then(mod => mod.ParticleBackground),
  { ssr: false }
);

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-[#1A1A18]">
      <ParticleBackground />
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
