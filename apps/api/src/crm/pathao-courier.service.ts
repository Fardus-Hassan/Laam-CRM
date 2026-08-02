import {
  BadGatewayException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';

import {
  CourierIntegrationsService,
  type PathaoAuthCredentials,
  type PathaoCredentials,
} from './courier-integrations.service';

type PathaoTokenCache = {
  accessToken: string;
  expiresAt: number;
};

export type PathaoCityDto = { id: string; name: string };
export type PathaoZoneDto = { id: string; name: string };
export type PathaoAreaDto = { id: string; name: string };

@Injectable()
export class PathaoCourierService {
  /** Token cache keyed by organizationId + clientId */
  private readonly tokenCache = new Map<string, PathaoTokenCache>();

  constructor(private readonly integrations: CourierIntegrationsService) {}

  private async credentials(organizationId: string): Promise<PathaoCredentials> {
    return this.integrations.resolvePathaoCredentials(organizationId);
  }

  private async auth(organizationId: string): Promise<PathaoAuthCredentials> {
    return this.integrations.resolvePathaoAuth(organizationId);
  }

  private cacheKey(organizationId: string, clientId: string) {
    return `${organizationId}:${clientId}`;
  }

  private async getAccessToken(organizationId: string): Promise<{
    token: string;
    cfg: PathaoAuthCredentials;
  }> {
    const cfg = await this.auth(organizationId);
    const key = this.cacheKey(organizationId, cfg.clientId);
    const now = Date.now();
    const cached = this.tokenCache.get(key);
    if (cached && cached.expiresAt > now + 30_000) {
      return { token: cached.accessToken, cfg };
    }

    const res = await fetch(`${cfg.baseUrl}/aladdin/api/v1/issue-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: cfg.clientId,
        client_secret: cfg.clientSecret,
        username: cfg.username,
        password: cfg.password,
        grant_type: cfg.grantType,
      }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      message?: string;
      error?: string;
    };

    if (!res.ok || !json.access_token) {
      throw new BadGatewayException(
        json.message || json.error || `Pathao token failed (${res.status})`,
      );
    }

    const expiresInSec = Number(json.expires_in ?? 3600);
    this.tokenCache.set(key, {
      accessToken: json.access_token,
      expiresAt: now + expiresInSec * 1000,
    });
    return { token: json.access_token, cfg };
  }

  private async pathaoGet(organizationId: string, path: string): Promise<unknown> {
    const { token, cfg } = await this.getAccessToken(organizationId);
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });

    const json = (await res.json().catch(() => ({}))) as {
      data?: unknown;
      message?: string;
      errors?: unknown;
    };

    if (!res.ok) {
      throw new BadGatewayException(
        formatPathaoError(json, `Pathao GET failed (${res.status}) for ${path}`),
      );
    }

    return json.data ?? json;
  }

  private async pathaoPost(
    organizationId: string,
    path: string,
    body: Record<string, unknown>,
  ): Promise<unknown> {
    const { token, cfg } = await this.getAccessToken(organizationId);
    const res = await fetch(`${cfg.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const json = (await res.json().catch(() => ({}))) as {
      data?: unknown;
      message?: string;
      errors?: unknown;
    };

    if (!res.ok) {
      throw new BadGatewayException(
        formatPathaoError(json, `Pathao request failed (${res.status})`),
      );
    }

    return json.data ?? json;
  }

  async resolveStoreId(organizationId: string): Promise<number> {
    const cfg = await this.credentials(organizationId);
    if (!cfg.storeId) {
      throw new ServiceUnavailableException(
        'Pathao store ID missing. Configure in Settings → Integrations → Pathao.',
      );
    }
    return cfg.storeId;
  }

  async testConnection(organizationId: string): Promise<{ ok: true; storeCount: number }> {
    const stores = await this.listStores(organizationId);
    return { ok: true, storeCount: stores.length };
  }

  async listStores(
    organizationId: string,
  ): Promise<Array<{ id: number; name: string }>> {
    const list = this.unwrapList(
      await this.pathaoGet(organizationId, '/aladdin/api/v1/stores'),
    );
    return list
      .map((s) => ({
        id: Number(s['store_id'] ?? s['id'] ?? 0),
        name: String(s['store_name'] ?? s['name'] ?? ''),
      }))
      .filter((s) => s.id > 0);
  }

  async createOrder(
    organizationId: string,
    input: {
      storeId: number;
      merchantOrderId: string;
      recipientName: string;
      recipientPhone: string;
      recipientSecondaryPhone?: string;
      recipientAddress: string;
      recipientCity: number;
      recipientZone: number;
      recipientArea: number;
      deliveryType?: number;
      itemType?: number;
      specialInstruction?: string;
      itemQuantity: number;
      itemWeight?: number;
      itemDescription?: string;
      amountToCollect: number;
    },
  ): Promise<{
    consignmentId: string;
    merchantOrderId?: string;
    orderStatus?: string;
    deliveryFee?: number;
  }> {
    const payload = {
      store_id: input.storeId,
      merchant_order_id: input.merchantOrderId,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_secondary_phone: input.recipientSecondaryPhone || undefined,
      recipient_address: input.recipientAddress,
      recipient_city: input.recipientCity,
      recipient_zone: input.recipientZone,
      recipient_area: input.recipientArea,
      delivery_type: input.deliveryType ?? 48,
      item_type: input.itemType ?? 2,
      special_instruction: input.specialInstruction || undefined,
      item_quantity: input.itemQuantity,
      item_weight: input.itemWeight ?? 0.5,
      item_description: input.itemDescription || undefined,
      amount_to_collect: Math.max(0, Math.round(input.amountToCollect)),
    };

    const data = (await this.pathaoPost(
      organizationId,
      '/aladdin/api/v1/orders',
      payload,
    )) as Record<string, unknown>;

    const consignmentId = String(
      data['consignment_id'] ?? data['consignmentId'] ?? '',
    );
    if (!consignmentId) {
      throw new BadGatewayException(
        'Pathao booking succeeded but consignment_id was missing',
      );
    }

    return {
      consignmentId,
      merchantOrderId: data['merchant_order_id']
        ? String(data['merchant_order_id'])
        : undefined,
      orderStatus: data['order_status']
        ? String(data['order_status'])
        : data['status']
          ? String(data['status'])
          : undefined,
      deliveryFee:
        data['delivery_fee'] !== undefined
          ? Number(data['delivery_fee'])
          : undefined,
    };
  }

  async getOrderInfo(
    organizationId: string,
    consignmentId: string,
  ): Promise<{
    consignmentId: string;
    merchantOrderId?: string;
    orderStatus: string;
    orderStatusSlug?: string;
    updatedAt?: string;
  }> {
    const data = (await this.pathaoGet(
      organizationId,
      `/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`,
    )) as Record<string, unknown>;

    const orderStatus = String(
      data['order_status'] ?? data['order_status_slug'] ?? data['status'] ?? '',
    );
    if (!orderStatus) {
      throw new BadGatewayException('Pathao order info missing order_status');
    }

    return {
      consignmentId: String(data['consignment_id'] ?? consignmentId),
      merchantOrderId: data['merchant_order_id']
        ? String(data['merchant_order_id'])
        : undefined,
      orderStatus,
      orderStatusSlug: data['order_status_slug']
        ? String(data['order_status_slug'])
        : undefined,
      updatedAt: data['updated_at'] ? String(data['updated_at']) : undefined,
    };
  }

  private unwrapList(payload: unknown): Record<string, unknown>[] {
    if (Array.isArray(payload)) return payload as Record<string, unknown>[];
    if (payload && typeof payload === 'object') {
      const obj = payload as { data?: unknown };
      if (Array.isArray(obj.data)) return obj.data as Record<string, unknown>[];
    }
    return [];
  }

  async listCities(organizationId: string): Promise<PathaoCityDto[]> {
    const list = this.unwrapList(
      await this.pathaoGet(organizationId, '/aladdin/api/v1/city-list'),
    );
    return list
      .map((c) => ({
        id: String(c['city_id'] ?? ''),
        name: String(c['city_name'] ?? ''),
      }))
      .filter((c) => c.id && c.name);
  }

  async listZones(organizationId: string, cityId: string): Promise<PathaoZoneDto[]> {
    if (!cityId) return [];
    const list = this.unwrapList(
      await this.pathaoGet(
        organizationId,
        `/aladdin/api/v1/cities/${encodeURIComponent(cityId)}/zone-list`,
      ),
    );
    return list
      .map((z) => ({
        id: String(z['zone_id'] ?? ''),
        name: String(z['zone_name'] ?? ''),
      }))
      .filter((z) => z.id && z.name);
  }

  async listAreas(organizationId: string, zoneId: string): Promise<PathaoAreaDto[]> {
    if (!zoneId) return [];
    const list = this.unwrapList(
      await this.pathaoGet(
        organizationId,
        `/aladdin/api/v1/zones/${encodeURIComponent(zoneId)}/area-list`,
      ),
    );
    return list
      .map((a) => ({
        id: String(a['area_id'] ?? ''),
        name: String(a['area_name'] ?? ''),
      }))
      .filter((a) => a.id && a.name);
  }

  /**
   * Phone → network delivery success (merchant Pathao history, not shop CRM orders).
   * Uses Aladdin bearer token against merchant.pathao.com/api/v1/user/success.
   */
  async getUserSuccessRate(
    organizationId: string,
    phone: string,
  ): Promise<PathaoUserSuccessRate> {
    const digits = phone.replace(/\D/g, '');
    const local =
      digits.length === 13 && digits.startsWith('880')
        ? `0${digits.slice(3)}`
        : digits.length === 11
          ? digits
          : phone;

    const { token } = await this.getAccessToken(organizationId);
    const res = await fetch('https://merchant.pathao.com/api/v1/user/success', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone: local }),
    });

    const json = (await res.json().catch(() => ({}))) as {
      data?: {
        customer?: {
          successful_delivery?: number | string;
          total_delivery?: number | string;
          customer_rating?: string;
          show_count?: boolean;
        };
      };
      message?: string;
      code?: number | string;
    };

    if (!res.ok) {
      throw new BadGatewayException(
        formatPathaoError(json, `Pathao user success failed (${res.status})`),
      );
    }

    const customer = json.data?.customer ?? {};
    const showCount = customer.show_count !== false;
    const total = Number(customer.total_delivery ?? 0);
    const success = Number(customer.successful_delivery ?? 0);
    const rating =
      typeof customer.customer_rating === 'string' ? customer.customer_rating : undefined;

    const countsAvailable =
      showCount &&
      (Number.isFinite(total) || Number.isFinite(success)) &&
      (total > 0 || success > 0 || customer.total_delivery !== undefined);

    return {
      total: Number.isFinite(total) ? Math.max(0, Math.floor(total)) : 0,
      success: Number.isFinite(success) ? Math.max(0, Math.floor(success)) : 0,
      failed: Math.max(
        0,
        (Number.isFinite(total) ? Math.floor(total) : 0) -
          (Number.isFinite(success) ? Math.floor(success) : 0),
      ),
      countsAvailable: Boolean(countsAvailable),
      rating,
      raw: json.data,
    };
  }
}

export type PathaoUserSuccessRate = {
  total: number;
  success: number;
  failed: number;
  countsAvailable: boolean;
  rating?: string;
  raw?: unknown;
};

function formatPathaoError(
  json: { message?: string; errors?: unknown },
  fallback: string,
): string {
  const parts: string[] = [];
  if (typeof json.message === 'string' && json.message.trim()) {
    parts.push(json.message.trim());
  }
  if (json.errors) {
    parts.push(
      typeof json.errors === 'string' ? json.errors : JSON.stringify(json.errors),
    );
  }
  return parts.length > 0 ? parts.join(' — ') : fallback;
}
