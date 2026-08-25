import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { CustomersService } from './customers.service';

class UpsertPurchaseSegmentDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsIn(['eq', 'gt', 'gte', 'lt', 'lte'])
  op?: 'eq' | 'gt' | 'gte' | 'lt' | 'lte';

  @Type(() => Number)
  @IsInt()
  @Min(0)
  threshold!: number;

  @IsOptional()
  @IsIn(['deliveredCount', 'orderCount'])
  metric?: 'deliveredCount' | 'orderCount';

  @IsOptional()
  @IsIn(['sidebar', 'nested_tab', 'sidebar_and_tab', 'filter_only'])
  displayMode?: 'sidebar' | 'nested_tab' | 'sidebar_and_tab' | 'filter_only';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  showInNav?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

@Controller('crm/settings/customer-purchase-segments')
export class OrgCustomerPurchaseSegmentsController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions('settings.manage', 'settings.view', 'companies.view')
  list(@CurrentUser() user: AuthUserPayload) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.listPurchaseSegments(user.organizationId!);
  }

  @Post()
  @RequirePermissions('settings.manage', 'companies.edit')
  upsert(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpsertPurchaseSegmentDto,
  ) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.upsertPurchaseSegment(user.organizationId!, {
      id: body.id,
      label: body.label,
      slug: body.slug,
      op: body.op ?? 'eq',
      threshold: body.threshold,
      metric: body.metric,
      displayMode: body.displayMode,
      sortOrder: body.sortOrder,
      showInNav: body.showInNav,
      isActive: body.isActive,
    });
  }

  @Patch(':id/active')
  @RequirePermissions('settings.manage', 'companies.edit')
  setActive(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: SetActiveDto,
  ) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.setPurchaseSegmentActive(
      user.organizationId!,
      id,
      body.isActive,
    );
  }

  @Delete(':id')
  @RequirePermissions('settings.manage', 'companies.edit')
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.customers.requireOrg(user.organizationId);
    await this.customers.deletePurchaseSegment(user.organizationId!, id);
    return { ok: true };
  }
}
