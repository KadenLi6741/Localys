import { Star } from 'lucide-react';

/** Star rating row with the review count shown to the right of the stars. */
export function Stars({ rating, reviewCount }: { rating: number; reviewCount: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center" aria-label={`Rated ${rating} out of 5`}>
        {[0, 1, 2, 3, 4].map((i) => {
          const filled = rating - i >= 1;
          const half = !filled && rating - i > 0;
          return (
            <span key={i} className="relative inline-block h-3.5 w-3.5">
              <Star className="absolute inset-0 h-3.5 w-3.5 text-gray-300 dark:text-gray-600" strokeWidth={1.5} />
              {(filled || half) && (
                <span className="absolute inset-0 overflow-hidden" style={{ width: filled ? '100%' : '50%' }}>
                  <Star className="h-3.5 w-3.5 fill-[#f97316] text-[#f97316]" strokeWidth={1.5} />
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs font-medium text-black dark:text-white">({reviewCount})</span>
    </div>
  );
}
