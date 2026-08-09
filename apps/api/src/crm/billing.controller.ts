import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type {
  CreateBillingInvoicePayload,
  RechargeCreditsPayload,
  UpsertBillingPaymentMethodPayload,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { BillingService } from './billing.service';

class RechargeDto {
  @Type(() => Number)
  @IsNumber()
  @Min(100)
  amountBdt!: number;

  @IsOptional()
  @IsString()
  paymentMethodId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

class CreateInvoiceDto {
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  amountBdt!: number;

  @IsString()
  @MinLength(1)
  periodLabel!: string;

  @IsOptional()
  @IsIn(['Starter', 'Pro', 'Enterprise'])
  plan?: 'Starter' | 'Pro' | 'Enterprise';

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  dueDate?: string;

  @IsOptional()
  @IsIn(['paid', 'pending', 'overdue', 'cancelled'])
  status?: 'paid' | 'pending' | 'overdue' | 'cancelled';
}

class PaymentMethodDto {
  @IsIn(['bkash', 'nagad', 'bank', 'card'])
  type!: 'bkash' | 'nagad' | 'bank' | 'card';

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  lastFour?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@ApiTags('CRM — Billing')
@Controller('crm/billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('overview')
  @RequirePermissions('billing.view')
  @ApiOperation({ summary: 'Tenant SaaS billing overview' })
  overview(@CurrentUser() user: AuthUserPayload) {
    this.billing.requireOrg(user.organizationId);
    return this.billing.getOverview(user.organizationId!);
  }

  @Get('invoices')
  @RequirePermissions('billing.view')
  invoices(@CurrentUser() user: AuthUserPayload) {
    this.billing.requireOrg(user.organizationId);
    return this.billing.listInvoices(user.organizationId!);
  }

  @Get('plans')
  @RequirePermissions('billing.view', 'platform.view')
  plans() {
    return this.billing.listPlans();
  }

  @Post('recharge')
  @RequirePermissions('billing.manage')
  @ApiOperation({ summary: 'Record SMS credit top-up (no gateway charge)' })
  recharge(@CurrentUser() user: AuthUserPayload, @Body() body: RechargeDto) {
    this.billing.requireOrg(user.organizationId);
    return this.billing.recordCredits(
      user.organizationId!,
      body as RechargeCreditsPayload,
    );
  }

  @Post('invoices')
  @RequirePermissions('billing.manage')
  createInvoice(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: CreateInvoiceDto,
  ) {
    this.billing.requireOrg(user.organizationId);
    return this.billing.createInvoice(
      user.organizationId!,
      body as CreateBillingInvoicePayload,
    );
  }

  @Patch('invoices/:id/paid')
  @RequirePermissions('billing.manage')
  markPaid(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.billing.requireOrg(user.organizationId);
    return this.billing.markInvoicePaid(user.organizationId!, id);
  }

  @Post('payment-methods')
  @RequirePermissions('billing.manage')
  addPaymentMethod(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: PaymentMethodDto,
  ) {
    this.billing.requireOrg(user.organizationId);
    return this.billing.addPaymentMethod(
      user.organizationId!,
      body as UpsertBillingPaymentMethodPayload,
    );
  }
}
