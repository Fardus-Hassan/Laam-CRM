import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { OrgOrderQueuesService } from './org-order-queues.service';

class UpsertOrderQueueDto {
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
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sidebarOrder?: number;

  @IsOptional()
  @IsBoolean()
  showInNav?: boolean;

  @IsOptional()
  @IsString()
  defaultChildSlug?: string | null;

  @IsOptional()
  @IsBoolean()
  followUpDue?: boolean;
}

class RenameQueueDto {
  @IsString()
  @MinLength(1)
  label!: string;
}

class QueueNavDto {
  @IsBoolean()
  showInNav!: boolean;
}

@Controller('crm/settings/order-queues')
export class OrgOrderQueuesController {
  constructor(private readonly queues: OrgOrderQueuesService) {}

  @Get()
  @RequirePermissions('settings.manage', 'settings.view', 'orders.view')
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('includeInactive') includeInactive?: string,
  ) {
    this.queues.requireOrg(user.organizationId);
    if (includeInactive === '1' || includeInactive === 'true') {
      return this.queues.listForSettings(user.organizationId!);
    }
    return this.queues.list(user.organizationId!);
  }

  @Post()
  @RequirePermissions('settings.manage')
  upsert(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertOrderQueueDto) {
    this.queues.requireOrg(user.organizationId);
    return this.queues.upsert(user.organizationId!, body);
  }

  @Patch(':id/label')
  @RequirePermissions('settings.manage')
  rename(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: RenameQueueDto,
  ) {
    this.queues.requireOrg(user.organizationId);
    return this.queues.rename(user.organizationId!, id, body.label);
  }

  @Patch(':id/nav')
  @RequirePermissions('settings.manage')
  setNav(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: QueueNavDto,
  ) {
    this.queues.requireOrg(user.organizationId);
    return this.queues.setNavVisibility(user.organizationId!, id, body.showInNav);
  }

  @Delete(':id')
  @RequirePermissions('settings.manage')
  deactivate(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.queues.requireOrg(user.organizationId);
    return this.queues.deactivate(user.organizationId!, id);
  }
}
