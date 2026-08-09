import type { AccountType, ChartOfAccount } from '@laam/types';

import { MOCK_CHART_OF_ACCOUNTS } from '@/features/accounting/data/mock-accounting';

const STORAGE_KEY = 'laam-chart-of-accounts-v1';

export const CHART_OF_ACCOUNTS_CHANGED = 'laam-chart-of-accounts-changed';

function loadOverrides(): ChartOfAccount[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ChartOfAccount[]) : [];
  } catch {
    return [];
  }
}

function saveOverrides(accounts: ChartOfAccount[]): ChartOfAccount[] {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts));
    window.dispatchEvent(new CustomEvent(CHART_OF_ACCOUNTS_CHANGED));
  }
  return accounts;
}

export function getChartOfAccounts(): ChartOfAccount[] {
  const overrides = loadOverrides();
  const overrideById = new Map(overrides.map((item) => [item.id, item]));
  const seedIds = new Set(MOCK_CHART_OF_ACCOUNTS.map((item) => item.id));

  const merged = MOCK_CHART_OF_ACCOUNTS.map((seed) => overrideById.get(seed.id) ?? seed);
  const custom = overrides.filter((item) => !seedIds.has(item.id));

  return [...merged, ...custom].sort((a, b) => a.code.localeCompare(b.code));
}

export function upsertChartOfAccount(input: {
  id?: string;
  code: string;
  name: string;
  type: AccountType;
  balance?: number;
  isActive?: boolean;
}): ChartOfAccount[] {
  const code = input.code.trim();
  const name = input.name.trim();
  if (!code || !name) {
    throw new Error('Account code and name are required');
  }

  const accounts = getChartOfAccounts();
  const existing = input.id ? accounts.find((item) => item.id === input.id) : undefined;
  const duplicateCode = accounts.find((item) => item.code === code && item.id !== input.id);
  if (duplicateCode) {
    throw new Error('Account code already exists');
  }

  const next: ChartOfAccount = {
    id: existing?.id ?? input.id ?? `acc-${code}`,
    code,
    name,
    type: input.type,
    balance: input.balance ?? existing?.balance ?? 0,
    isActive: input.isActive ?? existing?.isActive ?? true,
  };

  const overrides = loadOverrides().filter((item) => item.id !== next.id);
  return saveOverrides([...overrides, next]);
}

export function setChartOfAccountActive(id: string, isActive: boolean): ChartOfAccount[] {
  const account = getChartOfAccounts().find((item) => item.id === id);
  if (!account) {
    throw new Error('Account not found');
  }

  return upsertChartOfAccount({ ...account, isActive });
}
