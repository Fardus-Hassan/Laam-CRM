import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type CardLinkActionProps = {
  href: string;
  label?: string;
  className?: string;
};

export function CardLinkAction({
  href,
  label = 'View all',
  className,
}: CardLinkActionProps) {
  return (
    <Button
      variant="ghost"
      size="xs"
      className={cn('h-7 shrink-0 gap-0.5 whitespace-nowrap text-xs text-primary dark:hover:text-primary', className)}
      asChild
    >
      <Link href={href}>
        {label}
        <ChevronRight className="size-3.5" />
      </Link>
    </Button>
  );
}
