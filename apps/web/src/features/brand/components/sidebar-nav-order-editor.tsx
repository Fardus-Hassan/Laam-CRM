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
import type { SidebarNavOrder } from '@laam/types';
import { GripVertical, PanelLeft } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getUniversalNavRegistry } from '@/features/navigation/config/universal-nav-registry';
import {
  buildSidebarNavOrderFromGroups,
  isEditableSidebarGroupId,
  isOrdersStatusNavId,
  normalizeSidebarNavOrder,
} from '@/features/navigation/lib/apply-sidebar-nav-order';
import { cn } from '@/lib/utils';

type EditableChild = {
  id: string;
  title: string;
  children: EditableChild[];
};
type EditableItem = {
  id: string;
  title: string;
  children: EditableChild[];
};
type EditableGroup = {
  id: string;
  label: string;
  items: EditableItem[];
};

function mapChildren(
  children: Array<{ id: string; title: string; children?: unknown }> | undefined,
): EditableChild[] {
  if (!children?.length) return [];
  return children
    .filter((child) => !isOrdersStatusNavId(child.id))
    .map((child) => ({
      id: child.id,
      title: child.title,
      children: mapChildren(
        child.children as Array<{ id: string; title: string; children?: unknown }> | undefined,
      ),
    }));
}

function catalogFromRegistry(): EditableGroup[] {
  return getUniversalNavRegistry()
    .filter((group) => isEditableSidebarGroupId(group.id))
    .map((group) => ({
      id: group.id,
      label: group.label,
      items: group.items.map((item) => ({
        id: item.id,
        title: item.title,
        children: mapChildren(item.children),
      })),
    }));
}

function orderTreeChildren(
  children: EditableChild[],
  order: SidebarNavOrder,
  parentId: string,
): EditableChild[] {
  const childIds = order.childIdsByItem?.[parentId] ?? children.map((c) => c.id);
  const byId = new Map(children.map((c) => [c.id, c]));
  const ordered = childIds
    .map((id) => byId.get(id))
    .filter((c): c is EditableChild => Boolean(c))
    .map((child) => ({
      ...child,
      children: orderTreeChildren(child.children, order, child.id),
    }));
  for (const child of children) {
    if (!ordered.some((c) => c.id === child.id)) {
      ordered.push({
        ...child,
        children: orderTreeChildren(child.children, order, child.id),
      });
    }
  }
  return ordered;
}

function orderToGroups(
  catalog: EditableGroup[],
  order: SidebarNavOrder,
): EditableGroup[] {
  const byId = new Map(catalog.map((g) => [g.id, g]));
  return order.groupIds
    .map((groupId) => {
      const base = byId.get(groupId);
      if (!base) return null;
      const itemIds = order.itemIdsByGroup[groupId] ?? base.items.map((i) => i.id);
      const itemById = new Map(base.items.map((i) => [i.id, i]));
      const items = itemIds
        .map((id) => itemById.get(id))
        .filter((item): item is EditableItem => Boolean(item))
        .map((item) => ({
          ...item,
          children: orderTreeChildren(item.children, order, item.id),
        }));
      for (const item of base.items) {
        if (!items.some((i) => i.id === item.id)) {
          items.push({
            ...item,
            children: orderTreeChildren(item.children, order, item.id),
          });
        }
      }
      return { ...base, items };
    })
    .filter((g): g is EditableGroup => Boolean(g));
}

function collectChildOrder(
  nodes: EditableChild[],
  parentId: string,
  into: Record<string, string[]>,
): void {
  if (!nodes.length) return;
  into[parentId] = nodes.map((n) => n.id);
  for (const node of nodes) {
    collectChildOrder(node.children, node.id, into);
  }
}

function groupsToOrder(groups: EditableGroup[]): SidebarNavOrder {
  const childIdsByItem: Record<string, string[]> = {};
  for (const group of groups) {
    for (const item of group.items) {
      collectChildOrder(item.children, item.id, childIdsByItem);
    }
  }
  return {
    groupIds: groups.map((g) => g.id),
    itemIdsByGroup: Object.fromEntries(
      groups.map((g) => [g.id, g.items.map((i) => i.id)]),
    ),
    childIdsByItem,
  };
}

function groupDragId(groupId: string) {
  return `group:${groupId}`;
}

function itemDragId(groupId: string, itemId: string) {
  return `item:${groupId}:${itemId}`;
}

function childDragId(parentId: string, childId: string) {
  return `child:${parentId}:${childId}`;
}

function parseDragId(id: string):
  | { kind: 'group'; groupId: string }
  | { kind: 'item'; groupId: string; itemId: string }
  | { kind: 'child'; parentId: string; childId: string }
  | null {
  if (id.startsWith('group:')) {
    return { kind: 'group', groupId: id.slice('group:'.length) };
  }
  if (id.startsWith('item:')) {
    const rest = id.slice('item:'.length);
    const split = rest.indexOf(':');
    if (split <= 0) return null;
    return {
      kind: 'item',
      groupId: rest.slice(0, split),
      itemId: rest.slice(split + 1),
    };
  }
  if (id.startsWith('child:')) {
    const rest = id.slice('child:'.length);
    const split = rest.indexOf(':');
    if (split <= 0) return null;
    return {
      kind: 'child',
      parentId: rest.slice(0, split),
      childId: rest.slice(split + 1),
    };
  }
  return null;
}

function SortableRow({
  id,
  label,
  muted,
  nested,
}: {
  id: string;
  label: string;
  muted?: boolean;
  nested?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'flex items-center gap-2 rounded-md border border-border/70 bg-card px-2 py-2',
        muted && 'bg-muted/40',
        nested && 'bg-background/80',
        isDragging && 'z-10 opacity-90 shadow-md ring-1 ring-primary/40',
      )}
    >
      <button
        type="button"
        className="inline-flex size-7 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground active:cursor-grabbing"
        aria-label={`Drag ${label}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>
      <span
        className={cn(
          'min-w-0 flex-1 truncate text-sm',
          muted
            ? 'font-semibold uppercase tracking-wide text-muted-foreground'
            : nested
              ? 'text-muted-foreground'
              : 'font-medium',
        )}
      >
        {label}
      </span>
    </div>
  );
}

function ChildTree({
  parentId,
  nodes,
  depth,
}: {
  parentId: string;
  nodes: EditableChild[];
  depth: number;
}) {
  if (!nodes.length) return null;
  return (
    <div className="space-y-1" style={{ paddingLeft: Math.min(depth, 4) * 12 }}>
      {nodes.map((child) => (
        <div key={child.id} className="space-y-1">
          <SortableRow
            id={childDragId(parentId, child.id)}
            label={child.title}
            nested
          />
          <ChildTree parentId={child.id} nodes={child.children} depth={depth + 1} />
        </div>
      ))}
    </div>
  );
}

function reorderChildrenInTree(
  nodes: EditableChild[],
  parentId: string,
  targetParentId: string,
  fromChildId: string,
  toChildId: string,
): EditableChild[] {
  if (parentId === targetParentId) {
    const oldIndex = nodes.findIndex((c) => c.id === fromChildId);
    const newIndex = nodes.findIndex((c) => c.id === toChildId);
    if (oldIndex < 0 || newIndex < 0) return nodes;
    return arrayMove(nodes, oldIndex, newIndex);
  }
  return nodes.map((node) => ({
    ...node,
    children: reorderChildrenInTree(
      node.children,
      node.id,
      targetParentId,
      fromChildId,
      toChildId,
    ),
  }));
}

function collectSortableIds(groups: EditableGroup[]): string[] {
  const ids: string[] = [];

  function walkChildren(parentId: string, children: EditableChild[]) {
    for (const child of children) {
      ids.push(childDragId(parentId, child.id));
      walkChildren(child.id, child.children);
    }
  }

  for (const group of groups) {
    ids.push(groupDragId(group.id));
    for (const item of group.items) {
      ids.push(itemDragId(group.id, item.id));
      walkChildren(item.id, item.children);
    }
  }
  return ids;
}

type SidebarNavOrderEditorProps = {
  value: SidebarNavOrder | null;
  onChange: (next: SidebarNavOrder) => void;
  onReset: () => void;
  disabled?: boolean;
};

export function SidebarNavOrderEditor({
  value,
  onChange,
  onReset,
  disabled,
}: SidebarNavOrderEditorProps) {
  const catalog = React.useMemo(() => catalogFromRegistry(), []);
  const defaults = React.useMemo(
    () => buildSidebarNavOrderFromGroups(getUniversalNavRegistry()),
    [],
  );
  const effectiveOrder = React.useMemo(
    () => normalizeSidebarNavOrder(value, defaults),
    [value, defaults],
  );
  const groups = React.useMemo(
    () => orderToGroups(catalog, effectiveOrder),
    [catalog, effectiveOrder],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const sortableIds = React.useMemo(() => collectSortableIds(groups), [groups]);

  function commit(nextGroups: EditableGroup[]) {
    onChange(groupsToOrder(nextGroups));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || disabled) return;

    const from = parseDragId(String(active.id));
    const to = parseDragId(String(over.id));
    if (!from || !to || from.kind !== to.kind) return;

    if (from.kind === 'group' && to.kind === 'group') {
      const oldIndex = groups.findIndex((g) => g.id === from.groupId);
      const newIndex = groups.findIndex((g) => g.id === to.groupId);
      if (oldIndex < 0 || newIndex < 0) return;
      commit(arrayMove(groups, oldIndex, newIndex));
      return;
    }

    if (from.kind === 'item' && to.kind === 'item') {
      if (from.groupId !== to.groupId) return;
      const nextGroups = groups.map((group) => {
        if (group.id !== from.groupId) return group;
        const oldIndex = group.items.findIndex((i) => i.id === from.itemId);
        const newIndex = group.items.findIndex((i) => i.id === to.itemId);
        if (oldIndex < 0 || newIndex < 0) return group;
        return { ...group, items: arrayMove(group.items, oldIndex, newIndex) };
      });
      commit(nextGroups);
      return;
    }

    if (from.kind === 'child' && to.kind === 'child') {
      if (from.parentId !== to.parentId) return;
      const nextGroups = groups.map((group) => ({
        ...group,
        items: group.items.map((item) => ({
          ...item,
          children: reorderChildrenInTree(
            item.children,
            item.id,
            from.parentId,
            from.childId,
            to.childId,
          ),
        })),
      }));
      commit(nextGroups);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <PanelLeft className="size-4 text-primary" />
            Sidebar order
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            Drag groups and menus for the whole workspace. Order statuses (Pending,
            Confirm, …) are ordered on{' '}
            <span className="font-medium text-foreground">Settings → Order statuses</span>{' '}
            — sidebar and nested tabs both follow that list.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={onReset}
        >
          Reset order
        </Button>
      </CardHeader>
      <CardContent>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={onDragEnd}
        >
          <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">
              {groups.map((group) => (
                <div key={group.id} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <SortableRow id={groupDragId(group.id)} label={group.label} muted />
                  <div className="space-y-1.5 pl-1">
                    {group.items.map((item) => (
                      <div key={item.id} className="space-y-1.5">
                        <SortableRow
                          id={itemDragId(group.id, item.id)}
                          label={item.title}
                        />
                        <ChildTree parentId={item.id} nodes={item.children} depth={1} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>
      </CardContent>
    </Card>
  );
}
