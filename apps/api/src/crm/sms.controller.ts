import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  sendBulkOrderSmsPayloadSchema,
  sendOrderSmsPayloadSchema,
  sendSmsTestPayloadSchema,
  upsertSmsIntegrationPayloadSchema,
  upsertSmsTemplatePayloadSchema,
} from '@laam/types';

import {
  CurrentUser,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { actorFromUser } from '../common/actor.util';
import { SmsService } from './sms.service';

function parseBody<T>(schema: { parse: (data: unknown) => T }, body: unknown): T {
  return schema.parse(body);
}

@ApiTags('CRM — SMS')
@Controller('crm/settings/sms')
export class SmsSettingsController {
  constructor(private readonly sms: SmsService) {}

  @Get()
  @RequirePermissions('settings.manage', 'orders.view')
  @ApiOperation({ summary: 'Get org SMS gateway settings (secrets masked)' })
  get(@CurrentUser() user: AuthUserPayload) {
    this.sms.requireOrg(user.organizationId);
    return this.sms.getPublic(user.organizationId!);
  }

  @Put()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Upsert org SMS custom gateway credentials' })
  upsert(@CurrentUser() user: AuthUserPayload, @Body() body: unknown) {
    this.sms.requireOrg(user.organizationId);
    return this.sms.upsert(
      user.organizationId!,
      parseBody(upsertSmsIntegrationPayloadSchema, body),
    );
  }

  @Delete()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Disconnect SMS gateway' })
  disconnect(@CurrentUser() user: AuthUserPayload) {
    this.sms.requireOrg(user.organizationId);
    return this.sms.disconnect(user.organizationId!);
  }

  @Post('test')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Send a test SMS using saved gateway' })
  test(@CurrentUser() user: AuthUserPayload, @Body() body: unknown) {
    this.sms.requireOrg(user.organizationId);
    const parsed = parseBody(sendSmsTestPayloadSchema, body);
    return this.sms.testSend(
      user.organizationId!,
      parsed.phone,
      parsed.message,
      actorFromUser(user),
    );
  }

  @Get('templates')
  @RequirePermissions('settings.manage', 'orders.view')
  @ApiOperation({ summary: 'List SMS templates' })
  listTemplates(@CurrentUser() user: AuthUserPayload) {
    this.sms.requireOrg(user.organizationId);
    return this.sms.listTemplates(user.organizationId!);
  }

  @Put('templates')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Create or update SMS template' })
  upsertTemplate(@CurrentUser() user: AuthUserPayload, @Body() body: unknown) {
    this.sms.requireOrg(user.organizationId);
    return this.sms.upsertTemplate(
      user.organizationId!,
      parseBody(upsertSmsTemplatePayloadSchema, body),
    );
  }
}

@ApiTags('CRM — Orders SMS')
@Controller('crm/orders')
export class OrderSmsController {
  constructor(private readonly sms: SmsService) {}

  @Post('bulk/sms')
  @RequirePermissions('orders.confirm', 'orders.create', 'orders.assign')
  @ApiOperation({ summary: 'Bulk send SMS to selected orders' })
  bulkSms(@CurrentUser() user: AuthUserPayload, @Body() body: unknown) {
    this.sms.requireOrg(user.organizationId);
    const parsed = parseBody(sendBulkOrderSmsPayloadSchema, body);
    return this.sms.sendBulkToOrders(
      user.organizationId!,
      parsed.orderIds,
      parsed.message,
      actorFromUser(user),
    );
  }

  @Post(':id/sms')
  @RequirePermissions('orders.confirm', 'orders.create', 'orders.assign', 'orders.view')
  @ApiOperation({ summary: 'Send SMS to order customer phone' })
  sendOrderSms(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    this.sms.requireOrg(user.organizationId);
    const parsed = parseBody(sendOrderSmsPayloadSchema, body);
    return this.sms.sendToOrder(
      user.organizationId!,
      id,
      parsed.message,
      actorFromUser(user),
    );
  }
}
