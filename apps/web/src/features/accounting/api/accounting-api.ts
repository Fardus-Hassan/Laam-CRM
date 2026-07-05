import type {
  AccountingOverview,
  BalanceSheetReport,
  CashBankAccount,
  ChartOfAccount,
  CreateExpensePayload,
  CreateIncomePayload,
  ExpenseListItem,
  IncomeListItem,
  PayableItem,
  ProfitLossReport,
  ReceivableItem,
  TransactionListQuery,
  TransactionListResponse,
} from '@laam/types';

import {
  createMockExpense,
  createMockIncome,
  filterExpenses,
  filterIncomes,
  filterLedger,
  getAccountingOverview,
  getBalanceSheetReport,
  getProfitLossReport,
  MOCK_CASH_BANK,
  MOCK_PAYABLES,
  markPayablePaid,
  markReceivableCollected,
  MOCK_RECEIVABLES,
} from '@/features/accounting/data/mock-accounting';
import { getChartOfAccounts } from '@/features/accounting/data/chart-of-accounts-store';

export type AccountingApi = {
  getOverview: () => Promise<AccountingOverview>;
  listIncome: (query: TransactionListQuery) => Promise<TransactionListResponse>;
  listExpenses: (query: TransactionListQuery) => Promise<TransactionListResponse>;
  listLedger: (query: TransactionListQuery) => Promise<TransactionListResponse>;
  createIncome: (payload: CreateIncomePayload) => Promise<IncomeListItem>;
  createExpense: (payload: CreateExpensePayload) => Promise<ExpenseListItem>;
  listReceivables: () => Promise<{ items: ReceivableItem[]; total: number }>;
  listPayables: () => Promise<{ items: PayableItem[]; total: number }>;
  markReceivableCollected: (id: string) => Promise<ReceivableItem>;
  markPayablePaid: (id: string) => Promise<PayableItem>;
  listCashBank: () => Promise<{ items: CashBankAccount[] }>;
  listChartOfAccounts: () => Promise<{ items: ChartOfAccount[] }>;
  getProfitLoss: () => Promise<ProfitLossReport>;
  getBalanceSheet: () => Promise<BalanceSheetReport>;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createMockAccountingApi(): AccountingApi {
  return {
    async getOverview() {
      await delay(100);
      return getAccountingOverview();
    },
    async listIncome(query) {
      await delay(120);
      return filterIncomes(query);
    },
    async listExpenses(query) {
      await delay(120);
      return filterExpenses(query);
    },
    async listLedger(query) {
      await delay(100);
      return filterLedger(query);
    },
    async createIncome(payload) {
      await delay(100);
      return createMockIncome(payload);
    },
    async createExpense(payload) {
      await delay(100);
      return createMockExpense(payload);
    },
    async listReceivables() {
      await delay(80);
      return { items: MOCK_RECEIVABLES.map((r) => ({ ...r })), total: MOCK_RECEIVABLES.length };
    },
    async listPayables() {
      await delay(80);
      return { items: MOCK_PAYABLES.map((p) => ({ ...p })), total: MOCK_PAYABLES.length };
    },
    async markReceivableCollected(id) {
      await delay(100);
      const item = markReceivableCollected(id);
      if (!item) throw new Error('Receivable not found');
      return item;
    },
    async markPayablePaid(id) {
      await delay(100);
      const item = markPayablePaid(id);
      if (!item) throw new Error('Payable not found');
      return item;
    },
    async listCashBank() {
      await delay(60);
      return { items: MOCK_CASH_BANK };
    },
    async listChartOfAccounts() {
      await delay(80);
      return { items: getChartOfAccounts() };
    },
    async getProfitLoss() {
      await delay(80);
      return getProfitLossReport();
    },
    async getBalanceSheet() {
      await delay(80);
      return getBalanceSheetReport();
    },
  };
}

export function createHttpAccountingApi(): AccountingApi {
  const base = '/crm/accounting';
  return {
    async getOverview() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<AccountingOverview>(`${base}/overview`);
    },
    async listIncome(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (query.filter) params.set('filter', query.filter);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      return apiRequest<TransactionListResponse>(`${base}/income?${params}`);
    },
    async listExpenses(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      if (query.filter) params.set('filter', query.filter);
      if (query.search) params.set('search', query.search);
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      return apiRequest<TransactionListResponse>(`${base}/expenses?${params}`);
    },
    async listLedger(query) {
      const { apiRequest } = await import('@/lib/api/client');
      const params = new URLSearchParams();
      params.set('page', String(query.page));
      params.set('pageSize', String(query.pageSize));
      return apiRequest<TransactionListResponse>(`${base}/ledger?${params}`);
    },
    async createIncome(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<IncomeListItem>(`${base}/income`, { method: 'POST', body: JSON.stringify(payload) });
    },
    async createExpense(payload) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<ExpenseListItem>(`${base}/expenses`, { method: 'POST', body: JSON.stringify(payload) });
    },
    async listReceivables() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest(`${base}/receivables`);
    },
    async listPayables() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest(`${base}/payables`);
    },
    async markReceivableCollected(id) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest(`${base}/receivables/${id}/collect`, { method: 'POST' });
    },
    async markPayablePaid(id) {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest(`${base}/payables/${id}/pay`, { method: 'POST' });
    },
    async listCashBank() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest(`${base}/cash-bank`);
    },
    async listChartOfAccounts() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest(`${base}/chart-of-accounts`);
    },
    async getProfitLoss() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<ProfitLossReport>(`${base}/reports/profit-loss`);
    },
    async getBalanceSheet() {
      const { apiRequest } = await import('@/lib/api/client');
      return apiRequest<BalanceSheetReport>(`${base}/reports/balance-sheet`);
    },
  };
}

const useHttpApi = process.env.NEXT_PUBLIC_USE_API === 'true';
export const accountingApi = useHttpApi ? createHttpAccountingApi() : createMockAccountingApi();
