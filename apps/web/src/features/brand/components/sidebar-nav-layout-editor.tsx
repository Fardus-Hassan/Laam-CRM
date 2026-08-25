'use client';

import * as React from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { SidebarNavLayout } from '@laam/types';
import {
  Eye,
  EyeOff,
  FolderPlus,
  GripVertical,
  PanelLeft,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { getUniversalNavRegistry } from '@/features/navigation/config/universal-nav-registry';
import {
  AVAILABLE_POOL_ID,
  buildDefaultSidebarNavLayout,
  indexRegistryNodes,
  isCustomFolderId,
  isCustomSectionId,
  listUnplacedRegistryIds,
  newCustomFolderId,
  newCustomSectionId,
  normalizeSidebarNavLayout,
} from '@/features/navigation/lib/sidebar-nav-layout';
import { cn } from '@/lib/utils';

type Props = {
  value: SidebarNavLayout | null;
  onChange: (next: SidebarNavLayout) => void;
  onReset: () => void;
};

type DragKind = 'section' | 'folder' | 'child' | 'available';

function titleForRegistryId(id: string): string {
  const index = indexRegistryNodes(getUniversalNavRegistry());
  return index.get(id)?.title ?? id;
}

function SortableRow({
  id,
  children,
  className,
}: {
  id: string;
  children: React.ReactNode;
  className?: string;
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
        'rounded-lg border border-transparent bg-white/5',
        isDragging && 'opacity-60 ring-1 ring-white/20',
        className,
      )}
    >
      <div className="flex items-start gap-2 p-2">
        <button
          type="button"
          className="mt-1.5 shrink-0 cursor-grab touch-none text-white/40 hover:text-white/80 active:cursor-grabbing"
          aria-label="Drag"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function SidebarNavLayoutEditor({ value, onChange, onReset }: Props) {
  const defaults = React.useMemo(
    () => buildDefaultSidebarNavLayout(getUniversalNavRegistry()),
    [],
  );
  const layout = React.useMemo(
    () => normalizeSidebarNavLayout(value, defaults),
    [value, defaults],
  );
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const hidden = new Set(layout.hiddenIds);
  const availableIds = React.useMemo(
    () => listUnplacedRegistryIds(getUniversalNavRegistry(), layout),
    [layout],
  );

  function commit(next: SidebarNavLayout) {
    onChange(next);
  }

  function renameSection(sectionId: string, label: string) {
    commit({
      ...layout,
      sections: layout.sections.map((section) =>
        section.id === sectionId ? { ...section, label } : section,
      ),
    });
  }

  function renameFolder(folderId: string, label: string) {
    commit({
      ...layout,
      folders: layout.folders.map((folder) =>
        folder.id === folderId ? { ...folder, label } : folder,
      ),
    });
  }

  function addSection() {
    const id = newCustomSectionId();
    commit({
      ...layout,
      sections: [...layout.sections, { id, label: 'New section' }],
    });
  }

  function addFolder(sectionId: string) {
    const id = newCustomFolderId();
    commit({
      ...layout,
      folders: [
        ...layout.folders,
        { id, sectionId, label: 'New folder', iconFromId: 'orders' },
      ],
      childrenByFolderId: { ...layout.childrenByFolderId, [id]: [] },
    });
  }

  function removeSection(sectionId: string) {
    if (!isCustomSectionId(sectionId)) return;
    const folderIds = layout.folders
      .filter((folder) => folder.sectionId === sectionId)
      .map((folder) => folder.id);
    const childrenByFolderId = { ...layout.childrenByFolderId };
    for (const folderId of folderIds) delete childrenByFolderId[folderId];
    commit({
      ...layout,
      sections: layout.sections.filter((section) => section.id !== sectionId),
      folders: layout.folders.filter((folder) => folder.sectionId !== sectionId),
      childrenByFolderId,
    });
  }

  function removeFolder(folderId: string) {
    if (!isCustomFolderId(folderId)) return;
    const childrenByFolderId = { ...layout.childrenByFolderId };
    delete childrenByFolderId[folderId];
    commit({
      ...layout,
      folders: layout.folders.filter((folder) => folder.id !== folderId),
      childrenByFolderId,
    });
  }

  function toggleHidden(childId: string) {
    const set = new Set(layout.hiddenIds);
    if (set.has(childId)) set.delete(childId);
    else set.add(childId);
    commit({ ...layout, hiddenIds: [...set] });
  }

  function parseDragId(id: string): { kind: DragKind; key: string } | null {
    if (id.startsWith('sec:')) return { kind: 'section', key: id.slice(4) };
    if (id.startsWith('fld:')) return { kind: 'folder', key: id.slice(4) };
    if (id.startsWith('chd:')) return { kind: 'child', key: id.slice(4) };
    if (id.startsWith('avl:')) return { kind: 'available', key: id.slice(4) };
    if (id === `fld:${AVAILABLE_POOL_ID}`) {
      return { kind: 'folder', key: AVAILABLE_POOL_ID };
    }
    return null;
  }

  function onDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const active = parseDragId(String(event.active.id));
    const over = event.over ? parseDragId(String(event.over.id)) : null;
    if (!active || !over) return;

    if (active.kind === 'section' && over.kind === 'section') {
      const ids = layout.sections.map((section) => section.id);
      const oldIndex = ids.indexOf(active.key);
      const newIndex = ids.indexOf(over.key);
      if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
      commit({
        ...layout,
        sections: arrayMove(layout.sections, oldIndex, newIndex),
      });
      return;
    }

    if (active.kind === 'folder' && over.kind === 'folder') {
      if (active.key === AVAILABLE_POOL_ID || over.key === AVAILABLE_POOL_ID) return;
      const activeFolder = layout.folders.find((folder) => folder.id === active.key);
      const overFolder = layout.folders.find((folder) => folder.id === over.key);
      if (!activeFolder || !overFolder) return;

      if (activeFolder.sectionId === overFolder.sectionId) {
        const sectionFolders = layout.folders.filter(
          (folder) => folder.sectionId === activeFolder.sectionId,
        );
        const others = layout.folders.filter(
          (folder) => folder.sectionId !== activeFolder.sectionId,
        );
        const ids = sectionFolders.map((folder) => folder.id);
        const oldIndex = ids.indexOf(active.key);
        const newIndex = ids.indexOf(over.key);
        if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;
        const reordered = arrayMove(sectionFolders, oldIndex, newIndex);
        commit({ ...layout, folders: [...others, ...reordered] });
        return;
      }

      // Move folder to another section (place near over folder)
      const without = layout.folders.filter((folder) => folder.id !== active.key);
      const targetSectionFolders = without.filter(
        (folder) => folder.sectionId === overFolder.sectionId,
      );
      const rest = without.filter(
        (folder) => folder.sectionId !== overFolder.sectionId,
      );
      const overIndex = targetSectionFolders.findIndex(
        (folder) => folder.id === over.key,
      );
      const moved = { ...activeFolder, sectionId: overFolder.sectionId };
      targetSectionFolders.splice(Math.max(overIndex, 0), 0, moved);
      commit({ ...layout, folders: [...rest, ...targetSectionFolders] });
      return;
    }

    const isChildDrag =
      active.kind === 'child' || active.kind === 'available';
    const isChildDrop =
      over.kind === 'child' ||
      over.kind === 'available' ||
      over.kind === 'folder';

    if (isChildDrag && isChildDrop) {
      const fromFolderId =
        active.kind === 'available'
          ? AVAILABLE_POOL_ID
          : Object.entries(layout.childrenByFolderId).find(([, ids]) =>
              ids.includes(active.key),
            )?.[0];
      if (!fromFolderId) return;

      const toFolderId =
        over.kind === 'folder'
          ? over.key
          : over.kind === 'available'
            ? AVAILABLE_POOL_ID
            : Object.entries(layout.childrenByFolderId).find(([, ids]) =>
                ids.includes(over.key),
              )?.[0] ??
              (availableIds.includes(over.key) ? AVAILABLE_POOL_ID : undefined);
      if (!toFolderId) return;

      const childrenByFolderId = { ...layout.childrenByFolderId };

      if (fromFolderId !== AVAILABLE_POOL_ID) {
        childrenByFolderId[fromFolderId] = [
          ...(childrenByFolderId[fromFolderId] ?? []),
        ].filter((id) => id !== active.key);
      }

      if (toFolderId === AVAILABLE_POOL_ID) {
        // Dropping into Available = unplace (remove from folders only)
        commit({ ...layout, childrenByFolderId });
        return;
      }

      const toList = [...(childrenByFolderId[toFolderId] ?? [])].filter(
        (id) => id !== active.key,
      );
      if (over.kind === 'child') {
        const overIndex = toList.indexOf(over.key);
        toList.splice(overIndex < 0 ? toList.length : overIndex, 0, active.key);
      } else {
        toList.push(active.key);
      }
      childrenByFolderId[toFolderId] = toList;
      commit({ ...layout, childrenByFolderId });
    }
  }

  const sectionIds = layout.sections.map((section) => `sec:${section.id}`);

  return (
    <Card className="overflow-hidden border-border/70 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-3">
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <PanelLeft className="size-4 text-muted-foreground" />
            Sidebar layout
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag to reorder. Rename sections and folders. Hide or move child menus —
            child names stay from the app / order statuses. Unplaced menus stay in
            Available below — drag them into any folder.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addSection}>
            <Plus className="size-3.5" />
            Section
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="size-3.5" />
            PDF default
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div
          className="rounded-2xl border border-white/10 p-3 shadow-inner"
          style={{
            background:
              'linear-gradient(180deg, color-mix(in oklab, var(--brand-sidebar-bg-dark, #0B4D2A) 92%, black), var(--brand-sidebar-bg-dark, #0B4D2A))',
            color: 'var(--brand-sidebar-fg, #F6F9F6)',
          }}
        >
          <div className="mb-3 flex items-center gap-2 px-1 text-[11px] font-medium uppercase tracking-wide text-white/50">
            Live preview
          </div>

          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
              <div className="space-y-4">
                {layout.sections.map((section) => {
                  const sectionFolders = layout.folders.filter(
                    (folder) => folder.sectionId === section.id,
                  );
                  const folderSortIds = sectionFolders.map(
                    (folder) => `fld:${folder.id}`,
                  );

                  return (
                    <SortableRow key={section.id} id={`sec:${section.id}`}>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={section.label}
                            placeholder="Section header (empty = hidden)"
                            onChange={(event) =>
                              renameSection(section.id, event.target.value)
                            }
                            className="h-8 border-white/15 bg-white/10 text-xs uppercase tracking-wide text-white placeholder:text-white/35"
                          />
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            className="text-white/70 hover:bg-white/10 hover:text-white"
                            onClick={() => addFolder(section.id)}
                            title="Add folder"
                          >
                            <FolderPlus className="size-3.5" />
                          </Button>
                          {isCustomSectionId(section.id) ? (
                            <Button
                              type="button"
                              size="icon-sm"
                              variant="ghost"
                              className="text-white/70 hover:bg-white/10 hover:text-red-200"
                              onClick={() => removeSection(section.id)}
                              title="Remove section"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          ) : null}
                        </div>

                        <SortableContext
                          items={folderSortIds}
                          strategy={verticalListSortingStrategy}
                        >
                          <div className="space-y-2 pl-1">
                            {sectionFolders.map((folder) => {
                              const childIds =
                                layout.childrenByFolderId[folder.id] ?? [];
                              const childSortIds = childIds.map(
                                (id) => `chd:${id}`,
                              );

                              return (
                                <SortableRow
                                  key={folder.id}
                                  id={`fld:${folder.id}`}
                                  className="bg-black/15"
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        value={folder.label}
                                        onChange={(event) =>
                                          renameFolder(
                                            folder.id,
                                            event.target.value,
                                          )
                                        }
                                        className="h-8 border-white/15 bg-white/10 text-sm font-medium text-white"
                                      />
                                      {isCustomFolderId(folder.id) ? (
                                        <Button
                                          type="button"
                                          size="icon-sm"
                                          variant="ghost"
                                          className="text-white/70 hover:bg-white/10 hover:text-red-200"
                                          onClick={() => removeFolder(folder.id)}
                                        >
                                          <Trash2 className="size-3.5" />
                                        </Button>
                                      ) : null}
                                    </div>

                                    <SortableContext
                                      items={childSortIds}
                                      strategy={verticalListSortingStrategy}
                                    >
                                      <div className="space-y-1 pl-2">
                                        {childIds.map((childId) => {
                                          const isHidden = hidden.has(childId);
                                          return (
                                            <SortableRow
                                              key={childId}
                                              id={`chd:${childId}`}
                                              className="bg-black/20"
                                            >
                                              <div className="flex items-center gap-2">
                                                <span
                                                  className={cn(
                                                    'min-w-0 flex-1 truncate text-sm',
                                                    isHidden &&
                                                      'text-white/35 line-through',
                                                  )}
                                                  title="Child names come from registry / order statuses"
                                                >
                                                  {titleForRegistryId(childId)}
                                                </span>
                                                <Button
                                                  type="button"
                                                  size="icon-sm"
                                                  variant="ghost"
                                                  className="text-white/70 hover:bg-white/10 hover:text-white"
                                                  onClick={() =>
                                                    toggleHidden(childId)
                                                  }
                                                  title={
                                                    isHidden
                                                      ? 'Show in sidebar'
                                                      : 'Hide from sidebar'
                                                  }
                                                >
                                                  {isHidden ? (
                                                    <EyeOff className="size-3.5" />
                                                  ) : (
                                                    <Eye className="size-3.5" />
                                                  )}
                                                </Button>
                                              </div>
                                            </SortableRow>
                                          );
                                        })}
                                        {!childIds.length ? (
                                          <p className="px-2 py-1 text-xs text-white/35">
                                            Drop child menus here
                                          </p>
                                        ) : null}
                                      </div>
                                    </SortableContext>
                                  </div>
                                </SortableRow>
                              );
                            })}
                          </div>
                        </SortableContext>
                      </div>
                    </SortableRow>
                  );
                })}
              </div>
            </SortableContext>

            <div className="mt-4 rounded-xl border border-dashed border-white/25 bg-black/20 p-3">
              <SortableRow
                id={`fld:${AVAILABLE_POOL_ID}`}
                className="border-transparent bg-transparent"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 px-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-200/90">
                      Available (not in sidebar)
                    </p>
                    <span className="text-[10px] text-white/40">
                      {availableIds.length} items
                    </span>
                  </div>
                  <p className="px-1 text-xs text-white/45">
                    Drag into a folder to show in the live sidebar. Drag a child
                    here to unplace it.
                  </p>
                  <SortableContext
                    items={availableIds.map((id) => `avl:${id}`)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="max-h-56 space-y-1 overflow-y-auto pl-1">
                      {availableIds.map((childId) => (
                        <SortableRow
                          key={childId}
                          id={`avl:${childId}`}
                          className="bg-black/25"
                        >
                          <span className="block truncate text-sm text-white/85">
                            {titleForRegistryId(childId)}
                          </span>
                        </SortableRow>
                      ))}
                      {!availableIds.length ? (
                        <p className="px-2 py-1 text-xs text-white/35">
                          Everything is placed in a folder
                        </p>
                      ) : null}
                    </div>
                  </SortableContext>
                </div>
              </SortableRow>
            </div>

            <DragOverlay>
              {activeId ? (
                <div className="rounded-lg bg-emerald-700/90 px-3 py-2 text-sm text-white shadow-lg">
                  Moving…
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      </CardContent>
    </Card>
  );
}
