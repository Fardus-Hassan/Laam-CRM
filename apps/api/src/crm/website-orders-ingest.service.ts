import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import type {
  WebsiteIngestConfig,
  WebsiteOrderIngestLine,
  WebsiteOrderIngestPayload,
  WebsiteOrderIngestResult,
} from '@laam/types';
import { websiteIngestMatchWindowMinutes } from '@laam/types';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { FailedOrdersService } from './failed-orders.service';
import { OrdersService } from './orders.service';
import { OrgOrderStatusesService } from './org-order-statuses.service';
import { SecurityBlocksService } from './security-blocks.service';
import { resolveIngestShopperIp } from './website-ingest-security.util';
import {
  cartFingerprintFromIngestLines,
  normalizePhoneDigits,
  pickLinkCandidate,
  resolveLinkedStatus,
  WEBSITE_INGEST_LINKABLE_STATUSES,
} from './website-order-ingest-match.util';
import {
  mapWooCommercePayload,
  websiteIngestPayloadSchema,
} from './website-order-mapper';
import { WebsiteIntegrationsService } from './website-integrations.service';

type WebsiteStoreRow = {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  platform: string;
  storeUrl: string | null;
};

function exceptionMessage(error: unknown): string {
  if (error instanceof BadRequestException) {
    const res = error.getResponse();
    if (typeof res === 'string') return res;
    if (res && typeof res === 'object' && 'message' in res) {
      const m = (res as { message: string | string[] }).message;
      return Array.isArray(m) ? m.join(', ') : String(m);
    }
  }
  return error instanceof Error ? error.message : 'Ingest failed';
}

function isBlockedIngestError(message: string): boolean {
  return /is blocked/i.test(message);
}

function isUniqueExternalOrderConflict(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  );
}

function appendNote(existing: string | null | undefined, line: string): string {
  const base = (existing ?? '').trim();
  return base ? `${base}\n${line}` : line;
}

@Injectable()
export class WebsiteOrdersIngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly websites: WebsiteIntegrationsService,
    private readonly failedOrders: FailedOrdersService,
    private readonly securityBlocks: SecurityBlocksService,
    private readonly orgOrderStatuses: OrgOrderStatusesService,
  ) {}

  mapWooCommercePayload(body: unknown): WebsiteOrderIngestPayload {
    return mapWooCommercePayload(body);
  }

  async getIngestConfig(organizationId: string): Promise<WebsiteIngestConfig> {
    return this.websites.getIngestConfig(organizationId);
  }

  /**
   * Canonical ingest path — used by custom sites and WooCommerce adapter.
   */
  async ingestCanonical(
    store: WebsiteStoreRow,
    raw: unknown,
    opts?: { clientIp?: string },
  ): Promise<WebsiteOrderIngestResult> {
    let payload: WebsiteOrderIngestPayload;
    try {
      payload = websiteIngestPayloadSchema.parse(raw);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Invalid website order payload';
      await this.websites.markIngestError(store.id, message);
      throw new BadRequestException(message);
    }

    const externalOrderId = payload.externalOrderId.trim();
    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId: store.organizationId,
        websiteStoreId: store.id,
        externalOrderId,
        deletedAt: null,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        notes: true,
      },
    });
    if (existing) {
      const synced = await this.syncExistingExternalOrder({
        store,
        existing,
        payload,
      });
      await this.websites.markIngestSuccess(store.id);
      return synced;
    }

    const clientIp = resolveIngestShopperIp({
      payloadIp: payload.clientIp,
      requestIp: opts?.clientIp,
      sanitize: (rawIp) => this.securityBlocks.sanitizeClientIp(rawIp),
    });

    const { lineItems, unmatchedSkus } = await this.resolveLines(
      store.organizationId,
      payload.lineItems,
    );

    const linked = await this.tryLinkSameJourney({
      store,
      payload,
      externalOrderId,
      lineItems,
      unmatchedSkus,
    });
    if (linked) {
      await this.websites.markIngestSuccess(store.id);
      return linked;
    }

    const source = store.platform === 'woocommerce' ? 'ecommerce' : 'website';
    const incomingStatus = await this.resolveCreateStatus(
      store.organizationId,
      payload.status,
    );

    const noteParts = [
      payload.notes?.trim(),
      unmatchedSkus.length
        ? `Unmatched SKU(s): ${unmatchedSkus.join(', ')} — map products in Inventory.`
        : null,
      `Ingested from ${store.name} (${store.platform}/${store.slug}) · ext #${externalOrderId}`,
      incomingStatus === 'incomplete'
        ? 'Source: incomplete checkout (Woo pending payment / not submitted).'
        : null,
      clientIp ? `Client IP: ${clientIp}` : null,
    ].filter(Boolean);

    const createInput = {
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail || undefined,
      altMobile: payload.altMobile,
      shippingAddress: payload.shippingAddress,
      shippingArea: payload.shippingArea || payload.district || 'Unknown',
      district: payload.district,
      source: source as 'website' | 'ecommerce',
      status: incomingStatus,
      paymentMethod: payload.paymentMethod,
      paidAmount: payload.paidAmount,
      deliveryCharge: payload.deliveryCharge ?? 0,
      discount: payload.discount ?? 0,
      notes: noteParts.join('\n'),
      orderDate: payload.orderDate,
      referenceNo: externalOrderId,
      websiteStoreId: store.id,
      externalOrderId,
      clientIp,
      utmSource: payload.utmSource,
      utmId: payload.utmId,
      utmContent: payload.utmContent,
      utmCampaign: payload.utmCampaign,
      lineItems,
    };

    try {
      const order = await this.orders.create(
        store.organizationId,
        createInput,
        { name: `Website · ${store.name}` },
      );

      await this.websites.markIngestSuccess(store.id);
      return {
        ok: true,
        duplicate: false,
        action: 'created',
        orderId: order.id,
        orderNumber: order.orderNumber,
        unmatchedSkus,
        message: unmatchedSkus.length
          ? `Created ${order.orderNumber} with unmatched SKU warning`
          : `Created ${order.orderNumber}`,
      };
    } catch (error) {
      if (isUniqueExternalOrderConflict(error)) {
        const raced = await this.prisma.order.findFirst({
          where: {
            organizationId: store.organizationId,
            websiteStoreId: store.id,
            externalOrderId,
            deletedAt: null,
          },
          select: { id: true, orderNumber: true, status: true, notes: true },
        });
        if (raced) {
          const synced = await this.syncExistingExternalOrder({
            store,
            existing: raced,
            payload,
          });
          await this.websites.markIngestSuccess(store.id);
          return synced;
        }
      }

      const message = exceptionMessage(error);
      await this.websites.markIngestError(store.id, message);

      if (isBlockedIngestError(message)) {
        try {
          await this.failedOrders.enqueue(
            store.organizationId,
            {
              ...createInput,
              failedType: 'blocked',
              website: store.name,
              lastUpdateNote: `Blocked on website ingest · ext #${externalOrderId} · ${message}`,
            },
            { name: `Website · ${store.name}` },
          );
        } catch {
          // Never mask the original block error if failed-queue write fails.
        }
      }

      throw error instanceof HttpException
        ? error
        : new BadRequestException(message);
    }
  }

  private async resolveCreateStatus(
    organizationId: string,
    requested?: string,
  ): Promise<string> {
    const status = (requested ?? 'pending').trim() || 'pending';
    if (await this.orgOrderStatuses.isValidStatus(organizationId, status)) {
      return status;
    }
    if (await this.orgOrderStatuses.isValidStatus(organizationId, 'pending')) {
      return 'pending';
    }
    return status;
  }

  /** Same Woo order id webhook again — sync status without creating a duplicate. */
  private async syncExistingExternalOrder(params: {
    store: WebsiteStoreRow;
    existing: {
      id: string;
      orderNumber: string;
      status: string;
      notes: string | null;
    };
    payload: WebsiteOrderIngestPayload;
  }): Promise<WebsiteOrderIngestResult> {
    const { store, existing, payload } = params;
    const incomingStatus = await this.resolveCreateStatus(
      store.organizationId,
      payload.status,
    );
    const decision = resolveLinkedStatus({
      existingStatus: existing.status,
      incomingStatus,
    });

    let nextStatus = existing.status;
    if (decision.nextStatus && decision.nextStatus !== existing.status) {
      if (await this.orgOrderStatuses.isValidStatus(store.organizationId, decision.nextStatus)) {
        await this.orders.updateStatus(
          store.organizationId,
          existing.id,
          decision.nextStatus,
          { name: `Website · ${store.name}` },
        );
        nextStatus = decision.nextStatus;
      }
    }

    const note = `Website webhook sync · ext #${payload.externalOrderId} · CRM ${existing.status}→${nextStatus} (${decision.reason})`;
    await this.prisma.order.update({
      where: { id: existing.id },
      data: { notes: appendNote(existing.notes, note) },
    });

    return {
      ok: true,
      duplicate: true,
      action: 'duplicate',
      orderId: existing.id,
      orderNumber: existing.orderNumber,
      unmatchedSkus: [],
      message: `Order ${existing.orderNumber} already exists for external id ${payload.externalOrderId}`,
    };
  }

  /**
   * Same phone + store + window window + same cart → update existing CRM order
   * (avoids double call when team confirmed Incomplete then customer submits).
   */
  private async tryLinkSameJourney(params: {
    store: WebsiteStoreRow;
    payload: WebsiteOrderIngestPayload;
    externalOrderId: string;
    lineItems: Array<{
      productId?: string;
      variantId?: string;
      productName: string;
      sku?: string;
      variationLabel?: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    unmatchedSkus: string[];
  }): Promise<WebsiteOrderIngestResult | null> {
    const { store, payload, externalOrderId, unmatchedSkus } = params;
    const digits = normalizePhoneDigits(payload.customerPhone);
    if (digits.length < 5) return null;

    const config = await this.websites.getIngestConfig(store.organizationId);
    const windowMinutes = websiteIngestMatchWindowMinutes(config);
    const since = new Date(Date.now() - windowMinutes * 60_000);

    const candidates = await this.prisma.order.findMany({
      where: {
        organizationId: store.organizationId,
        websiteStoreId: store.id,
        deletedAt: null,
        createdAt: { gte: since },
        status: { in: [...WEBSITE_INGEST_LINKABLE_STATUSES] },
        OR: [
          { customerPhone: { contains: digits.slice(-11) } },
          { customerPhone: { contains: digits.slice(-10) } },
        ],
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        externalOrderId: true,
        notes: true,
        createdAt: true,
        customerPhone: true,
        lineItems: {
          select: { sku: true, productName: true, quantity: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 25,
    });

    const phoneMatched = candidates.filter(
      (row) => normalizePhoneDigits(row.customerPhone) === digits,
    );
    if (!phoneMatched.length) return null;

    const incomingCart = cartFingerprintFromIngestLines(payload.lineItems);
    const match = pickLinkCandidate({
      candidates: phoneMatched,
      incomingCart,
      windowMs: windowMinutes * 60_000,
    });
    if (!match) return null;

    // Never steal another Woo order id already claimed on a different CRM row.
    if (match.externalOrderId && match.externalOrderId !== externalOrderId) {
      // Re-point to the newer Woo id (processing) while keeping CRM order.
    }

    const incomingStatus = await this.resolveCreateStatus(
      store.organizationId,
      payload.status,
    );
    const decision = resolveLinkedStatus({
      existingStatus: match.status,
      incomingStatus,
    });

    let nextStatus = match.status;
    if (decision.nextStatus && decision.nextStatus !== match.status) {
      if (await this.orgOrderStatuses.isValidStatus(store.organizationId, decision.nextStatus)) {
        await this.orders.updateStatus(
          store.organizationId,
          match.id,
          decision.nextStatus,
          { name: `Website · ${store.name}` },
        );
        nextStatus = decision.nextStatus;
      }
    }

    const prevExt = match.externalOrderId?.trim() || null;
    const note = [
      `Linked website submit · Woo #${externalOrderId}`,
      prevExt && prevExt !== externalOrderId ? `(was ext #${prevExt})` : null,
      `status ${match.status}→${nextStatus}`,
      `(${decision.reason}; window ${windowMinutes}m)`,
      unmatchedSkus.length ? `Unmatched SKU(s): ${unmatchedSkus.join(', ')}` : null,
      payload.notes?.trim() || null,
    ]
      .filter(Boolean)
      .join(' · ');

    await this.prisma.order.update({
      where: { id: match.id },
      data: {
        externalOrderId,
        referenceNo: externalOrderId,
        notes: appendNote(match.notes, note),
        ...(payload.paidAmount != null ? { paidAmount: payload.paidAmount } : {}),
        ...(payload.paymentMethod ? { paymentMethod: payload.paymentMethod } : {}),
      },
    });

    return {
      ok: true,
      duplicate: false,
      action: 'linked',
      orderId: match.id,
      orderNumber: match.orderNumber,
      unmatchedSkus,
      message: `Linked to ${match.orderNumber} (same journey within ${windowMinutes}m)`,
    };
  }

  private async resolveLines(
    organizationId: string,
    lines: WebsiteOrderIngestLine[],
  ) {
    const unmatchedSkus: string[] = [];
    const resolved = [];

    for (const line of lines) {
      const sku = line.sku?.trim().toUpperCase();
      if (!sku) {
        resolved.push({
          productName: line.productName,
          sku: undefined,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          variationLabel: line.variationLabel,
        });
        continue;
      }

      const variant = await this.prisma.productVariant.findFirst({
        where: {
          organizationId,
          sku: { equals: sku, mode: 'insensitive' },
          product: { deletedAt: null },
        },
        select: {
          id: true,
          sku: true,
          label: true,
          productId: true,
          product: { select: { name: true } },
        },
      });

      if (!variant) {
        unmatchedSkus.push(sku);
        resolved.push({
          productName: line.productName,
          sku,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
          discount: line.discount,
          variationLabel: line.variationLabel,
        });
        continue;
      }

      resolved.push({
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        sku: variant.sku,
        variationLabel: line.variationLabel || variant.label,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        discount: line.discount,
      });
    }

    return { lineItems: resolved, unmatchedSkus };
  }
}
