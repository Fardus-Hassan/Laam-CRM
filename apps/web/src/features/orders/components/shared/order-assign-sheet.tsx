'use client';

import * as React from 'react';

import { FormField } from '@/components/form/form-field';
import { FormSearchSelect } from '@/components/form/form-search-select';
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const EMPLOYEES = ['Sakib Ahmed', 'Mitu Rahman', 'Imran Hossain', 'Tania Sultana', 'Arif Mahmud'];

type OrderAssignSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssign: (employeeName: string) => void | Promise<void>;
};

export function OrderAssignSheet({ open, onOpenChange, onAssign }: OrderAssignSheetProps) {
  const [employee, setEmployee] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  async function handleSubmit() {
    if (!employee) return;
    setSaving(true);
    try {
      await onAssign(employee);
      onOpenChange(false);
      setEmployee('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Assign agent</SheetTitle>
        </SheetHeader>
        <FormField label="Employee" className="mt-4">
          <FormSearchSelect
            value={employee}
            onChange={setEmployee}
            options={EMPLOYEES.map((name) => ({ value: name, label: name }))}
            placeholder="Search employee"
          />
        </FormField>
        <SheetFooter className="mt-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={!employee || saving} onClick={() => void handleSubmit()}>
            Assign
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
