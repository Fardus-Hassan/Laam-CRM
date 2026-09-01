import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  createWebsiteStorePayloadSchema,
  updateWebsiteIngestConfigPayloadSchema,
  updateWebsiteStorePayloadSchema,
} from '@laam/types';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import {
  CurrentUser,
  Public,
  RequirePermissions,
  type AuthUserPayload,
} from '../common/decorators';
import {
  websiteIngestByIpLimiter,
  websiteIngestByTokenLimiter,
} from './website-ingest-rate-limit';
import {
  clientIpFromRequestLike,
  verifyWooWebhookSignature,
} from './website-ingest-security.util';
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

/** WooCommerce sends `{"webhook_id":N}` when saving/activating a webhook (not an order). */
function isWooCommerceWebhookPing(body: unknown): boolean {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return false;
  const root = body as Record<string, unknown>;
  const hasWebhookId = root['webhook_id'] != null;
  const hasOrderId = root['id'] != null;
  const hasLines = Array.isArray(root['line_items']) && root['line_items'].length > 0;
  return hasWebhookId && !hasOrderId && !hasLines;
}

function enforceIngestRateLimits(token: string, requestIp: string) {
  const byToken = websiteIngestByTokenLimiter.check(`tok:${token.slice(0, 48)}`);
  if (!byToken.allowed) {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Ingest rate limit exceeded for this store token. Retry later.',
        retryAfter: byToken.retryAfterSec,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
  const byIp = websiteIngestByIpLimiter.check(`ip:${requestIp || 'unknown'}`);
  if (!byIp.allowed) {
    throw new HttpException(
      {
        statusCode: HttpStatus.TOO_MANY_REQUESTS,
        message: 'Ingest rate limit exceeded from this IP. Retry later.',
        retryAfter: byIp.retryAfterSec,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
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

  @Get('ingest-config')
  @RequirePermissions('settings.manage', 'orders.view')
  @ApiOperation({
    summary:
      'Get website ingest ops rules (duplicate match window for Incomplete ↔ Pending linking)',
  })
  getIngestConfig(@CurrentUser() user: AuthUserPayload) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.getIngestConfig(user.organizationId!);
  }

  @Put('ingest-config')
  @RequirePermissions('settings.manage')
  @ApiOperation({ summary: 'Update website ingest duplicate-match window' })
  updateIngestConfig(@CurrentUser() user: AuthUserPayload, @Body() body: unknown) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.updateIngestConfig(
      user.organizationId!,
      parseBody(updateWebsiteIngestConfigPayloadSchema, body),
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

  @Post(':id/rotate-webhook-secret')
  @RequirePermissions('settings.manage')
  @ApiOperation({
    summary: 'Rotate WooCommerce webhook HMAC secret (shown once; paste into Woo Secret field)',
  })
  rotateWebhookSecret(@CurrentUser() user: AuthUserPayload, @Param('id') id: string) {
    this.websites.requireOrg(user.organizationId);
    return this.websites.rotateWebhookSecret(user.organizationId!, id);
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
      'Canonical website order ingest (custom sites). Auth: X-Laam-Ingest-Token or Bearer. Rate limited.',
  })
  @ApiHeader({ name: 'X-Laam-Ingest-Token', required: true })
  async ingestCanonical(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Req() req: Request,
  ) {
    const token = extractIngestToken(headers, query);
    if (!token) throw new UnauthorizedException('Missing ingest token');
    const requestIp = clientIpFromRequestLike(req);
    enforceIngestRateLimits(token, requestIp);
    const store = await this.websites.resolveByIngestToken(token);
    return this.ingest.ingestCanonical(store, body, {
      clientIp: requestIp,
    });
  }

  @Public()
  @Post('woocommerce')
  @ApiOperation({
    summary:
      'WooCommerce order webhook adapter → CRM. Auth: ingest token + X-WC-Webhook-Signature when secret configured.',
  })
  @ApiHeader({ name: 'X-Laam-Ingest-Token', required: true })
  @ApiHeader({ name: 'X-WC-Webhook-Signature', required: false })
  async ingestWooCommerce(
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Query() query: Record<string, string | string[] | undefined>,
    @Body() body: unknown,
    @Req() req: RawBodyRequest<Request>,
  ) {
    const token = extractIngestToken(headers, query);
    if (!token) throw new UnauthorizedException('Missing ingest token');
    const requestIp = clientIpFromRequestLike(req);
    enforceIngestRateLimits(token, requestIp);
    const store = await this.websites.resolveByIngestToken(token);

    const webhookSecret = this.websites.getWebhookSecret(store.credentialsEnc);
    const signatureHeader = headers['x-wc-webhook-signature'];
    const hasSignatureHeader = Boolean(
      (Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader)?.trim(),
    );
    const forceRequireSig =
      process.env['LAAM_REQUIRE_WOO_SIGNATURE'] === 'true' ||
      process.env['LAAM_REQUIRE_WOO_SIGNATURE'] === '1';

    // Token in the Delivery URL is always required.
    // HMAC: verify when Woo sends X-WC-Webhook-Signature (Secret field filled).
    // If Secret is left empty in Woo, no signature header → token-only auth (common setup).
    // Set LAAM_REQUIRE_WOO_SIGNATURE=1 to require HMAC even when header is missing.
    if (hasSignatureHeader || forceRequireSig) {
      if (!webhookSecret) {
        throw new UnauthorizedException(
          'WooCommerce webhook secret not configured. Rotate webhook secret in CRM settings and paste into WooCommerce webhook Secret field.',
        );
      }
      verifyWooWebhookSignature({
        rawBody: req.rawBody,
        signatureHeader,
        secret: webhookSecret,
      });
    }

    // Save/activate in Woo sends a ping body — acknowledge so admin UI does not show 400.
    if (isWooCommerceWebhookPing(body)) {
      return { ok: true, message: 'WooCommerce webhook endpoint is reachable' };
    }

    const canonical = this.ingest.mapWooCommercePayload(body);
    return this.ingest.ingestCanonical(store, canonical, {
      // Transport IP is Woo/hosting — only use if mapper has no customer IP meta.
      clientIp: requestIp,
    });
  }
}
