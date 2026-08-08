import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { memoryStorage } from 'multer';

import { CurrentUser, Roles, type AuthUserPayload } from '../common/decorators';
import { BrandingService } from '../crm/branding.service';
import { PlatformService } from './platform.service';

class UpdateBrandingDto {
  @IsOptional()
  @IsObject()
  colors?: Record<string, string>;

  @IsOptional()
  @IsObject()
  logos?: {
    light?: string;
    dark?: string;
    favicon?: string;
  };

  @IsOptional()
  sidebarNavOrder?: {
    groupIds: string[];
    itemIdsByGroup: Record<string, string[]>;
  } | null;
}

class UploadLogoDto {
  @IsIn(['light', 'dark', 'favicon'])
  @IsString()
  variant!: 'light' | 'dark' | 'favicon';
}

@ApiTags('Platform branding')
@Controller('platform')
@Roles('super_admin')
export class PlatformBrandingController {
  constructor(
    private readonly platform: PlatformService,
    private readonly branding: BrandingService,
  ) {}

  @Get('branding')
  @ApiOperation({ summary: 'Get Laam platform brand' })
  async getPlatformBrand(@CurrentUser() user: AuthUserPayload) {
    this.platform.assertSuperAdmin(user);
    return this.branding.getPlatformBrand();
  }

  @Patch('branding')
  @ApiOperation({ summary: 'Update Laam platform brand' })
  async updatePlatformBrand(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UpdateBrandingDto,
  ) {
    this.platform.assertSuperAdmin(user);
    const organizationId = await this.branding.getPlatformOrganizationId();
    return this.branding.updateBranding(organizationId, {
      colors: body.colors as never,
      logos: body.logos,
      sidebarNavOrder: body.sidebarNavOrder as never,
    });
  }

  @Post('branding/logo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variant: { type: 'string', enum: ['light', 'dark', 'favicon'] },
        file: { type: 'string', format: 'binary' },
      },
      required: ['variant', 'file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadPlatformLogo(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UploadLogoDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    this.platform.assertSuperAdmin(user);
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }
    const organizationId = await this.branding.getPlatformOrganizationId();
    return this.branding.uploadLogo(organizationId, body.variant, file);
  }

  @Get('tenants/:id/branding')
  @ApiOperation({ summary: 'Get tenant brand as platform admin' })
  async getTenantBrand(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
  ) {
    this.platform.assertSuperAdmin(user);
    await this.platform.getTenant(id);
    return this.branding.getForOrganization(id);
  }

  @Patch('tenants/:id/branding')
  @ApiOperation({ summary: 'Update tenant brand as platform admin' })
  async updateTenantBrand(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateBrandingDto,
  ) {
    this.platform.assertSuperAdmin(user);
    await this.platform.getTenant(id);
    return this.branding.updateBranding(id, {
      colors: body.colors as never,
      logos: body.logos,
      sidebarNavOrder: body.sidebarNavOrder as never,
    });
  }

  @Post('tenants/:id/branding/logo')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        variant: { type: 'string', enum: ['light', 'dark', 'favicon'] },
        file: { type: 'string', format: 'binary' },
      },
      required: ['variant', 'file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async uploadTenantLogo(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UploadLogoDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    this.platform.assertSuperAdmin(user);
    await this.platform.getTenant(id);
    if (!file) {
      throw new BadRequestException('Logo file is required');
    }
    return this.branding.uploadLogo(id, body.variant, file);
  }
}
