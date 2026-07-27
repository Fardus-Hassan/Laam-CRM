import { Body, Controller, Get, Post } from '@nestjs/common';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { BulkActionId, OrderStatusDisplayMode, OrderWorkflowGroup } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { OrgOrderStatusesService } from './org-order-statuses.service';

const DISPLAY_MODES = ['sidebar', 'nested_tab', 'filter_only', 'sidebar_and_tab'] as const;
const GROUPS = [
  'intake',
  'confirm',
  'fulfillment',
  'delivery',
  'returns',
  'terminal',
  'special',
] as const;

class UpsertOrderStatusDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsString()
  @MinLength(1)
  @Matches(/^[a-z][a-z0-9_]*$/)
  slug!: string;

  @IsString()
  @MinLength(1)
  label!: string;

  @IsOptional()
  @IsString()
  labelBn?: string;

  @IsString()
  @MinLength(1)
  color!: string;

  @IsIn(GROUPS)
  group!: OrderWorkflowGroup;

  @IsOptional()
  @IsString()
  parentSlug?: string;

  @IsIn(DISPLAY_MODES)
  displayMode!: OrderStatusDisplayMode;

  @IsOptional()
  @IsBoolean()
  showInSidebar?: boolean;

  @IsOptional()
  @IsBoolean()
  showInNestedTabs?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sidebarOrder?: number;

  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedTransitions?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bulkActions?: BulkActionId[];

  @IsOptional()
  @IsBoolean()
  showInGroupByStatus?: boolean;
}

class ReplaceManyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpsertOrderStatusDto)
  statuses!: UpsertOrderStatusDto[];
}

@Controller('crm/settings/order-statuses')
export class OrgOrderStatusesController {
  constructor(private readonly statuses: OrgOrderStatusesService) {}

  @Get()
  @RequirePermissions('settings.manage', 'settings.view', 'orders.view')
  list(@CurrentUser() user: AuthUserPayload) {
    this.statuses.requireOrg(user.organizationId);
    return this.statuses.list(user.organizationId);
  }

  @Post()
  @RequirePermissions('settings.manage')
  upsert(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertOrderStatusDto) {
    this.statuses.requireOrg(user.organizationId);
    return this.statuses.upsert(user.organizationId, body);
  }

  @Post('replace')
  @RequirePermissions('settings.manage')
  replaceMany(@CurrentUser() user: AuthUserPayload, @Body() body: ReplaceManyDto) {
    this.statuses.requireOrg(user.organizationId);
    return this.statuses.replaceMany(user.organizationId, body.statuses);
  }
}
