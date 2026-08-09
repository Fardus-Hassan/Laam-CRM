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
import { CarrybeeCourierService } from './carrybee-courier.service';
import { BdCourierService } from './bdcourier.service';
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

class UpsertCarrybeeDto {
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
  clientContext?: string;

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

class UpsertBdCourierDto {
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsString()
  apiKey?: string;
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
    private readonly carrybee: CarrybeeCourierService,
    private readonly bdcourier: BdCourierService,
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

  @Get('carrybee')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Get Carrybee integration settings for current org' })
  getCarrybee(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.getCarrybeePublic(user.organizationId!);
  }

  @Put('carrybee')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Create/update Carrybee credentials (org settings)' })
  upsertCarrybee(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertCarrybeeDto) {
    return this.integrations.upsertCarrybee(user.organizationId!, body);
  }

  @Delete('carrybee')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Disable Carrybee and clear credentials' })
  disconnectCarrybee(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.disconnectCarrybee(user.organizationId!);
  }

  @Post('carrybee/test')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Test Carrybee connection with saved credentials' })
  testCarrybee(@CurrentUser() user: AuthUserPayload) {
    return this.carrybee.testConnection(user.organizationId!);
  }

  @Get('carrybee/stores')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'List Carrybee stores using org credentials' })
  listCarrybeeStores(@CurrentUser() user: AuthUserPayload) {
    return this.carrybee.listStores(user.organizationId!);
  }

  @Get('carrybee/status-maps')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.view', 'orders.view')
  listCarrybeeStatusMaps(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.listStatusMaps(user.organizationId!, 'carrybee');
  }

  @Put('carrybee/status-maps')
  @RequirePermissions('settings.manage', 'courier.manage')
  upsertCarrybeeStatusMap(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpsertStatusMapDto,
  ) {
    return this.integrations.upsertStatusMap(user.organizationId!, {
      ...body,
      provider: 'carrybee',
    });
  }

  @Patch('carrybee/status-maps/:id')
  @RequirePermissions('settings.manage', 'courier.manage')
  patchCarrybeeStatusMap(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpsertStatusMapDto,
  ) {
    return this.integrations.upsertStatusMap(user.organizationId!, {
      ...body,
      provider: 'carrybee',
      id,
    });
  }

  @Get('bdcourier')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Get BD Courier (phone history) settings for current org' })
  getBdCourier(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.getBdCourierPublic(user.organizationId!);
  }

  @Put('bdcourier')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Create/update BD Courier API key (org settings)' })
  upsertBdCourier(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertBdCourierDto) {
    return this.integrations.upsertBdCourier(user.organizationId!, body);
  }

  @Delete('bdcourier')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Disable BD Courier and clear API key' })
  disconnectBdCourier(@CurrentUser() user: AuthUserPayload) {
    return this.integrations.disconnectBdCourier(user.organizationId!);
  }

  @Post('bdcourier/test')
  @RequirePermissions('settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Test BD Courier connection with saved API key' })
  testBdCourier(@CurrentUser() user: AuthUserPayload) {
    return this.bdcourier.testConnection(user.organizationId!);
  }

  @Get('bdcourier/plan')
  @RequirePermissions('settings.view', 'settings.manage', 'courier.manage')
  @ApiOperation({ summary: 'Fetch BD Courier subscription / API plan for current org' })
  getBdCourierPlan(@CurrentUser() user: AuthUserPayload) {
    return this.bdcourier.getMyPlan(user.organizationId!);
  }
}
