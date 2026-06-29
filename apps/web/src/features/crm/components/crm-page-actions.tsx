'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';

import type { CrmModuleId } from '@laam/types';

import { Can } from '@/components/auth/can';
import { Button } from '@/components/ui/button';
import { CRM_MODULE_ACTIONS } from '@/features/crm/config/module-actions';

type CrmPageActionsProps = {
  moduleId: CrmModuleId;
};

export function CrmPageActions({ moduleId }: CrmPageActionsProps) {
  const actions = CRM_MODULE_ACTIONS[moduleId];

  if (!actions?.length) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Can key={action.permission} permission={action.permission}>
          <Button
            type="button"
            size="sm"
            variant={action.variant ?? 'default'}
            asChild={Boolean(action.href)}
          >
            {action.href ? (
              <Link href={action.href}>
                {action.variant === 'default' || !action.variant ? (
                  <Plus className="size-4" />
                ) : null}
                {action.label}
              </Link>
            ) : (
              <>
                {action.variant === 'default' || !action.variant ? (
                  <Plus className="size-4" />
                ) : null}
                {action.label}
              </>
            )}
          </Button>
        </Can>
      ))}
    </div>
  );
}
