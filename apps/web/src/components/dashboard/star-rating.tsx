import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

type StarRatingProps = {
  rating: number;
  max?: number;
  className?: string;
};

export function StarRating({ rating, max = 5, className }: StarRatingProps) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.5;

  return (
    <div className={cn('flex items-center gap-0.5', className)} aria-label={`${rating} stars`}>
      {Array.from({ length: max }).map((_, index) => {
        const filled = index < fullStars || (index === fullStars && hasHalf);

        return (
          <Star
            key={index}
            className={cn(
              'size-3.5 sm:size-4',
              filled
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-muted-foreground/40',
            )}
          />
        );
      })}
    </div>
  );
}
