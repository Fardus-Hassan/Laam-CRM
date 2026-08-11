import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  AccountingOverview,
  AccountType,
  BalanceSheetReport,
  CashBankAccount,
  ChartOfAccount,
  CreateExpensePayload,
  CreateIncomePayload,
  ExpenseListItem,
  IncomeListItem,
  LedgerEntry,
  PayableItem,
  PaymentMethod,
  ProfitLossReport,
  ReceivableItem,
  TransactionListQuery,
  TransactionListResponse,
  TransactionType,
} from '@laam/types';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import {
  ACCOUNT_BY_CODE,
  cashAccountForPaymentMethod,
  expenseDebitAccount,
  incomeCreditAccount,
  STANDARD_COA,
} from './accounting-coa';

type JournalWithLines = Prisma.AccountingJournalEntryGetPayload<{
  include: { lines: true };
}>;

@Injectable()
export class AccountingService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async ensureChartOfAccounts(organizationId: string): Promise<void> {
    const count = await this.prisma.accountingAccount.count({
      where: { organizationId },
    });
    if (count > 0) return;

    await this.prisma.accountingAccount.createMany({
      data: STANDARD_COA.map((a) => ({
        organizationId,
        code: a.code,
        name: a.name,
        type: a.type,
        isActive: true,
        isSystem: true,
        cashKind: a.cashKind,
      })),
      skipDuplicates: true,
    });
  }

  async listChartOfAccounts(
    organizationId: string,
  ): Promise<{ items: ChartOfAccount[] }> {
    await this.ensureChartOfAccounts(organizationId);
    const accounts = await this.prisma.accountingAccount.findMany({
      where: { organizationId },
      orderBy: { code: 'asc' },
    });
    const balances = await this.accountBalances(organizationId);
    return {
      items: accounts.map((a) => ({
        id: a.id,
        code: a.code,
        name: a.name,
        type: a.type as AccountType,
        balance: balances.balances.get(a.code) ?? 0,
        isActive: a.isActive,
      })),
    };
  }

  async createAccount(
    organizationId: string,
    input: { code: string; name: string; type: AccountType },
  ): Promise<ChartOfAccount> {
    await this.ensureChartOfAccounts(organizationId);
    const code = input.code.trim();
    const name = input.name.trim();
    if (!code || !name) {
      throw new BadRequestException('Code and name are required');
    }
    try {
      const created = await this.prisma.accountingAccount.create({
        data: {
          organizationId,
          code,
          name,
          type: input.type,
          isActive: true,
          isSystem: false,
        },
      });
      return {
        id: created.id,
        code: created.code,
        name: created.name,
        type: created.type as AccountType,
        balance: 0,
        isActive: created.isActive,
      };
    } catch {
      throw new BadRequestException('Account code already exists');
    }
  }

  async setAccountActive(
    organizationId: string,
    id: string,
    isActive: boolean,
  ): Promise<ChartOfAccount> {
    const existing = await this.prisma.accountingAccount.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Account not found');
    if (existing.isSystem && !isActive) {
      throw new BadRequestException('System accounts cannot be deactivated');
    }
    const updated = await this.prisma.accountingAccount.update({
      where: { id },
      data: { isActive },
    });
    const balances = await this.accountBalances(organizationId);
    return {
      id: updated.id,
      code: updated.code,
      name: updated.name,
      type: updated.type as AccountType,
      balance: balances.balances.get(updated.code) ?? 0,
      isActive: updated.isActive,
    };
  }

  async getOverview(organizationId: string): Promise<AccountingOverview> {
    await this.ensureChartOfAccounts(organizationId);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const { balances, typeByCode } = await this.accountBalances(organizationId);
    const month = await this.accountBalances(organizationId, {
      from: monthStart,
      to: now,
    });

    const totalIncome = this.sumByType(balances, 'income', typeByCode);
    const totalExpense = this.sumByType(balances, 'expense', typeByCode);
    const cashBalance =
      (balances.get('1000') ?? 0) +
      (balances.get('1010') ?? 0) +
      (balances.get('1020') ?? 0) +
      (balances.get('1030') ?? 0);

    const [receivables, payables, recent] = await Promise.all([
      this.listReceivables(organizationId),
      this.listPayables(organizationId),
      this.listLedger(organizationId, { page: 1, pageSize: 8 }),
    ]);

    return {
      totalIncome,
      totalExpense,
      netProfit: totalIncome - totalExpense,
      cashBalance,
      receivablesTotal: receivables.items
        .filter((r) => r.status !== 'collected')
        .reduce((s, r) => s + (r.amount - r.collectedAmount), 0),
      payablesTotal: payables.items
        .filter((p) => p.status !== 'paid')
        .reduce((s, p) => s + (p.amount - p.paidAmount), 0),
      incomeThisMonth: this.sumByType(month.balances, 'income', month.typeByCode),
      expenseThisMonth: this.sumByType(month.balances, 'expense', month.typeByCode),
      recentTransactions: recent.items,
    };
  }

  async listLedger(
    organizationId: string,
    query: TransactionListQuery,
    options?: { types?: TransactionType[]; categories?: string[] },
  ): Promise<TransactionListResponse> {
    await this.ensureChartOfAccounts(organizationId);
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, query.pageSize ?? 20));
    const search = query.search?.trim();

    const where: Prisma.AccountingJournalEntryWhereInput = {
      organizationId,
      status: 'posted',
      ...(query.dateFrom || query.dateTo
        ? {
            entryDate: {
              ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
              ...(query.dateTo ? { lte: new Date(query.dateTo) } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { description: { contains: search, mode: 'insensitive' } },
              { reference: { contains: search, mode: 'insensitive' } },
              { category: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(options?.categories?.length
        ? { category: { in: options.categories } }
        : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.accountingJournalEntry.count({ where }),
      this.prisma.accountingJournalEntry.findMany({
        where,
        include: { lines: true },
        orderBy: [{ entryDate: 'desc' }, { postedAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    let items = rows.map((row) => this.journalToLedgerEntry(row));
    if (options?.types?.length) {
      items = items.filter((i) => options.types!.includes(i.type));
    }

    // Re-filter after type mapping if needed — recount from mapped when types filter
    const filteredTotal = options?.types?.length ? items.length : total;
    const pageItems = options?.types?.length
      ? items.slice(0, pageSize)
      : items;

    return {
      items: pageItems,
      total: filteredTotal,
      page,
      pageSize,
      summary: {
        totalAmount: pageItems.reduce((s, i) => s + i.amount, 0),
        count: filteredTotal,
      },
    };
  }

  async listIncome(
    organizationId: string,
    query: TransactionListQuery,
  ): Promise<TransactionListResponse> {
    const filterCats =
      query.filter === 'order_sales'
        ? ['order_sales', 'cod_collection', 'bkash_payment']
        : query.filter === 'other'
          ? ['other_income', 'refund_reversal']
          : undefined;
    const dateQuery =
      query.filter === 'this_month'
        ? { ...query, dateFrom: this.monthStartIso() }
        : query;
    return this.listLedger(organizationId, dateQuery, {
      types: ['income'],
      categories: filterCats,
    });
  }

  async listExpenses(
    organizationId: string,
    query: TransactionListQuery,
  ): Promise<TransactionListResponse> {
    const filterCats =
      query.filter === 'courier'
        ? ['courier']
        : query.filter === 'ads'
          ? ['facebook_ads']
          : query.filter === 'other'
            ? ['other_expense', 'salary', 'rent', 'utilities', 'packaging']
            : undefined;
    const dateQuery =
      query.filter === 'this_month'
        ? { ...query, dateFrom: this.monthStartIso() }
        : query;
    return this.listLedger(organizationId, dateQuery, {
      types: ['expense'],
      categories: filterCats,
    });
  }

  async createIncome(
    organizationId: string,
    input: CreateIncomePayload,
    actorName?: string,
  ): Promise<IncomeListItem> {
    await this.ensureChartOfAccounts(organizationId);
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (!(amount > 0)) throw new BadRequestException('Amount must be positive');

    const cash = cashAccountForPaymentMethod(input.paymentMethod);
    const credit = incomeCreditAccount(input.category);
    const sourceId = randomUUID();
    const entryDate = new Date(input.date);

    const journalId = await this.postBalancedJournal(organizationId, {
      eventKey: `manual-income:${sourceId}`,
      sourceType: 'manual_income',
      sourceId,
      description: input.description.trim(),
      reference: input.reference?.trim() || input.relatedOrderId?.trim() || undefined,
      entryDate,
      category: input.category,
      paymentMethod: input.paymentMethod,
      lines: [
        { accountCode: cash.code, accountName: cash.name, debit: amount, credit: 0 },
        { accountCode: credit.code, accountName: credit.name, debit: 0, credit: amount },
      ],
    });

    return {
      id: journalId,
      date: entryDate.toISOString(),
      type: 'income',
      category: input.category,
      description: input.description.trim(),
      amount,
      paymentMethod: input.paymentMethod,
      accountName: cash.name,
      reference: input.reference,
      relatedOrderId: input.relatedOrderId,
      createdByName: actorName,
      createdAt: new Date().toISOString(),
    };
  }

  async createExpense(
    organizationId: string,
    input: CreateExpensePayload,
    actorName?: string,
  ): Promise<ExpenseListItem> {
    await this.ensureChartOfAccounts(organizationId);
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (!(amount > 0)) throw new BadRequestException('Amount must be positive');

    const cash = cashAccountForPaymentMethod(input.paymentMethod);
    const debit = expenseDebitAccount(input.category);
    const sourceId = randomUUID();
    const entryDate = new Date(input.date);

    // purchase_payment: pay down AP (Dr AP, Cr Cash) — not P&L
    const lines =
      input.category === 'purchase_payment'
        ? [
            {
              accountCode: '2000',
              accountName: ACCOUNT_BY_CODE['2000']!.name,
              debit: amount,
              credit: 0,
            },
            {
              accountCode: cash.code,
              accountName: cash.name,
              debit: 0,
              credit: amount,
            },
          ]
        : [
            {
              accountCode: debit.code,
              accountName: debit.name,
              debit: amount,
              credit: 0,
            },
            {
              accountCode: cash.code,
              accountName: cash.name,
              debit: 0,
              credit: amount,
            },
          ];

    const journalId = await this.postBalancedJournal(organizationId, {
      eventKey: `manual-expense:${sourceId}`,
      sourceType: 'manual_expense',
      sourceId,
      description: input.description.trim(),
      reference: input.reference?.trim() || input.relatedSupplier?.trim() || undefined,
      entryDate,
      category: input.category,
      paymentMethod: input.paymentMethod,
      lines,
    });

    return {
      id: journalId,
      date: entryDate.toISOString(),
      type: 'expense',
      category: input.category,
      description: input.description.trim(),
      amount,
      paymentMethod: input.paymentMethod,
      accountName: cash.name,
      reference: input.reference,
      relatedSupplier: input.relatedSupplier,
      createdByName: actorName,
      createdAt: new Date().toISOString(),
    };
  }

  /** Open COD/partial balances (sidebar badge). */
  async openReceivablesCount(organizationId: string): Promise<number> {
    const { items } = await this.listReceivables(organizationId);
    return items.length;
  }

  async listReceivables(
    organizationId: string,
  ): Promise<{ items: ReceivableItem[]; total: number }> {
    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        paymentStatus: { in: ['cod', 'partial'] },
        status: { notIn: ['cancelled'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        customerPhone: true,
        amount: true,
        paidAmount: true,
        paymentStatus: true,
        orderDate: true,
        createdAt: true,
      },
    });

    const items: ReceivableItem[] = [];
    for (const o of orders) {
      const due = o.amount - (o.paidAmount || 0);
      if (due <= 0.001) continue;
      const dueDate = o.orderDate ?? o.createdAt;
      const overdue =
        Date.now() - dueDate.getTime() > 7 * 24 * 60 * 60 * 1000;
      items.push({
        id: o.id,
        customerName: o.customerName,
        customerPhone: o.customerPhone ?? undefined,
        orderNumber: o.orderNumber,
        amount: o.amount,
        dueDate: dueDate.toISOString(),
        status:
          o.paymentStatus === 'partial'
            ? 'partial'
            : overdue
              ? 'overdue'
              : 'pending',
        collectedAmount: o.paidAmount || 0,
      });
    }

    return { items, total: items.length };
  }

  async listPayables(
    organizationId: string,
  ): Promise<{ items: PayableItem[]; total: number }> {
    const purchases = await this.prisma.inventoryPurchase.findMany({
      where: {
        organizationId,
        paymentStatus: { in: ['unpaid', 'partial'] },
      },
      include: {
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, unitCost: true } },
      },
      orderBy: { purchaseDate: 'desc' },
      take: 200,
    });

    const items: PayableItem[] = [];
    for (const p of purchases) {
      const amount = p.lines.reduce(
        (s, l) => s + Number(l.unitCost) * l.quantity,
        0,
      );
      if (amount <= 0) continue;
      const dueDate = p.dueDate ?? p.purchaseDate;
      const overdue =
        Date.now() - dueDate.getTime() > 14 * 24 * 60 * 60 * 1000;
      items.push({
        id: p.id,
        supplierName: p.supplier?.name ?? 'Supplier',
        reference: p.purchaseNumber,
        amount,
        dueDate: dueDate.toISOString(),
        status:
          p.paymentStatus === 'partial'
            ? 'partial'
            : overdue
              ? 'overdue'
              : 'pending',
        paidAmount: 0,
        category: 'purchase',
      });
    }

    return { items, total: items.length };
  }

  async markReceivableCollected(
    organizationId: string,
    orderId: string,
    paymentMethod: PaymentMethod = 'cash',
  ): Promise<ReceivableItem> {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, organizationId, deletedAt: null },
    });
    if (!order) throw new NotFoundException('Receivable not found');

    const due = Math.round((order.amount - (order.paidAmount || 0)) * 100) / 100;
    if (due <= 0) {
      throw new BadRequestException('Nothing left to collect');
    }

    await this.postOrderCollection(organizationId, {
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: due,
      paidTo: order.amount,
      paymentMethod,
    });

    const now = new Date();
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        paidAmount: order.amount,
        paymentStatus: 'paid',
        paymentMethod,
      },
    });

    await this.prisma.orderPayment.upsert({
      where: {
        organizationId_orderId: { organizationId, orderId: order.id },
      },
      create: {
        organizationId,
        orderId: order.id,
        method: paymentMethod,
        status: 'reconciled',
        collectedAmount: order.amount,
        collectedAt: now,
        reconciledAt: now,
      },
      update: {
        method: paymentMethod,
        status: 'reconciled',
        collectedAmount: order.amount,
        collectedAt: now,
        reconciledAt: now,
      },
    });

    return {
      id: order.id,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      orderNumber: order.orderNumber,
      amount: order.amount,
      dueDate: (order.orderDate ?? order.createdAt).toISOString(),
      status: 'collected',
      collectedAmount: order.amount,
    };
  }

  /**
   * Post sales collection to GL (Dr cash/method, Cr Sales).
   * Idempotent on cumulative paid-to amount so ops payments and AR collect share keys.
   * COD as a method is treated as cash-in-hand (not AR) once money is collected.
   */
  async postOrderCollection(
    organizationId: string,
    input: {
      orderId: string;
      orderNumber: string;
      amount: number;
      paidTo: number;
      paymentMethod: string;
    },
  ): Promise<string | null> {
    const amount = Math.round(Number(input.amount) * 100) / 100;
    if (!(amount > 0)) return null;

    await this.ensureChartOfAccounts(organizationId);

    const method =
      input.paymentMethod === 'cod' ? 'cash' : input.paymentMethod || 'cash';
    const cash = cashAccountForPaymentMethod(method);
    const paidTo = Math.round(Number(input.paidTo) * 100) / 100;

    return this.postBalancedJournal(organizationId, {
      eventKey: `ar-collect:${input.orderId}:paid-to:${paidTo}`,
      sourceType: 'order_collection',
      sourceId: input.orderId,
      description: `Collect ${input.orderNumber}`,
      reference: input.orderNumber,
      entryDate: new Date(),
      category: 'cod_collection',
      paymentMethod: method,
      lines: [
        { accountCode: cash.code, accountName: cash.name, debit: amount, credit: 0 },
        {
          accountCode: '4000',
          accountName: ACCOUNT_BY_CODE['4000']!.name,
          debit: 0,
          credit: amount,
        },
      ],
    });
  }

  /**
   * Settle AP for a received purchase (Dr AP / Cr cash). Idempotent per purchase.
   */
  async postPurchasePayment(
    organizationId: string,
    purchaseId: string,
    paymentMethod: PaymentMethod = 'cash',
  ): Promise<void> {
    const purchase = await this.prisma.inventoryPurchase.findFirst({
      where: { id: purchaseId, organizationId },
      include: {
        lines: { select: { quantity: true, unitCost: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Payable not found');

    const amount = purchase.lines.reduce(
      (s, l) => s + Number(l.unitCost) * l.quantity,
      0,
    );
    if (!(amount > 0)) return;

    await this.ensureChartOfAccounts(organizationId);
    const cash = cashAccountForPaymentMethod(paymentMethod);
    await this.postBalancedJournal(organizationId, {
      eventKey: `ap-pay:${purchase.id}`,
      sourceType: 'purchase_payment',
      sourceId: purchase.id,
      description: `Pay ${purchase.purchaseNumber}`,
      reference: purchase.purchaseNumber,
      entryDate: new Date(),
      category: 'purchase_payment',
      paymentMethod,
      lines: [
        {
          accountCode: '2000',
          accountName: ACCOUNT_BY_CODE['2000']!.name,
          debit: amount,
          credit: 0,
        },
        { accountCode: cash.code, accountName: cash.name, debit: 0, credit: amount },
      ],
    });
  }

  async markPayablePaid(
    organizationId: string,
    purchaseId: string,
    paymentMethod: PaymentMethod = 'cash',
  ): Promise<PayableItem> {
    const purchase = await this.prisma.inventoryPurchase.findFirst({
      where: { id: purchaseId, organizationId },
      include: {
        supplier: { select: { name: true } },
        lines: { select: { quantity: true, unitCost: true } },
      },
    });
    if (!purchase) throw new NotFoundException('Payable not found');

    const amount = purchase.lines.reduce(
      (s, l) => s + Number(l.unitCost) * l.quantity,
      0,
    );

    await this.postPurchasePayment(organizationId, purchaseId, paymentMethod);

    await this.prisma.inventoryPurchase.update({
      where: { id: purchase.id },
      data: { paymentStatus: 'paid' },
    });

    return {
      id: purchase.id,
      supplierName: purchase.supplier?.name ?? 'Supplier',
      reference: purchase.purchaseNumber,
      amount,
      dueDate: purchase.purchaseDate.toISOString(),
      status: 'paid',
      paidAmount: amount,
      category: 'purchase',
    };
  }

  async listCashBank(
    organizationId: string,
  ): Promise<{ items: CashBankAccount[] }> {
    await this.ensureChartOfAccounts(organizationId);
    const { balances } = await this.accountBalances(organizationId);
    const cashAccounts = await this.prisma.accountingAccount.findMany({
      where: { organizationId, cashKind: { not: null }, isActive: true },
      orderBy: { code: 'asc' },
    });

    return {
      items: cashAccounts.map((a, i) => ({
        id: a.id,
        name: a.name,
        type: (a.cashKind ?? 'cash') as CashBankAccount['type'],
        balance: balances.get(a.code) ?? 0,
        isDefault: i === 0,
      })),
    };
  }

  async getProfitLoss(
    organizationId: string,
    from?: string,
    to?: string,
  ): Promise<ProfitLossReport> {
    await this.ensureChartOfAccounts(organizationId);
    const rangeFrom = from ? new Date(from) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const rangeTo = to ? new Date(to) : new Date();
    const { balances } = await this.accountBalances(organizationId, {
      from: rangeFrom,
      to: rangeTo,
    });

    const incomeAccounts = await this.prisma.accountingAccount.findMany({
      where: { organizationId, type: 'income', isActive: true },
      orderBy: { code: 'asc' },
    });
    const expenseAccounts = await this.prisma.accountingAccount.findMany({
      where: { organizationId, type: 'expense', isActive: true },
      orderBy: { code: 'asc' },
    });

    const revenue = incomeAccounts
      .map((a) => ({ label: a.name, amount: balances.get(a.code) ?? 0 }))
      .filter((r) => r.amount !== 0);
    const expenses = expenseAccounts
      .map((a) => ({ label: a.name, amount: balances.get(a.code) ?? 0 }))
      .filter((r) => r.amount !== 0);

    const totalRevenue = revenue.reduce((s, r) => s + r.amount, 0);
    const totalExpenses = expenses.reduce((s, r) => s + r.amount, 0);
    const cogs = balances.get('5000') ?? 0;
    const gross = totalRevenue - cogs;

    return {
      periodLabel: `${rangeFrom.toISOString().slice(0, 10)} → ${rangeTo.toISOString().slice(0, 10)}`,
      revenue,
      expenses,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      grossMargin: totalRevenue > 0 ? Math.round((gross / totalRevenue) * 1000) / 10 : 0,
    };
  }

  async getBalanceSheet(
    organizationId: string,
    asOf?: string,
  ): Promise<BalanceSheetReport> {
    await this.ensureChartOfAccounts(organizationId);
    const asOfDate = asOf ? new Date(asOf) : new Date();
    const { balances, typeByCode } = await this.accountBalances(organizationId, {
      to: asOfDate,
    });

    const accounts = await this.prisma.accountingAccount.findMany({
      where: { organizationId, isActive: true },
      orderBy: { code: 'asc' },
    });

    const assets = accounts
      .filter((a) => a.type === 'asset')
      .map((a) => ({ label: a.name, amount: balances.get(a.code) ?? 0 }))
      .filter((r) => r.amount !== 0);
    const liabilities = accounts
      .filter((a) => a.type === 'liability')
      .map((a) => ({ label: a.name, amount: balances.get(a.code) ?? 0 }))
      .filter((r) => r.amount !== 0);
    const equityRows = accounts
      .filter((a) => a.type === 'equity')
      .map((a) => ({ label: a.name, amount: balances.get(a.code) ?? 0 }))
      .filter((r) => r.amount !== 0);

    // Retained earnings = income - expense (all time to asOf)
    const income = this.sumByType(balances, 'income', typeByCode);
    const expense = this.sumByType(balances, 'expense', typeByCode);
    const retained = income - expense;
    if (Math.abs(retained) > 0.001) {
      equityRows.push({ label: 'Retained earnings', amount: retained });
    }

    const totalAssets = assets.reduce((s, r) => s + r.amount, 0);
    const totalLiabilities = liabilities.reduce((s, r) => s + r.amount, 0);
    const totalEquity = equityRows.reduce((s, r) => s + r.amount, 0);

    return {
      asOfDate: asOfDate.toISOString(),
      assets,
      liabilities,
      equity: equityRows,
      totalAssets,
      totalLiabilities,
      totalEquity,
    };
  }

  // ─── internals ─────────────────────────────────────────────────────────────

  private async postBalancedJournal(
    organizationId: string,
    input: {
      eventKey: string;
      sourceType: string;
      sourceId: string;
      description: string;
      reference?: string;
      entryDate: Date;
      category?: string;
      paymentMethod?: string;
      lines: Array<{
        accountCode: string;
        accountName: string;
        debit: number;
        credit: number;
      }>;
    },
  ): Promise<string> {
    const existing = await this.prisma.accountingJournalEntry.findFirst({
      where: { organizationId, eventKey: input.eventKey },
      select: { id: true },
    });
    if (existing) return existing.id;

    const debitSum = input.lines.reduce((s, l) => s + l.debit, 0);
    const creditSum = input.lines.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(debitSum - creditSum) > 0.01) {
      throw new BadRequestException('Journal is not balanced');
    }

    const created = await this.prisma.accountingJournalEntry.create({
      data: {
        organizationId,
        entryDate: input.entryDate,
        description: input.description,
        reference: input.reference,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        eventKey: input.eventKey,
        category: input.category,
        paymentMethod: input.paymentMethod,
        status: 'posted',
        lines: {
          create: input.lines.map((l) => ({
            accountCode: l.accountCode,
            accountName: l.accountName,
            debit: new Prisma.Decimal(Math.round(l.debit * 100) / 100),
            credit: new Prisma.Decimal(Math.round(l.credit * 100) / 100),
          })),
        },
      },
    });
    return created.id;
  }

  private async accountBalances(
    organizationId: string,
    range?: { from?: Date; to?: Date },
  ): Promise<{ balances: Map<string, number>; typeByCode: Map<string, string> }> {
    const lines = await this.prisma.accountingJournalLine.findMany({
      where: {
        journalEntry: {
          organizationId,
          status: 'posted',
          ...(range?.from || range?.to
            ? {
                entryDate: {
                  ...(range.from ? { gte: range.from } : {}),
                  ...(range.to ? { lte: range.to } : {}),
                },
              }
            : {}),
        },
      },
      select: {
        accountCode: true,
        debit: true,
        credit: true,
      },
    });

    const accounts = await this.prisma.accountingAccount.findMany({
      where: { organizationId },
      select: { code: true, type: true },
    });
    const typeByCode = new Map(accounts.map((a) => [a.code, a.type]));
    for (const [code, meta] of Object.entries(ACCOUNT_BY_CODE)) {
      if (!typeByCode.has(code)) typeByCode.set(code, meta.type);
    }

    const balances = new Map<string, number>();
    for (const line of lines) {
      const debit = Number(line.debit);
      const credit = Number(line.credit);
      const type = typeByCode.get(line.accountCode);
      // Assets/expenses: debit increases; Liabilities/equity/income: credit increases
      const signed =
        type === 'asset' || type === 'expense' ? debit - credit : credit - debit;
      balances.set(line.accountCode, (balances.get(line.accountCode) ?? 0) + signed);
    }
    return { balances, typeByCode };
  }

  private sumByType(
    balances: Map<string, number>,
    type: AccountType,
    typeByCode: Map<string, string>,
  ): number {
    let sum = 0;
    for (const [code, amount] of balances) {
      if (typeByCode.get(code) === type) sum += amount;
    }
    return sum;
  }

  private journalToLedgerEntry(row: JournalWithLines): LedgerEntry {
    const amount = row.lines.reduce((max, l) => Math.max(max, Number(l.debit), Number(l.credit)), 0);
    const type = this.inferType(row);
    const cashLine = row.lines.find((l) =>
      ['1000', '1010', '1020', '1030', '1100'].includes(l.accountCode),
    );
    return {
      id: row.id,
      date: row.entryDate.toISOString(),
      type,
      category: row.category ?? row.sourceType,
      description: row.description,
      amount,
      paymentMethod: (row.paymentMethod as PaymentMethod) || 'cash',
      accountName: cashLine?.accountName ?? row.lines[0]?.accountName ?? 'General',
      reference: row.reference ?? undefined,
      relatedOrderId:
        row.sourceType.includes('order') || row.sourceType === 'order_collection'
          ? row.sourceId
          : undefined,
      relatedSupplier:
        row.sourceType.includes('purchase') ? row.reference ?? undefined : undefined,
      createdAt: row.postedAt.toISOString(),
    };
  }

  private inferType(row: JournalWithLines): TransactionType {
    if (row.sourceType === 'manual_income' || row.category === 'order_sales') {
      return 'income';
    }
    if (row.sourceType === 'manual_expense' || row.sourceType === 'purchase_payment') {
      return 'expense';
    }
    if (row.sourceType === 'order_collection' || row.sourceType === 'order_sales') {
      return 'income';
    }
    // Inventory journals
    if (
      row.sourceType === 'inventory' ||
      row.eventKey.startsWith('sale-cogs') ||
      row.eventKey.includes('purchase')
    ) {
      return 'journal';
    }
    const hasExpense = row.lines.some((l) => {
      const t = ACCOUNT_BY_CODE[l.accountCode]?.type;
      return t === 'expense' && Number(l.debit) > 0;
    });
    if (hasExpense) return 'expense';
    const hasIncome = row.lines.some((l) => {
      const t = ACCOUNT_BY_CODE[l.accountCode]?.type;
      return t === 'income' && Number(l.credit) > 0;
    });
    if (hasIncome) return 'income';
    return 'journal';
  }

  private monthStartIso(): string {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
  }
}
