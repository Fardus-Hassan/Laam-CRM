'use client';

import * as React from 'react';
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
import { loadSmsTemplates } from '@/features/orders/data/mock-sms-templates';

type OrderSmsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  customerPhone: string;
  customerName: string;
};

export function OrderSmsDialog({
  open,
  onOpenChange,
  orderNumber,
  customerPhone,
  customerName,
}: OrderSmsDialogProps) {
  const templates = React.useMemo(() => loadSmsTemplates(), []);
  const options = templates.map((t) => ({ value: t.id, label: t.label }));
  const [templateId, setTemplateId] = React.useState(templates[0]?.id ?? '');
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    const template = templates.find((t) => t.id === templateId) ?? templates[0];
    if (!template) return;
    setMessage(
      template.message
        .replace(/\{order_number\}/gi, orderNumber)
        .replace(/\{customer_name\}/gi, customerName)
        .replace(/\{phone\}/gi, customerPhone),
    );
  }, [open, templateId, templates, orderNumber, customerName, customerPhone]);

  function handleSend() {
    toast.success(`SMS queued to ${customerPhone}`);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send SMS — {orderNumber}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <FormField label="Template">
            <FormSearchSelect
              value={templateId}
              options={options}
              onChange={setTemplateId}
            />
          </FormField>
          <FormField label="Message">
            <FormTextarea rows={4} value={message} onChange={(e) => setMessage(e.target.value)} />
          </FormField>
          <p className="text-xs text-muted-foreground">To: {customerPhone}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="button" onClick={handleSend} disabled={!message.trim()}>Send SMS</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
