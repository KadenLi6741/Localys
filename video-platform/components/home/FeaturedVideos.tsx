'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Play } from 'lucide-react';
import { CarouselRow } from './CarouselRow';
import { Thumb } from './Thumb';
import { getFeaturedVideos } from '@/lib/supabase/featured';
import type { VideoCard } from '@/lib/home-data';

/**
 * (F) Real short-form videos (click → /video/[id]). Fetches actual videos from
 * Supabase; renders nothing if there are none yet (no fake video cards).
 */
export function FeaturedVideos() {
  const [videos, setVideos] = useState<VideoCard[]>([]);

  useEffect(() => {
    let active = true;
    getFeaturedVideos()
      .then((v) => { if (active) setVideos(v); })
      .catch(() => { if (active) setVideos([]); });
    return () => { active = false; };
  }, []);

  if (videos.length === 0) return null;

  return (
    <CarouselRow title="Featured in videos">
      {videos.map((v) => (
        <div key={v.id} className="w-[180px] shrink-0 sm:w-[200px]">
          <Link href={v.href} className="group/vid relative block overflow-hidden rounded-2xl">
            <Thumb
              src={v.thumbnail}
              label={v.businessName}
              alt={v.title}
              className="aspect-[9/14] rounded-2xl"
              imgClassName="h-full w-full object-cover transition duration-500 group-hover/vid:scale-105"
            />
            <span className="absolute inset-0 bg-black/30" />
            <span className="absolute left-2 top-2 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-black shadow">
              <Play className="h-4 w-4 fill-current" />
            </span>
            <span className="absolute bottom-2 left-2 right-2 text-white">
              <span className="block truncate text-sm font-semibold">{v.title}</span>
              <span className="block truncate text-xs text-white">{v.businessName} · {v.views} views</span>
            </span>
          </Link>
        </div>
      ))}
    </CarouselRow>
  );
}
