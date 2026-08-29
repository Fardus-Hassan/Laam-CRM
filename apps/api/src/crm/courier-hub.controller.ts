import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { CourierHubService } from './courier-hub.service';

class CourierSubmitDto {
  @IsArray()
  @IsString({ each: true })
  orderIds!: string[];

  @IsOptional()
  @IsString()
  provider?: string;
}

class CourierSettleDto {
  @IsString()
  orderId!: string;
}

@ApiTags('CRM — Courier Hub')
@Controller('crm/courier')
export class CourierHubController {
  constructor(private readonly hub: CourierHubService) {}

  private actor(user: AuthUserPayload) {
    return actorFromUser(user);
  }

  @Get('overview')
  @RequirePermissions('courier.view', 'courier.manage', 'orders.view')
  @ApiOperation({ summary: 'Courier hub overview (accounts, inbox, stats)' })
  overview(@CurrentUser() user: AuthUserPayload) {
    this.hub.requireOrg(user.organizationId);
    return this.hub.getOverview(user.organizationId!, user.userId);
  }

  @Get('ready')
  @RequirePermissions('courier.view', 'courier.manage', 'orders.view')
  @ApiOperation({ summary: 'Paginated ready-to-submit courier queue' })
  ready(
    @CurrentUser() user: AuthUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('search') search?: string,
  ) {
    this.hub.requireOrg(user.organizationId);
    return this.hub.listReadyToSubmit(user.organizationId!, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search,
    });
  }

  @Get('ready-count')
  @RequirePermissions('courier.view', 'courier.manage', 'orders.view')
  @ApiOperation({ summary: 'Count of orders ready to submit to courier' })
  async readyCount(@CurrentUser() user: AuthUserPayload) {
    this.hub.requireOrg(user.organizationId);
    const count = await this.hub.readyCount(user.organizationId!);
    return { count };
  }

  @Post('submit')
  @RequirePermissions('courier.manage', 'orders.confirm')
  @ApiOperation({ summary: 'Bulk book selected orders with Pathao or Carrybee' })
  submit(@CurrentUser() user: AuthUserPayload, @Body() body: CourierSubmitDto) {
    this.hub.requireOrg(user.organizationId);
    return this.hub.submitOrders(
      user.organizationId!,
      body.orderIds ?? [],
      body.provider,
      this.actor(user),
    );
  }

  @Post('inbox/:eventId/read')
  @RequirePermissions('courier.view', 'courier.manage', 'orders.view')
  @ApiOperation({ summary: 'Mark courier inbox event as read for the current user' })
  markRead(@CurrentUser() user: AuthUserPayload, @Param('eventId') eventId: string) {
    this.hub.requireOrg(user.organizationId);
    return this.hub.markInboxRead(user.organizationId!, eventId, user.userId);
  }

  @Post('settle-cod')
  @RequirePermissions('courier.manage', 'orders.confirm')
  @ApiOperation({ summary: 'Mark delivered courier order COD as paid' })
  settle(@CurrentUser() user: AuthUserPayload, @Body() body: CourierSettleDto) {
    this.hub.requireOrg(user.organizationId);
    return this.hub.settleCod(user.organizationId!, body.orderId, this.actor(user));
  }
}
