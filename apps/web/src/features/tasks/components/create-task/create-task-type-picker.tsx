'use client';

import type { ComponentType } from 'react';
import type { TaskType } from '@laam/types';
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  PackageCheck,
  Phone,
  Target,
  Truck,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { TASK_TYPE_LABELS } from '@/features/tasks/config/task-filters';

const TASK_TYPE_OPTIONS: {
  id: TaskType;
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'call_customer',
    label: TASK_TYPE_LABELS.call_customer,
    description: 'Callback or WhatsApp for a buyer inquiry',
    icon: Phone,
  },
  {
    id: 'confirm_order',
    label: TASK_TYPE_LABELS.confirm_order,
    description: 'Verify address, COD, or product before dispatch',
    icon: PackageCheck,
  },
  {
    id: 'courier_followup',
    label: TASK_TYPE_LABELS.courier_followup,
    description: 'Check Pathao / Steadfast delivery status',
    icon: Truck,
  },
  {
    id: 'payment_followup',
    label: TASK_TYPE_LABELS.payment_followup,
    description: 'Chase bKash, advance, or partial payment',
    icon: Banknote,
  },
  {
    id: 'lead_followup',
    label: TASK_TYPE_LABELS.lead_followup,
    description: 'Convert Facebook or abandoned-cart lead',
    icon: Target,
  },
  {
    id: 'delivery_issue',
    label: TASK_TYPE_LABELS.delivery_issue,
    description: 'Wrong product, damage, or missing item',
    icon: AlertTriangle,
  },
  {
    id: 'general',
    label: TASK_TYPE_LABELS.general,
    description: 'Stock check, VIP list, or internal to-do',
    icon: ClipboardList,
  },
];

type CreateTaskTypePickerProps = {
  value: TaskType;
  onChange: (value: TaskType) => void;
};

export function CreateTaskTypePicker({ value, onChange }: CreateTaskTypePickerProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {TASK_TYPE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isActive = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={cn(
              'flex items-start gap-3 rounded-lg border p-3 text-left transition-colors',
              isActive
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:border-primary/40',
            )}
          >
            <div
              className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-md',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
              )}
            >
              <Icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium">{option.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{option.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
