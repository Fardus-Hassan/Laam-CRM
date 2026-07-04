import type { AgentActivityItem } from '@laam/types';
import { CheckCircle2, Info, Package, Phone, Truck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const ACTIVITY_ICONS = {
  success: CheckCircle2,
  info: Info,
  warning: Phone,
  default: Package,
  delivery: Truck,
} as const;

type AgentActivityFeedProps = {
  items: AgentActivityItem[];
  className?: string;
};

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function AgentActivityFeed({ items, className }: AgentActivityFeedProps) {
  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => {
        const Icon = ACTIVITY_ICONS[item.type ?? 'default'];

        return (
          <li
            key={item.id}
            className="flex gap-3 border-b border-border/60 pb-3 last:border-0 last:pb-0"
          >
            <div className="relative shrink-0">
              <Avatar className="size-9">
                <AvatarFallback className="text-xs">{initials(item.agentName)}</AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full border border-background bg-muted">
                <Icon className="size-3 text-primary" aria-hidden />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-foreground">
                <span className="font-medium">{item.agentName}</span>{' '}
                <span className="text-muted-foreground">{item.message}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{item.timestamp}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
