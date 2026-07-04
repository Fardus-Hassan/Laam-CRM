'use client';

import { Copy, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { FormInput, type FormInputProps } from './form-input';

type FormPhoneInputProps = Omit<FormInputProps, 'type'> & {
  showWhatsapp?: boolean;
  showCall?: boolean;
  showCopy?: boolean;
  dialPrefix?: string;
  copyToastMessage?: string;
  /** `stacked` puts action buttons below the phone field to save horizontal space. */
  layout?: 'inline' | 'stacked';
};

function normalizePhone(value: string, dialPrefix: string) {
  const digits = value.replace(/\D/g, '');
  if (!digits) {
    return '';
  }

  if (digits.startsWith(dialPrefix)) {
    return digits;
  }

  if (digits.startsWith('0')) {
    return `${dialPrefix}${digits.slice(1)}`;
  }

  return `${dialPrefix}${digits}`;
}

export function FormPhoneInput({
  className,
  value,
  showWhatsapp = true,
  showCall = true,
  showCopy = true,
  dialPrefix = '88',
  copyToastMessage = 'Mobile number copied',
  layout = 'inline',
  disabled,
  ...props
}: FormPhoneInputProps) {
  const phone = typeof value === 'string' ? value : String(value ?? '');
  const hasPhone = phone.trim().length > 0;
  const actionsDisabled = disabled || !hasPhone;

  function openWhatsapp() {
    const normalized = normalizePhone(phone, dialPrefix);
    if (!normalized) {
      return;
    }

    window.open(`https://wa.me/${normalized}`, '_blank');
  }

  function openCall() {
    if (!hasPhone) {
      return;
    }

    window.open(`tel:${phone}`, '_self');
  }

  function copyPhone() {
    if (!hasPhone) {
      return;
    }

    void navigator.clipboard.writeText(phone);
    toast.success(copyToastMessage);
  }

  const actionButtons = (
    <>
      {showWhatsapp ? (
        <Button
          type="button"
          variant="outline"
          className="size-7 shrink-0 p-0"
          disabled={actionsDisabled}
          onClick={openWhatsapp}
          aria-label="WhatsApp"
        >
          <MessageCircle className="size-3.5 text-primary" />
        </Button>
      ) : null}
      {showCall ? (
        <Button
          type="button"
          variant="outline"
          className="size-7 shrink-0 p-0"
          disabled={actionsDisabled}
          onClick={openCall}
          aria-label="Call"
        >
          <Phone className="size-3.5" />
        </Button>
      ) : null}
      {showCopy ? (
        <Button
          type="button"
          variant="outline"
          className="size-7 shrink-0 p-0"
          disabled={actionsDisabled}
          onClick={copyPhone}
          aria-label="Copy"
        >
          <Copy className="size-3.5" />
        </Button>
      ) : null}
    </>
  );

  if (layout === 'stacked') {
    const hasActions = showWhatsapp || showCall || showCopy;
    return (
      <div className="space-y-1" data-no-drag-scroll>
        <FormInput
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={value}
          disabled={disabled}
          className={cn('w-full', className)}
          {...props}
        />
        {hasActions ? <div className="flex gap-1">{actionButtons}</div> : null}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 gap-1" data-no-drag-scroll>
      <FormInput
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        disabled={disabled}
        className={cn('min-w-0 flex-1', className)}
        {...props}
      />
      {actionButtons}
    </div>
  );
}
