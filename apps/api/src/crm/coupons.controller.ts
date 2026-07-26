import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import type { CreateCouponPayload } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { CouponsService } from './coupons.service';

class CreateCouponDto {
  @IsString()
  code!: string;

  @IsString()
  type!: 'percent' | 'fixed';

  @IsNumber()
  @Min(1)
  value!: number;

  @IsOptional()
  @IsNumber()
  minOrderBdt?: number;

  @IsOptional()
  @IsNumber()
  maxDiscountBdt?: number;

  @IsOptional()
  @IsNumber()
  usageLimit?: number;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class UpdateCouponDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  type?: 'percent' | 'fixed';

  @IsOptional()
  @IsNumber()
  @Min(1)
  value?: number;

  @IsOptional()
  @IsNumber()
  minOrderBdt?: number | null;

  @IsOptional()
  @IsNumber()
  maxDiscountBdt?: number | null;

  @IsOptional()
  @IsNumber()
  usageLimit?: number | null;

  @IsOptional()
  @IsString()
  expiresAt?: string | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class ValidateCouponDto {
  @IsString()
  code!: string;

  @IsNumber()
  @Min(0)
  orderSubtotal!: number;
}

@ApiTags('coupons')
@Controller('crm/coupons')
export class CouponsController {
  constructor(private readonly coupons: CouponsService) {}

  private requireOrg(user: AuthUserPayload): string {
    if (!user.organizationId) {
      throw new BadRequestException('Organization required');
    }
    return user.organizationId;
  }

  @Get()
  @RequirePermissions('coupons.view', 'orders.create')
  @ApiOperation({ summary: 'List coupons' })
  list(@CurrentUser() user: AuthUserPayload) {
    return this.coupons.list(this.requireOrg(user));
  }

  @Post('validate')
  @RequirePermissions('coupons.view', 'orders.create')
  @ApiOperation({ summary: 'Validate coupon for an order subtotal' })
  validate(@CurrentUser() user: AuthUserPayload, @Body() body: ValidateCouponDto) {
    return this.coupons.validate(
      this.requireOrg(user),
      body.code,
      body.orderSubtotal,
    );
  }

  @Post()
  @RequirePermissions('coupons.manage')
  @ApiOperation({ summary: 'Create coupon' })
  create(@CurrentUser() user: AuthUserPayload, @Body() body: CreateCouponDto) {
    return this.coupons.create(this.requireOrg(user), body as CreateCouponPayload);
  }

  @Patch(':id')
  @RequirePermissions('coupons.manage')
  @ApiOperation({ summary: 'Update coupon' })
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: UpdateCouponDto,
  ) {
    return this.coupons.update(this.requireOrg(user), id, body);
  }

  @Post(':id/toggle')
  @RequirePermissions('coupons.manage')
  @ApiOperation({ summary: 'Toggle coupon active' })
  toggle(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    return this.coupons.toggle(this.requireOrg(user), id);
  }

  @Delete(':id')
  @RequirePermissions('coupons.manage')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete coupon' })
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    await this.coupons.remove(this.requireOrg(user), id);
  }
}
