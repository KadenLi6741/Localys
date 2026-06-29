'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Play } from 'lucide-react';
import { CarouselRow } from './CarouselRow';
import { FEATURED_VIDEOS } from '@/lib/demoVideos';

/**
 * "Featured in Videos" — businesses with a linked video. Each card auto-plays a
 * muted preview on hover and opens the Discover feed to that clip on click.
 * Built-in (public/videos), so it always renders. Palette: black / #f97316 / white.
 */
export function FeaturedInVideos() {
  const router = useRouter();
  const refs = useRef<Record<string, HTMLVideoElement | null>>({});

  if (FEATURED_VIDEOS.length === 0) return null;

  const play = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    el.currentTime = 0;
    void el.play().catch(() => {});
  };
  const stop = (id: string) => {
    const el = refs.current[id];
    if (!el) return;
    el.pause();
    el.currentTime = 0;
  };

  return (
    <CarouselRow title="Featured in Videos">
      {FEATURED_VIDEOS.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => router.push(`/feed?videoId=${encodeURIComponent(v.id)}`)}
          onMouseEnter={() => play(v.id)}
          onMouseLeave={() => stop(v.id)}
          onFocus={() => play(v.id)}
          onBlur={() => stop(v.id)}
          className="group/vid relative block aspect-[9/14] w-[180px] shrink-0 overflow-hidden rounded-2xl bg-black text-left focus:outline-none focus:ring-2 focus:ring-[#f97316] sm:w-[200px]"
          aria-label={`Watch ${v.businessName} video`}
        >
          <video
            ref={(el) => { refs.current[v.id] = el; }}
            src={v.src}
            className="absolute inset-0 h-full w-full object-cover object-center"
            muted
            loop
            playsInline
            preload="metadata"
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/10" />
          <span className="pointer-events-none absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-[#f97316] text-white shadow">
            <Play className="h-4 w-4 fill-current" />
          </span>
          <span className="pointer-events-none absolute bottom-2 left-2 right-2 text-white">
            <span className="block truncate text-sm font-semibold">{v.businessName}</span>
            <span className="block truncate text-xs text-white/85">{v.category}</span>
          </span>
        </button>
      ))}
    </CarouselRow>
  );
}
