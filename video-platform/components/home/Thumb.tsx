'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';

/**
 * Swap-in image slot. Renders `src` when provided & it loads; otherwise a clean
 * neutral placeholder (soft gray box with a subtle image glyph — NO letters,
 * NO emoji, NO colored blocks). Drop a real image URL into `src` to replace it.
 *
 * Remote/static URLs go through next/image (`fill`) for automatic resizing,
 * lazy-loading and modern formats. Transient `data:`/`blob:` previews (e.g. a
 * just-picked file) bypass the optimizer via a plain <img>.
 */
// Tiny neutral blur shown under every optimized image while it downloads, so the
// slot fades from a soft gray rather than flashing an empty gray/black box.
// Precomputed base64 of an 8×8 #e5e7eb (gray-200) SVG — kept literal because this
// is a client component (no Node `Buffer` in the browser).
const BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjgiPjxyZWN0IHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiNlNWU3ZWIiLz48L3N2Zz4=';

export function Thumb({
  src,
  label,
  alt,
  className = '',
  imgClassName = 'object-cover',
  sizes = '(max-width: 768px) 50vw, 25vw',
  priority = false,
}: {
  src?: string;
  label?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
  /** Above-the-fold images (hero, first visible row): preloads + skips lazy-load. */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;
  const isRaw = !!src && (src.startsWith('data:') || src.startsWith('blob:'));

  return (
    <div className={`relative flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
      {showImg ? (
        isRaw ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt ?? label ?? ''} className={`h-full w-full ${imgClassName}`} onError={() => setFailed(true)} />
        ) : (
          <Image
            src={src}
            alt={alt ?? label ?? ''}
            fill
            sizes={sizes}
            priority={priority}
            placeholder="blur"
            blurDataURL={BLUR_DATA_URL}
            className={imgClassName}
            onError={() => setFailed(true)}
          />
        )
      ) : (
        <ImageIcon className="h-1/3 w-1/3 text-gray-300 dark:text-gray-600" strokeWidth={1.5} aria-hidden />
      )}
    </div>
  );
}
