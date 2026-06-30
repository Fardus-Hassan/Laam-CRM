'use client';

import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { Button } from '@/components/ui/button';
import type { BulkActionId } from '@laam/types';

import {
  BULK_ACTIONS_REGISTRY,
  resolveBulkActions,
} from '@/features/orders/config/bulk-actions-registry';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type OrderBulkActionsProps = {
  actionIds: BulkActionId[];
  selectedCount: number;
  className?: string;
};

export function OrderBulkActions({
  actionIds,
  selectedCount,
  className,
}: OrderBulkActionsProps) {
  const actions = resolveBulkActions(actionIds);
  const visibleActions = actions.filter(
    (action) => !action.requiresSelection || selectedCount > 0,
  );

  if (visibleActions.length === 0) {
    return null;
  }

  function handleAction(label: string) {
    toast.success(`${label} — prototype action`);
  }

  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="text-sm">
          Action
          {selectedCount > 0 ? (
            <span className="ml-2 font-normal text-muted-foreground">
              ({selectedCount} selected)
            </span>
          ) : null}
        </CardTitle>
      </CardHeader>
      <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
        <div className="flex flex-wrap gap-2">
          {visibleActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              size="sm"
              variant={
                action.variant === 'destructive'
                  ? 'destructive'
                  : action.variant === 'secondary'
                    ? 'secondary'
                    : 'default'
              }
              disabled={action.requiresSelection && selectedCount === 0}
              onClick={() => handleAction(BULK_ACTIONS_REGISTRY[action.id].label)}
            >
              {action.label}
            </Button>
          ))}
        </div>

        {selectedCount > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Transfer To" required>
              <FormSearchSelect
                value=""
                onChange={() => undefined}
                options={[]}
                placeholder="Search Employee"
                searchPlaceholder="Search Employee"
              />
            </FormField>
            <FormField label="Assign Tag" required>
              <FormSearchSelect
                value=""
                onChange={() => undefined}
                options={[
                  { value: 'vip', label: 'VIP' },
                  { value: 'repeat', label: 'Repeat' },
                ]}
                placeholder="Select Tag"
              />
            </FormField>
            <div className="flex flex-wrap gap-2 sm:col-span-2">
              <Button type="button" size="sm" onClick={() => handleAction('Transfer Selected')}>
                Transfer Selected
              </Button>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => handleAction('Change Selected')}
              >
                Change Selected
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
