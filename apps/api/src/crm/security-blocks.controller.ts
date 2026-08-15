import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { createBlockedEntryPayloadSchema } from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { SecurityBlocksService } from './security-blocks.service';

function parseCreateBody(body: unknown) {
  return createBlockedEntryPayloadSchema.parse(body);
}

@ApiTags('CRM — Security blocks')
@Controller('crm/security/blocked')
export class SecurityBlocksController {
  constructor(private readonly security: SecurityBlocksService) {}

  @Get()
  @RequirePermissions('security.manage', 'orders.view', 'settings.view')
  @ApiOperation({ summary: 'List blocked IPs and mobile numbers' })
  list(
    @CurrentUser() user: AuthUserPayload,
    @Query('type') type?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    this.security.requireOrg(user.organizationId);
    return this.security.list(user.organizationId!, {
      type: type === 'ip' || type === 'mobile' ? type : undefined,
      search: search?.trim() || undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
  }

  @Post()
  @RequirePermissions('security.manage')
  @ApiOperation({ summary: 'Block an IP or mobile number' })
  create(@CurrentUser() user: AuthUserPayload, @Body() body: unknown) {
    this.security.requireOrg(user.organizationId);
    const payload = parseCreateBody(body);
    return this.security.create(
      user.organizationId!,
      payload,
      actorFromUser(user),
      payload.lastOrderId ? { lastOrderId: payload.lastOrderId } : undefined,
    );
  }

  @Delete(':id')
  @RequirePermissions('security.manage')
  @ApiOperation({ summary: 'Remove a block entry' })
  async remove(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.security.requireOrg(user.organizationId);
    await this.security.remove(user.organizationId!, id);
    return { ok: true };
  }
}
