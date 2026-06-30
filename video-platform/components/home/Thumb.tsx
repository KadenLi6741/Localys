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
export function Thumb({
  src,
  label,
  alt,
  className = '',
  imgClassName = 'object-cover',
  sizes = '(max-width: 768px) 50vw, 25vw',
}: {
  src?: string;
  label?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
  sizes?: string;
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
