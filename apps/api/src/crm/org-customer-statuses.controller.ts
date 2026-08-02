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

class UpsertCustomerStatusDto {
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
  @IsString()
  color?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class SetActiveDto {
  @IsBoolean()
  isActive!: boolean;
}

@Controller('crm/settings/customer-statuses')
export class OrgCustomerStatusesController {
  constructor(private readonly customers: CustomersService) {}

  @Get()
  @RequirePermissions('settings.manage', 'settings.view', 'companies.view')
  list(@CurrentUser() user: AuthUserPayload) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.listStatuses(user.organizationId!);
  }

  @Post()
  @RequirePermissions('settings.manage', 'companies.edit')
  upsert(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpsertCustomerStatusDto,
  ) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.upsertStatus(user.organizationId!, body);
  }

  @Patch(':id/active')
  @RequirePermissions('settings.manage', 'companies.edit')
  setActive(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: SetActiveDto,
  ) {
    this.customers.requireOrg(user.organizationId);
    return this.customers.setStatusActive(
      user.organizationId!,
      id,
      body.isActive,
    );
  }

  @Delete(':id')
  @RequirePermissions('settings.manage', 'companies.edit')
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.customers.requireOrg(user.organizationId);
    await this.customers.deleteStatus(user.organizationId!, id);
    return { ok: true };
  }
}
