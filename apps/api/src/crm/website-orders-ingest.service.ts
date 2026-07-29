import { BadRequestException, Injectable } from '@nestjs/common';
import type {
  WebsiteOrderIngestLine,
  WebsiteOrderIngestPayload,
  WebsiteOrderIngestResult,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from './orders.service';
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

@Injectable()
export class WebsiteOrdersIngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly websites: WebsiteIntegrationsService,
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
    ].filter(Boolean);

    try {
      const order = await this.orders.create(
        store.organizationId,
        {
          customerName: payload.customerName,
          customerPhone: payload.customerPhone,
          customerEmail: payload.customerEmail || undefined,
          altMobile: payload.altMobile,
          shippingAddress: payload.shippingAddress,
          shippingArea: payload.shippingArea || payload.district || 'Unknown',
          district: payload.district,
          source,
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
          utmSource: payload.utmSource,
          utmId: payload.utmId,
          utmContent: payload.utmContent,
          utmCampaign: payload.utmCampaign,
          lineItems,
        },
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
      const message = error instanceof Error ? error.message : 'Ingest failed';
      await this.websites.markIngestError(store.id, message);
      throw error;
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
