import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { Type } from 'class-transformer';
import type {
  CampaignPlatform,
  CampaignStatus,
  CreateCampaignPayload,
  UpdateCampaignPayload,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { CampaignsService } from './campaigns.service';

class CreateCampaignDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsIn(['active', 'paused', 'ended'])
  status?: CampaignStatus;

  @IsOptional()
  @IsIn(['facebook', 'instagram', 'google'])
  platform?: CampaignPlatform;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetBdt?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  landingPageName?: string | null;

  @IsOptional()
  @IsString()
  landingPageUrl?: string | null;
}

class UpdateCampaignDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsIn(['active', 'paused', 'ended'])
  status?: CampaignStatus;

  @IsOptional()
  @IsIn(['facebook', 'instagram', 'google'])
  platform?: CampaignPlatform;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  budgetBdt?: number;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsString()
  landingPageName?: string | null;

  @IsOptional()
  @IsString()
  landingPageUrl?: string | null;
}

@ApiTags('CRM — Campaigns')
@Controller('crm/campaigns')
export class CampaignsController {
  constructor(private readonly campaigns: CampaignsService) {}

  @Get('overview')
  @RequirePermissions('campaigns.view')
  @ApiOperation({ summary: 'Campaign overview with attributed metrics' })
  overview(@CurrentUser() user: AuthUserPayload) {
    this.campaigns.requireOrg(user.organizationId);
    return this.campaigns.overview(user.organizationId!);
  }

  @Get()
  @RequirePermissions('campaigns.view')
  @ApiOperation({ summary: 'List campaigns' })
  list(@CurrentUser() user: AuthUserPayload) {
    this.campaigns.requireOrg(user.organizationId);
    return this.campaigns.list(user.organizationId!);
  }

  @Get(':id')
  @RequirePermissions('campaigns.view')
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.campaigns.requireOrg(user.organizationId);
    return this.campaigns.getById(user.organizationId!, id);
  }

  @Post()
  @RequirePermissions('campaigns.create')
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateCampaignDto) {
    this.campaigns.requireOrg(user.organizationId);
    return this.campaigns.create(user.organizationId!, body as CreateCampaignPayload);
  }

  @Patch(':id')
  @RequirePermissions('campaigns.edit', 'campaigns.manage_budget')
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateCampaignDto,
  ) {
    this.campaigns.requireOrg(user.organizationId);
    return this.campaigns.update(
      user.organizationId!,
      id,
      body as UpdateCampaignPayload,
    );
  }

  @Delete(':id')
  @RequirePermissions('campaigns.edit')
  remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.campaigns.requireOrg(user.organizationId);
    return this.campaigns.remove(user.organizationId!, id);
  }
}
