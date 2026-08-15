import { createHmac, timingSafeEqual } from 'crypto';

import { UnauthorizedException } from '@nestjs/common';

/**
 * WooCommerce webhook signature:
 * X-WC-Webhook-Signature = base64(hmac_sha256(rawBody, secret))
 * @see https://woocommerce.github.io/code-reference/files/woocommerce-includes-class-wc-webhook.html
 */
export function computeWooWebhookSignature(rawBody: Buffer | string, secret: string): string {
  const body = typeof rawBody === 'string' ? Buffer.from(rawBody, 'utf8') : rawBody;
  return createHmac('sha256', secret).update(body).digest('base64');
}

export function verifyWooWebhookSignature(opts: {
  rawBody: Buffer | string | undefined;
  signatureHeader: string | string[] | undefined;
  secret: string;
}): void {
  const secret = opts.secret.trim();
  if (!secret) {
    throw new UnauthorizedException('Webhook secret is not configured for this store');
  }

  if (!opts.rawBody || (Buffer.isBuffer(opts.rawBody) && opts.rawBody.length === 0)) {
    throw new UnauthorizedException('Missing raw body for webhook signature verification');
  }

  const header = Array.isArray(opts.signatureHeader)
    ? opts.signatureHeader[0]
    : opts.signatureHeader;
  const provided = (header ?? '').trim();
  if (!provided) {
    throw new UnauthorizedException(
      'Missing X-WC-Webhook-Signature. Set the Woo webhook Secret to match this store.',
    );
  }

  const expected = computeWooWebhookSignature(opts.rawBody, secret);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new UnauthorizedException('Invalid WooCommerce webhook signature');
  }
}

/** Prefer shopper IP from payload; fall back to transport/request IP. Never store junk. */
export function resolveIngestShopperIp(opts: {
  payloadIp?: string | null;
  requestIp?: string | null;
  sanitize: (raw?: string | null) => string | undefined;
}): string | undefined {
  return (
    opts.sanitize(opts.payloadIp) ||
    opts.sanitize(opts.requestIp) ||
    undefined
  );
}

/** First client IP from X-Forwarded-For / X-Real-IP / socket (trust proxy dependent). */
export function clientIpFromRequestLike(req: {
  headers: Record<string, string | string[] | undefined>;
  ip?: string;
  socket?: { remoteAddress?: string };
}): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0]!.trim();
  }
  if (Array.isArray(forwarded) && forwarded[0]) {
    return forwarded[0].split(',')[0]!.trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp.trim()) return realIp.trim();
  if (Array.isArray(realIp) && realIp[0]) return String(realIp[0]).trim();
  return req.ip || req.socket?.remoteAddress || 'unknown';
}
