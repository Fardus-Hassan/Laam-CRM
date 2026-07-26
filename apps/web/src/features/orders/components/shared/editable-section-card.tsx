'use client';

import * as React from 'react';
import { Pencil, X, Check } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { cn } from '@/lib/utils';

type EditableSectionCardProps = {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  editContent?: React.ReactNode;
  canEdit?: boolean;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
  className?: string;
  headerExtra?: React.ReactNode;
};

export function EditableSectionCard({
  title,
  icon,
  children,
  editContent,
  canEdit = true,
  onSave,
  onCancel,
  className,
  headerExtra,
}: EditableSectionCardProps) {
  const [editing, setEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave?.();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    onCancel?.();
    setEditing(false);
  }

  return (
    <Card className={cn('gap-0 py-0 shadow-none', className)}>
      <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between gap-2')}>
        <CardTitle className="flex min-w-0 items-center gap-2 text-sm">
          {icon}
          <span className="truncate">{title}</span>
        </CardTitle>
        <div className="flex shrink-0 items-center gap-1">
          {headerExtra}
          {canEdit && editContent ? (
            editing ? (
              <>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2"
                  onClick={handleCancel}
                  disabled={saving}
                >
                  <X className="size-3.5" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="h-7 px-2"
                  onClick={handleSave}
                  disabled={saving}
                >
                  <Check className="size-3.5" />
                </Button>
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
                Edit
              </Button>
            )
          ) : null}
        </div>
      </CardHeader>
      <CardContent className={cn('space-y-3', ORDER_SECTION_BODY_CLASS)}>
        {editing && editContent ? editContent : children}
      </CardContent>
    </Card>
  );
}
