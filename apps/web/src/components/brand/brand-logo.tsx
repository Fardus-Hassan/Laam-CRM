'use client';

import * as React from 'react';
import Image from 'next/image';
import { GalleryVerticalEnd } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useBrand } from '@/features/brand/providers/brand-provider';
import { useTheme } from '@/features/theme/hooks/use-theme';

type BrandLogoProps = {
  src?: string;
  alt?: string;
  className?: string;
  iconClassName?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  /** Force a theme variant regardless of current mode. */
  variant?: 'light' | 'dark';
};

function isRemoteOrData(src: string) {
  return src.startsWith('http') || src.startsWith('data:') || src.includes('/api/uploads/');
}

export function BrandLogo({
  src,
  alt,
  className,
  iconClassName,
  width = 160,
  height = 48,
  priority = false,
  variant,
}: BrandLogoProps) {
  const brand = useBrand();
  const { resolvedTheme } = useTheme();
  const mode = variant ?? (resolvedTheme === 'light' ? 'light' : 'dark');
  const logoSrc = src ?? (mode === 'light' ? brand.logos.light : brand.logos.dark);
  const logoAlt = alt ?? brand.name;
  const [hasError, setHasError] = React.useState(false);

  React.useEffect(() => {
    setHasError(false);
  }, [logoSrc]);

  if (hasError || !logoSrc) {
    return (
      <GalleryVerticalEnd
        className={cn('size-8 shrink-0 text-sidebar-foreground', iconClassName, className)}
      />
    );
  }

  if (isRemoteOrData(logoSrc)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoSrc}
        alt={logoAlt}
        width={width}
        height={height}
        className={cn('h-auto max-h-12 w-auto max-w-[180px] shrink-0 object-contain', className)}
        onError={() => setHasError(true)}
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
      className={cn('h-auto max-h-12 w-auto max-w-[180px] shrink-0 object-contain', className)}
      onError={() => setHasError(true)}
    />
  );
}
