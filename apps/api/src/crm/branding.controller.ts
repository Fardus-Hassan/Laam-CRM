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

import {
  CurrentUser,
  Public,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { BrandingService } from './branding.service';

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
}

class UploadLogoDto {
  @IsIn(['light', 'dark', 'favicon'])
  @IsString()
  variant!: 'light' | 'dark' | 'favicon';
}

@ApiTags('Branding')
@Controller()
export class BrandingController {
  constructor(private readonly branding: BrandingService) {}

  @Public()
  @Get('public/tenants/:slug/branding')
  @ApiOperation({ summary: 'Public tenant brand for login screens' })
  getPublic(@Param('slug') slug: string) {
    return this.branding.getPublicBySlug(slug);
  }

  @Public()
  @Get('public/platform/branding')
  @ApiOperation({ summary: 'Public Laam platform brand for localhost login' })
  getPublicPlatform() {
    return this.branding.getPlatformBrand();
  }

  @Get('crm/settings/branding')
  @RequirePermissions('brand.view', 'brand.manage')
  getMine(@CurrentUser() user: AuthUserPayload) {
    if (!user.organizationId) {
      return this.branding.getPlatformBrand();
    }
    return this.branding.getForOrganization(user.organizationId);
  }

  @Patch('crm/settings/branding')
  @RequirePermissions('brand.manage')
  update(@CurrentUser() user: AuthUserPayload, @Body() body: UpdateBrandingDto) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization required');
    }
    return this.branding.updateBranding(user.organizationId, {
      colors: body.colors as never,
      logos: body.logos,
    });
  }

  @Post('crm/settings/branding/logo')
  @RequirePermissions('brand.manage')
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
  uploadLogo(
    @CurrentUser() user: AuthUserPayload,
    @Body() body: UploadLogoDto,
    @UploadedFile() file: { buffer: Buffer; mimetype: string; size: number; originalname: string },
  ) {
    if (!user.organizationId) {
      throw new BadRequestException('Organization required');
    }
    return this.branding.uploadLogo(user.organizationId, body.variant, file);
  }
}
