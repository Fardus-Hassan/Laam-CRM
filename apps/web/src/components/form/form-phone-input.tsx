'use client';

import { Copy, MessageSquare, Phone } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { FORM_CONTROL_HEIGHT_CLASS } from './form-control';
import { FormInput, type FormInputProps } from './form-input';

type FormPhoneInputProps = Omit<FormInputProps, 'type'> & {
  showWhatsapp?: boolean;
  showSms?: boolean;
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

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.85 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function FormPhoneInput({
  className,
  value,
  showWhatsapp = true,
  showSms = true,
  showCall = true,
  showCopy = true,
  dialPrefix = '88',
  copyToastMessage = 'Mobile number copied',
  layout = 'inline',
  disabled,
  readOnly,
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

    window.open(`https://wa.me/${normalized}`, '_blank', 'noopener,noreferrer');
  }

  function openSms() {
    if (!hasPhone) {
      return;
    }

    window.open(`sms:${phone}`, '_self');
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

  const actionBtnClass = 'size-6 shrink-0 p-0';

  // Order: Copy → SMS → Call → WhatsApp
  const actionButtons = (
    <>
      {showCopy ? (
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={actionsDisabled}
          onClick={copyPhone}
          aria-label="Copy"
        >
          <Copy className="size-3" />
        </Button>
      ) : null}
      {showSms ? (
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={actionsDisabled}
          onClick={openSms}
          aria-label="SMS"
        >
          <MessageSquare className="size-3" />
        </Button>
      ) : null}
      {showCall ? (
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={actionsDisabled}
          onClick={openCall}
          aria-label="Call"
        >
          <Phone className="size-3" />
        </Button>
      ) : null}
      {showWhatsapp ? (
        <Button
          type="button"
          variant="outline"
          className={actionBtnClass}
          disabled={actionsDisabled}
          onClick={openWhatsapp}
          aria-label="WhatsApp"
        >
          <WhatsAppIcon className="size-3 text-[#25D366]" />
        </Button>
      ) : null}
    </>
  );

  const hasActions = showCopy || showSms || showCall || showWhatsapp;

  // Read-only display: size-to-content text (inputs clip and ignore value width).
  const phoneField = readOnly ? (
    <span
      className={cn(
        FORM_CONTROL_HEIGHT_CLASS,
        'inline-flex w-max max-w-none shrink-0 items-center whitespace-nowrap rounded-md border border-input bg-background px-2 text-sm tabular-nums shadow-xs dark:bg-input/30',
        className,
      )}
      title={hasPhone ? phone : undefined}
    >
      {hasPhone ? phone : '—'}
    </span>
  ) : (
    <FormInput
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      value={value}
      disabled={disabled}
      className={cn(layout === 'inline' ? 'min-w-0 flex-1' : 'w-full', className)}
      {...props}
    />
  );

  if (layout === 'stacked') {
    return (
      <div className="space-y-1" data-no-drag-scroll>
        {phoneField}
        {hasActions ? <div className="flex gap-0.5">{actionButtons}</div> : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex shrink-0 items-center gap-0.5 whitespace-nowrap',
        readOnly ? 'w-max' : 'min-w-0',
      )}
      data-no-drag-scroll
    >
      {phoneField}
      {actionButtons}
    </div>
  );
}
