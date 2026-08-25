'use client';

import * as React from 'react';
import Link from 'next/link';
import type { AccountingOverview, BalanceSheetReport, ProfitLossReport } from '@laam/types';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  Landmark,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { CrmPageActions } from '@/features/crm/components/crm-page-actions';
import { CrmSummaryStrip } from '@/features/crm/components/crm-summary-strip';
import { Can } from '@/components/auth/can';
import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { accountingApi } from '@/features/accounting/api/accounting-api';
import { TransactionListShell } from '@/features/accounting/components/transaction-list/transaction-list-shell';
import {
  ACCOUNT_TYPE_LABELS,
  PAYABLE_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  RECEIVABLE_STATUS_LABELS,
} from '@/features/accounting/config/accounting-filters';
import {
  ORDER_CARD_CLASS,
  ORDER_PAGE_GAP,
  ORDER_SECTION_BODY_CLASS,
  ORDER_SECTION_HEADER_CLASS,
} from '@/features/orders/components/create-order/section-layout';
import { FormField } from '@/components/form/form-field';
import { FormInput } from '@/components/form/form-input';
import { FormSearchSelect } from '@/components/form/form-search-select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AccountType, ChartOfAccount } from '@laam/types';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { useDragToScroll } from '@/hooks/use-drag-to-scroll';
import { ExportMenu } from '@/components/export-menu';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';

export function IncomeListPage() {
  return (
    <TransactionListShell
      mode="income"
      title="Income"
      description="Order sales, COD collections, bKash payments, and other income."
      listFn={accountingApi.listIncome.bind(accountingApi)}
      createLabel="Record income"
    />
  );
}

export function ExpenseListPage() {
  return (
    <TransactionListShell
      mode="expense"
      title="Expenses"
      description="Courier, ads, packaging, salaries, purchases, and other costs."
      listFn={accountingApi.listExpenses.bind(accountingApi)}
      createLabel="Record expense"
    />
  );
}

export function LedgerListPage() {
  return (
    <TransactionListShell
      mode="ledger"
      title="General ledger"
      description="All income and expense transactions in one audit trail."
      listFn={accountingApi.listLedger.bind(accountingApi)}
    />
  );
}

export function AccountingOverviewPage() {
  const [data, setData] = React.useState<AccountingOverview | null>(null);

  React.useEffect(() => {
    void accountingApi.getOverview().then(setData);
  }, []);

  return (
    <PageShell title="Accounting" description="Cash flow, profit, receivables, and payables at a glance.">
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <CrmPageActions moduleId="accounting" />
        <CrmSummaryStrip
          items={[
            { id: 'income', label: 'Total income', value: data ? formatCurrency(data.totalIncome) : '—' },
            { id: 'expense', label: 'Total expenses', value: data ? formatCurrency(data.totalExpense) : '—' },
            { id: 'profit', label: 'Net profit', value: data ? formatCurrency(data.netProfit) : '—' },
            { id: 'cash', label: 'Cash & bank', value: data ? formatCurrency(data.cashBalance) : '—' },
            { id: 'ar', label: 'Receivables', value: data ? formatCurrency(data.receivablesTotal) : '—' },
            { id: 'ap', label: 'Payables', value: data ? formatCurrency(data.payablesTotal) : '—' },
          ]}
          className="grid-cols-2 sm:grid-cols-2 xl:grid-cols-3"
        />

        <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
          <QuickActionCard href="/dashboard/accounting/income" icon={TrendingUp} label="Record income" tone="positive" />
          <QuickActionCard href="/dashboard/accounting/expenses" icon={TrendingDown} label="Record expense" tone="negative" />
          <QuickActionCard href="/dashboard/accounting/receivables" icon={ArrowDownLeft} label="Receivables" />
          <QuickActionCard href="/dashboard/accounting/payables" icon={ArrowUpRight} label="Payables" />
        </div>

        <div className="grid min-w-0 gap-3 sm:gap-4 lg:grid-cols-2">
          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">This month</CardTitle>
            </CardHeader>
            <CardContent className={ORDER_SECTION_BODY_CLASS}>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Income</p>
                  <p className="truncate text-lg font-semibold text-emerald-600 sm:text-xl">
                    {data ? formatCurrency(data.incomeThisMonth) : '—'}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Expenses</p>
                  <p className="truncate text-lg font-semibold text-red-600 sm:text-xl">
                    {data ? formatCurrency(data.expenseThisMonth) : '—'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
              <CardTitle className="text-sm">Quick reports</CardTitle>
            </CardHeader>
            <CardContent className={cn(ORDER_SECTION_BODY_CLASS, 'flex flex-wrap gap-2')}>
              <Button type="button" size="sm" variant="outline" asChild><Link href="/dashboard/accounting/profit-loss">Profit & Loss</Link></Button>
              <Button type="button" size="sm" variant="outline" asChild><Link href="/dashboard/accounting/balance-sheet">Balance sheet</Link></Button>
              <Button type="button" size="sm" variant="outline" asChild><Link href="/dashboard/accounting/ledger">Ledger</Link></Button>
              <Button type="button" size="sm" variant="outline" asChild><Link href="/dashboard/accounting/cash-bank">Cash & bank</Link></Button>
            </CardContent>
          </Card>
        </div>

        <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
          <CardHeader className={cn(ORDER_SECTION_HEADER_CLASS, 'flex-row items-center justify-between gap-2')}>
            <CardTitle className="text-sm">Recent transactions</CardTitle>
            <Button type="button" size="sm" variant="ghost" className="shrink-0" asChild>
              <Link href="/dashboard/accounting/ledger">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <SimpleTxnTable rows={data?.recentTransactions ?? []} />
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

function QuickActionCard({
  href,
  icon: Icon,
  label,
  tone,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  tone?: 'positive' | 'negative';
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex min-w-0 flex-col items-start gap-2 rounded-lg border p-3 transition-colors hover:border-primary/40 hover:bg-muted/30 sm:flex-row sm:items-center sm:gap-3 sm:p-4',
        tone === 'positive' && 'border-emerald-500/20',
        tone === 'negative' && 'border-red-500/20',
      )}
    >
      <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-md bg-muted sm:size-10', tone === 'positive' && 'text-emerald-600', tone === 'negative' && 'text-red-600')}>
        <Icon className="size-4 sm:size-5" />
      </div>
      <span className="text-xs font-medium leading-snug sm:text-sm">{label}</span>
    </Link>
  );
}

function SimpleTxnTable({ rows }: { rows: AccountingOverview['recentTransactions'] }) {
  const scrollRef = useDragToScroll<HTMLDivElement>({ handleSelector: 'thead' });

  if (!rows.length) {
    return <p className="p-4 text-center text-sm text-muted-foreground">No recent transactions.</p>;
  }

  return (
    <div
      ref={scrollRef}
      className={cn(
        'custom-scrollbar min-h-[14rem] min-w-0 max-w-full overflow-auto overscroll-contain',
        'max-h-[min(50vh,28rem)] sm:max-h-[min(55vh,32rem)]',
        '[&[data-drag-scrolling=true]]:cursor-grabbing',
        '[&[data-drag-scrolling=true]_thead]:cursor-grabbing',
      )}
    >
      <table className="w-full min-w-[480px] text-sm">
        <thead className="sticky top-0 z-20 cursor-grab select-none bg-card [&_*]:select-none">
          <tr className="border-b bg-card text-left text-xs text-muted-foreground">
            <th className="bg-card px-3 py-2 sm:px-4">Date</th>
            <th className="bg-card px-3 py-2 sm:px-4">Description</th>
            <th className="bg-card px-3 py-2 sm:px-4">Method</th>
            <th className="bg-card px-3 py-2 text-right sm:px-4">Amount</th>
          </tr>
        </thead>
        <tbody className="select-text">
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/50">
              <td className="px-3 py-2.5 tabular-nums sm:px-4 sm:py-3">{row.date}</td>
              <td className="px-3 py-2.5 sm:px-4 sm:py-3">{row.description}</td>
              <td className="px-3 py-2.5 sm:px-4 sm:py-3">
                <Badge variant="outline" className="text-[10px]">
                  {PAYMENT_METHOD_LABELS[row.paymentMethod]}
                </Badge>
              </td>
              <td
                className={cn(
                  'px-3 py-2.5 text-right font-medium tabular-nums sm:px-4 sm:py-3',
                  row.type === 'income'
                    ? 'text-emerald-600'
                    : row.type === 'journal'
                      ? 'text-foreground'
                      : 'text-red-600',
                )}
              >
                {row.type === 'income' ? '+' : row.type === 'journal' ? '' : '−'}
                {formatCurrency(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ReceivablesPage() {
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof accountingApi.listReceivables>>['items']>([]);
  const refresh = React.useCallback(() => {
    void accountingApi.listReceivables().then((r) => setItems(r.items));
  }, []);
  React.useEffect(() => { refresh(); }, [refresh]);

  async function handleCollect(id: string) {
    await accountingApi.markReceivableCollected(id);
    refresh();
  }

  return (
    <ReportPageShell title="Accounts receivable" description="Money customers owe you — COD pending, partial payments.">
      <div className="flex justify-end">
        <Can permission="accounting.export">
          <ExportMenu
            filename="receivables"
            headers={['Customer', 'Phone', 'Order', 'Amount', 'Due', 'Status', 'Collected']}
            rows={items.map((r) => [r.customerName, r.customerPhone ?? '', r.orderNumber, r.amount, r.dueDate, r.status, r.collectedAmount])}
          />
        </Can>
      </div>
      <SimpleTable
        headers={['Customer', 'Order', 'Amount', 'Due', 'Status', 'Collected', '']}
        rows={items.map((r) => [
          <div key="c"><p className="font-medium">{r.customerName}</p>{r.customerPhone ? <p className="text-xs text-muted-foreground">{r.customerPhone}</p> : null}</div>,
          <span key="o" className="font-mono">{r.orderNumber}</span>,
          formatCurrency(r.amount),
          r.dueDate,
          <Badge key="s" variant={r.status === 'overdue' ? 'destructive' : r.status === 'collected' ? 'success' : 'secondary'}>{RECEIVABLE_STATUS_LABELS[r.status]}</Badge>,
          formatCurrency(r.collectedAmount),
          r.status !== 'collected' ? (
            <Button key="a" type="button" size="sm" variant="outline" onClick={() => void handleCollect(r.id)}>
              Mark collected
            </Button>
          ) : (
            <span key="a" className="text-xs text-muted-foreground">Done</span>
          ),
        ])}
      />
    </ReportPageShell>
  );
}

export function PayablesPage() {
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof accountingApi.listPayables>>['items']>([]);
  const refresh = React.useCallback(() => {
    void accountingApi.listPayables().then((r) => setItems(r.items));
  }, []);
  React.useEffect(() => { refresh(); }, [refresh]);

  async function handlePay(id: string) {
    await accountingApi.markPayablePaid(id);
    refresh();
  }

  return (
    <ReportPageShell title="Accounts payable" description="Money you owe suppliers — purchase orders, courier bills.">
      <div className="flex justify-end">
        <Can permission="accounting.export">
          <ExportMenu
            filename="payables"
            headers={['Supplier', 'Reference', 'Amount', 'Due', 'Status', 'Paid']}
            rows={items.map((p) => [p.supplierName, p.reference, p.amount, p.dueDate, p.status, p.paidAmount])}
          />
        </Can>
      </div>
      <SimpleTable
        headers={['Supplier', 'Reference', 'Amount', 'Due', 'Status', 'Paid', '']}
        rows={items.map((p) => [
          p.supplierName,
          <span key="r" className="font-mono">{p.reference}</span>,
          formatCurrency(p.amount),
          p.dueDate,
          <Badge key="s" variant={p.status === 'overdue' ? 'destructive' : p.status === 'paid' ? 'success' : 'secondary'}>{PAYABLE_STATUS_LABELS[p.status]}</Badge>,
          formatCurrency(p.paidAmount),
          p.status !== 'paid' ? (
            <Button key="a" type="button" size="sm" variant="outline" onClick={() => void handlePay(p.id)}>
              Mark paid
            </Button>
          ) : (
            <span key="a" className="text-xs text-muted-foreground">Done</span>
          ),
        ])}
      />
    </ReportPageShell>
  );
}

export function CashBankPage() {
  const [items, setItems] = React.useState<Awaited<ReturnType<typeof accountingApi.listCashBank>>['items']>([]);
  React.useEffect(() => { void accountingApi.listCashBank().then((r) => setItems(r.items)); }, []);
  const total = items.reduce((s, a) => s + a.balance, 0);
  return (
    <ReportPageShell title="Cash & bank" description="Cash register, bKash, Nagad, and bank account balances.">
      <CrmSummaryStrip items={[{ id: 'total', label: 'Total balance', value: formatCurrency(total) }]} className="max-w-xs" />
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {items.map((account) => (
          <Card key={account.id} className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-2">
                <Wallet className="size-5 shrink-0 text-muted-foreground" />
                {account.isDefault ? <Badge className="shrink-0 text-[10px]">Default</Badge> : null}
              </div>
              <p className="mt-3 truncate font-medium">{account.name}</p>
              <p className="truncate text-xl font-bold tabular-nums sm:text-2xl">{formatCurrency(account.balance)}</p>
              {account.accountNumber ? <p className="mt-1 truncate font-mono text-xs text-muted-foreground">{account.accountNumber}</p> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </ReportPageShell>
  );
}

export function ChartOfAccountsPage() {
  const [items, setItems] = React.useState<ChartOfAccount[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState({
    code: '',
    name: '',
    type: 'expense' as AccountType,
  });

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await accountingApi.listChartOfAccounts();
      setItems(res.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load chart of accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate() {
    if (!draft.code.trim() || !draft.name.trim()) {
      toast.error('Code and name are required');
      return;
    }

    setSaving(true);
    try {
      await accountingApi.createChartOfAccount(draft);
      setOpen(false);
      setDraft({ code: '', name: '', type: 'expense' });
      toast.success('Account added');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save account');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(account: ChartOfAccount) {
    try {
      await accountingApi.setChartOfAccountActive(account.id, !account.isActive);
      toast.success(account.isActive ? 'Account deactivated' : 'Account activated');
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update account');
    }
  }

  return (
    <ReportPageShell
      title="Chart of accounts"
      description="Your account structure — assets, liabilities, equity, income, expenses."
      action={
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Add account
        </Button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading accounts…</p>
      ) : (
        <SimpleTable
          headers={['Code', 'Account name', 'Type', 'Balance', 'Status', 'Actions']}
          rows={items.map((account) => [
            <span key="c" className="font-mono">{account.code}</span>,
            account.name,
            <Badge key="t" variant="outline" className="text-[10px]">{ACCOUNT_TYPE_LABELS[account.type]}</Badge>,
            formatCurrency(account.balance),
            <Badge key="s" variant={account.isActive ? 'default' : 'secondary'}>{account.isActive ? 'Active' : 'Inactive'}</Badge>,
            <Button
              key="a"
              type="button"
              size="sm"
              variant="ghost"
              className="h-7"
              onClick={() => void handleToggle(account)}
            >
              {account.isActive ? 'Deactivate' : 'Activate'}
            </Button>,
          ])}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add ledger account</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <FormField label="Account code">
              <FormInput
                value={draft.code}
                onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value }))}
                placeholder="6100"
              />
            </FormField>
            <FormField label="Account name">
              <FormInput
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
                placeholder="Office supplies"
              />
            </FormField>
            <FormField label="Type">
              <FormSearchSelect
                value={draft.type}
                onChange={(value) => setDraft((current) => ({ ...current, type: value as AccountType }))}
                options={Object.entries(ACCOUNT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
                searchable={false}
              />
            </FormField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="button" disabled={saving} onClick={() => void handleCreate()}>
              {saving ? 'Saving…' : 'Save account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ReportPageShell>
  );
}

export function ProfitLossPage() {
  const [report, setReport] = React.useState<ProfitLossReport | null>(null);
  React.useEffect(() => { void accountingApi.getProfitLoss().then(setReport); }, []);
  if (!report) return <ReportPageShell title="Profit & Loss" description="Loading…"><p className="text-sm text-muted-foreground">Loading report…</p></ReportPageShell>;
  return (
    <ReportPageShell title="Profit & Loss" description={`Income vs expenses — ${report.periodLabel}`}>
      <div className="grid gap-4 lg:grid-cols-2">
        <ReportSection title="Revenue" icon={TrendingUp} items={report.revenue} total={report.totalRevenue} tone="positive" />
        <ReportSection title="Expenses" icon={TrendingDown} items={report.expenses} total={report.totalExpenses} tone="negative" />
      </div>
      <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:p-6">
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">Net profit</p>
            <p className={cn('truncate text-2xl font-bold tabular-nums sm:text-3xl', report.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600')}>{formatCurrency(report.netProfit)}</p>
          </div>
          <div className="sm:text-right">
            <p className="text-sm text-muted-foreground">Gross margin</p>
            <p className="text-xl font-semibold tabular-nums sm:text-2xl">{report.grossMargin}%</p>
          </div>
        </CardContent>
      </Card>
    </ReportPageShell>
  );
}

export function BalanceSheetPage() {
  const [report, setReport] = React.useState<BalanceSheetReport | null>(null);
  React.useEffect(() => { void accountingApi.getBalanceSheet().then(setReport); }, []);
  if (!report) return <ReportPageShell title="Balance sheet" description="Loading…"><p className="text-sm text-muted-foreground">Loading report…</p></ReportPageShell>;
  return (
    <ReportPageShell title="Balance sheet" description={`Financial position as of ${report.asOfDate}`}>
      <div className="grid gap-4 lg:grid-cols-3">
        <ReportSection title="Assets" icon={Landmark} items={report.assets} total={report.totalAssets} />
        <ReportSection title="Liabilities" icon={Banknote} items={report.liabilities} total={report.totalLiabilities} tone="negative" />
        <ReportSection title="Equity" icon={Scale} items={report.equity} total={report.totalEquity} />
      </div>
      <p className="text-center text-xs text-muted-foreground">
        Assets ({formatCurrency(report.totalAssets)}) = Liabilities ({formatCurrency(report.totalLiabilities)}) + Equity ({formatCurrency(report.totalEquity)})
      </p>
    </ReportPageShell>
  );
}

function ReportSection({
  title,
  icon: Icon,
  items,
  total,
  tone,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: { label: string; amount: number }[];
  total: number;
  tone?: 'positive' | 'negative';
}) {
  return (
    <Card className={cn(ORDER_CARD_CLASS, 'min-w-0')}>
      <CardHeader className={ORDER_SECTION_HEADER_CLASS}>
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icon className="size-4 shrink-0" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className={ORDER_SECTION_BODY_CLASS}>
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.label} className="flex min-w-0 items-start justify-between gap-3 text-sm">
              <span className="min-w-0 truncate text-muted-foreground">{item.label}</span>
              <span className="shrink-0 font-medium tabular-nums">{formatCurrency(item.amount)}</span>
            </li>
          ))}
        </ul>
        <div className={cn('mt-4 flex justify-between border-t pt-3 font-semibold', tone === 'positive' && 'text-emerald-600', tone === 'negative' && 'text-red-600')}>
          <span>Total</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function ReportPageShell({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <PageShell title="Accounting" description={description}>
      <div className={cn(ORDER_PAGE_GAP, 'min-w-0')}>
        <CrmPageActions moduleId="accounting" />
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-base font-semibold tracking-tight">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </PageShell>
  );
}

function SimpleTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
  const scrollRef = useDragToScroll<HTMLDivElement>({ handleSelector: 'thead' });

  if (!rows.length) {
    return (
      <Card className={ORDER_CARD_CLASS}>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">No records.</CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(ORDER_CARD_CLASS, 'min-w-0 overflow-hidden')}>
      <div
        ref={scrollRef}
        className={cn(
          'custom-scrollbar min-h-[16rem] min-w-0 max-w-full overflow-auto overscroll-contain',
          'max-h-[min(62vh,34rem)] sm:max-h-[min(70vh,44rem)]',
          '[&[data-drag-scrolling=true]]:cursor-grabbing',
          '[&[data-drag-scrolling=true]_thead]:cursor-grabbing',
        )}
      >
        <table className="w-full min-w-[560px] text-sm">
          <thead className="sticky top-0 z-20 cursor-grab select-none [&_*]:select-none">
            <tr className="border-b bg-muted/30 text-left text-xs text-muted-foreground">
              {headers.map((h) => (
                <th
                  key={h}
                  className="whitespace-nowrap bg-muted/30 px-3 py-2.5 font-medium sm:px-4"
                >
                  {h || ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="select-text">
            {rows.map((cells, i) => (
              <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                {cells.map((cell, j) => (
                  <td key={j} className="px-3 py-2.5 align-middle sm:px-4 sm:py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
