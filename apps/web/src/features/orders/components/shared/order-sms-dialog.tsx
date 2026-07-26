'use client';

import * as React from 'react';
import type { OrderDetail } from '@laam/types';
import { toast } from 'sonner';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import { FormTextarea } from '@/components/form/form-textarea';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { orderSmsApi, smsSettingsApi } from '@/features/settings/api/sms-settings-api';

type OrderSmsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Pick<
    OrderDetail,
    'id' | 'orderNumber' | 'customerPhone' | 'customerName' | 'courierConsignmentId'
  >;
};

function applyPlaceholders(
  template: string,
  order: OrderSmsDialogProps['order'],
  businessName = 'Laam',
): string {
  return template
    .replaceAll('{customer_name}', order.customerName)
    .replaceAll('{invoice_id}', order.orderNumber)
    .replaceAll('{order_number}', order.orderNumber)
    .replaceAll('{phone}', order.customerPhone)
    .replaceAll('{business_name}', businessName)
    .replaceAll('{courier_invoice}', order.courierConsignmentId ?? '')
    .replaceAll('[customer_name]', order.customerName)
    .replaceAll('[invoice_id]', order.orderNumber)
    .replaceAll('[business_name]', businessName);
}

export function OrderSmsDialog({ open, onOpenChange, order }: OrderSmsDialogProps) {
  const [templates, setTemplates] = React.useState<
    Array<{ id: string; label: string; message: string }>
  >([]);
  const [templateId, setTemplateId] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [sending, setSending] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void smsSettingsApi
      .listTemplates()
      .then((list) => {
        if (cancelled) return;
        const enabled = list.filter((t) => t.enabled);
        setTemplates(enabled.map((t) => ({ id: t.id, label: t.label, message: t.message })));
        const first = enabled[0];
        if (first) {
          setTemplateId(first.id);
          setMessage(applyPlaceholders(first.message || '', order));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
          setMessage(`Hi ${order.customerName}, regarding order ${order.orderNumber}.`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [open, order]);

  React.useEffect(() => {
    if (!open || !templateId) return;
    const template = templates.find((t) => t.id === templateId);
    if (!template) return;
    setMessage(applyPlaceholders(template.message || '', order));
  }, [templateId, templates, open, order]);

  async function handleSend() {
    if (!message.trim()) {
      toast.error('Enter a message');
      return;
    }
    setSending(true);
    try {
      const result = await orderSmsApi.send(order.id, {
        message: message.trim(),
        templateId: templateId || undefined,
      });
      toast.success(result.message || `SMS sent to ${result.toPhone}`);
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'SMS failed');
    } finally {
      setSending(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send SMS — {order.orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {templates.length > 0 ? (
            <FormField label="Template">
              <FormSearchSelect
                value={templateId}
                options={templates.map((t) => ({ value: t.id, label: t.label }))}
                onChange={setTemplateId}
              />
            </FormField>
          ) : null}
          <FormField label="Message">
            <FormTextarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">Count: {message.length}</p>
          </FormField>
          <p className="text-xs text-muted-foreground">To: {order.customerPhone}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={!message.trim() || sending}
          >
            {sending ? 'Sending…' : 'Send SMS'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
