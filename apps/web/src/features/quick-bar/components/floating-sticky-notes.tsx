'use client';

import * as React from 'react';
import { GripVertical, Minus, Trash2, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  STICKY_COLORS,
  STICKY_MAX_HEIGHT,
  STICKY_MAX_WIDTH,
  STICKY_MIN_HEIGHT,
  STICKY_MIN_WIDTH,
  bringStickyNoteToFront,
  deleteStickyNote,
  listStuckNotes,
  updateStickyNote,
  type StickyNote,
  type StickyNoteColor,
} from '@/features/quick-bar/data/quick-bar-store';
import { cn } from '@/lib/utils';

const COLORS: StickyNoteColor[] = ['yellow', 'pink', 'blue', 'green', 'purple'];

type FloatingStickyNotesProps = {
  version: number;
  onChange?: () => void;
};

export function FloatingStickyNotes({ version, onChange }: FloatingStickyNotesProps) {
  const [notes, setNotes] = React.useState<StickyNote[]>([]);

  React.useEffect(() => {
    setNotes(listStuckNotes());
  }, [version]);

  function refresh(next: StickyNote[]) {
    setNotes(next.filter((n) => n.stuck));
    onChange?.();
  }

  if (!notes.length) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-30 overflow-hidden">
      {notes.map((note) => (
        <DraggableStickyNote
          key={note.id}
          note={note}
          onUpdate={(patch) => refresh(updateStickyNote(note.id, patch))}
          onFocus={() => refresh(bringStickyNoteToFront(note.id))}
          onDelete={() => refresh(deleteStickyNote(note.id))}
        />
      ))}
    </div>
  );
}

function DraggableStickyNote({
  note,
  onUpdate,
  onFocus,
  onDelete,
}: {
  note: StickyNote;
  onUpdate: (patch: Partial<StickyNote>) => void;
  onFocus: () => void;
  onDelete: () => void;
}) {
  const [dragging, setDragging] = React.useState(false);
  const [resizing, setResizing] = React.useState(false);
  const dragOffset = React.useRef({ x: 0, y: 0 });
  const resizeStart = React.useRef({ x: 0, y: 0, width: 0, height: 0 });
  const noteRef = React.useRef<HTMLDivElement>(null);

  const width = note.minimized ? Math.min(note.width, 180) : note.width;
  const height = note.minimized ? 44 : note.height;

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
    onFocus();
    const el = noteRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setDragging(true);
    el.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (dragging) {
      const left = e.clientX - dragOffset.current.x;
      const top = e.clientY - dragOffset.current.y;
      const x = Math.min(88, Math.max(0, (left / window.innerWidth) * 100));
      const y = Math.min(82, Math.max(0, (top / window.innerHeight) * 100));
      onUpdate({ x, y });
      return;
    }
    if (resizing) {
      const dw = e.clientX - resizeStart.current.x;
      const dh = e.clientY - resizeStart.current.y;
      onUpdate({
        width: Math.min(STICKY_MAX_WIDTH, Math.max(STICKY_MIN_WIDTH, resizeStart.current.width + dw)),
        height: Math.min(STICKY_MAX_HEIGHT, Math.max(STICKY_MIN_HEIGHT, resizeStart.current.height + dh)),
      });
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging && !resizing) return;
    setDragging(false);
    setResizing(false);
    try {
      noteRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const onResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    onFocus();
    resizeStart.current = {
      x: e.clientX,
      y: e.clientY,
      width: note.width,
      height: note.height,
    };
    setResizing(true);
    noteRef.current?.setPointerCapture(e.pointerId);
  };

  return (
    <div
      ref={noteRef}
      className={cn(
        'pointer-events-auto absolute touch-none rounded-xl border shadow-lg transition-[box-shadow,transform] duration-200',
        STICKY_COLORS[note.color],
        dragging || resizing ? 'scale-[1.01] shadow-2xl' : 'shadow-md hover:shadow-xl',
        dragging && 'cursor-grabbing',
        !dragging && !resizing && 'cursor-grab',
      )}
      style={{
        left: `${note.x}%`,
        top: `${note.y}%`,
        width,
        height,
        zIndex: note.zIndex,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <div className="flex h-9 shrink-0 items-center gap-0.5 overflow-hidden border-b border-black/5 px-1.5 dark:border-white/10">
        <GripVertical className="size-3.5 shrink-0 opacity-50" />
        <span className="min-w-0 flex-1 truncate text-[10px] font-medium opacity-60">Note</span>
        <div className="flex shrink-0 items-center gap-0.5" data-no-drag>
          <div className="mr-0.5 hidden gap-0.5 sm:flex">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={cn(
                  'size-2.5 rounded-full border border-black/10 transition-transform hover:scale-110',
                  c === 'yellow' && 'bg-amber-300',
                  c === 'pink' && 'bg-pink-300',
                  c === 'blue' && 'bg-sky-300',
                  c === 'green' && 'bg-emerald-300',
                  c === 'purple' && 'bg-violet-300',
                  note.color === c && 'ring-2 ring-foreground/40',
                )}
                onClick={() => onUpdate({ color: c })}
                aria-label={`Color ${c}`}
              />
            ))}
          </div>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            onClick={() => onUpdate({ minimized: !note.minimized })}
            aria-label="Minimize"
          >
            <Minus className="size-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            onClick={() => onUpdate({ stuck: false })}
            aria-label="Unstick"
            title="Remove from screen"
          >
            <X className="size-3" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="size-6 shrink-0 text-destructive"
            onClick={onDelete}
            aria-label="Delete"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      {!note.minimized ? (
        <>
          <textarea
            data-no-drag
            className="h-[calc(100%-2.25rem)] w-full resize-none bg-transparent px-3 py-2 text-sm outline-none placeholder:opacity-40"
            placeholder="Type a note…"
            value={note.text}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onFocus={onFocus}
          />
          {/* Resize handle — bottom-right corner */}
          <div
            data-no-drag
            className={cn(
              'absolute bottom-0 right-0 flex size-5 cursor-se-resize items-end justify-end rounded-br-xl p-0.5 opacity-50 transition-opacity hover:opacity-100',
              resizing && 'opacity-100',
            )}
            onPointerDown={onResizePointerDown}
            title="Drag to resize"
            aria-label="Resize note"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" className="opacity-70">
              <path d="M9 1 L9 9 L1 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
              <path d="M9 5 L5 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
        </>
      ) : (
        <p className="truncate px-3 py-1 text-xs opacity-70">{note.text || 'Empty note'}</p>
      )}
    </div>
  );
}
