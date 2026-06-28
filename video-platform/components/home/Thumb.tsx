'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';

/**
 * Swap-in image slot. Renders `src` when provided & it loads; otherwise a clean
 * neutral placeholder (soft gray box with a subtle image glyph — NO letters,
 * NO emoji, NO colored blocks). Drop a real image URL into `src` to replace it.
 */
export function Thumb({
  src,
  label,
  alt,
  className = '',
  imgClassName = 'h-full w-full object-cover',
}: {
  src?: string;
  label?: string;
  alt?: string;
  className?: string;
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = src && !failed;

  return (
    <div className={`flex items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-800 ${className}`}>
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={alt ?? label ?? ''} className={imgClassName} onError={() => setFailed(true)} />
      ) : (
        <ImageIcon className="h-1/3 w-1/3 text-gray-300 dark:text-gray-600" strokeWidth={1.5} aria-hidden />
      )}
    </div>
  );
}
