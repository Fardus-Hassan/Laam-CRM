import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import type {
  AccountType,
  CreateExpensePayload,
  CreateIncomePayload,
  PaymentMethod,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { AccountingService } from './accounting.service';

class CreateIncomeDto {
  @IsString()
  date!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  relatedOrderId?: string;
}

class CreateExpenseDto {
  @IsString()
  date!: string;

  @IsString()
  @MinLength(1)
  category!: string;

  @IsString()
  @MinLength(1)
  description!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;

  @IsString()
  paymentMethod!: PaymentMethod;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  relatedSupplier?: string;
}

class CreateAccountDto {
  @IsString()
  @MinLength(1)
  code!: string;

  @IsString()
  @MinLength(1)
  name!: string;

  @IsIn(['asset', 'liability', 'equity', 'income', 'expense'])
  type!: AccountType;
}

class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

@ApiTags('CRM — Accounting')
@Controller('crm/accounting')
export class AccountingController {
  constructor(private readonly accounting: AccountingService) {}

  @Get('overview')
  @RequirePermissions('accounting.view')
  @ApiOperation({ summary: 'Accounting overview KPIs' })
  overview(@CurrentUser() user: AuthUserPayload) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.getOverview(user.organizationId!);
  }

  @Get('income')
  @RequirePermissions('accounting.view')
  listIncome(
    @CurrentUser() user: AuthUserPayload,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.listIncome(user.organizationId!, {
      filter,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Post('income')
  @RequirePermissions('accounting.create')
  createIncome(@CurrentUser() user: AuthUserPayload, @Body() body: CreateIncomeDto) {
    this.accounting.requireOrg(user.organizationId);
    const payload: CreateIncomePayload = { ...body };
    return this.accounting.createIncome(
      user.organizationId!,
      payload,
      actorFromUser(user).name,
    );
  }

  @Get('expenses')
  @RequirePermissions('accounting.view')
  listExpenses(
    @CurrentUser() user: AuthUserPayload,
    @Query('filter') filter?: string,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
  ) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.listExpenses(user.organizationId!, {
      filter,
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
    });
  }

  @Post('expenses')
  @RequirePermissions('accounting.create')
  createExpense(@CurrentUser() user: AuthUserPayload, @Body() body: CreateExpenseDto) {
    this.accounting.requireOrg(user.organizationId);
    const payload: CreateExpensePayload = { ...body };
    return this.accounting.createExpense(
      user.organizationId!,
      payload,
      actorFromUser(user).name,
    );
  }

  @Get('ledger')
  @RequirePermissions('accounting.view')
  listLedger(
    @CurrentUser() user: AuthUserPayload,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.listLedger(user.organizationId!, {
      search,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 20,
      dateFrom,
      dateTo,
    });
  }

  @Get('receivables')
  @RequirePermissions('accounting.view')
  receivables(@CurrentUser() user: AuthUserPayload) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.listReceivables(user.organizationId!);
  }

  @Post('receivables/:id/collect')
  @RequirePermissions('accounting.create', 'accounting.edit')
  collectReceivable(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.markReceivableCollected(user.organizationId!, id);
  }

  @Get('payables')
  @RequirePermissions('accounting.view')
  payables(@CurrentUser() user: AuthUserPayload) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.listPayables(user.organizationId!);
  }

  @Post('payables/:id/pay')
  @RequirePermissions('accounting.create', 'accounting.edit')
  payPayable(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.markPayablePaid(user.organizationId!, id);
  }

  @Get('cash-bank')
  @RequirePermissions('accounting.view')
  cashBank(@CurrentUser() user: AuthUserPayload) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.listCashBank(user.organizationId!);
  }

  @Get('chart-of-accounts')
  @RequirePermissions('accounting.view')
  chart(@CurrentUser() user: AuthUserPayload) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.listChartOfAccounts(user.organizationId!);
  }

  @Post('chart-of-accounts')
  @RequirePermissions('accounting.manage')
  createAccount(@CurrentUser() user: AuthUserPayload, @Body() body: CreateAccountDto) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.createAccount(user.organizationId!, body);
  }

  @Patch('chart-of-accounts/:id')
  @RequirePermissions('accounting.manage')
  patchAccount(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: SetActiveDto,
  ) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.setAccountActive(user.organizationId!, id, body.isActive);
  }

  @Get('reports/profit-loss')
  @RequirePermissions('accounting.view')
  profitLoss(
    @CurrentUser() user: AuthUserPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.getProfitLoss(user.organizationId!, from, to);
  }

  @Get('reports/balance-sheet')
  @RequirePermissions('accounting.view')
  balanceSheet(
    @CurrentUser() user: AuthUserPayload,
    @Query('asOf') asOf?: string,
  ) {
    this.accounting.requireOrg(user.organizationId);
    return this.accounting.getBalanceSheet(user.organizationId!, asOf);
  }
}
