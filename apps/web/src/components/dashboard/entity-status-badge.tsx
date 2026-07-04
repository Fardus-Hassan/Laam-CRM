import type {
  CompanyStatus,
  DealStage,
  LeadStatus,
  OrderStatusType,
} from '@laam/types';
import type { FollowUpRow } from '@laam/types';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

type BadgeVariant = 'success' | 'default' | 'danger' | 'warning' | 'secondary';

const ORDER_STATUS_VARIANT: Partial<Record<OrderStatusType, BadgeVariant>> = {
  pending: 'warning',
  pending_2: 'warning',
  pending_3: 'warning',
  confirmed: 'success',
  confirmed_2: 'success',
  convert: 'default',
  convert_2: 'default',
  processing: 'default',
  processing_2: 'default',
  special: 'secondary',
  special_2: 'secondary',
  hold: 'warning',
  hold_followup: 'warning',
  in_courier: 'default',
  cod_changed: 'warning',
  delivered: 'default',
  completed: 'success',
  cancelled: 'danger',
  pending_return: 'warning',
  returned: 'secondary',
  hand_delivery: 'default',
  hand_delivery_completed: 'success',
  others: 'secondary',
  others_2: 'secondary',
  rts_carrybee: 'secondary',
  return_collection: 'secondary',
  courier_payment_validate: 'secondary',
  follow_up: 'secondary',
  in_progress: 'default',
};

function formatOrderStatusLabel(status: OrderStatusType): string {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function getOrderStatusConfig(status: OrderStatusType) {
  return {
    label: formatOrderStatusLabel(status),
    variant: ORDER_STATUS_VARIANT[status] ?? 'secondary',
  };
}

const FOLLOW_UP_STATUS_CONFIG: Record<
  FollowUpRow['status'],
  { label: string; variant: BadgeVariant }
> = {
  pending: { label: 'Pending', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'default' },
  completed: { label: 'Completed', variant: 'success' },
};

const LEAD_STATUS_CONFIG: Record<LeadStatus, { label: string; variant: BadgeVariant }> = {
  new: { label: 'New', variant: 'secondary' },
  contacted: { label: 'Contacted', variant: 'default' },
  qualified: { label: 'Qualified', variant: 'warning' },
  converted: { label: 'Converted', variant: 'success' },
  lost: { label: 'Lost', variant: 'danger' },
};

const COMPANY_STATUS_CONFIG: Record<CompanyStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'success' },
  inactive: { label: 'Inactive', variant: 'secondary' },
  prospect: { label: 'Prospect', variant: 'warning' },
};

const DEAL_STAGE_CONFIG: Record<DealStage, { label: string; variant: BadgeVariant }> = {
  new_lead: { label: 'New Lead', variant: 'secondary' },
  contacted: { label: 'Contacted', variant: 'default' },
  qualified: { label: 'Qualified', variant: 'warning' },
  proposal: { label: 'Proposal', variant: 'default' },
  negotiation: { label: 'Negotiation', variant: 'warning' },
  won: { label: 'Won', variant: 'success' },
  lost: { label: 'Lost', variant: 'danger' },
};

type EntityStatusBadgeProps = {
  status:
    | OrderStatusType
    | FollowUpRow['status']
    | LeadStatus
    | CompanyStatus
    | DealStage;
  kind?: 'order' | 'follow_up' | 'lead' | 'company' | 'deal';
  className?: string;
};

export function EntityStatusBadge({ status, kind = 'order', className }: EntityStatusBadgeProps) {
  const config =
    kind === 'follow_up'
      ? FOLLOW_UP_STATUS_CONFIG[status as FollowUpRow['status']]
      : kind === 'lead'
        ? LEAD_STATUS_CONFIG[status as LeadStatus]
        : kind === 'company'
          ? COMPANY_STATUS_CONFIG[status as CompanyStatus]
          : kind === 'deal'
            ? DEAL_STAGE_CONFIG[status as DealStage]
            : getOrderStatusConfig(status as OrderStatusType);

  return (
    <Badge variant={config.variant} className={cn('font-normal', className)}>
      {config.label}
    </Badge>
  );
}

/** @deprecated Use EntityStatusBadge */
export function StatusBadge({
  status,
  kind = 'order',
  className,
}: EntityStatusBadgeProps) {
  return <EntityStatusBadge status={status} kind={kind} className={className} />;
}
