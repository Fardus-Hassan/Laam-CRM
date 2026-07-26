import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { CourierIntegrationsService } from './courier-integrations.service';
import { PathaoCourierService } from './pathao-courier.service';

class UpsertPathaoDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsIn(['sandbox', 'live'])
  environment?: 'sandbox' | 'live';

  @IsOptional()
  @IsString()
  storeId?: string | null;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  clientSecret?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(60)
  @Max(3600)
  syncIntervalSec?: number;
}

class UpsertStatusMapDto {
  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsString()
  slug!: string;

  @IsString()
  label!: string;

  @IsOptional()
  @IsString()
  crmStatus?: string | null;

  @IsOptional()
  @IsBoolean()
  isTerminal?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('Courier integrations')
@Controller('crm/settings/couriers')
export class CourierIntegrationsController {
  constructor(
    private readonly integrations: CourierIntegrationsService,
    private readonly pathao: PathaoCourierService,
  ) {}

  @Get('pathao')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Get Pathao integration settings for current org' })
  getPathao(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.getPathaoPublic(user.organizationId!);
  }

  @Put('pathao')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Create/update Pathao credentials (org settings)' })
  upsertPathao(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertPathaoDto) {
    return this.integrations.upsertPathao(user.organizationId!, body);
  }

  @Delete('pathao')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Disable Pathao and clear credentials' })
  disconnectPathao(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.disconnectPathao(user.organizationId!);
  }

  @Post('pathao/test')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Test Pathao connection with saved credentials' })
  testPathao(@CurrentUser() user: AuthUserPayload) {
    return this.pathao.testConnection(user.organizationId!);
  }

  @Get('pathao/stores')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'List Pathao stores using org credentials' })
  listStores(@CurrentUser() user: AuthUserPayload) {
    return this.pathao.listStores(user.organizationId!);
  }

  @Get('pathao/status-maps')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.view', 'orders.view')
  listStatusMaps(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.listStatusMaps(user.organizationId!, 'pathao');
  }

  @Put('pathao/status-maps')
  @RequirePermissions('settings.manage', 'courier.manage')
  upsertStatusMap(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertStatusMapDto) {
    return this.integrations.upsertStatusMap(user.organizationId!, body);
  }

  @Patch('pathao/status-maps/:id')
  @RequirePermissions('settings.manage', 'courier.manage')
  patchStatusMap(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpsertStatusMapDto,
  ) {
    return this.integrations.upsertStatusMap(user.organizationId!, { ...body, id });
  }
}
