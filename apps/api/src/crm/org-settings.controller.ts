import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Put,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { OrgSettingsService } from './org-settings.service';

class UpdateOrgProfileDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  orderPrefix?: string;

  @IsOptional()
  @IsString()
  defaultCourier?: string;
}

@ApiTags('Organization settings')
@Controller('crm/settings')
export class OrgSettingsController {
  constructor(private readonly settings: OrgSettingsService) {}

  @Get()
  @RequirePermissions('settings.manage', 'settings.view', 'brand.view')
  @ApiOperation({ summary: 'Organization profile and integration summary' })
  getSettings(@CurrentUser() user: AuthUserPayload) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization required');
    }
    return this.settings.getSettings(user.organizationId);
  }

  @Patch('profile')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update organization profile and order defaults' })
  updateProfile(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpdateOrgProfileDto,
  ) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization required');
    }
    return this.settings.updateProfile(user.organizationId, body);
  }

  @Put('integrations')
  @RequirePermissions('settings.manage')
  updateIntegration() {
    throw new BadRequestException(
      'Connect couriers and SMS from Settings → Integrations',
    );
  }

  @Delete('integrations/:provider')
  @RequirePermissions('settings.manage')
  disconnectIntegration(@Param('provider') _provider: string) {
    throw new BadRequestException(
      'Disconnect integrations from Settings → Integrations',
    );
  }
}
