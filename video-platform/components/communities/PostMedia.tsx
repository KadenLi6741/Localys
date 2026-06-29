'use client';

import { useState } from 'react';
import type { ThreadMedia } from '@/contexts/CommunitiesContext';

/**
 * Renders a community post's attached photo or video. Hides itself if the media
 * fails to load (e.g. missing file) so a post never shows a broken image.
 * Palette: black framing only.
 * Part of: Localy (FBLA Coding & Programming — Byte-Sized Business Boost)
 */
export function PostMedia({ media, className = '' }: { media?: ThreadMedia; className?: string }) {
  const [failed, setFailed] = useState(false);
  if (!media || failed) return null;

  return (
    <div className={`mt-2 overflow-hidden rounded-xl border border-gray-200 bg-black dark:border-gray-700 ${className}`}>
      {media.type === 'video' ? (
        <video
          src={media.src}
          className="max-h-[420px] w-full object-contain"
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={media.src}
          alt=""
          className="max-h-[420px] w-full object-contain"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}
