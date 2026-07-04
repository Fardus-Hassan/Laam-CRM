'use client';

import * as React from 'react';
import Image from 'next/image';
import { GalleryVerticalEnd } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBrand } from '@/features/brand/providers/brand-provider';

type BrandLogoProps = {
  src?: string;
  alt?: string;
  className?: string;
  iconClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean;
};

export function BrandLogo({
  src,
  alt,
  className,
  iconClassName,
  width = 140,
  height = 40,
  priority = false,
}: BrandLogoProps) {
  const brand = useBrand();
  const logoSrc = src ?? brand.logos.default;
  const logoAlt = alt ?? brand.name;
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <GalleryVerticalEnd
        className={cn('size-8 shrink-0 text-sidebar-foreground', iconClassName, className)}
      />
    );
  }

  return (
    <Image
      src={logoSrc}
      alt={logoAlt}
      width={width}
      height={height}
      priority={priority}
      className={cn('h-auto w-auto max-w-[140px] shrink-0 object-contain', className)}
      onError={() => setHasError(true)}
    />
  );
}
