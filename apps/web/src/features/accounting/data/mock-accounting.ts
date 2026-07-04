import type {
  AccountingOverview,
  BalanceSheetReport,
  CashBankAccount,
  ChartOfAccount,
  CreateExpensePayload,
  CreateIncomePayload,
  CreateJournalPayload,
  ExpenseCategory,
  ExpenseListItem,
  IncomeCategory,
  IncomeListItem,
  LedgerEntry,
  PayableItem,
  ProfitLossReport,
  ReceivableItem,
  TransactionListQuery,
  TransactionListResponse,
} from '@laam/types';

import {
  EXPENSE_CATEGORIES,
  INCOME_FILTERS,
  EXPENSE_FILTERS,
} from '@/features/accounting/config/accounting-filters';

const MOCK_TODAY = '2026-07-02';

const INCOME_DESCS: Record<IncomeCategory, string[]> = {
  order_sales: ['Modhu order payment', 'Khejur combo sale', 'Ramadan gift box order'],
  cod_collection: ['COD collected — Pathao', 'COD handover from courier'],
  bkash_payment: ['bKash payment received', 'Advance bKash from buyer'],
  other_income: ['Packaging material sold', 'Miscellaneous income'],
  refund_reversal: ['Cancelled order refund reversal'],
};

const EXPENSE_DESCS: Record<ExpenseCategory, string[]> = {
  courier: ['Pathao delivery charge', 'Steadfast parcel fee', 'Return courier cost'],
  packaging: ['Gift box purchase', 'Honey jar labels', 'Bubble wrap stock'],
  facebook_ads: ['Facebook ad spend — Ramadan', 'Lead gen campaign'],
  purchase_payment: ['Honey supplier payment', 'Dates wholesale purchase'],
  salary: ['Sales team salary', 'Packing staff payment'],
  rent: ['Shop rent — July', 'Warehouse rent'],
  utilities: ['Electricity bill', 'Internet bill'],
  product_cost: ['COGS — modhu batch', 'COGS — ajwa khejur'],
  inventory_writeoff: ['Damaged stock write-off', 'Expired khejur write-off'],
  other_expense: ['Office supplies', 'Misc expense'],
};

function buildIncome(index: number): IncomeListItem {
  const cats = Object.keys(INCOME_DESCS) as IncomeCategory[];
  const category = cats[index % cats.length];
  const day = 1 + (index % 28);
  const date = `2026-06-${String(day).padStart(2, '0')}`;
  const methods = ['bkash', 'cash', 'cod', 'bank', 'nagad'] as const;
  const method = methods[index % methods.length];
  return {
    id: `inc-${index}`,
    date,
    type: 'income',
    category,
    description: INCOME_DESCS[category][index % INCOME_DESCS[category].length],
    amount: 1500 + index * 850,
    paymentMethod: method,
    accountName: method === 'bkash' ? 'bKash Business' : method === 'bank' ? 'DBBL Current' : 'Cash Register',
    reference: category === 'order_sales' ? `ORD-${12000 + index}` : undefined,
    relatedOrderId: category === 'order_sales' ? `ORD-${12000 + index}` : undefined,
    createdByName: 'Sakib Ahmed',
    createdAt: `${date}T10:00:00.000Z`,
  };
}

function buildExpense(index: number): ExpenseListItem {
  const cats = Object.keys(EXPENSE_DESCS) as ExpenseCategory[];
  const category = cats[index % cats.length];
  const day = 2 + (index % 27);
  const date = `2026-06-${String(day).padStart(2, '0')}`;
  const methods = ['cash', 'bkash', 'bank', 'nagad'] as const;
  const method = methods[index % methods.length];
  return {
    id: `exp-${index}`,
    date,
    type: 'expense',
    category,
    description: EXPENSE_DESCS[category][index % EXPENSE_DESCS[category].length],
    amount: 500 + index * 420,
    paymentMethod: method,
    accountName: method === 'bkash' ? 'bKash Business' : method === 'bank' ? 'DBBL Current' : 'Cash Register',
    reference: category === 'purchase_payment' ? `PO-${2400 + index}` : undefined,
    relatedSupplier: category === 'purchase_payment' ? 'Sundarban Honey Co-op' : undefined,
    createdByName: 'Fatema Akter',
    createdAt: `${date}T14:00:00.000Z`,
  };
}

export const MOCK_INCOMES: IncomeListItem[] = Array.from({ length: 32 }, (_, i) => buildIncome(i + 1));
export const MOCK_EXPENSES: ExpenseListItem[] = Array.from({ length: 26 }, (_, i) => buildExpense(i + 1));

export const MOCK_LEDGER: LedgerEntry[] = [...MOCK_INCOMES, ...MOCK_EXPENSES].sort(
  (a, b) => b.date.localeCompare(a.date),
);

export const MOCK_CHART_OF_ACCOUNTS: ChartOfAccount[] = [
  { id: 'acc-1000', code: '1000', name: 'Cash Register', type: 'asset', balance: 125000, isActive: true },
  { id: 'acc-1010', code: '1010', name: 'bKash Business', type: 'asset', balance: 342500, isActive: true },
  { id: 'acc-1020', code: '1020', name: 'DBBL Current Account', type: 'asset', balance: 890000, isActive: true },
  { id: 'acc-1100', code: '1100', name: 'Accounts Receivable', type: 'asset', balance: 45600, isActive: true },
  { id: 'acc-1200', code: '1200', name: 'Inventory Stock', type: 'asset', balance: 520000, isActive: true },
  { id: 'acc-1210', code: '1210', name: 'Raw Materials', type: 'asset', balance: 280000, isActive: true },
  { id: 'acc-1220', code: '1220', name: 'Finished Goods', type: 'asset', balance: 240000, isActive: true },
  { id: 'acc-2000', code: '2000', name: 'Accounts Payable', type: 'liability', balance: 78500, isActive: true },
  { id: 'acc-2100', code: '2100', name: 'Courier Payable', type: 'liability', balance: 12400, isActive: true },
  { id: 'acc-3000', code: '3000', name: "Owner's Equity", type: 'equity', balance: 1200000, isActive: true },
  { id: 'acc-4000', code: '4000', name: 'Sales Revenue', type: 'income', balance: 2850000, isActive: true },
  { id: 'acc-5000', code: '5000', name: 'Cost of Goods Sold', type: 'expense', balance: 1420000, isActive: true },
  { id: 'acc-5100', code: '5100', name: 'Courier Expense', type: 'expense', balance: 186000, isActive: true },
  { id: 'acc-5200', code: '5200', name: 'Marketing Expense', type: 'expense', balance: 95000, isActive: true },
  { id: 'acc-5300', code: '5300', name: 'Inventory Write-off', type: 'expense', balance: 12000, isActive: true },
];

function adjustCoa(code: string, delta: number) {
  const acc = MOCK_CHART_OF_ACCOUNTS.find((a) => a.code === code);
  if (acc) acc.balance = Math.max(0, acc.balance + delta);
}

export const MOCK_RECEIVABLES: ReceivableItem[] = Array.from({ length: 14 }, (_, i) => ({
  id: `ar-${i + 1}`,
  customerName: ['Fatema Akter', 'Karim Hassan', 'Nusrat Jahan', 'Kabir Hossain'][i % 4],
  customerPhone: `017${String(10000000 + i * 111111).slice(0, 8)}`,
  // Align with live order numbers (MH-…) so COD settlement can match
  orderNumber: `MH-${8800 + i}`,
  amount: 2500 + i * 800,
  dueDate: `2026-07-${String(3 + (i % 10)).padStart(2, '0')}`,
  status: (['pending', 'partial', 'overdue', 'collected'] as const)[i % 4],
  collectedAmount: i % 4 === 1 ? 1000 : i % 4 === 3 ? 2500 + i * 800 : 0,
  note: i % 3 === 0 ? 'COD pending from courier' : undefined,
}));

export const MOCK_PAYABLES: PayableItem[] = Array.from({ length: 12 }, (_, i) => ({
  id: `ap-${i + 1}`,
  supplierName: ['Sundarban Honey Co-op', 'Rajshahi Khejur Traders', 'Dhaka Packaging House'][i % 3],
  reference: `PO-${2400 + i}`,
  amount: 15000 + i * 4500,
  dueDate: `2026-07-${String(5 + (i % 8)).padStart(2, '0')}`,
  status: (['pending', 'partial', 'overdue', 'paid'] as const)[i % 4],
  paidAmount: i % 4 === 1 ? 5000 : i % 4 === 3 ? 15000 + i * 4500 : 0,
  category: i % 2 === 0 ? 'Purchase' : 'Courier',
}));

export function markReceivableCollected(id: string): ReceivableItem | undefined {
  const item = MOCK_RECEIVABLES.find((r) => r.id === id);
  if (!item || item.status === 'collected') return item;
  item.status = 'collected';
  item.collectedAmount = item.amount;
  return { ...item };
}

export function markReceivableCollectedByOrderNumber(
  orderNumber: string,
): ReceivableItem | undefined {
  const item = MOCK_RECEIVABLES.find((r) => r.orderNumber === orderNumber);
  if (!item) return undefined;
  return markReceivableCollected(item.id);
}

/** Open COD receivable when order is delivered (cash not yet settled). */
export function ensureReceivableForOrder(opts: {
  orderNumber: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
}): ReceivableItem {
  const existing = MOCK_RECEIVABLES.find((r) => r.orderNumber === opts.orderNumber);
  if (existing) return existing;

  const item: ReceivableItem = {
    id: `ar-${Date.now()}`,
    customerName: opts.customerName,
    customerPhone: opts.customerPhone,
    orderNumber: opts.orderNumber,
    amount: opts.amount,
    dueDate: new Date().toISOString().slice(0, 10),
    status: 'pending',
    collectedAmount: 0,
    note: 'COD — awaiting courier settlement',
  };
  MOCK_RECEIVABLES.unshift(item);
  adjustCoa('1100', opts.amount);
  return item;
}

export function markPayablePaid(id: string): PayableItem | undefined {
  const item = MOCK_PAYABLES.find((p) => p.id === id);
  if (!item || item.status === 'paid') return item;
  item.status = 'paid';
  item.paidAmount = item.amount;
  return { ...item };
}

export const MOCK_CASH_BANK: CashBankAccount[] = [
  { id: 'cb-1', name: 'Cash Register', type: 'cash', balance: 125000, isDefault: true },
  { id: 'cb-2', name: 'bKash Business', type: 'bkash', balance: 342500, accountNumber: '01XXXXXXXXX' },
  { id: 'cb-3', name: 'Nagad Merchant', type: 'nagad', balance: 48500, accountNumber: '01XXXXXXXXX' },
  { id: 'cb-4', name: 'DBBL Current', type: 'bank', balance: 890000, accountNumber: '123-456789-001' },
];

function adjustCashBank(accountName: string, delta: number) {
  const acc = MOCK_CASH_BANK.find(
    (a) => a.name === accountName || a.name.toLowerCase().includes(accountName.toLowerCase().slice(0, 5)),
  );
  if (acc) acc.balance = Math.max(0, acc.balance + delta);
}

export function getAccountingOverview(): AccountingOverview {
  const totalIncome = MOCK_INCOMES.reduce((s, i) => s + i.amount, 0);
  const totalExpense = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0);
  const incomeThisMonth = MOCK_INCOMES.filter((i) => i.date.startsWith('2026-06')).reduce((s, i) => s + i.amount, 0);
  const expenseThisMonth = MOCK_EXPENSES.filter((e) => e.date.startsWith('2026-06')).reduce((s, e) => s + e.amount, 0);

  return {
    totalIncome,
    totalExpense,
    netProfit: totalIncome - totalExpense,
    cashBalance: MOCK_CASH_BANK.reduce((s, a) => s + a.balance, 0),
    receivablesTotal: MOCK_RECEIVABLES.filter((r) => r.status !== 'collected').reduce(
      (s, r) => s + r.amount - r.collectedAmount,
      0,
    ),
    payablesTotal: MOCK_PAYABLES.filter((p) => p.status !== 'paid').reduce(
      (s, p) => s + p.amount - p.paidAmount,
      0,
    ),
    incomeThisMonth,
    expenseThisMonth,
    recentTransactions: MOCK_LEDGER.slice(0, 8),
  };
}

export function getProfitLossReport(): ProfitLossReport {
  const totalRevenue = MOCK_INCOMES.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = MOCK_EXPENSES.reduce((s, e) => s + e.amount, 0);
  const netProfit = totalRevenue - totalExpenses;
  return {
    periodLabel: 'June 2026',
    revenue: [
      { label: 'Order sales', amount: MOCK_INCOMES.filter((i) => i.category === 'order_sales').reduce((s, i) => s + i.amount, 0) },
      { label: 'COD collections', amount: MOCK_INCOMES.filter((i) => i.category === 'cod_collection').reduce((s, i) => s + i.amount, 0) },
      { label: 'bKash & digital', amount: MOCK_INCOMES.filter((i) => i.category === 'bkash_payment').reduce((s, i) => s + i.amount, 0) },
      { label: 'Other income', amount: MOCK_INCOMES.filter((i) => ['other_income', 'refund_reversal'].includes(i.category)).reduce((s, i) => s + i.amount, 0) },
    ],
    expenses: EXPENSE_CATEGORIES.slice(0, 6).map((c) => ({
      label: c.label,
      amount: MOCK_EXPENSES.filter((e) => e.category === c.id).reduce((s, e) => s + e.amount, 0),
    })),
    totalRevenue,
    totalExpenses,
    netProfit,
    grossMargin: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0,
  };
}

export function getBalanceSheetReport(): BalanceSheetReport {
  const assets = MOCK_CHART_OF_ACCOUNTS.filter((a) => a.type === 'asset');
  const liabilities = MOCK_CHART_OF_ACCOUNTS.filter((a) => a.type === 'liability');
  const equity = MOCK_CHART_OF_ACCOUNTS.filter((a) => a.type === 'equity');
  return {
    asOfDate: MOCK_TODAY,
    assets: assets.map((a) => ({ label: a.name, amount: a.balance })),
    liabilities: liabilities.map((a) => ({ label: a.name, amount: a.balance })),
    equity: equity.map((a) => ({ label: a.name, amount: a.balance })),
    totalAssets: assets.reduce((s, a) => s + a.balance, 0),
    totalLiabilities: liabilities.reduce((s, a) => s + a.balance, 0),
    totalEquity: equity.reduce((s, a) => s + a.balance, 0),
  };
}

function filterTransactions(
  items: LedgerEntry[],
  query: TransactionListQuery,
  filterDefs: { id: string; match?: (item: LedgerEntry) => boolean }[],
): TransactionListResponse {
  const search = query.search?.trim().toLowerCase() ?? '';
  const filtered = items.filter((item) => {
    const filterDef = filterDefs.find((f) => f.id === query.filter);
    if (query.filter && query.filter !== 'all' && filterDef?.match && !filterDef.match(item)) return false;
    if (!search) return true;
    return (
      item.description.toLowerCase().includes(search) ||
      item.category.toLowerCase().includes(search) ||
      (item.reference?.toLowerCase().includes(search) ?? false) ||
      item.accountName.toLowerCase().includes(search)
    );
  });
  const total = filtered.length;
  const start = (query.page - 1) * query.pageSize;
  const pageItems = filtered.slice(start, start + query.pageSize);
  return {
    items: pageItems,
    total,
    page: query.page,
    pageSize: query.pageSize,
    summary: { totalAmount: filtered.reduce((s, i) => s + i.amount, 0), count: total },
    filters: filterDefs.map((f) => ({
      id: f.id,
      label: INCOME_FILTERS.find((x) => x.id === f.id)?.label ?? EXPENSE_FILTERS.find((x) => x.id === f.id)?.label ?? f.id,
      count: f.match ? items.filter(f.match).length : items.length,
    })),
  };
}

export function filterIncomes(query: TransactionListQuery): TransactionListResponse {
  const filters = INCOME_FILTERS.map((f) => ({
    id: f.id,
    match:
      f.id === 'this_month'
        ? (i: LedgerEntry) => i.date.startsWith('2026-06')
        : f.id === 'order_sales'
          ? (i: LedgerEntry) => (i as IncomeListItem).category === 'order_sales'
          : f.id === 'other'
            ? (i: LedgerEntry) => !['order_sales', 'cod_collection', 'bkash_payment'].includes((i as IncomeListItem).category)
            : undefined,
  }));
  return filterTransactions(MOCK_INCOMES, query, filters);
}

export function filterExpenses(query: TransactionListQuery): TransactionListResponse {
  const filters = EXPENSE_FILTERS.map((f) => ({
    id: f.id,
    match:
      f.id === 'this_month'
        ? (i: LedgerEntry) => i.date.startsWith('2026-06')
        : f.id === 'courier'
          ? (i: LedgerEntry) => (i as ExpenseListItem).category === 'courier'
          : f.id === 'ads'
            ? (i: LedgerEntry) => (i as ExpenseListItem).category === 'facebook_ads'
            : f.id === 'other'
              ? (i: LedgerEntry) => !['courier', 'facebook_ads', 'purchase_payment'].includes((i as ExpenseListItem).category)
              : undefined,
  }));
  return filterTransactions(MOCK_EXPENSES, query, filters);
}

export function filterLedger(query: TransactionListQuery): TransactionListResponse {
  return filterTransactions(MOCK_LEDGER, query, [{ id: 'all' }, { id: 'this_month', match: (i) => i.date.startsWith('2026-06') }]);
}

export function createMockIncome(payload: CreateIncomePayload): IncomeListItem {
  const item: IncomeListItem = {
    id: `inc-${MOCK_INCOMES.length + 1}`,
    type: 'income',
    ...payload,
    createdByName: 'Sakib Ahmed',
    createdAt: new Date().toISOString(),
  };
  MOCK_INCOMES.unshift(item);
  MOCK_LEDGER.unshift(item);
  return item;
}

export function createMockExpense(payload: CreateExpensePayload): ExpenseListItem {
  const item: ExpenseListItem = {
    id: `exp-${MOCK_EXPENSES.length + 1}`,
    type: 'expense',
    ...payload,
    createdByName: 'Sakib Ahmed',
    createdAt: new Date().toISOString(),
  };
  MOCK_EXPENSES.unshift(item);
  MOCK_LEDGER.unshift(item);
  return item;
}

export function createMockJournal(payload: CreateJournalPayload): LedgerEntry {
  const item: LedgerEntry = {
    id: `jnl-${Date.now()}-${MOCK_LEDGER.length}`,
    type: 'journal',
    date: payload.date,
    category: payload.category,
    description: payload.description,
    amount: payload.amount,
    paymentMethod: 'cash',
    accountName: payload.accountName ?? 'Inventory Stock',
    reference: payload.reference,
    relatedSupplier: payload.relatedSupplier,
    relatedOrderId: payload.relatedOrderId,
    createdByName: 'Sakib Ahmed',
    createdAt: new Date().toISOString(),
  };
  MOCK_LEDGER.unshift(item);
  return item;
}

/** Purchase stock received — Dr Inventory / Raw Materials, Cr Cash or AP. */
export function postInventoryPurchase(opts: {
  amount: number;
  supplierName: string;
  reference: string;
  paymentMethod?: CreateExpensePayload['paymentMethod'];
  accountName?: string;
  paidNow?: boolean;
}): void {
  const date = new Date().toISOString().slice(0, 10);
  const accountName = opts.accountName ?? 'Cash Register';

  createMockJournal({
    date,
    category: 'inventory_purchase',
    description: `Stock purchase — ${opts.supplierName} (${opts.reference})`,
    amount: opts.amount,
    accountName: 'Raw Materials',
    reference: opts.reference,
    relatedSupplier: opts.supplierName,
  });

  adjustCoa('1200', opts.amount);
  adjustCoa('1210', opts.amount);

  if (opts.paidNow !== false) {
    createMockExpense({
      date,
      category: 'purchase_payment',
      description: `Paid supplier — ${opts.supplierName} (${opts.reference})`,
      amount: opts.amount,
      paymentMethod: opts.paymentMethod ?? 'cash',
      accountName,
      reference: opts.reference,
      relatedSupplier: opts.supplierName,
    });
    adjustCashBank(accountName, -opts.amount);
    adjustCoa('1000', -opts.amount);
  } else {
    adjustCoa('2000', opts.amount);
    MOCK_PAYABLES.unshift({
      id: `ap-${Date.now()}`,
      supplierName: opts.supplierName,
      reference: opts.reference,
      amount: opts.amount,
      dueDate: date,
      status: 'pending',
      paidAmount: 0,
      category: 'Purchase',
    });
  }
}

/** Mixer / production — move value from raw materials to finished goods (no P&L). */
export function postInventoryProduction(opts: {
  materialCost: number;
  unitsProduced: number;
  outputName: string;
  batchNumber: string;
  costPerUnit: number;
}): void {
  if (opts.materialCost <= 0) return;
  createMockJournal({
    date: new Date().toISOString().slice(0, 10),
    category: 'inventory_production',
    description: `Production ${opts.batchNumber}: ${opts.unitsProduced}× ${opts.outputName} @ ৳${Math.round(opts.costPerUnit)}/unit`,
    amount: opts.materialCost,
    accountName: 'Finished Goods',
    reference: opts.batchNumber,
  });
  adjustCoa('1210', -opts.materialCost);
  adjustCoa('1220', opts.materialCost);
}

/** Sale COGS — Dr COGS, Cr Finished Goods / Inventory. */
export function postInventoryCogs(opts: {
  amount: number;
  orderNumber: string;
  orderId?: string;
  description?: string;
}): void {
  if (opts.amount <= 0) return;
  const date = new Date().toISOString().slice(0, 10);
  createMockExpense({
    date,
    category: 'product_cost',
    description: opts.description ?? `COGS — ${opts.orderNumber}`,
    amount: opts.amount,
    paymentMethod: 'cash',
    accountName: 'Finished Goods',
    reference: opts.orderNumber,
  });
  createMockJournal({
    date,
    category: 'inventory_cogs',
    description: `Inventory out — ${opts.orderNumber}`,
    amount: opts.amount,
    accountName: 'Finished Goods',
    reference: opts.orderNumber,
    relatedOrderId: opts.orderId,
  });
  adjustCoa('5000', opts.amount);
  adjustCoa('1220', -opts.amount);
  adjustCoa('1200', -opts.amount);
}

/** Damage / expiry write-off. */
export function postInventoryWriteOff(opts: {
  amount: number;
  productName: string;
  reason: string;
  reference?: string;
}): void {
  if (opts.amount <= 0) return;
  createMockExpense({
    date: new Date().toISOString().slice(0, 10),
    category: 'inventory_writeoff',
    description: `${opts.reason}: ${opts.productName}`,
    amount: opts.amount,
    paymentMethod: 'cash',
    accountName: 'Inventory Stock',
    reference: opts.reference,
  });
  adjustCoa('5300', opts.amount);
  adjustCoa('1200', -opts.amount);
  adjustCoa('1220', -opts.amount);
}

export function getPendingReceivablesCount(): number {
  return MOCK_RECEIVABLES.filter((r) => r.status === 'pending' || r.status === 'overdue').length;
}
