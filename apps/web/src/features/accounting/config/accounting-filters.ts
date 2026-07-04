import type { ExpenseCategory, IncomeCategory, PaymentMethod } from '@laam/types';

export const INCOME_FILTERS = [
  { id: 'all', label: 'All income' },
  { id: 'this_month', label: 'This month' },
  { id: 'order_sales', label: 'Order sales' },
  { id: 'other', label: 'Other' },
] as const;

export const EXPENSE_FILTERS = [
  { id: 'all', label: 'All expenses' },
  { id: 'this_month', label: 'This month' },
  { id: 'courier', label: 'Courier' },
  { id: 'ads', label: 'Ads' },
  { id: 'other', label: 'Other' },
] as const;

export const INCOME_CATEGORIES: { id: IncomeCategory; label: string }[] = [
  { id: 'order_sales', label: 'Order sales' },
  { id: 'cod_collection', label: 'COD collection' },
  { id: 'bkash_payment', label: 'bKash / digital' },
  { id: 'other_income', label: 'Other income' },
  { id: 'refund_reversal', label: 'Refund reversal' },
];

export const EXPENSE_CATEGORIES: { id: ExpenseCategory; label: string }[] = [
  { id: 'courier', label: 'Courier' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'facebook_ads', label: 'Facebook ads' },
  { id: 'purchase_payment', label: 'Purchase payment' },
  { id: 'salary', label: 'Salary' },
  { id: 'rent', label: 'Rent' },
  { id: 'utilities', label: 'Utilities' },
  { id: 'product_cost', label: 'Product cost (COGS)' },
  { id: 'inventory_writeoff', label: 'Inventory write-off' },
  { id: 'other_expense', label: 'Other expense' },
];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  bkash: 'bKash',
  nagad: 'Nagad',
  bank: 'Bank transfer',
  card: 'Card',
  cod: 'COD',
};

export const ACCOUNT_TYPE_LABELS = {
  asset: 'Asset',
  liability: 'Liability',
  equity: 'Equity',
  income: 'Income',
  expense: 'Expense',
} as const;

export const RECEIVABLE_STATUS_LABELS = {
  pending: 'Pending',
  partial: 'Partial',
  overdue: 'Overdue',
  collected: 'Collected',
} as const;

export const PAYABLE_STATUS_LABELS = {
  pending: 'Pending',
  partial: 'Partial',
  overdue: 'Overdue',
  paid: 'Paid',
} as const;
