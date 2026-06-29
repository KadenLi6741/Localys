/**
 * AuthSplitLayout — the two-pane layout for auth screens (login/signup): form on one side, a
 *   scrolling photo collage on the other.
 * Purpose: Gives the auth pages a polished, branded split-screen look while keeping the actual form
 *   markup in the page components. The photo columns are decorative (aria-hidden).
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */

import { Logo } from '@/components/Logo';

// Two vertically-scrolling columns of local-business / community photos.
const colA = [
  '/landing/hero-food.jpeg',
  '/landing/creator-dining.jpg',
  '/landing/biz-advanced-printing.webp',
];
const colB = [
  '/landing/hero-flowers.jpg',
  '/landing/biz-acuvega.jpg',
  '/landing/hero-restaurant.png',
];

function Column({ images, className }: { images: string[]; className: string }) {
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {[...images, ...images].map((src, i) => (
        <img
          key={i}
          src={src}
          alt=""
          aria-hidden
          loading="eager"
          className="aspect-[3/4] w-full rounded-2xl object-cover"
        />
      ))}
    </div>
  );
}

export default function AuthSplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* LEFT — animated collage */}
      <div className="relative hidden w-1/2 overflow-hidden lg:block">
        <div className="absolute inset-0 grid grid-cols-2 gap-4 p-4">
          <Column images={colA} className="animate-marquee-y" />
          <Column images={colB} className="animate-marquee-y-rev" />
        </div>

        {/* legibility overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/50" />

        {/* brand wordmark */}
        <Logo href="/" className="absolute left-8 top-8 z-10 text-white" />
      </div>

      {/* RIGHT — form */}
      <div className="flex w-full items-center justify-center overflow-y-auto bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
