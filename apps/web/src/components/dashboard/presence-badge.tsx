import type { AgentPresence } from '@laam/types';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const PRESENCE_CONFIG: Record<
  AgentPresence,
  { label: string; variant: 'success' | 'warning' | 'secondary' }
> = {
  online: { label: 'Online', variant: 'success' },
  away: { label: 'Away', variant: 'warning' },
  offline: { label: 'Offline', variant: 'secondary' },
};

type PresenceBadgeProps = {
  presence: AgentPresence;
  className?: string;
};

export function PresenceBadge({ presence, className }: PresenceBadgeProps) {
  const config = PRESENCE_CONFIG[presence];

  return (
    <Badge variant={config.variant} className={cn('font-normal', className)}>
      {config.label}
    </Badge>
  );
}
