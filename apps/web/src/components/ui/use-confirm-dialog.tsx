'use client';

import * as React from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export type ConfirmOptions = {
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
};

type PendingConfirm = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

/**
 * Promise-based confirm that uses the app ConfirmDialog (never window.confirm).
 *
 * Usage:
 * ```tsx
 * const { confirm, confirmDialog } = useConfirmDialog();
 * const ok = await confirm({ title: '…', description: '…', destructive: true });
 * if (!ok) return;
 * // …
 * return <>{children}{confirmDialog}</>;
 * ```
 */
export function useConfirmDialog() {
  const [pending, setPending] = React.useState<PendingConfirm | null>(null);

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setPending({
        title: options.title,
        description: options.description,
        confirmLabel: options.confirmLabel ?? 'Confirm',
        destructive: options.destructive ?? false,
        resolve,
      });
    });
  }, []);

  const close = React.useCallback((value: boolean) => {
    setPending((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const confirmDialog = (
    <ConfirmDialog
      open={Boolean(pending)}
      onOpenChange={(open) => {
        if (!open) close(false);
      }}
      title={pending?.title ?? ''}
      description={pending?.description ?? ''}
      confirmLabel={pending?.confirmLabel ?? 'Confirm'}
      destructive={pending?.destructive}
      onConfirm={() => {
        close(true);
      }}
    />
  );

  return { confirm, confirmDialog };
}
