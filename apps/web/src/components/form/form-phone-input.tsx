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

  return (
    <div className="flex min-w-0 gap-1">
      <FormInput
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={value}
        disabled={disabled}
        className={cn('min-w-0 flex-1', className)}
        {...props}
      />
      {showWhatsapp ? (
        <Button
          type="button"
          variant="outline"
          className="size-7 shrink-0 p-0"
          disabled={actionsDisabled}
          onClick={openWhatsapp}
          aria-label="WhatsApp"
        >
          <MessageCircle className="size-3.5 text-emerald-600" />
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
    </div>
  );
}
