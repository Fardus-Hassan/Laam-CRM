import { z } from 'zod';

export const paymentMethodSchema = z.enum([
  'cash',
  'bkash',
  'nagad',
  'bank',
  'card',
  'cod',
]);
export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const accountTypeSchema = z.enum([
  'asset',
  'liability',
  'equity',
  'income',
  'expense',
]);
export type AccountType = z.infer<typeof accountTypeSchema>;

export const transactionTypeSchema = z.enum(['income', 'expense', 'transfer', 'journal']);
export type TransactionType = z.infer<typeof transactionTypeSchema>;

export const incomeCategorySchema = z.enum([
  'order_sales',
  'cod_collection',
  'bkash_payment',
  'other_income',
  'refund_reversal',
]);
export type IncomeCategory = z.infer<typeof incomeCategorySchema>;

export const expenseCategorySchema = z.enum([
  'courier',
  'packaging',
  'facebook_ads',
  'purchase_payment',
  'salary',
  'rent',
  'utilities',
  'product_cost',
  'inventory_writeoff',
  'other_expense',
]);
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;

/** Non-P&L inventory movements shown on the ledger (purchase, production, transfer). */
export const inventoryJournalCategorySchema = z.enum([
  'inventory_purchase',
  'inventory_production',
  'inventory_transfer',
  'inventory_cogs',
]);
export type InventoryJournalCategory = z.infer<typeof inventoryJournalCategorySchema>;

export const ledgerEntrySchema = z.object({
  id: z.string(),
  date: z.string(),
  type: transactionTypeSchema,
  category: z.string(),
  description: z.string(),
  amount: z.number(),
  paymentMethod: paymentMethodSchema,
  accountName: z.string(),
  reference: z.string().optional(),
  relatedOrderId: z.string().optional(),
  relatedSupplier: z.string().optional(),
  createdByName: z.string().optional(),
  createdAt: z.string(),
});

export type LedgerEntry = z.infer<typeof ledgerEntrySchema>;

export const incomeListItemSchema = ledgerEntrySchema.extend({
  type: z.literal('income'),
  category: incomeCategorySchema,
});

export type IncomeListItem = z.infer<typeof incomeListItemSchema>;

export const expenseListItemSchema = ledgerEntrySchema.extend({
  type: z.literal('expense'),
  category: expenseCategorySchema,
});

export type ExpenseListItem = z.infer<typeof expenseListItemSchema>;

export const chartOfAccountSchema = z.object({
  id: z.string(),
  code: z.string(),
  name: z.string(),
  type: accountTypeSchema,
  balance: z.number(),
  isActive: z.boolean(),
});

export type ChartOfAccount = z.infer<typeof chartOfAccountSchema>;

export const receivableItemSchema = z.object({
  id: z.string(),
  customerName: z.string(),
  customerPhone: z.string().optional(),
  orderNumber: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  status: z.enum(['pending', 'partial', 'overdue', 'collected']),
  collectedAmount: z.number().default(0),
  note: z.string().optional(),
});

export type ReceivableItem = z.infer<typeof receivableItemSchema>;

export const payableItemSchema = z.object({
  id: z.string(),
  supplierName: z.string(),
  reference: z.string(),
  amount: z.number(),
  dueDate: z.string(),
  status: z.enum(['pending', 'partial', 'overdue', 'paid']),
  paidAmount: z.number().default(0),
  category: z.string().optional(),
});

export type PayableItem = z.infer<typeof payableItemSchema>;

export const cashBankAccountSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['cash', 'bkash', 'nagad', 'bank']),
  balance: z.number(),
  accountNumber: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export type CashBankAccount = z.infer<typeof cashBankAccountSchema>;

export const accountingOverviewSchema = z.object({
  totalIncome: z.number(),
  totalExpense: z.number(),
  netProfit: z.number(),
  cashBalance: z.number(),
  receivablesTotal: z.number(),
  payablesTotal: z.number(),
  incomeThisMonth: z.number(),
  expenseThisMonth: z.number(),
  recentTransactions: z.array(ledgerEntrySchema),
});

export type AccountingOverview = z.infer<typeof accountingOverviewSchema>;

export const incomeFilterSchema = z.enum(['all', 'this_month', 'order_sales', 'other']);
export type IncomeFilter = z.infer<typeof incomeFilterSchema>;

export const expenseFilterSchema = z.enum(['all', 'this_month', 'courier', 'ads', 'other']);
export type ExpenseFilter = z.infer<typeof expenseFilterSchema>;

export const filterCountSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number(),
});

export type AccountingFilterCount = z.infer<typeof filterCountSchema>;

export const transactionListQuerySchema = z.object({
  filter: z.string().optional(),
  search: z.string().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().default(20),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export type TransactionListQuery = z.infer<typeof transactionListQuerySchema>;

export const transactionListResponseSchema = z.object({
  items: z.array(ledgerEntrySchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  summary: z.object({
    totalAmount: z.number(),
    count: z.number(),
  }),
  filters: z.array(filterCountSchema).optional(),
});

export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;

export const profitLossReportSchema = z.object({
  periodLabel: z.string(),
  revenue: z.array(z.object({ label: z.string(), amount: z.number() })),
  expenses: z.array(z.object({ label: z.string(), amount: z.number() })),
  totalRevenue: z.number(),
  totalExpenses: z.number(),
  netProfit: z.number(),
  grossMargin: z.number(),
});

export type ProfitLossReport = z.infer<typeof profitLossReportSchema>;

export const balanceSheetReportSchema = z.object({
  asOfDate: z.string(),
  assets: z.array(z.object({ label: z.string(), amount: z.number() })),
  liabilities: z.array(z.object({ label: z.string(), amount: z.number() })),
  equity: z.array(z.object({ label: z.string(), amount: z.number() })),
  totalAssets: z.number(),
  totalLiabilities: z.number(),
  totalEquity: z.number(),
});

export type BalanceSheetReport = z.infer<typeof balanceSheetReportSchema>;

export const createIncomePayloadSchema = z.object({
  date: z.string(),
  category: incomeCategorySchema,
  description: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: paymentMethodSchema,
  accountName: z.string(),
  reference: z.string().optional(),
  relatedOrderId: z.string().optional(),
});

export type CreateIncomePayload = z.infer<typeof createIncomePayloadSchema>;

export const createExpensePayloadSchema = z.object({
  date: z.string(),
  category: expenseCategorySchema,
  description: z.string().min(1),
  amount: z.number().positive(),
  paymentMethod: paymentMethodSchema,
  accountName: z.string(),
  reference: z.string().optional(),
  relatedSupplier: z.string().optional(),
});

export type CreateExpensePayload = z.infer<typeof createExpensePayloadSchema>;

export const createJournalPayloadSchema = z.object({
  date: z.string(),
  category: inventoryJournalCategorySchema,
  description: z.string().min(1),
  amount: z.number().positive(),
  accountName: z.string().default('Inventory Stock'),
  reference: z.string().optional(),
  relatedSupplier: z.string().optional(),
  relatedOrderId: z.string().optional(),
});

export type CreateJournalPayload = z.infer<typeof createJournalPayloadSchema>;
