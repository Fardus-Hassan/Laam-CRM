import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  CourierIntegrationsService,
  type CarrybeeAuthCredentials,
  type CarrybeeCredentials,
} from './courier-integrations.service';

export type CarrybeeCityDto = { id: string; name: string };
export type CarrybeeZoneDto = { id: string; name: string; cityId: string };
export type CarrybeeAreaDto = { id: string; name: string; zoneId: string };
export type CarrybeeStoreDto = {
  id: string;
  name: string;
  isActive: boolean;
  isApproved: boolean;
};

type CarrybeeResponse<T> = {
  error?: boolean;
  message?: string;
  causes?: unknown;
  data?: T;
};

@Injectable()
export class CarrybeeCourierService {
  private readonly logger = new Logger(CarrybeeCourierService.name);

  constructor(private readonly integrations: CourierIntegrationsService) {}

  private async auth(organizationId: string): Promise<CarrybeeAuthCredentials> {
    return this.integrations.resolveCarrybeeAuth(organizationId);
  }

  private async credentials(organizationId: string): Promise<CarrybeeCredentials> {
    return this.integrations.resolveCarrybeeCredentials(organizationId);
  }

  private async request<T = unknown>(
    organizationId: string,
    method: 'GET' | 'POST',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<T> {
    const cfg = await this.auth(organizationId);
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}${path}`, {
        method,
        headers: {
          'Client-ID': cfg.clientId,
          'Client-Secret': cfg.clientSecret,
          'Client-Context': cfg.clientContext,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'network error';
      this.logger.error(`Carrybee ${method} ${path} network failure: ${detail}`);
      throw new BadGatewayException(
        `Carrybee unreachable (${cfg.environment}): ${detail}`,
      );
    }

    const rawText = await res.text();
    let json: CarrybeeResponse<T> = {};
    try {
      json = rawText ? (JSON.parse(rawText) as CarrybeeResponse<T>) : {};
    } catch {
      json = {};
    }

    if (!res.ok || json.error) {
      const formatted = formatCarrybeeError(
        json,
        `Carrybee ${method} failed (${res.status}) for ${path}`,
      );
      this.logger.warn(
        `Carrybee ${method} ${path} → ${res.status} [${cfg.environment}] ${formatted}${rawText ? ` body=${rawText.slice(0, 400)}` : ''}`,
      );
      throw new BadGatewayException(
        appendEnvHint(formatted, cfg.environment, res.status),
      );
    }

    return (json.data ?? (json as unknown)) as T;
  }

  async resolveStoreId(organizationId: string): Promise<string> {
    const cfg = await this.credentials(organizationId);
    return cfg.storeId;
  }

  async testConnection(organizationId: string): Promise<{ ok: true; storeCount: number }> {
    const stores = await this.listStores(organizationId);
    await this.integrations.markCarrybeeSyncResult(organizationId, { ok: true });
    return { ok: true, storeCount: stores.length };
  }

  async listStores(organizationId: string): Promise<CarrybeeStoreDto[]> {
    const data = await this.request<{ stores?: Record<string, unknown>[] }>(
      organizationId,
      'GET',
      '/api/v2/stores',
    );
    const list = Array.isArray(data?.stores) ? data.stores : [];
    return list
      .map((s) => ({
        id: String(s['id'] ?? ''),
        name: String(s['name'] ?? ''),
        isActive: Boolean(s['is_active'] ?? true),
        isApproved: Boolean(s['is_approved'] ?? true),
      }))
      .filter((s) => s.id && s.name);
  }

  async listCities(organizationId: string): Promise<CarrybeeCityDto[]> {
    const data = await this.request<{ cities?: Record<string, unknown>[] }>(
      organizationId,
      'GET',
      '/api/v2/cities',
    );
    const list = Array.isArray(data?.cities) ? data.cities : [];
    return list
      .map((c) => ({
        id: String(c['id'] ?? ''),
        name: String(c['name'] ?? ''),
      }))
      .filter((c) => c.id && c.name);
  }

  async listZones(organizationId: string, cityId: string): Promise<CarrybeeZoneDto[]> {
    if (!cityId) return [];
    const data = await this.request<{ zones?: Record<string, unknown>[] }>(
      organizationId,
      'GET',
      `/api/v2/cities/${encodeURIComponent(cityId)}/zones`,
    );
    const list = Array.isArray(data?.zones) ? data.zones : [];
    return list
      .map((z) => ({
        id: String(z['id'] ?? ''),
        name: String(z['name'] ?? ''),
        cityId: String(z['city_id'] ?? cityId),
      }))
      .filter((z) => z.id && z.name);
  }

  async listAreas(
    organizationId: string,
    cityId: string,
    zoneId: string,
  ): Promise<CarrybeeAreaDto[]> {
    if (!cityId || !zoneId) return [];
    const data = await this.request<{ areas?: Record<string, unknown>[] }>(
      organizationId,
      'GET',
      `/api/v2/cities/${encodeURIComponent(cityId)}/zones/${encodeURIComponent(zoneId)}/areas`,
    );
    const list = Array.isArray(data?.areas) ? data.areas : [];
    return list
      .map((a) => ({
        id: String(a['id'] ?? ''),
        name: String(a['name'] ?? ''),
        zoneId: String(a['zone_id'] ?? zoneId),
      }))
      .filter((a) => a.id && a.name);
  }

  async assertStoreReady(organizationId: string): Promise<string> {
    const cfg = await this.credentials(organizationId);
    const storeId = cfg.storeId.trim();
    if (!storeId) {
      throw new BadRequestException(
        'Carrybee store is not selected. Settings → Integrations → Carrybee → Test → pick a store → Save.',
      );
    }

    const liveStoreAlias = (
      process.env['CARRYBEE_LIVE_STORE_ID'] ||
      process.env['CARRYBEE_STORE_ID'] ||
      ''
    ).trim();
    const sandboxStoreAlias = (process.env['CARRYBEE_SANDBOX_STORE_ID'] || '').trim();

    if (
      cfg.environment === 'sandbox' &&
      liveStoreAlias &&
      storeId === liveStoreAlias
    ) {
      throw new BadRequestException(
        `Store ${storeId} is a live Carrybee store, but environment is sandbox. Open Settings → Carrybee, click Test, pick a sandbox store, then Save.`,
      );
    }
    if (
      cfg.environment === 'live' &&
      sandboxStoreAlias &&
      storeId === sandboxStoreAlias
    ) {
      throw new BadRequestException(
        `Store ${storeId} is a sandbox Carrybee store, but environment is live. Open Settings → Carrybee, click Test, pick a live store, then Save.`,
      );
    }

    const stores = await this.listStores(organizationId);
    if (stores.length > 0 && !stores.some((s) => s.id === storeId)) {
      throw new BadRequestException(
        `Store ${storeId} is not in your Carrybee ${cfg.environment} store list. Settings → Carrybee → Test → select a store from the list → Save.`,
      );
    }

    return storeId;
  }

  async createOrder(
    organizationId: string,
    input: {
      storeId: string;
      merchantOrderId?: string;
      recipientName: string;
      recipientPhone: string;
      recipientSecondaryPhone?: string;
      recipientAddress: string;
      /** Optional — Carrybee can auto-resolve from recipient_address. */
      cityId?: number;
      zoneId?: number;
      areaId?: number;
      deliveryType?: number;
      productType?: number;
      specialInstruction?: string;
      productDescription?: string;
      itemWeight?: number;
      itemQuantity?: number;
      collectableAmount: number;
      isClosedBox?: boolean;
    },
  ): Promise<{
    consignmentId: string;
    merchantOrderId?: string;
    collectableAmount?: string;
    codFee?: number;
    deliveryFee?: string;
  }> {
    const payload: Record<string, unknown> = {
      store_id: String(input.storeId),
      merchant_order_id: input.merchantOrderId || undefined,
      delivery_type: input.deliveryType ?? 1,
      product_type: input.productType ?? 1,
      recipient_phone: input.recipientPhone,
      recipient_name: input.recipientName,
      recipient_address: input.recipientAddress,
      recipient_secendary_phone: input.recipientSecondaryPhone || undefined,
      special_instruction: input.specialInstruction || undefined,
      product_description: input.productDescription || undefined,
      item_weight: Math.max(1, Math.round(input.itemWeight ?? 500)),
      item_quantity: input.itemQuantity ?? 1,
      collectable_amount: Math.max(0, Math.round(input.collectableAmount)),
      is_closed_box: Boolean(input.isClosedBox),
    };

    // Omit city/zone when missing — empty string causes 400; API resolves from address.
    if (input.cityId != null && Number(input.cityId) > 0) {
      payload.city_id = Number(input.cityId);
    }
    if (input.zoneId != null && Number(input.zoneId) > 0) {
      payload.zone_id = Number(input.zoneId);
    }
    if (input.areaId != null && Number(input.areaId) > 0) {
      payload.area_id = Number(input.areaId);
    }

    const data = await this.request<{
      order?: Record<string, unknown>;
    }>(organizationId, 'POST', '/api/v2/orders', payload);

    const order = data?.order ?? (data as unknown as Record<string, unknown>);
    const consignmentId = String(order?.['consignment_id'] ?? '');
    if (!consignmentId) {
      throw new BadGatewayException(
        'Carrybee booking succeeded but consignment_id was missing',
      );
    }

    return {
      consignmentId,
      merchantOrderId: order?.['merchant_order_id']
        ? String(order['merchant_order_id'])
        : undefined,
      collectableAmount: order?.['collectable_amount']
        ? String(order['collectable_amount'])
        : undefined,
      codFee: order?.['cod_fee'] !== undefined ? Number(order['cod_fee']) : undefined,
      deliveryFee: order?.['delivery_fee'] ? String(order['delivery_fee']) : undefined,
    };
  }

  async getOrderDetails(
    organizationId: string,
    consignmentId: string,
  ): Promise<{
    consignmentId: string;
    merchantOrderId?: string;
    transferStatus: string;
    collectableAmount?: string;
    collectedAmount?: string;
    updatedAt?: string;
  }> {
    const data = await this.request<Record<string, unknown>>(
      organizationId,
      'GET',
      `/api/v2/orders/${encodeURIComponent(consignmentId)}/details`,
    );

    const transferStatus = String(data?.['transfer_status'] ?? '');
    if (!transferStatus) {
      throw new BadGatewayException('Carrybee order details missing transfer_status');
    }

    return {
      consignmentId: String(data?.['consignment_id'] ?? consignmentId),
      merchantOrderId: data?.['merchant_order_id']
        ? String(data['merchant_order_id'])
        : undefined,
      transferStatus,
      collectableAmount: data?.['collectable_amount']
        ? String(data['collectable_amount'])
        : undefined,
      collectedAmount: data?.['collected_amount']
        ? String(data['collected_amount'])
        : undefined,
      updatedAt: data?.['updated_at'] ? String(data['updated_at']) : undefined,
    };
  }

  async cancelOrder(
    organizationId: string,
    consignmentId: string,
    cancellationReason: string,
  ): Promise<{ ok: true }> {
    await this.request(
      organizationId,
      'POST',
      `/api/v2/orders/${encodeURIComponent(consignmentId)}/cancel`,
      { consignment_id: consignmentId, cancellation_reason: cancellationReason.slice(0, 200) },
    );
    return { ok: true };
  }
}

function formatCarrybeeError(
  json: { message?: string; causes?: unknown; request_id?: string },
  fallback: string,
): string {
  const parts: string[] = [];
  if (typeof json.message === 'string' && json.message.trim()) {
    parts.push(json.message.trim());
  }
  if (json.causes) {
    parts.push(typeof json.causes === 'string' ? json.causes : JSON.stringify(json.causes));
  }
  if (typeof json.request_id === 'string' && json.request_id.trim()) {
    parts.push(`request_id=${json.request_id.trim()}`);
  }
  return parts.length > 0 ? parts.join(' — ') : fallback;
}

function appendEnvHint(message: string, environment: string, status: number): string {
  const generic =
    /something went wrong|unexpected error|internal server error/i.test(message);
  if (!generic) return message;
  return `${message} (Carrybee HTTP ${status}, env=${environment}). If booking, confirm Settings → Carrybee store matches this environment (sandbox store ≠ live store 20902).`;
}
