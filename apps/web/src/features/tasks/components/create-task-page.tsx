'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { TaskPriority, TaskType } from '@laam/types';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormPhoneInput } from '@/components/form/form-phone-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateTaskSummaryPanel } from '@/features/tasks/components/create-task/create-task-summary-panel';
import { CreateTaskTypePicker } from '@/features/tasks/components/create-task/create-task-type-picker';
import { TASK_PRIORITY_LABELS } from '@/features/tasks/config/task-filters';
import { useAuth } from '@/features/auth/hooks/use-auth';
import { useAgentOptions } from '@/features/rbac/hooks/use-agent-options';
import { useTaskMutations } from '@/features/tasks/hooks/use-task-mutations';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_GRID_GAP,
  ORDER_SECTION_HEADER_CLASS,
  ORDER_SIDEBAR_GRID_CLASS,
  ORDER_STICKY_MAX_H_CLASS,
  ORDER_STICKY_TOP_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

const PRIORITY_OPTIONS = (Object.keys(TASK_PRIORITY_LABELS) as TaskPriority[]).map((value) => ({
  value,
  label: TASK_PRIORITY_LABELS[value],
}));

const CUSTOMER_TASK_TYPES: TaskType[] = [
  'call_customer',
  'confirm_order',
  'courier_followup',
  'payment_followup',
  'lead_followup',
  'delivery_issue',
];

export function CreateTaskPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { agents } = useAgentOptions();
  const { createTask, isLoading } = useTaskMutations();
  const [draft, setDraft] = React.useState({
    title: '',
    description: '',
    taskType: 'call_customer' as TaskType,
    priority: 'medium' as TaskPriority,
    dueDate: '',
    dueTime: '',
    assignedAgentName: '',
    customerName: '',
    customerPhone: '',
    notes: '',
  });

  React.useEffect(() => {
    if (draft.assignedAgentName) return;
    const preferred = user?.name?.trim();
    if (preferred) {
      setDraft((current) =>
        current.assignedAgentName ? current : { ...current, assignedAgentName: preferred },
      );
      return;
    }
    if (agents[0]) {
      setDraft((current) =>
        current.assignedAgentName ? current : { ...current, assignedAgentName: agents[0]! },
      );
    }
  }, [user?.name, agents, draft.assignedAgentName]);

  function patch(values: Partial<typeof draft>) {
    setDraft((current) => ({ ...current, ...values }));
  }

  const showCustomerFields = CUSTOMER_TASK_TYPES.includes(draft.taskType);
  const canSubmit = draft.title.trim().length > 0;

  async function handleSubmit() {
    if (!canSubmit) {
      toast.error('Task title is required');
      return;
    }

    const task = await createTask({
      title: draft.title.trim(),
      description: draft.description.trim() || undefined,
      taskType: draft.taskType,
      priority: draft.priority,
      dueDate: draft.dueDate || undefined,
      dueTime: draft.dueTime || undefined,
      assignedAgentName: draft.assignedAgentName || undefined,
      customerName: showCustomerFields ? draft.customerName.trim() || undefined : undefined,
      customerPhone: showCustomerFields ? draft.customerPhone.trim() || undefined : undefined,
      notes: draft.notes.trim() || undefined,
      relatedType: 'none',
    });

    router.push('/dashboard/tasks');
    void task;
  }

  return (
    <PageShell
      title="New task"
      description="Create a to-do for calls, order checks, courier follow-ups, or payments."
      breadcrumbs={[
        { label: 'Tasks', href: '/dashboard/tasks' },
        { label: 'New task' },
      ]}
    >
      <div className={ORDER_PAGE_GAP}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/dashboard/tasks">
              <ArrowLeft className="size-4" />
              Back
            </Link>
          </Button>
          <p className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> Title required
          </p>
        </div>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
          className={cn('grid gap-4', ORDER_SIDEBAR_GRID_CLASS)}
        >
          <div className="space-y-4 pb-28 lg:pb-0">
            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">What needs to be done?</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <CreateTaskTypePicker
                  value={draft.taskType}
                  onChange={(taskType) => patch({ taskType })}
                />
              </CardContent>
            </Card>

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Task details</CardTitle>
              </CardHeader>
              <CardContent className={cn(ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
                <FormField label="Title" required>
                  <FormInput
                    value={draft.title}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="e.g. Call Fatema about modhu gift box"
                  />
                </FormField>
                <FormField label="Description">
                  <FormTextarea
                    rows={3}
                    value={draft.description}
                    onChange={(e) => patch({ description: e.target.value })}
                    placeholder="Extra context for the team…"
                  />
                </FormField>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Priority">
                    <FormSearchSelect
                      value={draft.priority}
                      onChange={(v) => patch({ priority: v as TaskPriority })}
                      options={PRIORITY_OPTIONS}
                      searchable={false}
                    />
                  </FormField>
                  <FormField label="Assign to">
                    <FormSearchSelect
                      value={draft.assignedAgentName}
                      onChange={(v) => patch({ assignedAgentName: v })}
                      options={agents.map((name) => ({ value: name, label: name }))}
                      placeholder="Select agent…"
                    />
                  </FormField>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField label="Due date">
                    <input
                      type="date"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={draft.dueDate}
                      onChange={(e) => patch({ dueDate: e.target.value })}
                    />
                  </FormField>
                  <FormField label="Due time">
                    <input
                      type="time"
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                      value={draft.dueTime}
                      onChange={(e) => patch({ dueTime: e.target.value })}
                    />
                  </FormField>
                </div>
              </CardContent>
            </Card>

            {showCustomerFields ? (
              <Card className={ORDER_CARD_CLASS}>
                <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                  <CardTitle className="text-sm">Customer (optional)</CardTitle>
                </CardHeader>
                <CardContent className={cn(ORDER_SECTION_BODY_CLASS, ORDER_SECTION_GRID_GAP)}>
                  <FormField label="Customer name">
                    <FormInput
                      value={draft.customerName}
                      onChange={(e) => patch({ customerName: e.target.value })}
                      placeholder="Buyer name"
                    />
                  </FormField>
                  <FormField label="Mobile">
                    <FormPhoneInput
                      value={draft.customerPhone}
                      onChange={(e) => patch({ customerPhone: e.target.value })}
                    />
                  </FormField>
                </CardContent>
              </Card>
            ) : null}

            <Card className={ORDER_CARD_CLASS}>
              <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
                <CardTitle className="text-sm">Notes</CardTitle>
              </CardHeader>
              <CardContent className={ORDER_SECTION_BODY_CLASS}>
                <FormTextarea
                  rows={4}
                  value={draft.notes}
                  onChange={(e) => patch({ notes: e.target.value })}
                  placeholder="COD confirmed, prefers evening call…"
                />
              </CardContent>
            </Card>
          </div>

          <aside className={cn('space-y-4', ORDER_STICKY_TOP_CLASS, ORDER_STICKY_MAX_H_CLASS)}>
            <CreateTaskSummaryPanel draft={draft} />
          </aside>

          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 p-4 backdrop-blur lg:static lg:col-span-2 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
            <div className="mx-auto flex max-w-3xl items-center justify-end gap-2 lg:max-w-none">
              <Button type="button" variant="outline" asChild>
                <Link href="/dashboard/tasks">Cancel</Link>
              </Button>
              <Button type="submit" disabled={!canSubmit || isLoading}>
                Create task
              </Button>
            </div>
          </div>
        </form>
      </div>
    </PageShell>
  );
}
