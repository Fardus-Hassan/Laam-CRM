/**
 * Standard BD SME chart of accounts used by inventory + accounting.
 * Keep codes stable — inventory journals hard-reference these.
 */
export const STANDARD_COA = [
  { code: '1000', name: 'Cash on Hand', type: 'asset', cashKind: 'cash' },
  { code: '1010', name: 'bKash', type: 'asset', cashKind: 'bkash' },
  { code: '1020', name: 'Nagad', type: 'asset', cashKind: 'nagad' },
  { code: '1030', name: 'Bank Account', type: 'asset', cashKind: 'bank' },
  { code: '1100', name: 'Accounts Receivable', type: 'asset', cashKind: null },
  { code: '1200', name: 'Inventory Stock', type: 'asset', cashKind: null },
  { code: '2000', name: 'Accounts Payable', type: 'liability', cashKind: null },
  { code: '3000', name: 'Owner Equity', type: 'equity', cashKind: null },
  { code: '4000', name: 'Sales Revenue', type: 'income', cashKind: null },
  { code: '4100', name: 'Other Income', type: 'income', cashKind: null },
  { code: '5000', name: 'Cost of Goods Sold', type: 'expense', cashKind: null },
  { code: '5100', name: 'Courier Expense', type: 'expense', cashKind: null },
  { code: '5200', name: 'Packaging Expense', type: 'expense', cashKind: null },
  { code: '5210', name: 'Facebook Ads', type: 'expense', cashKind: null },
  { code: '5220', name: 'Salary', type: 'expense', cashKind: null },
  { code: '5230', name: 'Rent', type: 'expense', cashKind: null },
  { code: '5240', name: 'Utilities', type: 'expense', cashKind: null },
  { code: '5299', name: 'Other Expense', type: 'expense', cashKind: null },
  { code: '5300', name: 'Inventory Write-off', type: 'expense', cashKind: null },
  { code: '5400', name: 'Inventory Reconciliation Adj', type: 'expense', cashKind: null },
] as const;

export type StandardAccountCode = (typeof STANDARD_COA)[number]['code'];

export const ACCOUNT_BY_CODE = Object.fromEntries(
  STANDARD_COA.map((a) => [a.code, a]),
) as Record<string, (typeof STANDARD_COA)[number]>;

export function cashAccountForPaymentMethod(method: string): {
  code: string;
  name: string;
} {
  switch (method) {
    case 'bkash':
      return { code: '1010', name: ACCOUNT_BY_CODE['1010']!.name };
    case 'nagad':
      return { code: '1020', name: ACCOUNT_BY_CODE['1020']!.name };
    case 'bank':
    case 'card':
      return { code: '1030', name: ACCOUNT_BY_CODE['1030']!.name };
    case 'cod':
      return { code: '1100', name: ACCOUNT_BY_CODE['1100']!.name };
    case 'cash':
    default:
      return { code: '1000', name: ACCOUNT_BY_CODE['1000']!.name };
  }
}

export function incomeCreditAccount(category: string): { code: string; name: string } {
  if (category === 'order_sales' || category === 'cod_collection' || category === 'bkash_payment') {
    return { code: '4000', name: ACCOUNT_BY_CODE['4000']!.name };
  }
  return { code: '4100', name: ACCOUNT_BY_CODE['4100']!.name };
}

export function expenseDebitAccount(category: string): { code: string; name: string } {
  const map: Record<string, string> = {
    courier: '5100',
    packaging: '5200',
    facebook_ads: '5210',
    salary: '5220',
    rent: '5230',
    utilities: '5240',
    product_cost: '5000',
    inventory_writeoff: '5300',
    purchase_payment: '2000',
    other_expense: '5299',
  };
  const code = map[category] ?? '5299';
  return { code, name: ACCOUNT_BY_CODE[code]?.name ?? 'Other Expense' };
}
