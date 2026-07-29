import { Body, Controller, Get, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional } from 'class-validator';
import type { UpsertAutomationSettingsPayload } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { AutomationsService } from './automations.service';

class UpsertAutomationsDto {
  @IsOptional()
  @IsBoolean()
  autoSmsOnStatusChange?: boolean;

  @IsOptional()
  @IsObject()
  statusSmsMap?: Record<string, string>;

  @IsOptional()
  @IsBoolean()
  autoFollowupOnStatusChange?: boolean;

  @IsOptional()
  @IsObject()
  statusFollowupMap?: Record<
    string,
    { queue?: number; delayDays?: number; note?: string }
  >;
}

@ApiTags('CRM — Automations')
@Controller('crm/settings/automations')
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get()
  @RequirePermissions('settings.manage', 'orders.view')
  @ApiOperation({ summary: 'Get SMS + follow-up automation settings' })
  get(@CurrentUser() user: AuthUserPayload) {
    this.automations.requireOrg(user.organizationId);
    return this.automations.getSettings(user.organizationId!);
  }

  @Put()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update SMS and/or follow-up automation settings' })
  put(@CurrentUser() user: AuthUserPayload, @Body() body: UpsertAutomationsDto) {
    this.automations.requireOrg(user.organizationId);
    return this.automations.updateSettings(
      user.organizationId!,
      body as UpsertAutomationSettingsPayload,
    );
  }
}
