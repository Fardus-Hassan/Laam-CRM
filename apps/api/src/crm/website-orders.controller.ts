import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createWebsiteStorePayloadSchema,
  updateWebsiteStorePayloadSchema,
} from '@laam/types';

import {
  CurrentUser,
  Public,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import { WebsiteIntegrationsService } from './website-integrations.service';
import { WebsiteOrdersIngestService } from './website-orders-ingest.service';

function parseBody<T>(schema: { parse: (data: unknown) => T }, body: unknown): T {
  return schema.parse(body);
}

function extractIngestToken(
  headers: Record<string, string | string[] | undefined>,
  query: Record<string, string | string[] | undefined>,
): string {
  const header =
    headers['x-laam-ingest-token'] ??
    headers['x-website-token'] ??
    headers['authorization'];
  const headerValue = Array.isArray(header) ? header[0] : header;
  if (headerValue) {
    const raw = headerValue.trim();
    if (raw.toLowerCase().startsWith('bearer ')) return raw.slice(7).trim();
    return raw;
  }
  const q = query['token'];
  const qValue = Array.isArray(q) ? q[0] : q;
  return (qValue ?? '').trim();
}

@ApiTags('CRM — Website stores')
@Controller('crm/settings/websites')
export class WebsiteIntegrationsController {
  constructor(private readonly websites: WebsiteIntegrationsService) {}

  @Get()
  @RequirePermissions('settings.manage', 'orders.view')
  @ApiOperation({ summary: 'List connected website / e-commerce stores' })
  list(@CurrentUser() user: AuthUserPayload) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.list(user.organizationId!);
  }

  @Post()
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Create website store + ingest token (shown once)' })
  create(@CurrentUser() user: AuthUserPayload, @Body() body: unknown) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.create(
      user.organizationId!,
      parseBody(createWebsiteStorePayloadSchema, body),
    );
  }

  @Get(':id')
  @RequirePermissions('settings.manage', 'orders.view')
  @ApiOperation({ summary: 'Get website store' })
  get(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.get(user.organizationId!, id);
  }

  @Put(':id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update website store' })
  update(
    @CurrentUser() user: AuthUserPayload,
    @Param('id') id: string,
    @Body() body: unknown,
  ) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.update(
      user.organizationId!,
      id,
      parseBody(updateWebsiteStorePayloadSchema, body),
    );
  }

  @Post(':id/rotate-token')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Rotate ingest token (new token shown once)' })
  rotate(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.rotateToken(user.organizationId!, id);
  }

  @Delete(':id')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Disconnect / delete website store' })
  disconnect(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.disconnect(user.organizationId!, id);
  }
}

@ApiTags('CRM — Website order ingest')
@Controller('crm/integrations/website-orders')
export class WebsiteOrdersIngestController {
  constructor(
    private readonly websites: WebsiteIntegrationsService,
    private readonly ingest: WebsiteOrdersIngestService,
  ) {}

  @Public()
  @Post()
  @ApiOperation({
    summary:
      'Canonical website order ingest (custom sites). Auth: X-Laam-Ingest-Token or Bearer.',
  })
  @ApiHeader({ name: 'X-Laam-Ingest-Token', required: true })
  async ingestCanonical(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const token = extractIngestToken(headers, query);
    if (!token) throw new UnauthorizedException('Missing ingest token');
    const store = await this.websites.resolveByIngestToken(token);
    return this.ingest.ingestCanonical(store, body);
  }

  @Public()
  @Post('woocommerce')
  @ApiOperation({
    summary:
      'WooCommerce order webhook adapter → CRM. Auth: X-Laam-Ingest-Token or ?token=',
  })
  @ApiHeader({ name: 'X-Laam-Ingest-Token', required: true })
  async ingestWooCommerce(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
  ) {
    const token = extractIngestToken(headers, query);
    if (!token) throw new UnauthorizedException('Missing ingest token');
    const store = await this.websites.resolveByIngestToken(token);
    const canonical = this.ingest.mapWooCommercePayload(body);
    return this.ingest.ingestCanonical(store, canonical);
  }
}
