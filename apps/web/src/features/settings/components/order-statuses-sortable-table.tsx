'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { BulkActionId, OrderStatusConfig } from '@laam/types';
import { GripVertical } from 'lucide-react';

import { FormSelect } from '@/components/form/form-select';
import { Checkbox } from '@/components/ui/checkbox';
import { getStatusParentOptions } from '@/features/orders/lib/order-status-hierarchy';
import {
  statusShowsInNestedTabs,
  statusShowsInSidebar,
  statusVisibilityLabel,
} from '@/features/orders/lib/order-status-visibility';
import { cn } from '@/lib/utils';

function SortableStatusRow({
  status,
  disabled,
  onUpdate,
  bulkActionsEditor,
}: {
  status: OrderStatusConfig;
  disabled?: boolean;
  onUpdate: (status: OrderStatusConfig, patch: Partial<OrderStatusConfig>) => void;
  bulkActionsEditor: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: status.slug });

  const parentOptions = [
    { value: '', label: 'None — top-level' },
    ...getStatusParentOptions(status.slug).map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ];

  return (
    <tr
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'border-b last:border-b-0',
        isDragging && 'relative z-10 bg-card shadow-md ring-1 ring-primary/30',
      )}
    >
      <td className="px-2 py-2.5">
        <button
          type="button"
          className="inline-flex size-7 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing disabled:opacity-50"
          aria-label={`Drag ${status.label}`}
          disabled={disabled}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
      </td>
      <td className="px-3 py-2.5 font-medium">{status.label}</td>
      <td className="px-3 py-2.5 font-mono text-xs">{status.slug}</td>
      <td className="px-3 py-2.5">
        <FormSelect
          value={status.parentSlug ?? ''}
          onChange={(parentSlug) =>
            onUpdate(status, {
              parentSlug: parentSlug ? parentSlug : undefined,
            })
          }
          options={parentOptions}
          searchable
        />
      </td>
      <td className="px-3 py-2.5">
        <Checkbox
          checked={statusShowsInSidebar(status)}
          onCheckedChange={(checked) =>
            onUpdate(status, { showInSidebar: checked === true })
          }
          aria-label={`Show ${status.label} in sidebar`}
        />
      </td>
      <td className="px-3 py-2.5">
        <Checkbox
          checked={statusShowsInNestedTabs(status)}
          onCheckedChange={(checked) =>
            onUpdate(status, { showInNestedTabs: checked === true })
          }
          aria-label={`Show ${status.label} as nested tab`}
        />
      </td>
      <td className="px-3 py-2.5">
        <Checkbox
          checked={status.showInGroupByStatus !== false}
          onCheckedChange={(checked) =>
            onUpdate(status, {
              showInGroupByStatus: checked === true,
            })
          }
          aria-label={`Show ${status.label} in Group by Status`}
        />
      </td>
      <td className="px-3 py-2.5">{bulkActionsEditor}</td>
      <td className="px-3 py-2.5 text-muted-foreground">
        {statusVisibilityLabel(status)}
      </td>
    </tr>
  );
}

type OrderStatusesSortableTableProps = {
  statuses: OrderStatusConfig[];
  disabled?: boolean;
  onReorder: (next: OrderStatusConfig[]) => void;
  onUpdate: (status: OrderStatusConfig, patch: Partial<OrderStatusConfig>) => void;
  renderBulkActions: (status: OrderStatusConfig) => React.ReactNode;
};

export function OrderStatusesSortableTable({
  statuses,
  disabled,
  onReorder,
  onUpdate,
  renderBulkActions,
}: OrderStatusesSortableTableProps) {
  const ordered = React.useMemo(
    () =>
      [...statuses].sort(
        (a, b) => (a.sidebarOrder ?? 999) - (b.sidebarOrder ?? 999) || a.label.localeCompare(b.label),
      ),
    [statuses],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || disabled) return;
    const oldIndex = ordered.findIndex((s) => s.slug === active.id);
    const newIndex = ordered.findIndex((s) => s.slug === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(ordered, oldIndex, newIndex).map((status, index) => ({
      ...status,
      sidebarOrder: (index + 1) * 10,
    }));
    onReorder(moved);
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border/70">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <table className="w-full min-w-[1220px] text-sm">
          <thead className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
            <tr>
              <th className="w-10 px-2 py-2 font-medium" aria-label="Reorder" />
              <th className="px-3 py-2 font-medium">Label</th>
              <th className="px-3 py-2 font-medium">Slug</th>
              <th className="px-3 py-2 font-medium">Parent</th>
              <th className="px-3 py-2 font-medium">Sidebar</th>
              <th className="px-3 py-2 font-medium">Nested tab</th>
              <th className="px-3 py-2 font-medium">Group by</th>
              <th className="px-3 py-2 font-medium">Bulk actions</th>
              <th className="px-3 py-2 font-medium">Effective</th>
            </tr>
          </thead>
          <SortableContext
            items={ordered.map((s) => s.slug)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {ordered.map((status) => (
                <SortableStatusRow
                  key={status.id}
                  status={status}
                  disabled={disabled}
                  onUpdate={onUpdate}
                  bulkActionsEditor={renderBulkActions(status)}
                />
              ))}
            </tbody>
          </SortableContext>
        </table>
      </DndContext>
    </div>
  );
}

/** Re-export type for callers that need BulkActionId in render props. */
export type { BulkActionId };
