import { BadRequestException, HttpException, Injectable } from '@nestjs/common';
import type {
  WebsiteOrderIngestLine,
  WebsiteOrderIngestPayload,
  WebsiteOrderIngestResult,
} from '@laam/types';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { FailedOrdersService } from './failed-orders.service';
import { OrdersService } from './orders.service';
import { SecurityBlocksService } from './security-blocks.service';
import { resolveIngestShopperIp } from './website-ingest-security.util';
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

@Injectable()
export class WebsiteOrdersIngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly websites: WebsiteIntegrationsService,
    private readonly failedOrders: FailedOrdersService,
    private readonly securityBlocks: SecurityBlocksService,
  ) {}

  mapWooCommercePayload(body: unknown): WebsiteOrderIngestPayload {
    return mapWooCommercePayload(body);
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
      select: { id: true, orderNumber: true },
    });
    if (existing) {
      await this.websites.markIngestSuccess(store.id);
      return {
        ok: true,
        duplicate: true,
        orderId: existing.id,
        orderNumber: existing.orderNumber,
        unmatchedSkus: [],
        message: `Order ${existing.orderNumber} already exists for external id ${externalOrderId}`,
      };
    }

    // Prefer body shopper IP (custom shop backend); fall back to transport IP.
    const clientIp = resolveIngestShopperIp({
      payloadIp: payload.clientIp,
      requestIp: opts?.clientIp,
      sanitize: (raw) => this.securityBlocks.sanitizeClientIp(raw),
    });

    const { lineItems, unmatchedSkus } = await this.resolveLines(
      store.organizationId,
      payload.lineItems,
    );

    const source = store.platform === 'woocommerce' ? 'ecommerce' : 'website';
    const noteParts = [
      payload.notes?.trim(),
      unmatchedSkus.length
        ? `Unmatched SKU(s): ${unmatchedSkus.join(', ')} — map products in Inventory.`
        : null,
      `Ingested from ${store.name} (${store.platform}/${store.slug}) · ext #${externalOrderId}`,
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
      status: 'pending',
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
        orderId: order.id,
        orderNumber: order.orderNumber,
        unmatchedSkus,
        message: unmatchedSkus.length
          ? `Created ${order.orderNumber} with unmatched SKU warning`
          : `Created ${order.orderNumber}`,
      };
    } catch (error) {
      // Concurrent webhook race: unique (org, store, externalOrderId) — treat as idempotent OK.
      if (isUniqueExternalOrderConflict(error)) {
        const raced = await this.prisma.order.findFirst({
          where: {
            organizationId: store.organizationId,
            websiteStoreId: store.id,
            externalOrderId,
            deletedAt: null,
          },
          select: { id: true, orderNumber: true },
        });
        if (raced) {
          await this.websites.markIngestSuccess(store.id);
          return {
            ok: true,
            duplicate: true,
            orderId: raced.id,
            orderNumber: raced.orderNumber,
            unmatchedSkus,
            message: `Order ${raced.orderNumber} already exists for external id ${externalOrderId}`,
          };
        }
      }

      const message = exceptionMessage(error);
      await this.websites.markIngestError(store.id, message);

      // Ops visibility: blocked shoppers land in Failed Orders for review after unblock.
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
