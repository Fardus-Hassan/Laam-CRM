import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, UsePipes, ValidationPipe } from '@nestjs/common';
import type { CreateTenantRequest } from '@laam/types';
import { IsEmail, IsString, MinLength } from 'class-validator';

import { CurrentUser, Roles, type AuthUserPayload } from '../common/decorators';
import { BillingService } from '../crm/billing.service';
import { PlatformService } from './platform.service';

type CreateTenantBody = {
  name?: string;
  slug?: string;
  plan?: string;
  owner?: { name?: string; email?: string; phone?: string };
  additionalAdmins?: { name?: string; email?: string }[];
};

function parseCreateTenantBody(body: CreateTenantBody): CreateTenantRequest {
  const name = body.name?.trim();
  const slug = body.slug?.trim();
  const plan = body.plan;
  const ownerName = body.owner?.name?.trim();
  const ownerEmail = body.owner?.email?.trim();

  if (!name || !slug) {
    throw new BadRequestException('name and slug are required');
  }
  if (!['Starter', 'Pro', 'Enterprise'].includes(plan ?? '')) {
    throw new BadRequestException('Invalid plan');
  }
  if (!ownerName || !ownerEmail) {
    throw new BadRequestException('Owner name and email are required');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) {
    throw new BadRequestException('Invalid owner email');
  }

  const additionalAdmins = (body.additionalAdmins ?? [])
    .map((admin) => ({
      name: admin.name?.trim() ?? '',
      email: admin.email?.trim() ?? '',
    }))
    .filter((admin) => admin.name && admin.email);

  for (const admin of additionalAdmins) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(admin.email)) {
      throw new BadRequestException(`Invalid admin email: ${admin.email}`);
    }
  }

  return {
    name,
    slug,
    plan: plan as CreateTenantRequest['plan'],
    owner: {
      name: ownerName,
      email: ownerEmail,
      phone: body.owner?.phone?.trim() || undefined,
    },
    additionalAdmins,
  };
}

class AddTenantAdminDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsEmail()
  email!: string;
}

@Controller('platform')
@Roles('super_admin')
export class PlatformController {
  constructor(
    private readonly platform: PlatformService,
    private readonly billing: BillingService,
  ) {}

  @Get('billing')
  listBilling(@CurrentUser() user: AuthUserPayload) {
    this.platform.assertSuperAdmin(user);
    return this.billing.listPlatformBilling();
  }

  @Get('tenants')
  listTenants(@CurrentUser() user: AuthUserPayload) {
    this.platform.assertSuperAdmin(user);
    return this.platform.listTenants();
  }

  @Get('tenants/:id')
  getTenant(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.platform.assertSuperAdmin(user);
    return this.platform.getTenant(id);
  }

  @Get('tenants/:id/owner')
  getTenantOwner(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.platform.assertSuperAdmin(user);
    return this.platform.getTenantOwner(id);
  }

  @Post('tenants')
  @UsePipes(new ValidationPipe({ whitelist: false, transform: false }))
  createTenant(@CurrentUser() user: AuthUserPayload, @Body() body: CreateTenantBody) {
    this.platform.assertSuperAdmin(user);
    return this.platform.createTenant(parseCreateTenantBody(body));
  }

  @Patch('tenants/:id/status')
  updateStatus(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: { status: 'active' | 'suspended' | 'onboarding' },
  ) {
    this.platform.assertSuperAdmin(user);
    return this.platform.updateTenantStatus(id, body.status);
  }

  @Delete('tenants/:id')
  deleteTenant(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.platform.assertSuperAdmin(user);
    return this.platform.deleteTenant(id);
  }

  @Post('tenants/:id/admins')
  addAdmin(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: AddTenantAdminDto,
  ) {
    this.platform.assertSuperAdmin(user);
    return this.platform.addTenantAdmin(id, body);
  }

  @Patch('tenants/:id/admins/:userId/status')
  setAdminStatus(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Body() body: { status: 'active' | 'suspended' },
  ) {
    this.platform.assertSuperAdmin(user);
    return this.platform.setTenantAdminStatus(id, userId, body.status);
  }
}
