import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import type { ReportPeriod, ReportViewId } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { ReportsService } from './reports.service';

class PeriodQuery {
  @IsOptional()
  @IsString()
  @IsIn(['7d', '30d', '90d', 'ytd', 'custom'])
  period?: ReportPeriod;
}

class MonthQuery {
  @IsOptional()
  @IsString()
  monthKey?: string;
}

class UpsertSpendDto {
  @IsString()
  monthKey!: string;

  @IsString()
  @MinLength(1)
  campaignName!: string;

  @IsNumber()
  @Min(0)
  spendBdt!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

class UpsertTargetDto {
  @IsString()
  monthKey!: string;

  @IsIn(['agent', 'team'])
  scope!: 'agent' | 'team';

  @IsString()
  @MinLength(1)
  subjectKey!: string;

  @IsString()
  @MinLength(1)
  subjectLabel!: string;

  @IsNumber()
  @Min(0)
  targetOrders!: number;

  @IsNumber()
  @Min(0)
  targetRevenueBdt!: number;
}

@ApiTags('CRM — Reports')
@Controller('crm/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  private period(query: PeriodQuery): ReportPeriod {
    return query.period ?? '30d';
  }

  @Get('summary')
  @RequirePermissions('reports.view')
  @ApiOperation({ summary: 'Report summary KPIs + trends' })
  getSummary(@CurrentUser() user: AuthUserPayload, @Query() query: PeriodQuery) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getSummary(user.organizationId!, this.period(query));
  }

  @Get('sales')
  @RequirePermissions('reports.view')
  getSales(@CurrentUser() user: AuthUserPayload, @Query() query: PeriodQuery) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getSales(user.organizationId!, this.period(query));
  }

  @Get('revenue')
  @RequirePermissions('reports.view')
  getRevenue(@CurrentUser() user: AuthUserPayload, @Query() query: PeriodQuery) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getRevenue(user.organizationId!, this.period(query));
  }

  @Get('repeat-customers')
  @RequirePermissions('reports.view')
  getRepeatCustomers(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: PeriodQuery,
  ) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getRepeatCustomers(user.organizationId!, this.period(query));
  }

  @Get('products/:type')
  @RequirePermissions('reports.view')
  getRankedProducts(
    @CurrentUser() user: AuthUserPayload,
    @Param('type') type: ReportViewId,
    @Query() query: PeriodQuery,
  ) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getRankedProducts(
      user.organizationId!,
      type,
      this.period(query),
    );
  }

  @Get('product-daily')
  @RequirePermissions('reports.view')
  getProductDaily(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: PeriodQuery,
  ) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getProductDaily(user.organizationId!, this.period(query));
  }

  @Get('employees/:type')
  @RequirePermissions('reports.view')
  getEmployees(
    @CurrentUser() user: AuthUserPayload,
    @Param('type') type: ReportViewId,
    @Query() query: PeriodQuery,
  ) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getEmployees(
      user.organizationId!,
      type,
      this.period(query),
    );
  }

  @Get('team-targets')
  @RequirePermissions('reports.view')
  getTeamTargets(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: PeriodQuery,
  ) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getTeamTargets(user.organizationId!, this.period(query));
  }

  @Get('targets')
  @RequirePermissions('reports.view', 'reports.export')
  listTargets(@CurrentUser() user: AuthUserPayload, @Query() query: MonthQuery) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.listTargets(user.organizationId!, query.monthKey);
  }

  @Post('targets')
  @RequirePermissions('reports.export', 'reports.view')
  upsertTarget(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertTargetDto) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.upsertTarget(user.organizationId!, body);
  }

  @Delete('targets/:id')
  @RequirePermissions('reports.export', 'reports.view')
  async deleteTarget(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
  ) {
    this.reports.requireOrg(user.organizationId);
    await this.reports.deleteTarget(user.organizationId!, id);
    return { ok: true };
  }

  @Get('marketing')
  @RequirePermissions('reports.view')
  getMarketing(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: PeriodQuery,
  ) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getMarketing(user.organizationId!, this.period(query));
  }

  @Get('marketing/spend')
  @RequirePermissions('reports.view')
  listSpend(@CurrentUser() user: AuthUserPayload, @Query() query: MonthQuery) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.listMarketingSpend(user.organizationId!, query.monthKey);
  }

  @Post('marketing/spend')
  @RequirePermissions('reports.export', 'reports.view')
  upsertSpend(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertSpendDto) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.upsertMarketingSpend(user.organizationId!, body);
  }

  @Delete('marketing/spend/:id')
  @RequirePermissions('reports.export', 'reports.view')
  async deleteSpend(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
  ) {
    this.reports.requireOrg(user.organizationId);
    await this.reports.deleteMarketingSpend(user.organizationId!, id);
    return { ok: true };
  }

  @Get('sources')
  @RequirePermissions('reports.view')
  getLeadSources(
    @CurrentUser() user: AuthUserPayload,
    @Query() query: PeriodQuery,
  ) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getLeadSources(user.organizationId!, this.period(query));
  }

  @Get('upsales')
  @RequirePermissions('reports.view')
  getUpsales(@CurrentUser() user: AuthUserPayload, @Query() query: PeriodQuery) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getUpsales(user.organizationId!, this.period(query));
  }

  @Get('login-history')
  @RequirePermissions('reports.view', 'security.view')
  getLoginHistory(@CurrentUser() user: AuthUserPayload) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getLoginHistory(user.organizationId!);
  }

  @Get('platform')
  @RequirePermissions('reports.view')
  getPlatform(@CurrentUser() user: AuthUserPayload) {
    this.reports.requireOrg(user.organizationId);
    return this.reports.getPlatform(user.organizationId!);
  }
}
