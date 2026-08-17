import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateOrderPayload,
  CourierShopStats,
  DuplicateCheckResult,
  OrgRoutingConfig,
  OrgRoutingMode,
  OrderCourierStats,
  OrderCourierTracking,
  OrderDetail,
  OrderListItem,
  OrderListQuery,
  OrderListResponse,
  OrderSource,
  OrderStatusType,
  PaymentStatus,
} from '@laam/types';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';
import { CarrybeeCourierService } from './carrybee-courier.service';
import type { CarrybeeSyncService } from './carrybee-sync.service';
import {
  formatCourierBookError,
  isAlreadyBookedCourierError,
} from './courier-book-error.util';
import { CouponsService } from './coupons.service';
import { CourierIntegrationsService } from './courier-integrations.service';
import { CourierPhoneHistoryService } from './courier-phone-history.service';
import { CustomersService } from './customers.service';
import { FollowupsService } from './followups.service';
import { InventoryCatalogService } from './inventory-catalog.service';
import { LeadsService } from './leads.service';
import { normalizeBdPhone } from './phone.util';
import { OrderPaymentsService } from './order-payments.service';
import { OrgOrderStatusesService } from './org-order-statuses.service';
import { PathaoCourierService } from './pathao-courier.service';
import { isPathaoCancelledStatus } from './pathao-status.defaults';
import { SecurityBlocksService } from './security-blocks.service';
import { SmsService } from './sms.service';
import { AutomationsService } from './automations.service';
import type { PathaoSyncService } from './pathao-sync.service';

export type OrderFormOptionDto = {
  value: string;
  label: string;
};

export type OrderFormOptionsResponse = {
  statuses: OrderFormOptionDto[];
  paymentMethods: OrderFormOptionDto[];
  sources: OrderFormOptionDto[];
  districts: OrderFormOptionDto[];
  orderTags: OrderFormOptionDto[];
  customerTags: OrderFormOptionDto[];
  pathaoCities: OrderFormOptionDto[];
  pathaoZones: OrderFormOptionDto[];
  defaultCourierNote: string;
  defaultShipping: number;
};

type RoutingScope = 'order' | 'courier';

type AssignmentMode = OrgRoutingMode;

type RoutingOverrideInput = {
  mode?: AssignmentMode;
  teamIds?: string[];
  assigneeUserId?: string;
};

export type CreateOrderInput = CreateOrderPayload & {
  altMobile?: string;
  customerNote?: string;
  customerTag?: string;
  orderTag?: string;
  paymentMethod?: string;
  courierNote?: string;
  packingNote?: string;
  referenceNo?: string;
  orderDate?: string;
  courierChargedToMe?: number;
  websiteStoreId?: string;
  externalOrderId?: string;
  /** Shopper IP at intake (website webhook / public APIs). */
  clientIp?: string;
  pathaoCity?: string;
  pathaoZone?: string;
  pathaoArea?: string;
  pathaoCityId?: number;
  pathaoZoneId?: number;
  pathaoAreaId?: number;
  carrybeeCity?: string;
  carrybeeZone?: string;
  carrybeeArea?: string;
  carrybeeCityId?: number;
  carrybeeZoneId?: number;
  carrybeeAreaId?: number;
  utmSource?: string;
  utmId?: string;
  utmContent?: string;
  utmCampaign?: string;
  courierWeightKg?: number;
  courierDeliveryType?: 'normal' | 'express';
  attachmentNames?: string[];
  attachmentUrls?: string[];
  lineItems: Array<
    CreateOrderPayload['lineItems'][number] & {
      productId?: string;
      variantId?: string;
      variationLabel?: string;
      discount?: number;
    }
  >;
};

export type UpdateOrderInput = {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  altMobile?: string;
  shippingAddress?: string;
  shippingArea?: string;
  district?: string;
  source?: string;
  status?: string;
  paymentStatus?: PaymentStatus;
  paymentMethod?: string;
  deliveryCharge?: number;
  discount?: number;
  paidAmount?: number;
  notes?: string;
  customerNote?: string;
  courierNote?: string;
  packingNote?: string;
  referenceNo?: string;
  skipFollowup?: boolean;
  couponCode?: string;
  customerTag?: string;
  orderTag?: string;
  assignedAgentName?: string;
  assignedUserId?: string;
  pathaoCity?: string;
  pathaoZone?: string;
  pathaoArea?: string;
  pathaoCityId?: number | null;
  pathaoZoneId?: number | null;
  pathaoAreaId?: number | null;
  carrybeeCity?: string;
  carrybeeZone?: string;
  carrybeeArea?: string;
  carrybeeCityId?: number | null;
  carrybeeZoneId?: number | null;
  carrybeeAreaId?: number | null;
  lineItems?: CreateOrderInput['lineItems'];
  attachmentNames?: string[];
  attachmentUrls?: string[];
  utmSource?: string;
  utmId?: string;
  utmContent?: string;
  utmCampaign?: string;
  courierWeightKg?: number | null;
  courierDeliveryType?: 'normal' | 'express' | null;
  /** Warehouse stock is cut from on confirm / courier book. */
  fulfillmentWarehouseId?: string | null;
};

const STOCK_CUT_STATUSES = new Set([
  'confirmed',
  'processing',
  'processing_2',
  'in_courier',
]);

const FULFILLMENT_WAREHOUSE_REQUIRED_MSG =
  'Select a fulfillment warehouse before confirming or booking courier (stock is cut from that warehouse)';

/** After stock is cut, these statuses keep inventory deducted (no restock). */
const STOCK_KEEP_DEDUCTED_STATUSES = new Set(['delivered', 'completed']);

/** Customer return completed — restock inventory (manual approve = move to this status). */
const STOCK_RETURN_RESTOCK_STATUSES = new Set(['returned']);

const ROUTING_MODES: AssignmentMode[] = ['auto_split', 'specific_member'];
const OPEN_ORDER_WORKLOAD_STATUSES = new Set([
  'pending',
  'pending_2',
  'pending_3',
  'confirmed',
  'processing',
  'processing_2',
  'hold',
  'in_courier',
  'out_for_delivery',
]);
const ACTIVE_COURIER_WORKLOAD_SLUGS = new Set([
  'order_placed',
  'pending_pickup',
  'picked_up',
  'in_transit',
  'on_hold',
  'partial_delivered',
  'rescheduled',
  'approved_by_shop',
]);

const DEFAULT_STATUSES: OrderFormOptionDto[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'pending_2', label: 'Pending 2' },
  { value: 'pending_3', label: 'Pending 3' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'hold', label: 'On Hold' },
  { value: 'processing', label: 'Processing' },
  { value: 'in_courier', label: 'In Courier' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DEFAULT_PAYMENT_METHODS: OrderFormOptionDto[] = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'bkash', label: 'bKash' },
  { value: 'nagad', label: 'Nagad' },
  { value: 'card', label: 'Card' },
  { value: 'paid', label: 'Already Paid' },
];

const DEFAULT_SOURCES: OrderFormOptionDto[] = [
  { value: 'facebook', label: 'Facebook Ad' },
  { value: 'campaign', label: 'Facebook Campaign' },
  { value: 'website', label: 'Website' },
  { value: 'landing_page', label: 'Landing Page' },
  { value: 'call', label: 'Inbound Call' },
  { value: 'ecommerce', label: 'Online Store' },
  { value: 'walk_in', label: 'Walk-in' },
];

const DEFAULT_DISTRICTS = [
  'Dhaka',
  'Chittagong',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Gazipur',
  'Narayanganj',
];

const DEFAULT_ORDER_TAGS = ['VIP', 'Repeat', 'COD Risk', 'New', 'Ramadan', 'Gift Buyer'];
const DEFAULT_CUSTOMER_TAGS = ['VIP', 'Repeat', 'New', 'Wholesale'];

const DEFAULT_COURIER_NOTE =
  'পার্সেল খোলা যাবে না — মার্চেন্টকে জানানো ছাড়া খুলবেন না। কাস্টমার কল না ধরলে পার্সেল ক্যান্সেল করবেন না।';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly coupons: CouponsService,
    private readonly inventory: InventoryCatalogService,
    private readonly leads: LeadsService,
    private readonly customers: CustomersService,
    private readonly followups: FollowupsService,
    private readonly pathao: PathaoCourierService,
    private readonly carrybee: CarrybeeCourierService,
    private readonly courierIntegrations: CourierIntegrationsService,
    private readonly courierPhoneHistory: CourierPhoneHistoryService,
    private readonly orderPayments: OrderPaymentsService,
    private readonly orgOrderStatuses: OrgOrderStatusesService,
    private readonly sms: SmsService,
    private readonly automations: AutomationsService,
    private readonly securityBlocks: SecurityBlocksService,
    @Inject(forwardRef(() => require('./pathao-sync.service').PathaoSyncService))
    private readonly pathaoSync: PathaoSyncService,
    @Inject(forwardRef(() => require('./carrybee-sync.service').CarrybeeSyncService))
    private readonly carrybeeSync: CarrybeeSyncService,
  ) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization required');
    }
  }

  private normalizeRoutingMode(value: string | null | undefined): AssignmentMode {
    if (value === 'specific_member') return 'specific_member';
    return 'auto_split';
  }

  private async getOrCreateRoutingConfig(organizationId: string) {
    const existing = await this.prisma.orgRoutingConfig.findUnique({
      where: { organizationId },
    });
    if (existing) return existing;
    return this.prisma.orgRoutingConfig.create({
      data: {
        organizationId,
        orderMode: 'auto_split',
        orderTeamIds: [],
        courierMode: 'auto_split',
        courierTeamIds: [],
      },
    });
  }

  private normalizeTeamIds(values: string[] | undefined): string[] {
    return [...new Set((values ?? []).map((v) => v.trim()).filter(Boolean))];
  }

  private async resolveTeamMemberPool(
    organizationId: string,
    teamIds: string[],
  ): Promise<Array<{ id: string; name: string; teamId: string | null }>> {
    const normalized = this.normalizeTeamIds(teamIds);
    if (!normalized.length) return [];
    const members = await this.prisma.user.findMany({
      where: {
        organizationId,
        teamId: { in: normalized },
        status: 'active',
      },
      select: { id: true, name: true, teamId: true },
    });
    return members;
  }

  private async resolveLeastLoadUser(
    organizationId: string,
    scope: RoutingScope,
    pool: Array<{ id: string; name: string; teamId: string | null }>,
    loadMemo?: Map<string, number>,
  ): Promise<{ userId: string; userName: string } | null> {
    if (!pool.length) return null;
    const ids = pool.map((m) => m.id);
    const counts =
      scope === 'order'
        ? await this.prisma.order.groupBy({
            by: ['assignedUserId'],
            where: {
              organizationId,
              deletedAt: null,
              assignedUserId: { in: ids },
              status: { in: [...OPEN_ORDER_WORKLOAD_STATUSES] },
            },
            _count: { _all: true },
          })
        : await this.prisma.order.groupBy({
            by: ['logisticAssignedUserId'],
            where: {
              organizationId,
              deletedAt: null,
              logisticAssignedUserId: { in: ids },
              courierStatusSlug: { in: [...ACTIVE_COURIER_WORKLOAD_SLUGS] },
            },
            _count: { _all: true },
          });

    const base = new Map<string, number>();
    for (const m of pool) base.set(m.id, 0);
    for (const row of counts) {
      const key = scope === 'order' ? row.assignedUserId : row.logisticAssignedUserId;
      if (key) base.set(key, row._count._all);
    }
    if (loadMemo) {
      for (const [id, delta] of loadMemo.entries()) {
        base.set(id, (base.get(id) ?? 0) + delta);
      }
    }
    const sorted = [...pool].sort((a, b) => {
      const diff = (base.get(a.id) ?? 0) - (base.get(b.id) ?? 0);
      if (diff !== 0) return diff;
      return a.name.localeCompare(b.name);
    });
    const pick = sorted[0];
    if (!pick) return null;
    return { userId: pick.id, userName: pick.name };
  }

  async getRoutingConfig(organizationId: string): Promise<OrgRoutingConfig> {
    const cfg = await this.getOrCreateRoutingConfig(organizationId);
    return {
      orderRouting: {
        mode: this.normalizeRoutingMode(cfg.orderMode),
        teamIds: cfg.orderTeamIds ?? [],
        assigneeUserId: cfg.orderAssigneeUserId ?? undefined,
      },
      courierRouting: {
        mode: this.normalizeRoutingMode(cfg.courierMode),
        teamIds: cfg.courierTeamIds ?? [],
        assigneeUserId: cfg.courierAssigneeUserId ?? undefined,
      },
    };
  }

  async updateRoutingConfig(
    organizationId: string,
    input: Partial<OrgRoutingConfig>,
  ): Promise<OrgRoutingConfig> {
    const current = await this.getOrCreateRoutingConfig(organizationId);
    const nextOrderMode = this.normalizeRoutingMode(
      input.orderRouting?.mode ?? current.orderMode,
    );
    const nextCourierMode = this.normalizeRoutingMode(
      input.courierRouting?.mode ?? current.courierMode,
    );
    const nextOrderTeams = this.normalizeTeamIds(
      input.orderRouting?.teamIds ?? current.orderTeamIds,
    );
    const nextCourierTeams = this.normalizeTeamIds(
      input.courierRouting?.teamIds ?? current.courierTeamIds,
    );

    if (!ROUTING_MODES.includes(nextOrderMode) || !ROUTING_MODES.includes(nextCourierMode)) {
      throw new BadRequestException('Invalid routing mode');
    }

    const validateMember = async (
      teamIds: string[],
      userId: string | null | undefined,
      label: string,
    ) => {
      if (!userId) return null;
      const user = await this.prisma.user.findFirst({
        where: {
          organizationId,
          id: userId,
          status: 'active',
        },
        select: { id: true, teamId: true },
      });
      if (!user) throw new BadRequestException(`${label} assignee not found`);
      if (teamIds.length && (!user.teamId || !teamIds.includes(user.teamId))) {
        throw new BadRequestException(`${label} assignee must be a member of selected team(s)`);
      }
      return user.id;
    };

    const orderAssigneeUserId = await validateMember(
      nextOrderTeams,
      input.orderRouting?.assigneeUserId ?? current.orderAssigneeUserId,
      'Order routing',
    );
    const courierAssigneeUserId = await validateMember(
      nextCourierTeams,
      input.courierRouting?.assigneeUserId ?? current.courierAssigneeUserId,
      'Courier routing',
    );

    await this.prisma.orgRoutingConfig.update({
      where: { organizationId },
      data: {
        orderMode: nextOrderMode,
        orderTeamIds: nextOrderTeams,
        orderAssigneeUserId,
        courierMode: nextCourierMode,
        courierTeamIds: nextCourierTeams,
        courierAssigneeUserId,
      },
    });
    return this.getRoutingConfig(organizationId);
  }

  private async resolveRoutingAssignee(
    organizationId: string,
    scope: RoutingScope,
    override?: RoutingOverrideInput,
    loadMemo?: Map<string, number>,
  ): Promise<{ userId: string; userName: string } | null> {
    const cfg = await this.getOrCreateRoutingConfig(organizationId);
    const configuredMode = scope === 'order' ? cfg.orderMode : cfg.courierMode;
    const configuredTeamIds = scope === 'order' ? cfg.orderTeamIds : cfg.courierTeamIds;
    const configuredUserId =
      scope === 'order' ? cfg.orderAssigneeUserId : cfg.courierAssigneeUserId;

    const mode = this.normalizeRoutingMode(override?.mode ?? configuredMode);
    const teamIds = this.normalizeTeamIds(override?.teamIds ?? configuredTeamIds);
    const explicitUserId = override?.assigneeUserId?.trim() || configuredUserId || null;

    const pool = await this.resolveTeamMemberPool(organizationId, teamIds);
    if (mode === 'specific_member') {
      if (!explicitUserId) return null;
      const match = pool.find((u) => u.id === explicitUserId);
      if (match) return { userId: match.id, userName: match.name };
      const user = await this.prisma.user.findFirst({
        where: { id: explicitUserId, organizationId, status: 'active' },
        select: { id: true, name: true },
      });
      if (!user) return null;
      return { userId: user.id, userName: user.name };
    }
    const pick = await this.resolveLeastLoadUser(organizationId, scope, pool, loadMemo);
    return pick;
  }

  /** First confirm/fulfillment status freezes sales KPI credit. Hold/pending/cancel never credit. */
  private async shouldSnapshotOrderCredit(
    organizationId: string,
    status: string,
  ): Promise<boolean> {
    const slug = status.trim().toLowerCase();
    if (!slug) return false;
    const blocked = new Set([
      'pending',
      'pending_2',
      'pending_3',
      'hold',
      'hold_followup',
      'cancelled',
      'canceled',
      'failed',
      'duplicate',
      'returned',
      'pending_return',
    ]);
    if (blocked.has(slug) || slug.includes('hold')) return false;
    if (slug.startsWith('confirmed')) return true;
    const fulfillment = new Set([
      'processing',
      'in_courier',
      'delivered',
      'completed',
      'hand_delivery_completed',
    ]);
    if (fulfillment.has(slug)) return true;
    const meta = await this.orgOrderStatuses.getStatusMeta(organizationId, slug);
    if (!meta) return false;
    if (meta.group === 'confirm') return true;
    if (meta.group === 'fulfillment' || meta.group === 'delivery') return true;
    return false;
  }

  private async logisticFieldsForBook(
    organizationId: string,
    existing: {
      logisticAssignedUserId: string | null;
      logisticAssignedAgentName: string | null;
    },
    override?: RoutingOverrideInput,
    loadMemo?: Map<string, number>,
  ): Promise<{
    logisticAssignedUserId?: string;
    logisticAssignedAgentName?: string;
  }> {
    if (existing.logisticAssignedUserId || existing.logisticAssignedAgentName?.trim()) {
      return {};
    }
    const pick = await this.resolveRoutingAssignee(
      organizationId,
      'courier',
      override,
      loadMemo,
    );
    if (!pick) return {};
    if (loadMemo) {
      loadMemo.set(pick.userId, (loadMemo.get(pick.userId) ?? 0) + 1);
    }
    return {
      logisticAssignedUserId: pick.userId,
      logisticAssignedAgentName: pick.userName,
    };
  }

  private deriveInboundIncentiveFlags(input: {
    source: string;
    snapshot: unknown;
    nextLines: Array<{
      productId: string | null;
      variantId: string | null;
      sku: string | null;
      quantity: number;
      unitPrice: number;
    }>;
    nextAmount: number;
  }): { crossSell: boolean; upsell: boolean } | null {
    const source = (input.source || '').toLowerCase();
    if (source !== 'website' && source !== 'ecommerce') return null;
    const snap = input.snapshot as
      | {
          amount?: number;
          lines?: Array<{
            productId?: string | null;
            variantId?: string | null;
            sku?: string | null;
            quantity?: number;
          }>;
        }
      | null
      | undefined;
    if (!snap?.lines?.length || !Number.isFinite(snap.amount ?? NaN)) return null;

    const originalAmount = Number(snap.amount ?? 0);
    if (!(input.nextAmount > originalAmount)) {
      return { crossSell: false, upsell: false };
    }

    const normalizeKey = (line: {
      productId?: string | null;
      variantId?: string | null;
      sku?: string | null;
    }) => {
      if (line.variantId) return `v:${line.variantId}`;
      if (line.productId) return `p:${line.productId}`;
      const sku = line.sku?.trim().toLowerCase();
      return sku ? `s:${sku}` : '';
    };

    const originalMap = new Map<string, number>();
    for (const line of snap.lines) {
      const key = normalizeKey(line);
      if (!key) continue;
      originalMap.set(key, (originalMap.get(key) ?? 0) + Math.max(0, Number(line.quantity ?? 0)));
    }
    const nextMap = new Map<string, number>();
    for (const line of input.nextLines) {
      const key = normalizeKey(line);
      if (!key) continue;
      nextMap.set(key, (nextMap.get(key) ?? 0) + Math.max(0, Number(line.quantity ?? 0)));
    }

    let crossSell = false;
    let upsell = false;
    for (const [key, qty] of nextMap.entries()) {
      const originalQty = originalMap.get(key) ?? 0;
      if (originalQty === 0 && qty > 0) crossSell = true;
      if (qty > originalQty) upsell = true;
    }
    return { crossSell, upsell };
  }

  async ensureFormOptions(organizationId: string): Promise<void> {
    const count = await this.prisma.orderFormOption.count({ where: { organizationId } });
    if (count > 0) return;

    const rows: Array<{
      organizationId: string;
      kind: string;
      value: string;
      label: string;
      sortOrder: number;
    }> = [];

    DEFAULT_STATUSES.forEach((o, i) =>
      rows.push({ organizationId, kind: 'status', value: o.value, label: o.label, sortOrder: i }),
    );
    DEFAULT_PAYMENT_METHODS.forEach((o, i) =>
      rows.push({
        organizationId,
        kind: 'payment_method',
        value: o.value,
        label: o.label,
        sortOrder: i,
      }),
    );
    DEFAULT_SOURCES.forEach((o, i) =>
      rows.push({ organizationId, kind: 'source', value: o.value, label: o.label, sortOrder: i }),
    );
    DEFAULT_DISTRICTS.forEach((name, i) =>
      rows.push({
        organizationId,
        kind: 'district',
        value: name,
        label: name,
        sortOrder: i,
      }),
    );
    DEFAULT_ORDER_TAGS.forEach((name, i) =>
      rows.push({
        organizationId,
        kind: 'order_tag',
        value: name,
        label: name,
        sortOrder: i,
      }),
    );
    DEFAULT_CUSTOMER_TAGS.forEach((name, i) =>
      rows.push({
        organizationId,
        kind: 'customer_tag',
        value: name,
        label: name,
        sortOrder: i,
      }),
    );
    rows.push({
      organizationId,
      kind: 'default_courier_note',
      value: 'default',
      label: DEFAULT_COURIER_NOTE,
      sortOrder: 0,
    });
    rows.push({
      organizationId,
      kind: 'default_shipping',
      value: 'default',
      label: '120',
      sortOrder: 0,
    });

    await this.prisma.orderFormOption.createMany({ data: rows });
  }

  async getFormOptions(organizationId: string): Promise<OrderFormOptionsResponse> {
    await this.ensureFormOptions(organizationId);
    await this.orgOrderStatuses.ensureSeeded(organizationId);
    const rows = await this.prisma.orderFormOption.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }],
    });

    const pick = (kind: string) =>
      rows.filter((r) => r.kind === kind).map((r) => ({ value: r.value, label: r.label }));

    const noteRow = rows.find((r) => r.kind === 'default_courier_note');
    const shippingRow = rows.find((r) => r.kind === 'default_shipping');

    const [districtRows, cityRows, zoneRows] = await Promise.all([
      this.prisma.order.findMany({
        where: { organizationId, OR: [{ district: { not: null } }, { shippingArea: { not: '' } }] },
        select: { district: true, shippingArea: true },
        distinct: ['district'],
        take: 200,
      }),
      this.prisma.order.findMany({
        where: { organizationId, pathaoCity: { not: null } },
        select: { pathaoCity: true },
        distinct: ['pathaoCity'],
        take: 200,
      }),
      this.prisma.order.findMany({
        where: { organizationId, pathaoZone: { not: null } },
        select: { pathaoZone: true },
        distinct: ['pathaoZone'],
        take: 200,
      }),
    ]);

    const configuredDistricts = pick('district');
    const liveDistrictMap = new Map(configuredDistricts.map((d) => [d.value.toLowerCase(), d]));
    for (const row of districtRows) {
      const label = (row.district || row.shippingArea || '').trim();
      if (!label) continue;
      const key = label.toLowerCase();
      if (!liveDistrictMap.has(key)) {
        liveDistrictMap.set(key, { value: label, label });
      }
    }

    return {
      statuses: pick('status'),
      paymentMethods: pick('payment_method'),
      sources: pick('source'),
      districts: [...liveDistrictMap.values()].sort((a, b) => a.label.localeCompare(b.label)),
      orderTags: pick('order_tag'),
      customerTags: pick('customer_tag'),
      pathaoCities: cityRows
        .map((r) => r.pathaoCity?.trim())
        .filter((v): v is string => Boolean(v))
        .map((v) => ({ value: v, label: v }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      pathaoZones: zoneRows
        .map((r) => r.pathaoZone?.trim())
        .filter((v): v is string => Boolean(v))
        .map((v) => ({ value: v, label: v }))
        .sort((a, b) => a.label.localeCompare(b.label)),
      defaultCourierNote: noteRow?.label ?? DEFAULT_COURIER_NOTE,
      defaultShipping: Number(shippingRow?.label ?? 120) || 120,
    };
  }

  async listFormOptionRows(organizationId: string, kind?: string) {
    await this.ensureFormOptions(organizationId);
    return this.prisma.orderFormOption.findMany({
      where: {
        organizationId,
        ...(kind ? { kind } : {}),
      },
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { label: 'asc' }],
    });
  }

  async createFormOption(
    organizationId: string,
    input: { kind: string; value: string; label: string; sortOrder?: number },
  ) {
    await this.ensureFormOptions(organizationId);
    const kind = input.kind.trim();
    const value = input.value.trim().replace(/\s+/g, '_').toLowerCase();
    const label = input.label.trim();
    if (!kind || !value || !label) {
      throw new BadRequestException('kind, value, and label are required');
    }
    if (kind === 'default_courier_note' || kind === 'default_shipping') {
      throw new BadRequestException('Use update for default courier note / shipping');
    }
    const maxSort = await this.prisma.orderFormOption.aggregate({
      where: { organizationId, kind },
      _max: { sortOrder: true },
    });
    try {
      return await this.prisma.orderFormOption.create({
        data: {
          organizationId,
          kind,
          value,
          label,
          sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
          isActive: true,
        },
      });
    } catch {
      throw new BadRequestException('Option with this value already exists');
    }
  }

  /** Upsert a status into org status config + form options whitelist. */
  async ensureStatusFormOption(
    organizationId: string,
    input: { value: string; label?: string },
  ): Promise<{ value: string; label: string; created: boolean }> {
    await this.ensureFormOptions(organizationId);
    const value = input.value.trim().replace(/\s+/g, '_').toLowerCase();
    if (!value || !/^[a-z][a-z0-9_]*$/.test(value)) {
      throw new BadRequestException('Invalid status slug');
    }
    const label =
      input.label?.trim() ||
      value
        .split('_')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

    const before = await this.prisma.orgOrderStatus.findUnique({
      where: { organizationId_slug: { organizationId, slug: value } },
    });

    await this.orgOrderStatuses.upsert(organizationId, {
      slug: value,
      label,
      color: before?.color ?? 'hsl(174 58% 42%)',
      group: (before?.group as 'intake') ?? 'intake',
      displayMode: (before?.displayMode as 'filter_only') ?? 'filter_only',
      parentSlug: before?.parentSlug ?? undefined,
      showInSidebar: before?.showInSidebar ?? false,
      showInNestedTabs: before?.showInNestedTabs ?? false,
      sidebarOrder: before?.sidebarOrder ?? undefined,
      isTerminal: before?.isTerminal ?? false,
      isDefault: before?.isDefault ?? false,
      allowedTransitions: before?.allowedTransitions ?? [],
      bulkActions: (() => {
        const existingBulk = before?.bulkActions as never[] | undefined;
        return existingBulk?.length
          ? existingBulk
          : ([
              'status_change',
              'print_selected',
              'print_barcode',
              'print_info',
              'export',
              'send_sms',
              'set_followup',
              'transfer',
              'submit_pathao',
              'submit_carrybee',
              'courier_cancel',
              'courier_unlink',
            ] as never[]);
      })(),
      showInGroupByStatus: before?.showInGroupByStatus ?? true,
    });

    return { value, label, created: !before };
  }

  async updateFormOption(
    organizationId: string,
    id: string,
    input: { label?: string; value?: string; sortOrder?: number; isActive?: boolean },
  ) {
    const existing = await this.prisma.orderFormOption.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Option not found');

    const data: {
      label?: string;
      value?: string;
      sortOrder?: number;
      isActive?: boolean;
    } = {};
    if (input.label !== undefined) data.label = input.label.trim();
    if (input.value !== undefined && existing.kind !== 'default_courier_note' && existing.kind !== 'default_shipping') {
      data.value = input.value.trim().replace(/\s+/g, '_').toLowerCase();
    }
    if (input.sortOrder !== undefined) data.sortOrder = input.sortOrder;
    if (input.isActive !== undefined) data.isActive = input.isActive;

    try {
      return await this.prisma.orderFormOption.update({
        where: { id },
        data,
      });
    } catch {
      throw new BadRequestException('Could not update option (duplicate value?)');
    }
  }

  async deleteFormOption(organizationId: string, id: string) {
    const existing = await this.prisma.orderFormOption.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Option not found');
    if (existing.kind === 'default_courier_note' || existing.kind === 'default_shipping') {
      throw new BadRequestException('Cannot delete default courier note / shipping');
    }
    await this.prisma.orderFormOption.delete({ where: { id } });
    return { ok: true };
  }

  /**
   * Order IDs for the Follow-ups Due queue — same rules as list(`followUpDue`).
   * Open follow-ups scheduled today or earlier, linked to a non-deleted order.
   */
  private async resolveFollowUpDueOrderIds(
    organizationId: string,
  ): Promise<string[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const dueFollowups = await this.prisma.followup.findMany({
      where: {
        organizationId,
        orderId: { not: null },
        scheduleDate: { lte: startOfToday },
        skipped: false,
        followupStatus: { notIn: ['done', 'converted'] },
      },
      select: { orderId: true },
    });
    const candidateIds = [
      ...new Set(
        dueFollowups
          .map((f) => f.orderId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (candidateIds.length === 0) return [];

    const liveOrders = await this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: null,
        id: { in: candidateIds },
      },
      select: { id: true },
    });
    return liveOrders.map((o) => o.id);
  }

  /** Sidebar badge counts — same filters as status / follow-ups / failed list pages. */
  async getNavStatusCounts(organizationId: string): Promise<{
    byStatus: Record<string, number>;
    followupsDue: number;
    failed: number;
  }> {
    const grouped = await this.prisma.order.groupBy({
      by: ['status'],
      where: { organizationId, deletedAt: null },
      _count: { _all: true },
    });

    const byStatus: Record<string, number> = {};
    for (const row of grouped) {
      byStatus[row.status] = row._count._all;
    }

    const [dueOrderIds, failed] = await Promise.all([
      this.resolveFollowUpDueOrderIds(organizationId),
      this.prisma.failedOrder.count({
        where: {
          organizationId,
          queueStatus: 'pending',
          createdAt: {
            gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        },
      }),
    ]);

    return {
      byStatus,
      followupsDue: dueOrderIds.length,
      failed,
    };
  }

  async bulkSetFollowUp(
    organizationId: string,
    orderIds: string[],
    followUpDate: string,
    actor: ActorLabel,
  ): Promise<{ successCount: number; failedCount: number; message: string }> {
    const ids = [...new Set(orderIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      throw new BadRequestException('orderIds required');
    }
    const parsed = new Date(followUpDate);
    if (!followUpDate.trim() || Number.isNaN(parsed.getTime())) {
      throw new BadRequestException('Valid followUpDate required (YYYY-MM-DD)');
    }
    const scheduleDate = new Date(
      Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
    );
    const noteLine = `Follow-up due: ${followUpDate.trim().slice(0, 10)}`;

    let successCount = 0;
    for (const orderId of ids) {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, organizationId },
        include: { lineItems: true },
      });
      if (!order) continue;

      const notes = order.notes ? `${order.notes}\n${noteLine}` : noteLine;
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: {
            status: 'hold_followup',
            notes,
            skipFollowup: false,
          },
        });
        await tx.orderActivity.createMany({
          data: [
            {
              organizationId,
              orderId: order.id,
              type: 'status',
              label: 'Status updated',
              description: 'hold_followup',
              actorUserId: actor.userId ?? null,
              actorName: actor.name ?? null,
            },
            {
              organizationId,
              orderId: order.id,
              type: 'note',
              label: 'Follow-up scheduled',
              description: noteLine,
              actorUserId: actor.userId ?? null,
              actorName: actor.name ?? null,
            },
          ],
        });
      });

      const existingFu = await this.prisma.followup.findFirst({
        where: { organizationId, orderId: order.id },
      });
      if (existingFu) {
        await this.prisma.followup.update({
          where: { id: existingFu.id },
          data: {
            scheduleDate,
            skipped: false,
            followupNotes: noteLine,
          },
        });
      } else {
        await this.followups.createFromOrder(
          organizationId,
          {
            orderId: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            phone: order.customerPhone,
            address: order.shippingAddress,
            district: order.district,
            area: order.shippingArea,
            source: order.source,
            assignedAgentName: order.assignedAgentName,
            customerNotes: order.customerNote,
            lineItems: order.lineItems.map((l) => ({
              productName: l.productName,
              quantity: l.quantity,
            })),
            skipFollowup: false,
            customerId: order.customerId,
          },
          actor,
        );
        await this.prisma.followup.updateMany({
          where: { organizationId, orderId: order.id },
          data: { scheduleDate, followupNotes: noteLine },
        });
      }

      successCount += 1;
    }

    return {
      successCount,
      failedCount: ids.length - successCount,
      message: `Follow-up set for ${successCount} order(s)`,
    };
  }

  async bulkAction(
    organizationId: string,
    payload: {
      action: string;
      orderIds: string[];
      status?: string;
      employeeName?: string;
      employeeUserId?: string;
      courier?: string;
      fulfillmentWarehouseId?: string;
      confirmRemoteCancelled?: boolean;
      assignmentMode?: AssignmentMode;
      routingTeamIds?: string[];
      routingUserId?: string;
    },
    actor: ActorLabel,
  ): Promise<{ successCount: number; failedCount: number; message: string }> {
    const ids = [...new Set(payload.orderIds.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) {
      throw new BadRequestException('orderIds required');
    }

    if (payload.action === 'status_change') {
      const status = payload.status?.trim();
      if (!status) throw new BadRequestException('status required for status_change');
      const warehouseOverride = payload.fulfillmentWarehouseId?.trim() || undefined;
      if (STOCK_CUT_STATUSES.has(status) && !warehouseOverride) {
        throw new BadRequestException(FULFILLMENT_WAREHOUSE_REQUIRED_MSG);
      }
      if (warehouseOverride) {
        await this.assertActiveWarehouse(organizationId, warehouseOverride);
      }
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      for (const orderId of ids) {
        try {
          await this.updateStatus(organizationId, orderId, status, actor, {
            fulfillmentWarehouseId: warehouseOverride,
          });
          successCount += 1;
        } catch (e) {
          failedCount += 1;
          const msg = e instanceof Error ? e.message : 'Status update failed';
          if (errors.length < 5) errors.push(msg);
        }
      }
      const detail = errors.length ? ` Examples: ${errors.join(' · ')}` : '';
      return {
        successCount,
        failedCount,
        message: `Updated status for ${successCount}/${ids.length} order(s).${detail}`,
      };
    }

    if (payload.action === 'transfer_employee') {
      const name = payload.employeeName?.trim() || null;
      const userId = payload.employeeUserId?.trim() || null;
      let successCount = 0;
      for (const orderId of ids) {
        const existing = await this.prisma.order.findFirst({
          where: { id: orderId, organizationId },
        });
        if (!existing) continue;
        await this.prisma.order.update({
          where: { id: existing.id },
          data: {
            assignedAgentName: name,
            assignedUserId: userId,
          },
        });
        successCount += 1;
      }
      return {
        successCount,
        failedCount: ids.length - successCount,
        message: `Assigned ${successCount} order(s)`,
      };
    }

    if (payload.action === 'courier_submit') {
      const courier = (payload.courier ?? '').trim().toLowerCase();
      if (courier !== 'pathao' && courier !== 'carrybee') {
        throw new BadRequestException(
          'Bulk courier submit supports pathao or carrybee only',
        );
      }
      const warehouseId = payload.fulfillmentWarehouseId?.trim();
      if (!warehouseId) {
        throw new BadRequestException(FULFILLMENT_WAREHOUSE_REQUIRED_MSG);
      }
      await this.assertActiveWarehouse(organizationId, warehouseId);
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      const loadMemo = new Map<string, number>();
      for (const orderId of ids) {
        try {
          const existing = await this.prisma.order.findFirst({
            where: { id: orderId, organizationId, deletedAt: null },
            select: {
              id: true,
              fulfillmentWarehouseId: true,
              stockDeductedAt: true,
            },
          });
          if (!existing) {
            throw new NotFoundException('Order not found');
          }
          if (
            !existing.stockDeductedAt &&
            existing.fulfillmentWarehouseId !== warehouseId
          ) {
            await this.prisma.order.update({
              where: { id: existing.id },
              data: { fulfillmentWarehouseId: warehouseId },
            });
          } else if (
            existing.stockDeductedAt &&
            existing.fulfillmentWarehouseId &&
            existing.fulfillmentWarehouseId !== warehouseId
          ) {
            throw new BadRequestException(
              'Cannot change fulfillment warehouse after stock was deducted',
            );
          } else if (!existing.fulfillmentWarehouseId && !existing.stockDeductedAt) {
            await this.prisma.order.update({
              where: { id: existing.id },
              data: { fulfillmentWarehouseId: warehouseId },
            });
          }
          const courierOverride = {
            mode: payload.assignmentMode,
            teamIds: payload.routingTeamIds,
            assigneeUserId: payload.routingUserId,
          };
          if (courier === 'pathao') {
            await this.bookWithPathao(
              organizationId,
              orderId,
              actor,
              courierOverride,
              loadMemo,
            );
          } else {
            await this.bookWithCarrybee(
              organizationId,
              orderId,
              actor,
              courierOverride,
              loadMemo,
            );
          }
          successCount += 1;
        } catch (e) {
          failedCount += 1;
          const msg = e instanceof Error ? e.message : 'Book failed';
          if (errors.length < 5) errors.push(msg);
        }
      }
      const detail = errors.length ? ` Examples: ${errors.join(' · ')}` : '';
      return {
        successCount,
        failedCount,
        message: `Booked ${successCount}/${ids.length} via ${courier}.${detail}`,
      };
    }

    if (payload.action === 'update_courier_status') {
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      for (const orderId of ids) {
        const existing = await this.prisma.order.findFirst({
          where: { id: orderId, organizationId, deletedAt: null },
          select: {
            id: true,
            courierProvider: true,
            courierConsignmentId: true,
          },
        });
        if (!existing?.courierConsignmentId || !existing.courierProvider) {
          failedCount += 1;
          if (errors.length < 5) errors.push('No courier booking to sync');
          continue;
        }
        try {
          const provider = existing.courierProvider.toLowerCase();
          if (provider === 'pathao') {
            await this.syncPathaoStatus(organizationId, existing.id);
          } else if (provider === 'carrybee') {
            await this.syncCarrybeeStatus(organizationId, existing.id);
          } else {
            failedCount += 1;
            if (errors.length < 5) {
              errors.push(`Unsupported courier: ${existing.courierProvider}`);
            }
            continue;
          }
          successCount += 1;
        } catch (e) {
          failedCount += 1;
          const msg = e instanceof Error ? e.message : 'Sync failed';
          if (errors.length < 5) errors.push(msg);
        }
      }
      const detail = errors.length ? ` Examples: ${errors.join(' · ')}` : '';
      return {
        successCount,
        failedCount,
        message: `Synced courier status for ${successCount}/${ids.length} order(s).${detail}`,
      };
    }

    if (payload.action === 'courier_cancel') {
      let successCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      for (const orderId of ids) {
        try {
          await this.cancelCourierShipment(organizationId, orderId, actor);
          successCount += 1;
        } catch (e) {
          failedCount += 1;
          const msg = e instanceof Error ? e.message : 'Courier cancel failed';
          if (errors.length < 5) errors.push(msg);
        }
      }
      const detail = errors.length ? ` Examples: ${errors.join(' · ')}` : '';
      return {
        successCount,
        failedCount,
        message: `Cancelled courier on ${successCount}/${ids.length} order(s).${detail}`,
      };
    }

    if (payload.action === 'courier_unlink') {
      let successCount = 0;
      let skippedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];
      for (const orderId of ids) {
        try {
          await this.unlinkCourierShipment(organizationId, orderId, actor, {
            confirmRemoteCancelled: Boolean(payload.confirmRemoteCancelled),
          });
          successCount += 1;
        } catch (e) {
          const existing = await this.prisma.order.findFirst({
            where: { id: orderId, organizationId, deletedAt: null },
            select: {
              courierProvider: true,
              courierConsignmentId: true,
              courierTrackingCode: true,
            },
          });
          const hadLink = Boolean(
            existing?.courierProvider ||
              existing?.courierConsignmentId ||
              existing?.courierTrackingCode,
          );
          if (!existing || !hadLink) {
            skippedCount += 1;
            continue;
          }
          failedCount += 1;
          const msg = e instanceof Error ? e.message : 'Unlink failed';
          if (errors.length < 5) errors.push(msg);
        }
      }
      const detail = errors.length ? ` Examples: ${errors.join(' · ')}` : '';
      return {
        successCount,
        failedCount,
        message: `Unlinked courier on ${successCount} order(s)${skippedCount ? `, skipped ${skippedCount}` : ''}${failedCount ? `, failed ${failedCount}` : ''}.${detail}`,
      };
    }

    throw new BadRequestException(
      `Bulk action "${payload.action}" is not implemented yet`,
    );
  }

  async list(
    organizationId: string,
    query: Partial<OrderListQuery> & {
      page?: number;
      pageSize?: number;
      dateFrom?: string;
      dateTo?: string;
    },
  ): Promise<OrderListResponse> {
    const page = query.page ?? 1;
    const pageSize = Math.min(1000, Math.max(1, query.pageSize ?? 20));
    const where: Record<string, unknown> = { organizationId, deletedAt: null };
    const andFilters: Record<string, unknown>[] = [];

    if (query.status) {
      if (query.excludeStatus) {
        andFilters.push({ status: { not: query.status } });
      } else {
        where.status = query.status;
      }
    }
    if (query.source) {
      if (query.excludeSource) {
        andFilters.push({ source: { not: query.source } });
      } else {
        where.source = query.source;
      }
    }
    if (query.paymentStatus) where.paymentStatus = query.paymentStatus;
    if (query.district?.trim()) {
      const d = query.district.trim();
      const districtMatch = {
        OR: [
          { district: { contains: d, mode: 'insensitive' } },
          { shippingArea: { contains: d, mode: 'insensitive' } },
        ],
      };
      if (query.excludeDistrict) {
        andFilters.push({ NOT: districtMatch });
      } else {
        andFilters.push(districtMatch);
      }
    }
    if (query.employee?.trim()) {
      where.assignedAgentName = query.employee.trim();
    }
    if (query.courierStatusSlug) where.courierStatusSlug = query.courierStatusSlug;
    if (query.courier === 'pathao' || query.courier === 'carrybee') {
      if (query.excludeCourier) {
        andFilters.push({
          OR: [
            { courierProvider: { not: query.courier } },
            { courierProvider: null },
          ],
        });
      } else {
        where.courierProvider = query.courier;
      }
    } else if (query.courier?.trim()) {
      if (query.excludeCourier) {
        andFilters.push({
          OR: [
            { courierProvider: { not: query.courier.trim() } },
            { courierProvider: null },
          ],
        });
      } else {
        where.courierProvider = query.courier.trim();
      }
    }

    if (query.productId?.trim()) {
      andFilters.push({
        lineItems: { some: { productId: query.productId.trim() } },
      });
    } else if (query.product?.trim()) {
      andFilters.push({
        lineItems: {
          some: {
            productName: { contains: query.product.trim(), mode: 'insensitive' },
          },
        },
      });
    }

    if (query.amountMin != null || query.amountMax != null) {
      const amount: Record<string, number> = {};
      if (query.amountMin != null) amount.gte = query.amountMin;
      if (query.amountMax != null) amount.lte = query.amountMax;
      where.amount = amount;
    }

    if (query.pathaoCity?.trim()) {
      where.pathaoCity = { contains: query.pathaoCity.trim(), mode: 'insensitive' };
    }
    if (query.pathaoZone?.trim()) {
      where.pathaoZone = { contains: query.pathaoZone.trim(), mode: 'insensitive' };
    }

    if (query.noteStatus === 'has_note') {
      andFilters.push({
        notes: { not: null },
        NOT: { notes: '' },
      });
    } else if (query.noteStatus === 'no_note') {
      andFilters.push({
        OR: [{ notes: null }, { notes: '' }],
      });
    }

    const createdAtFilter = resolveCreatedAtFilter(
      query.dateRange,
      query.dateFrom,
      query.dateTo,
    );
    if (createdAtFilter) where.createdAt = createdAtFilter;

    const courierBookedFilter = resolveCreatedAtFilter(
      query.courierDateRange,
      query.courierDateFrom,
      query.courierDateTo,
    );
    if (courierBookedFilter) where.courierBookedAt = courierBookedFilter;

    if (query.followUpDue === true) {
      const dueOrderIds = await this.resolveFollowUpDueOrderIds(organizationId);
      where.id = { in: dueOrderIds.length > 0 ? dueOrderIds : ['__none__'] };
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      andFilters.push({
        OR: [
          { orderNumber: { contains: q, mode: 'insensitive' } },
          { customerName: { contains: q, mode: 'insensitive' } },
          { customerPhone: { contains: q } },
        ],
      });
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    const orderBy = resolveOrderListSort(query.sortBy, query.sortDir);

    const [total, rows, moneyAgg] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          lineItems: { orderBy: { createdAt: 'asc' } },
          fulfillmentWarehouse: { select: { id: true, name: true } },
        },
      }),
      this.prisma.order.aggregate({
        where,
        _sum: {
          amount: true,
          subtotal: true,
          deliveryCharge: true,
          discount: true,
          paidAmount: true,
          courierChargedToMe: true,
        },
      }),
    ]);

    const productIds = [
      ...new Set(
        rows
          .flatMap((r) => r.lineItems.map((l) => l.productId))
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const productImages =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { organizationId, id: { in: productIds } },
            select: { id: true, imageUrl: true },
          })
        : [];
    const imageByProductId = new Map(
      productImages.map((p) => [p.id, p.imageUrl ?? undefined]),
    );

    const phones = [
      ...new Set(rows.map((r) => r.customerPhone).filter((p) => Boolean(p?.trim()))),
    ];
    const [courierByPhone, shopByPhone] = await Promise.all([
      this.courierPhoneHistory.loadCachedStatsByPhones(organizationId, phones),
      this.loadShopCourierByPhones(organizationId, phones),
    ]);
    // Cache-only on list — no background BD Courier warm (protects API quota).

    const orderIds = rows.map((r) => r.id);
    const [followups, followUpActivities] = await Promise.all([
      orderIds.length
        ? this.prisma.followup.findMany({
            where: { organizationId, orderId: { in: orderIds } },
            select: { orderId: true, scheduleDate: true },
          })
        : Promise.resolve([]),
      orderIds.length
        ? this.prisma.orderActivity.findMany({
            where: {
              organizationId,
              orderId: { in: orderIds },
              label: 'Follow-up scheduled',
            },
            orderBy: { createdAt: 'desc' },
            select: { orderId: true, createdAt: true },
          })
        : Promise.resolve([]),
    ]);

    const followUpDueByOrderId = new Map<string, string>();
    for (const fu of followups) {
      if (!fu.orderId || !fu.scheduleDate) continue;
      followUpDueByOrderId.set(fu.orderId, fu.scheduleDate.toISOString());
    }

    const followUpSetByOrderId = new Map<string, string>();
    for (const act of followUpActivities) {
      if (followUpSetByOrderId.has(act.orderId)) continue;
      followUpSetByOrderId.set(act.orderId, act.createdAt.toISOString());
    }

    const items: OrderListItem[] = rows.map((row) =>
      this.toListItem(
        row,
        imageByProductId,
        courierByPhone.get(row.customerPhone),
        {
          followUpDueAt: followUpDueByOrderId.get(row.id),
          followUpSetAt: followUpSetByOrderId.get(row.id),
        },
        shopByPhone.get(row.customerPhone),
      ),
    );
    const totalAmount = moneyAgg._sum.amount ?? 0;

    return {
      items,
      page,
      pageSize,
      total,
      summary: {
        count: total,
        totalAmount,
        productTotal: moneyAgg._sum.subtotal ?? 0,
        shippingCollected: moneyAgg._sum.deliveryCharge ?? 0,
        discountTotal: moneyAgg._sum.discount ?? 0,
        paidTotal: moneyAgg._sum.paidAmount ?? 0,
        courierChargeTotal: moneyAgg._sum.courierChargedToMe ?? 0,
      },
    };
  }

  async getByOrderNumber(organizationId: string, orderNumber: string): Promise<OrderDetail> {
    const row = await this.prisma.order.findFirst({
      where: { organizationId, orderNumber, deletedAt: null },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'asc' } },
        fulfillmentWarehouse: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Order not found');
    return this.toDetailEnriched(organizationId, row);
  }

  async getById(organizationId: string, id: string): Promise<OrderDetail> {
    const row = await this.prisma.order.findFirst({
      where: { organizationId, id, deletedAt: null },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'asc' } },
        fulfillmentWarehouse: { select: { id: true, name: true } },
      },
    });
    if (!row) throw new NotFoundException('Order not found');
    return this.toDetailEnriched(organizationId, row);
  }

  /**
   * Status-derived courier progress until live courier booking is wired.
   * Honest UX: no fake tracking IDs.
   */
  async getCourierTracking(
    organizationId: string,
    idOrNumber: string,
  ): Promise<OrderCourierTracking> {
    const row = await this.prisma.order.findFirst({
      where: {
        organizationId,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: {
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) throw new NotFoundException('Order not found');

    const status = row.status;
    const courierRelevant = [
      'confirmed',
      'processing',
      'processing_2',
      'in_courier',
      'delivered',
      'completed',
    ];
    if (!courierRelevant.includes(status) && status !== 'cancelled') {
      throw new NotFoundException('Courier tracking not available for this status');
    }

    const findActivity = (match: (type: string, label: string) => boolean) =>
      row.activities.find((a) => match(a.type, a.label));

    const createdAt = row.createdAt.toISOString();
    const confirmed = findActivity(
      (t, l) => t === 'confirmed' || l.toLowerCase().includes('confirmed'),
    );
    const inCourier = findActivity(
      (_t, l) =>
        l.toLowerCase().includes('in_courier') ||
        l.toLowerCase().includes('in courier') ||
        l.toLowerCase().includes('courier'),
    );
    const delivered = findActivity(
      (t, l) => t === 'delivered' || l.toLowerCase().includes('delivered'),
    );

    const rank: Record<string, number> = {
      pending: 0,
      pending_2: 0,
      pending_3: 0,
      confirmed: 1,
      hold: 1,
      processing: 2,
      processing_2: 2,
      in_courier: 3,
      delivered: 4,
      completed: 5,
      cancelled: -1,
    };
    const currentRank = rank[status] ?? 0;

    const steps = [
      {
        id: 'created',
        label: 'Order created',
        completed: true,
        timestamp: createdAt,
      },
      {
        id: 'confirmed',
        label: 'Confirmed / ready for dispatch',
        completed: currentRank >= 1,
        timestamp: confirmed?.createdAt.toISOString(),
      },
      {
        id: 'processing',
        label: 'Processing / packing',
        completed: currentRank >= 2,
        timestamp:
          currentRank >= 2
            ? (findActivity((_t, l) => l.toLowerCase().includes('processing'))
                ?.createdAt.toISOString() ?? undefined)
            : undefined,
      },
      {
        id: 'in_courier',
        label: 'Handed to courier',
        completed: currentRank >= 3,
        timestamp: inCourier?.createdAt.toISOString(),
      },
      {
        id: 'delivered',
        label: 'Delivered',
        completed: currentRank >= 4,
        timestamp: delivered?.createdAt.toISOString(),
      },
    ];

    const current =
      steps.filter((s) => s.completed).at(-1)?.label ??
      (status === 'cancelled' ? 'Cancelled' : status);

    return {
      courierName:
        row.courierProvider === 'pathao'
          ? 'Pathao'
          : row.courierProvider === 'carrybee'
            ? 'Carrybee'
            : row.pathaoCity
              ? 'Pathao'
              : row.carrybeeCity
                ? 'Carrybee'
                : 'Courier',
      trackingId: row.courierConsignmentId ?? row.courierTrackingCode ?? undefined,
      currentStatus:
        status === 'cancelled'
          ? 'Cancelled'
          : row.courierStatus || current,
      steps:
        status === 'cancelled'
          ? [
              ...steps.slice(0, 2),
              {
                id: 'cancelled',
                label: 'Order cancelled',
                completed: true,
                timestamp: findActivity((t) => t === 'cancelled')?.createdAt.toISOString(),
              },
            ]
          : steps,
    };
  }

  async listByPhone(
    organizationId: string,
    phone: string,
    excludeIdOrNumber?: string,
  ): Promise<OrderDetail[]> {
    const digits = phone.replace(/\D/g, '');
    if (!digits) return [];

    const rows = await this.prisma.order.findMany({
      where: {
        organizationId,
        OR: [
          { customerPhone: { contains: digits } },
          { altMobile: { contains: digits } },
        ],
        ...(excludeIdOrNumber
          ? {
              NOT: {
                OR: [{ id: excludeIdOrNumber }, { orderNumber: excludeIdOrNumber }],
              },
            }
          : {}),
      },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const normalized = digits;
    const matched = rows.filter((row) => {
      const primary = (row.customerPhone ?? '').replace(/\D/g, '');
      const alt = (row.altMobile ?? '').replace(/\D/g, '');
      return (
        primary === normalized ||
        alt === normalized ||
        primary.endsWith(normalized) ||
        normalized.endsWith(primary)
      );
    });
    return Promise.all(
      matched.map((row) => this.toDetailEnriched(organizationId, row)),
    );
  }

  async checkDuplicate(
    organizationId: string,
    phone: string,
    options?: { windowHours?: number; productIds?: string[] },
  ): Promise<DuplicateCheckResult> {
    const normalized = phone.trim();
    if (!normalized) return { isDuplicate: false };

    const windowHours = options?.windowHours && options.windowHours > 0 ? options.windowHours : 72;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000);
    const productIds = (options?.productIds ?? []).filter(Boolean);

    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        customerPhone: normalized,
        createdAt: { gte: since },
        status: { notIn: ['cancelled', 'delivered', 'completed'] },
        ...(productIds.length
          ? {
              lineItems: {
                some: {
                  OR: [
                    { productId: { in: productIds } },
                    { variantId: { in: productIds } },
                  ],
                },
              },
            }
          : {}),
      },
      orderBy: { createdAt: 'desc' },
      select: { id: true, orderNumber: true },
    });
    if (!existing) return { isDuplicate: false };
    return {
      isDuplicate: true,
      existingOrderId: existing.id,
      existingOrderNumber: existing.orderNumber,
      message: productIds.length
        ? `Similar order ${existing.orderNumber} found for this phone + product(s) within ${windowHours}h`
        : `Similar order ${existing.orderNumber} found for this phone within ${windowHours}h`,
    };
  }

  async lookupCustomer(organizationId: string, phone: string) {
    const normalized = phone.trim();
    if (!normalized) return null;

    const phoneKey = normalizeBdPhone(normalized);
    const profile = phoneKey
      ? await this.prisma.customer.findUnique({
          where: {
            organizationId_phoneNormalized: {
              organizationId,
              phoneNormalized: phoneKey,
            },
          },
        })
      : null;

    if (profile) {
      await this.customers.refreshStats(organizationId, profile.id);
      const fresh = await this.prisma.customer.findFirstOrThrow({
        where: { id: profile.id },
      });
      return {
        mobile: fresh.phone,
        name: fresh.name,
        email: fresh.email ?? '',
        address: fresh.address ?? '',
        district: fresh.district ?? fresh.area ?? '',
        orderSource: fresh.source ?? '',
        customerTag: fresh.tags[0] ?? '',
        stats: {
          totalOrders: fresh.orderCount,
          completedDelivered: fresh.deliveredCount,
        },
      };
    }

    const orders = await this.prisma.order.findMany({
      where: { organizationId, customerPhone: normalized },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    if (orders.length === 0) return null;

    const latest = orders[0]!;
    const completedDelivered = orders.filter((o) =>
      ['delivered', 'completed'].includes(o.status),
    ).length;

    return {
      mobile: latest.customerPhone,
      name: latest.customerName,
      email: latest.customerEmail ?? '',
      address: latest.shippingAddress ?? '',
      district: latest.district ?? latest.shippingArea,
      orderSource: latest.source,
      customerTag: latest.customerTag ?? '',
      stats: {
        totalOrders: orders.length,
        completedDelivered,
      },
    };
  }

  async create(
    organizationId: string,
    input: CreateOrderInput,
    actor: ActorLabel,
  ): Promise<OrderDetail> {
    if (!input.lineItems?.length) {
      throw new BadRequestException('At least one line item is required');
    }
    if (!input.customerName?.trim() || !input.customerPhone?.trim()) {
      throw new BadRequestException('Customer name and phone are required');
    }
    if (!input.shippingAddress?.trim()) {
      throw new BadRequestException('Shipping address is required');
    }

    const clientIp = this.securityBlocks.sanitizeClientIp(input.clientIp);
    await this.securityBlocks.assertNotBlocked(organizationId, {
      phone: input.customerPhone,
      altMobile: input.altMobile,
      ip: clientIp,
    });

    const options = await this.getFormOptions(organizationId);
    const status = input.status || options.statuses[0]?.value || 'pending';
    const source = input.source || options.sources[0]?.value || 'call';
    if (!(await this.orgOrderStatuses.isValidStatus(organizationId, status))) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }
    if (!options.sources.some((s) => s.value === source)) {
      throw new BadRequestException(`Invalid order source: ${source}`);
    }

    const lineRows = input.lineItems.map((line) => {
      const qty = Math.max(1, Math.floor(line.quantity));
      const unitPrice = Number(line.unitPrice) || 0;
      const discount = Number(line.discount ?? 0) || 0;
      const lineTotal = Math.max(0, qty * unitPrice - discount);
      return {
        productId: line.productId ?? null,
        variantId: line.variantId ?? null,
        productName: line.productName,
        variationLabel: line.variationLabel ?? null,
        sku: line.sku ?? null,
        quantity: qty,
        unitPrice,
        discount,
        lineTotal,
      };
    });

    const subtotal = lineRows.reduce((sum, l) => sum + l.lineTotal, 0);
    let discount = Number(input.discount ?? 0) || 0;
    const deliveryCharge = Number(input.deliveryCharge ?? 0) || 0;

    let couponCode = input.couponCode?.trim() || null;
    if (couponCode) {
      const validated = await this.coupons.validate(
        organizationId,
        couponCode,
        Math.max(0, subtotal),
      );
      if (!validated.valid || !validated.coupon) {
        throw new BadRequestException(validated.message || 'Invalid coupon');
      }
      const couponDiscount = this.coupons.calcDiscount(
        validated.coupon,
        Math.max(0, subtotal),
      );
      const manualPart = Math.max(0, discount - couponDiscount);
      discount = manualPart + couponDiscount;
      couponCode = validated.coupon.code;
    }

    const amount = Math.max(0, subtotal - discount + deliveryCharge);
    const paidAmount = Number(input.paidAmount ?? 0) || 0;
    const paymentMethod = input.paymentMethod ?? null;
    const paymentStatus = this.resolvePaymentStatus(
      input.paymentStatus,
      paymentMethod,
      paidAmount,
      amount,
    );

    const orderNumber = await this.nextOrderNumber(organizationId);
    const shippingArea =
      input.district?.trim() ||
      input.shippingArea?.trim() ||
      input.pathaoCity?.trim() ||
      'Unknown';
    const explicitAssignedUserId = input.assignedUserId?.trim() || null;
    let explicitAssignedAgentName = input.assignedAgentName?.trim() || null;
    if (explicitAssignedUserId && !explicitAssignedAgentName) {
      const assignedUser = await this.prisma.user.findFirst({
        where: { id: explicitAssignedUserId, organizationId },
        select: { name: true },
      });
      explicitAssignedAgentName = assignedUser?.name?.trim() || null;
    }
    const routingOverride =
      input.assignmentMode || input.routingTeamIds?.length || input.routingUserId
        ? {
            mode: input.assignmentMode,
            teamIds: input.routingTeamIds,
            assigneeUserId: input.routingUserId,
          }
        : undefined;
    const routedSalesAssignee =
      explicitAssignedUserId || explicitAssignedAgentName
        ? null
        : await this.resolveRoutingAssignee(organizationId, 'order', routingOverride);
    const inboundWebsite = Boolean(input.websiteStoreId?.trim());
    const salesAssignedUserId =
      explicitAssignedUserId ||
      routedSalesAssignee?.userId ||
      (inboundWebsite ? null : actor.userId) ||
      null;
    const salesAssignedName =
      explicitAssignedAgentName ||
      routedSalesAssignee?.userName ||
      (inboundWebsite ? null : actor.name) ||
      null;
    const creditNow = await this.shouldSnapshotOrderCredit(organizationId, status);

    const created = await this.prisma.$transaction(async (tx) => {
      const customer = await this.customers.ensureFromOrder(
        organizationId,
        {
          name: input.customerName.trim(),
          phone: input.customerPhone.trim(),
          email: input.customerEmail,
          altMobile: input.altMobile,
          district: input.district?.trim() || shippingArea,
          area: shippingArea,
          address: input.shippingAddress.trim(),
          source,
          assignedAgentName: salesAssignedName,
          notes: input.customerNote,
        },
        tx,
      );

      const order = await tx.order.create({
        data: {
          organizationId,
          orderNumber,
          status,
          customerId: customer.id,
          customerName: input.customerName.trim(),
          customerPhone: input.customerPhone.trim(),
          customerEmail: input.customerEmail?.trim() || null,
          altMobile: input.altMobile?.trim() || null,
          customerNote: input.customerNote?.trim() || null,
          customerTag: input.customerTag?.trim() || null,
          orderTag: input.orderTag?.trim() || null,
          source,
          itemsCount: lineRows.reduce((sum, l) => sum + l.quantity, 0),
          subtotal,
          discount,
          deliveryCharge,
          amount,
          paidAmount,
          paymentStatus,
          paymentMethod,
          assignedAgentName: salesAssignedName,
          assignedUserId: salesAssignedUserId,
          ...(creditNow
            ? {
                orderCreditUserId: salesAssignedUserId,
                orderCreditAgentName: salesAssignedName,
                orderCreditedAt: new Date(),
              }
            : {}),
          shippingArea,
          shippingAddress: input.shippingAddress.trim(),
          district: input.district?.trim() || shippingArea,
          pathaoCity: input.pathaoCity?.trim() || null,
          pathaoZone: input.pathaoZone?.trim() || null,
          pathaoArea: input.pathaoArea?.trim() || null,
          pathaoCityId:
            input.pathaoCityId !== undefined && input.pathaoCityId !== null
              ? Math.floor(Number(input.pathaoCityId))
              : null,
          pathaoZoneId:
            input.pathaoZoneId !== undefined && input.pathaoZoneId !== null
              ? Math.floor(Number(input.pathaoZoneId))
              : null,
          pathaoAreaId:
            input.pathaoAreaId !== undefined && input.pathaoAreaId !== null
              ? Math.floor(Number(input.pathaoAreaId))
              : null,
          carrybeeCity: input.carrybeeCity?.trim() || null,
          carrybeeZone: input.carrybeeZone?.trim() || null,
          carrybeeArea: input.carrybeeArea?.trim() || null,
          carrybeeCityId:
            input.carrybeeCityId !== undefined && input.carrybeeCityId !== null
              ? Math.floor(Number(input.carrybeeCityId))
              : null,
          carrybeeZoneId:
            input.carrybeeZoneId !== undefined && input.carrybeeZoneId !== null
              ? Math.floor(Number(input.carrybeeZoneId))
              : null,
          carrybeeAreaId:
            input.carrybeeAreaId !== undefined && input.carrybeeAreaId !== null
              ? Math.floor(Number(input.carrybeeAreaId))
              : null,
          notes: input.notes?.trim() || null,
          courierNote: input.courierNote?.trim() || null,
          packingNote: input.packingNote?.trim() || null,
          referenceNo: input.referenceNo?.trim() || null,
          orderDate: input.orderDate ? new Date(input.orderDate) : new Date(),
          skipFollowup: Boolean(input.skipFollowup),
          couponCode,
          courierChargedToMe: Number(input.courierChargedToMe ?? 0) || 0,
          leadId: input.leadId || null,
          utmSource: input.utmSource?.trim() || null,
          utmId: input.utmId?.trim() || null,
          utmContent: input.utmContent?.trim() || null,
          utmCampaign: input.utmCampaign?.trim() || null,
          courierWeightKg:
            input.courierWeightKg !== undefined && input.courierWeightKg !== null
              ? Math.max(0.1, Number(input.courierWeightKg))
              : null,
          courierDeliveryType:
            input.courierDeliveryType === 'express' || input.courierDeliveryType === 'normal'
              ? input.courierDeliveryType
              : null,
          attachmentNames: input.attachmentNames ?? [],
          attachmentUrls: input.attachmentUrls ?? [],
          websiteStoreId: input.websiteStoreId?.trim() || null,
          externalOrderId: input.externalOrderId?.trim() || null,
          inboundOriginalSnapshot: input.websiteStoreId
            ? {
                amount,
                lines: lineRows.map((l) => ({
                  productId: l.productId,
                  variantId: l.variantId,
                  sku: l.sku,
                  quantity: l.quantity,
                  unitPrice: l.unitPrice,
                })),
              }
            : null,
          incentiveFlags: null,
          clientIp: clientIp ?? null,
          createdByUserId: actor.userId ?? null,
          createdByName: actor.name ?? null,
          lineItems: {
            create: lineRows.map((l) => ({
              organizationId,
              ...l,
            })),
          },
          activities: {
            create: [
              {
                organizationId,
                type: 'created',
                label: 'Order created',
                description: `Order ${orderNumber} created`,
                actorUserId: actor.userId ?? null,
                actorName: actor.name ?? null,
              },
              ...(input.notes?.trim()
                ? [
                    {
                      organizationId,
                      type: 'note' as const,
                      label: 'Note updated',
                      description: input.notes.trim(),
                      actorUserId: actor.userId ?? null,
                      actorName: actor.name ?? null,
                    },
                  ]
                : []),
            ],
          },
        },
        include: {
          lineItems: { orderBy: { createdAt: 'asc' } },
          activities: { orderBy: { createdAt: 'asc' } },
        },
      });
      await this.customers.refreshStats(organizationId, customer.id, tx);
      return order;
    });

    if (couponCode) {
      await this.coupons.consumeUsage(organizationId, couponCode);
    }

    if (input.leadId) {
      await this.leads.markConverted(
        organizationId,
        input.leadId,
        created.orderNumber,
        actor,
      );
    }

    await this.followups.createFromOrder(
      organizationId,
      {
        orderId: created.id,
        orderNumber: created.orderNumber,
        customerName: created.customerName,
        phone: created.customerPhone,
        address: created.shippingAddress,
        district: created.district,
        area: created.shippingArea,
        source: created.source,
        assignedAgentName: created.assignedAgentName,
        customerNotes: created.customerNote,
        lineItems: created.lineItems.map((l) => ({
          productName: l.productName,
          quantity: l.quantity,
        })),
        skipFollowup: Boolean(input.skipFollowup),
        customerId: created.customerId,
      },
      actor,
    );

    await this.orderPayments.ensureForOrder(
      organizationId,
      {
        id: created.id,
        amount: created.amount,
        paidAmount: created.paidAmount,
        paymentStatus: created.paymentStatus,
        paymentMethod: created.paymentMethod,
      },
      actor,
    );

    // Background: cache courier success for this phone (website + manual create).
    // Table stays cache-only; this is the controlled API spend per new/expired phone.
    this.courierPhoneHistory.ensureFresh(organizationId, created.customerPhone);

    return this.toDetailEnriched(organizationId, created);
  }

  async updateStatus(
    organizationId: string,
    idOrNumber: string,
    nextStatus: string | undefined,
    actor: ActorLabel,
    options?: { fulfillmentWarehouseId?: string },
  ): Promise<OrderDetail> {
    if (!nextStatus?.trim()) {
      throw new BadRequestException('status is required');
    }
    const status = nextStatus.trim();
    if (!(await this.orgOrderStatuses.isValidStatus(organizationId, status))) {
      throw new BadRequestException(`Invalid order status: ${status}`);
    }

    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: { lineItems: true },
    });
    if (!existing) throw new NotFoundException('Order not found');

    const prev = existing.status;
    if (prev === status) {
      return this.getById(organizationId, existing.id);
    }

    // Cancelling a booked order must cancel the remote consignment first.
    if (status === 'cancelled' && existing.courierConsignmentId) {
      await this.cancelRemoteCourierOrThrow(organizationId, existing, {
        reason: 'Order cancelled in CRM',
      });
    }

    const shouldCut =
      STOCK_CUT_STATUSES.has(status) &&
      !STOCK_CUT_STATUSES.has(prev) &&
      !existing.stockDeductedAt;
    // Restock when cancelling, completing a return, or moving out of a
    // stock-cut status back to draft-like statuses (e.g. confirmed → pending).
    // Do NOT restock on delivered/completed — inventory stays sold.
    const leavingStockCut =
      STOCK_CUT_STATUSES.has(prev) &&
      !STOCK_CUT_STATUSES.has(status) &&
      !STOCK_KEEP_DEDUCTED_STATUSES.has(status) &&
      status !== 'pending_return' &&
      status !== 'returned' &&
      status !== 'cancelled';
    const shouldRestock =
      Boolean(existing.stockDeductedAt) &&
      (status === 'cancelled' ||
        (STOCK_RETURN_RESTOCK_STATUSES.has(status) &&
          !STOCK_RETURN_RESTOCK_STATUSES.has(prev)) ||
        leavingStockCut);

    let cutWarehouseId: string | undefined;
    if (shouldCut) {
      cutWarehouseId = await this.resolveFulfillmentWarehouseId(
        organizationId,
        existing,
        options?.fulfillmentWarehouseId,
      );
    }
    const restockWarehouseId = existing.fulfillmentWarehouseId ?? undefined;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (shouldCut && cutWarehouseId) {
        await this.inventory.applyOrderStockDeltas(
          tx,
          organizationId,
          existing.lineItems.map((l) => ({
            productId: l.productId,
            variantId: l.variantId,
            quantity: l.quantity,
            productName: l.productName,
          })),
          {
            sign: -1,
            orderNumber: existing.orderNumber,
            orderId: existing.id,
            actor: { userId: actor.userId, name: actor.name },
            warehouseId: cutWarehouseId,
          },
        );
      }
      if (shouldRestock) {
        const restockLines = existing.lineItems
          .map((l) => {
            const already = (l as { returnedQuantity?: number }).returnedQuantity ?? 0;
            const qty = Math.max(0, l.quantity - already);
            return {
              productId: l.productId,
              variantId: l.variantId,
              quantity: qty,
              productName: l.productName,
              lineId: l.id,
              fullQty: l.quantity,
            };
          })
          .filter((l) => l.quantity > 0);
        if (restockLines.length > 0) {
          await this.inventory.applyOrderStockDeltas(
            tx,
            organizationId,
            restockLines.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              productName: l.productName,
            })),
            {
              sign: 1,
              orderNumber: existing.orderNumber,
              orderId: existing.id,
              actor: { userId: actor.userId, name: actor.name },
              warehouseId: restockWarehouseId,
            },
          );
        }
        for (const line of existing.lineItems) {
          await tx.orderItem.update({
            where: { id: line.id },
            data: { returnedQuantity: line.quantity },
          });
        }
      }

      return tx.order.update({
        where: { id: existing.id },
        data: {
          status,
          ...(shouldCut && cutWarehouseId
            ? { fulfillmentWarehouseId: cutWarehouseId }
            : {}),
          ...(status === 'cancelled' && existing.courierConsignmentId
            ? this.courierClearFields()
            : {}),
          ...( (await this.shouldSnapshotOrderCredit(organizationId, status)) &&
          !existing.orderCreditedAt
            ? {
                orderCreditUserId: existing.assignedUserId ?? null,
                orderCreditAgentName: existing.assignedAgentName ?? null,
                orderCreditedAt: new Date(),
              }
            : {}),
          stockDeductedAt: shouldCut
            ? new Date()
            : shouldRestock
              ? null
              : undefined,
          activities: {
            create: {
              organizationId,
              type:
                status === 'cancelled'
                  ? 'cancelled'
                  : status === 'confirmed'
                    ? 'confirmed'
                    : 'note',
              label: `Status changed to ${status}`,
              description:
                status === 'cancelled' && existing.courierConsignmentId
                  ? `${prev} → ${status} · courier consignment cancelled`
                  : shouldCut && cutWarehouseId
                    ? `${prev} → ${status} · stock from warehouse`
                    : `${prev} → ${status}`,
              actorUserId: actor.userId ?? null,
              actorName: actor.name ?? null,
            },
          },
        },
        include: {
          lineItems: { orderBy: { createdAt: 'asc' } },
          activities: { orderBy: { createdAt: 'asc' } },
          fulfillmentWarehouse: { select: { id: true, name: true } },
        },
      });
    });

    // Best-effort auto SMS / follow-up — never fail the status change
    void this.sms.tryAutoSmsOnStatusChange(organizationId, updated.id, status).catch(() => undefined);
    void this.automations
      .tryAutoFollowupOnStatusChange(organizationId, updated.id, status)
      .catch(() => undefined);

    return this.toDetailEnriched(organizationId, updated);
  }

  /** Partial or full line returns — restocks returned qty and sets pending_return / returned. */
  async returnLines(
    organizationId: string,
    idOrNumber: string,
    payload: { lines: Array<{ lineItemId: string; quantity: number }> },
    actor: ActorLabel,
  ): Promise<OrderDetail> {
    const lines = payload.lines ?? [];
    if (lines.length === 0) throw new BadRequestException('lines required');

    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: { lineItems: true },
    });
    if (!existing) throw new NotFoundException('Order not found');

    const byId = new Map(existing.lineItems.map((l) => [l.id, l]));
    const deltas: Array<{
      lineId: string;
      addQty: number;
      productId: string | null;
      variantId: string | null;
      productName: string;
      nextReturned: number;
    }> = [];

    for (const row of lines) {
      const line = byId.get(row.lineItemId);
      if (!line) throw new BadRequestException(`Unknown line item: ${row.lineItemId}`);
      const addQty = Math.floor(row.quantity);
      if (addQty <= 0) throw new BadRequestException('Return quantity must be positive');
      const already = (line as { returnedQuantity?: number }).returnedQuantity ?? 0;
      const remaining = line.quantity - already;
      if (addQty > remaining) {
        throw new BadRequestException(
          `Cannot return ${addQty} of ${line.productName} — only ${remaining} left`,
        );
      }
      deltas.push({
        lineId: line.id,
        addQty,
        productId: line.productId,
        variantId: line.variantId,
        productName: line.productName,
        nextReturned: already + addQty,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing.stockDeductedAt) {
        await this.inventory.applyOrderStockDeltas(
          tx,
          organizationId,
          deltas.map((d) => ({
            productId: d.productId,
            variantId: d.variantId,
            quantity: d.addQty,
            productName: d.productName,
          })),
          {
            sign: 1,
            orderNumber: existing.orderNumber,
            orderId: existing.id,
            actor: { userId: actor.userId, name: actor.name },
            warehouseId: existing.fulfillmentWarehouseId ?? undefined,
          },
        );
      }

      for (const d of deltas) {
        await tx.orderItem.update({
          where: { id: d.lineId },
          data: { returnedQuantity: d.nextReturned },
        });
      }

      const refreshed = await tx.orderItem.findMany({ where: { orderId: existing.id } });
      const allReturned = refreshed.every(
        (l) => ((l as { returnedQuantity?: number }).returnedQuantity ?? 0) >= l.quantity,
      );
      const nextStatus = allReturned ? 'returned' : 'pending_return';

      await tx.order.update({
        where: { id: existing.id },
        data: {
          status: nextStatus,
          stockDeductedAt: allReturned ? null : existing.stockDeductedAt,
          activities: {
            create: {
              organizationId,
              type: 'note',
              label: allReturned ? 'Return completed' : 'Partial return recorded',
              description: deltas
                .map((d) => `${d.productName} ×${d.addQty}`)
                .join(', ')
                .slice(0, 400),
              actorUserId: actor.userId ?? null,
              actorName: actor.name ?? null,
            },
          },
        },
      });
    });

    return this.getById(organizationId, existing.id);
  }

  /** Soft-delete → recycle bin; restock if stock was previously cut. */
  async softDelete(
    organizationId: string,
    idOrNumber: string,
    actor: ActorLabel,
  ): Promise<{ ok: true }> {
    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: { lineItems: true },
    });
    if (!existing) throw new NotFoundException('Order not found');

    if (existing.courierConsignmentId) {
      throw new BadRequestException(
        'This order has an active courier booking. Cancel the courier (or Cancel order) first. Use Courier Unlink only if the parcel is already cancelled at Pathao/Carrybee.',
      );
    }

    await this.prisma.$transaction(async (tx) => {
      if (existing.stockDeductedAt) {
        const restockLines = existing.lineItems
          .map((l) => {
            const already = (l as { returnedQuantity?: number }).returnedQuantity ?? 0;
            const qty = Math.max(0, l.quantity - already);
            return {
              productId: l.productId,
              variantId: l.variantId,
              quantity: qty,
              productName: l.productName,
            };
          })
          .filter((l) => l.quantity > 0);
        if (restockLines.length > 0) {
          await this.inventory.applyOrderStockDeltas(
            tx,
            organizationId,
            restockLines,
            {
              sign: 1,
              orderNumber: existing.orderNumber,
              orderId: existing.id,
              actor: { userId: actor.userId, name: actor.name },
              warehouseId: existing.fulfillmentWarehouseId ?? undefined,
            },
          );
        }
      }

      await tx.order.update({
        where: { id: existing.id },
        data: {
          deletedAt: new Date(),
          stockDeductedAt: existing.stockDeductedAt ? null : existing.stockDeductedAt,
          stockRestockedOnDelete: Boolean(existing.stockDeductedAt),
          activities: {
            create: {
              organizationId,
              type: 'note',
              label: 'Order moved to recycle bin',
              description: existing.stockDeductedAt
                ? 'Soft-deleted and stock restocked'
                : 'Soft-deleted',
              actorUserId: actor.userId ?? null,
              actorName: actor.name ?? null,
            },
          },
        },
      });
    });

    return { ok: true };
  }

  async restoreDeleted(organizationId: string, orderId: string, actor: ActorLabel) {
    const existing = await this.prisma.order.findFirst({
      where: { organizationId, id: orderId, deletedAt: { not: null } },
      include: { lineItems: true },
    });
    if (!existing) throw new NotFoundException('Deleted order not found');

    const needsRehold =
      existing.stockRestockedOnDelete &&
      !existing.stockDeductedAt &&
      (STOCK_CUT_STATUSES.has(existing.status) ||
        STOCK_KEEP_DEDUCTED_STATUSES.has(existing.status));

    if (needsRehold) {
      const warehouseId = await this.resolveFulfillmentWarehouseId(
        organizationId,
        existing,
        existing.fulfillmentWarehouseId ?? undefined,
      );
      const cutLines = existing.lineItems
        .map((l) => {
          const already = (l as { returnedQuantity?: number }).returnedQuantity ?? 0;
          const qty = Math.max(0, l.quantity - already);
          return {
            productId: l.productId,
            variantId: l.variantId,
            quantity: qty,
            productName: l.productName,
          };
        })
        .filter((l) => l.quantity > 0);

      await this.prisma.$transaction(async (tx) => {
        if (cutLines.length > 0) {
          await this.inventory.applyOrderStockDeltas(tx, organizationId, cutLines, {
            sign: -1,
            orderNumber: existing.orderNumber,
            orderId: existing.id,
            actor: { userId: actor.userId, name: actor.name },
            warehouseId,
          });
        }
        await tx.order.update({
          where: { id: existing.id },
          data: {
            deletedAt: null,
            stockDeductedAt: new Date(),
            stockRestockedOnDelete: false,
            fulfillmentWarehouseId: warehouseId,
            activities: {
              create: {
                organizationId,
                type: 'note',
                label: 'Order restored from recycle bin',
                description: 'Restored and stock re-held for fulfillment status',
                actorUserId: actor.userId ?? null,
                actorName: actor.name ?? null,
              },
            },
          },
        });
      });
      return { ok: true };
    }

    await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        deletedAt: null,
        stockRestockedOnDelete: false,
        activities: {
          create: {
            organizationId,
            type: 'note',
            label: 'Order restored from recycle bin',
            actorUserId: actor.userId ?? null,
            actorName: actor.name ?? null,
          },
        },
      },
    });
    return { ok: true };
  }

  async purgeDeleted(organizationId: string, orderId: string) {
    const existing = await this.prisma.order.findFirst({
      where: { organizationId, id: orderId, deletedAt: { not: null } },
    });
    if (!existing) throw new NotFoundException('Deleted order not found');
    await this.prisma.order.delete({ where: { id: existing.id } });
    return { ok: true };
  }

  async listDeletedForRecycleBin(organizationId: string, search?: string) {
    const rows = await this.prisma.order.findMany({
      where: {
        organizationId,
        deletedAt: { not: null },
        ...(search?.trim()
          ? {
              OR: [
                { orderNumber: { contains: search.trim(), mode: 'insensitive' as const } },
                { customerName: { contains: search.trim(), mode: 'insensitive' as const } },
                { customerPhone: { contains: search.trim(), mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      orderBy: { deletedAt: 'desc' },
      take: 200,
    });
    return rows;
  }

  async update(
    organizationId: string,
    idOrNumber: string,
    input: UpdateOrderInput,
    actor: ActorLabel,
  ): Promise<OrderDetail> {
    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: { lineItems: true, activities: true },
    });
    if (!existing) throw new NotFoundException('Order not found');

    const statusOnly =
      input.status !== undefined &&
      Object.entries(input).every(
        ([key, value]) =>
          key === 'status' ||
          key === 'fulfillmentWarehouseId' ||
          value === undefined,
      );
    if (statusOnly) {
      return this.updateStatus(organizationId, existing.id, input.status, actor, {
        fulfillmentWarehouseId: input.fulfillmentWarehouseId ?? undefined,
      });
    }

    if (input.lineItems !== undefined && input.lineItems.length === 0) {
      throw new BadRequestException('At least one line item is required');
    }

    // Blocklist is re-checked when contact identity changes (not on pure status updates).
    const nextPhone = input.customerPhone?.trim() || existing.customerPhone;
    const nextAlt =
      input.altMobile !== undefined
        ? input.altMobile?.trim() || null
        : existing.altMobile;
    if (
      input.customerPhone !== undefined ||
      input.altMobile !== undefined
    ) {
      await this.securityBlocks.assertNotBlocked(organizationId, {
        phone: nextPhone,
        altMobile: nextAlt,
        ip: (existing as { clientIp?: string | null }).clientIp,
      });
    }

    if (
      (input.attachmentNames !== undefined || input.attachmentUrls !== undefined) &&
      (input.attachmentNames?.length ?? 0) !== (input.attachmentUrls?.length ?? 0)
    ) {
      throw new BadRequestException('attachmentNames and attachmentUrls length must match');
    }

    if (input.source) {
      const options = await this.getFormOptions(organizationId);
      if (!options.sources.some((s) => s.value === input.source)) {
        throw new BadRequestException(`Invalid order source: ${input.source}`);
      }
    }

    let nextFulfillmentWarehouseId: string | null | undefined = undefined;
    if (input.fulfillmentWarehouseId !== undefined) {
      if (
        existing.stockDeductedAt &&
        (input.fulfillmentWarehouseId ?? null) !== existing.fulfillmentWarehouseId
      ) {
        throw new BadRequestException(
          'Cannot change fulfillment warehouse after stock was deducted',
        );
      }
      if (input.fulfillmentWarehouseId === null || input.fulfillmentWarehouseId === '') {
        nextFulfillmentWarehouseId = null;
      } else {
        await this.assertActiveWarehouse(
          organizationId,
          input.fulfillmentWarehouseId.trim(),
        );
        nextFulfillmentWarehouseId = input.fulfillmentWarehouseId.trim();
      }
    }

    let lineRows:
      | Array<{
          productId: string | null;
          variantId: string | null;
          productName: string;
          variationLabel: string | null;
          sku: string | null;
          quantity: number;
          unitPrice: number;
          discount: number;
          lineTotal: number;
        }>
      | undefined;

    if (input.lineItems) {
      lineRows = input.lineItems.map((line) => {
        const qty = Math.max(1, Math.floor(line.quantity));
        const unitPrice = Number(line.unitPrice) || 0;
        const discount = Number(line.discount ?? 0) || 0;
        return {
          productId: line.productId ?? null,
          variantId: line.variantId ?? null,
          productName: line.productName,
          variationLabel: line.variationLabel ?? null,
          sku: line.sku ?? null,
          quantity: qty,
          unitPrice,
          discount,
          lineTotal: Math.max(0, qty * unitPrice - discount),
        };
      });
    }

    const subtotal = lineRows
      ? lineRows.reduce((sum, l) => sum + l.lineTotal, 0)
      : existing.subtotal;
    const discount =
      input.discount !== undefined
        ? Number(input.discount) || 0
        : existing.discount;
    const deliveryCharge =
      input.deliveryCharge !== undefined
        ? Number(input.deliveryCharge) || 0
        : existing.deliveryCharge;
    const amount = Math.max(0, subtotal - discount + deliveryCharge);
    const paidAmount =
      input.paidAmount !== undefined
        ? Number(input.paidAmount) || 0
        : existing.paidAmount;
    const paymentMethod =
      input.paymentMethod !== undefined
        ? input.paymentMethod?.trim() || null
        : existing.paymentMethod;
    const paymentStatus = this.resolvePaymentStatus(
      input.paymentStatus as PaymentStatus | undefined,
      paymentMethod,
      paidAmount,
      amount,
    );

    const shippingArea =
      input.district?.trim() ||
      input.shippingArea?.trim() ||
      existing.shippingArea;
    const nextLinesForFlags = (lineRows ??
      existing.lineItems.map((l) => ({
        productId: l.productId,
        variantId: l.variantId,
        sku: l.sku,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
      }))) as Array<{
      productId: string | null;
      variantId: string | null;
      sku: string | null;
      quantity: number;
      unitPrice: number;
    }>;
    const nextIncentiveFlags =
      lineRows || input.discount !== undefined || input.deliveryCharge !== undefined
        ? this.deriveInboundIncentiveFlags({
            source: existing.source,
            snapshot: (existing as { inboundOriginalSnapshot?: unknown }).inboundOriginalSnapshot,
            nextLines: nextLinesForFlags,
            nextAmount: amount,
          })
        : undefined;

    const activityCreates: Array<{
      organizationId: string;
      type: string;
      label: string;
      description?: string;
      actorUserId: string | null;
      actorName: string | null;
    }> = [];

    if (input.notes !== undefined && input.notes !== (existing.notes ?? '')) {
      activityCreates.push({
        organizationId,
        type: 'note',
        label: 'Note updated',
        description: input.notes?.trim() || undefined,
        actorUserId: actor.userId ?? null,
        actorName: actor.name ?? null,
      });
    }
    if (
      input.assignedAgentName !== undefined &&
      input.assignedAgentName !== (existing.assignedAgentName ?? '')
    ) {
      activityCreates.push({
        organizationId,
        type: 'assigned',
        label: 'Assignee updated',
        description: input.assignedAgentName?.trim() || 'Unassigned',
        actorUserId: actor.userId ?? null,
        actorName: actor.name ?? null,
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      let nextStockDeductedAt: Date | null | undefined = undefined;
      const warehouseForStock =
        nextFulfillmentWarehouseId !== undefined
          ? nextFulfillmentWarehouseId ?? undefined
          : existing.fulfillmentWarehouseId ?? undefined;

      if (lineRows) {
        const stillNeedsStockHeld = STOCK_CUT_STATUSES.has(existing.status);

        if (existing.stockDeductedAt) {
          const restockLines = existing.lineItems
            .map((l) => {
              const already = (l as { returnedQuantity?: number }).returnedQuantity ?? 0;
              const qty = Math.max(0, l.quantity - already);
              return {
                productId: l.productId,
                variantId: l.variantId,
                quantity: qty,
                productName: l.productName,
              };
            })
            .filter((l) => l.quantity > 0);
          if (restockLines.length > 0) {
            await this.inventory.applyOrderStockDeltas(
              tx,
              organizationId,
              restockLines,
              {
                sign: 1,
                orderNumber: existing.orderNumber,
                orderId: existing.id,
                actor: { userId: actor.userId, name: actor.name },
                warehouseId: existing.fulfillmentWarehouseId ?? undefined,
              },
            );
          }
          nextStockDeductedAt = null;
        }

        await tx.orderItem.deleteMany({ where: { orderId: existing.id } });
        await tx.orderItem.createMany({
          data: lineRows.map((l) => ({
            orderId: existing.id,
            organizationId,
            ...l,
          })),
        });

        if (stillNeedsStockHeld) {
          if (!warehouseForStock) {
            throw new BadRequestException(FULFILLMENT_WAREHOUSE_REQUIRED_MSG);
          }
          await this.inventory.applyOrderStockDeltas(
            tx,
            organizationId,
            lineRows.map((l) => ({
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
              productName: l.productName,
            })),
            {
              sign: -1,
              orderNumber: existing.orderNumber,
              orderId: existing.id,
              actor: { userId: actor.userId, name: actor.name },
              warehouseId: warehouseForStock,
            },
          );
          nextStockDeductedAt = new Date();
        }
      }

      const updated = await tx.order.update({
        where: { id: existing.id },
        data: {
          ...(nextStockDeductedAt !== undefined
            ? { stockDeductedAt: nextStockDeductedAt }
            : {}),
          ...(nextFulfillmentWarehouseId !== undefined
            ? { fulfillmentWarehouseId: nextFulfillmentWarehouseId }
            : {}),
          customerName: input.customerName?.trim() ?? undefined,
          customerPhone: input.customerPhone?.trim() ?? undefined,
          customerEmail:
            input.customerEmail !== undefined
              ? input.customerEmail.trim() || null
              : undefined,
          altMobile:
            input.altMobile !== undefined
              ? input.altMobile.trim() || null
              : undefined,
          shippingAddress: input.shippingAddress?.trim() ?? undefined,
          shippingArea: input.district || input.shippingArea ? shippingArea : undefined,
          district:
            input.district !== undefined
              ? input.district.trim() || null
              : undefined,
          source: input.source ?? undefined,
          paymentStatus,
          paymentMethod:
            input.paymentMethod !== undefined ? paymentMethod : undefined,
          deliveryCharge:
            input.deliveryCharge !== undefined ? deliveryCharge : undefined,
          discount: input.discount !== undefined || lineRows ? discount : undefined,
          paidAmount: input.paidAmount !== undefined ? paidAmount : undefined,
          amount: lineRows || input.discount !== undefined || input.deliveryCharge !== undefined
            ? amount
            : undefined,
          subtotal: lineRows ? subtotal : undefined,
          itemsCount: lineRows
            ? lineRows.reduce((sum, l) => sum + l.quantity, 0)
            : undefined,
          notes:
            input.notes !== undefined ? input.notes.trim() || null : undefined,
          customerNote:
            input.customerNote !== undefined
              ? input.customerNote.trim() || null
              : undefined,
          courierNote:
            input.courierNote !== undefined
              ? input.courierNote.trim() || null
              : undefined,
          packingNote:
            input.packingNote !== undefined
              ? input.packingNote.trim() || null
              : undefined,
          referenceNo:
            input.referenceNo !== undefined
              ? input.referenceNo.trim() || null
              : undefined,
          utmSource:
            input.utmSource !== undefined ? input.utmSource.trim() || null : undefined,
          utmId: input.utmId !== undefined ? input.utmId.trim() || null : undefined,
          utmContent:
            input.utmContent !== undefined ? input.utmContent.trim() || null : undefined,
          utmCampaign:
            input.utmCampaign !== undefined
              ? input.utmCampaign.trim() || null
              : undefined,
          courierWeightKg:
            input.courierWeightKg !== undefined
              ? input.courierWeightKg === null
                ? null
                : Math.max(0.1, Number(input.courierWeightKg))
              : undefined,
          courierDeliveryType:
            input.courierDeliveryType !== undefined
              ? input.courierDeliveryType === 'express' ||
                input.courierDeliveryType === 'normal'
                ? input.courierDeliveryType
                : null
              : undefined,
          skipFollowup:
            input.skipFollowup !== undefined ? Boolean(input.skipFollowup) : undefined,
          couponCode:
            input.couponCode !== undefined
              ? input.couponCode.trim() || null
              : undefined,
          customerTag:
            input.customerTag !== undefined
              ? input.customerTag.trim() || null
              : undefined,
          orderTag:
            input.orderTag !== undefined
              ? input.orderTag.trim() || null
              : undefined,
          assignedAgentName:
            input.assignedAgentName !== undefined
              ? input.assignedAgentName.trim() || null
              : undefined,
          assignedUserId:
            input.assignedUserId !== undefined
              ? input.assignedUserId.trim() || null
              : undefined,
          incentiveFlags: nextIncentiveFlags === undefined ? undefined : nextIncentiveFlags,
          pathaoCity:
            input.pathaoCity !== undefined
              ? input.pathaoCity.trim() || null
              : undefined,
          pathaoZone:
            input.pathaoZone !== undefined
              ? input.pathaoZone.trim() || null
              : undefined,
          pathaoArea:
            input.pathaoArea !== undefined
              ? input.pathaoArea.trim() || null
              : undefined,
          pathaoCityId:
            input.pathaoCityId !== undefined
              ? input.pathaoCityId === null
                ? null
                : Math.floor(Number(input.pathaoCityId))
              : undefined,
          pathaoZoneId:
            input.pathaoZoneId !== undefined
              ? input.pathaoZoneId === null
                ? null
                : Math.floor(Number(input.pathaoZoneId))
              : undefined,
          pathaoAreaId:
            input.pathaoAreaId !== undefined
              ? input.pathaoAreaId === null
                ? null
                : Math.floor(Number(input.pathaoAreaId))
              : undefined,
          carrybeeCity:
            input.carrybeeCity !== undefined
              ? input.carrybeeCity.trim() || null
              : undefined,
          carrybeeZone:
            input.carrybeeZone !== undefined
              ? input.carrybeeZone.trim() || null
              : undefined,
          carrybeeArea:
            input.carrybeeArea !== undefined
              ? input.carrybeeArea.trim() || null
              : undefined,
          carrybeeCityId:
            input.carrybeeCityId !== undefined
              ? input.carrybeeCityId === null
                ? null
                : Math.floor(Number(input.carrybeeCityId))
              : undefined,
          carrybeeZoneId:
            input.carrybeeZoneId !== undefined
              ? input.carrybeeZoneId === null
                ? null
                : Math.floor(Number(input.carrybeeZoneId))
              : undefined,
          carrybeeAreaId:
            input.carrybeeAreaId !== undefined
              ? input.carrybeeAreaId === null
                ? null
                : Math.floor(Number(input.carrybeeAreaId))
              : undefined,
          attachmentNames:
            input.attachmentNames !== undefined ? input.attachmentNames : undefined,
          attachmentUrls:
            input.attachmentUrls !== undefined ? input.attachmentUrls : undefined,
          activities:
            activityCreates.length > 0
              ? { create: activityCreates }
              : undefined,
        },
        include: {
          lineItems: { orderBy: { createdAt: 'asc' } },
          activities: { orderBy: { createdAt: 'asc' } },
          fulfillmentWarehouse: { select: { id: true, name: true } },
        },
      });

      // Keep buyer profile in sync so detail-page customer lookup does not
      // overwrite order fields with a stale CRM customer after reload.
      const touchedCustomer =
        input.customerName !== undefined ||
        input.customerPhone !== undefined ||
        input.customerEmail !== undefined ||
        input.altMobile !== undefined ||
        input.shippingAddress !== undefined ||
        input.district !== undefined ||
        input.customerNote !== undefined;
      const nextName = (input.customerName ?? updated.customerName).trim();
      const nextPhone = (input.customerPhone ?? updated.customerPhone).trim();
      if (touchedCustomer && nextName && nextPhone) {
        const customer = await this.customers.ensureFromOrder(
          organizationId,
          {
            name: nextName,
            phone: nextPhone,
            email:
              input.customerEmail !== undefined
                ? input.customerEmail
                : updated.customerEmail,
            altMobile:
              input.altMobile !== undefined ? input.altMobile : updated.altMobile,
            district:
              input.district !== undefined ? input.district : updated.district,
            area: updated.shippingArea,
            address:
              input.shippingAddress !== undefined
                ? input.shippingAddress
                : updated.shippingAddress,
            source: input.source ?? updated.source,
            assignedAgentName:
              input.assignedAgentName !== undefined
                ? input.assignedAgentName
                : updated.assignedAgentName,
            notes:
              input.customerNote !== undefined
                ? input.customerNote
                : updated.customerNote,
          },
          tx,
        );
        if (updated.customerId !== customer.id) {
          await tx.order.update({
            where: { id: updated.id },
            data: { customerId: customer.id },
          });
        }
      }

      return updated;
    });

    if (input.status && input.status !== existing.status) {
      const detail = await this.updateStatus(
        organizationId,
        updated.id,
        input.status,
        actor,
      );
      await this.orderPayments.ensureForOrder(
        organizationId,
        {
          id: updated.id,
          amount: updated.amount,
          paidAmount: updated.paidAmount,
          paymentStatus: updated.paymentStatus,
          paymentMethod: updated.paymentMethod,
        },
        actor,
      );
      return detail;
    }

    await this.orderPayments.ensureForOrder(
      organizationId,
      {
        id: updated.id,
        amount: updated.amount,
        paidAmount: updated.paidAmount,
        paymentStatus: updated.paymentStatus,
        paymentMethod: updated.paymentMethod,
      },
      actor,
    );

    return this.toDetailEnriched(organizationId, updated);
  }

  /**
   * Hold inventory before calling a courier API (industry-standard: reserve → book).
   * Returns true when this call newly held stock (caller must release on abort).
   */
  private async holdStockForCourierBook(
    organizationId: string,
    order: {
      id: string;
      orderNumber: string;
      stockDeductedAt: Date | null;
      fulfillmentWarehouseId: string | null;
      lineItems: Array<{
        productId: string | null;
        variantId: string | null;
        quantity: number;
        productName: string;
      }>;
    },
    actor: ActorLabel,
  ): Promise<boolean> {
    if (order.stockDeductedAt) return false;

    const warehouseId = await this.resolveFulfillmentWarehouseId(
      organizationId,
      order,
    );

    await this.prisma.$transaction(async (tx) => {
      await this.inventory.applyOrderStockDeltas(
        tx,
        organizationId,
        order.lineItems.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
          productName: l.productName,
        })),
        {
          sign: -1,
          orderNumber: order.orderNumber,
          orderId: order.id,
          actor: { userId: actor.userId, name: actor.name },
          warehouseId,
        },
      );
      await tx.order.update({
        where: { id: order.id },
        data: {
          stockDeductedAt: new Date(),
          fulfillmentWarehouseId: warehouseId,
        },
      });
    });
    return true;
  }

  /** Undo a pre-book stock hold when the courier API / CRM persist step fails. */
  private async releaseStockForCourierBook(
    organizationId: string,
    order: {
      id: string;
      orderNumber: string;
      fulfillmentWarehouseId?: string | null;
      lineItems: Array<{
        productId: string | null;
        variantId: string | null;
        quantity: number;
        productName: string;
      }>;
    },
    actor: ActorLabel,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.order.findUnique({
        where: { id: order.id },
        select: { stockDeductedAt: true, fulfillmentWarehouseId: true },
      });
      if (!fresh?.stockDeductedAt) return;

      await this.inventory.applyOrderStockDeltas(
        tx,
        organizationId,
        order.lineItems.map((l) => ({
          productId: l.productId,
          variantId: l.variantId,
          quantity: l.quantity,
          productName: l.productName,
        })),
        {
          sign: 1,
          orderNumber: order.orderNumber,
          orderId: order.id,
          actor: { userId: actor.userId, name: actor.name },
          warehouseId:
            fresh.fulfillmentWarehouseId ??
            order.fulfillmentWarehouseId ??
            undefined,
        },
      );
      await tx.order.update({
        where: { id: order.id },
        data: { stockDeductedAt: null },
      });
    });
  }

  /**
   * If CRM never saved the consignment, best-effort cancel the remote parcel and
   * release any stock we held in this attempt.
   */
  private async compensateFailedCourierBook(
    organizationId: string,
    order: {
      id: string;
      orderNumber: string;
      lineItems: Array<{
        productId: string | null;
        variantId: string | null;
        quantity: number;
        productName: string;
      }>;
    },
    actor: ActorLabel,
    opts: {
      stockHeldNow: boolean;
      provider: 'pathao' | 'carrybee';
      remoteConsignmentId?: string | null;
    },
  ): Promise<void> {
    const fresh = await this.prisma.order.findUnique({
      where: { id: order.id },
      select: { courierConsignmentId: true },
    });
    if (fresh?.courierConsignmentId) return;

    const remoteId = opts.remoteConsignmentId?.trim();
    if (remoteId) {
      try {
        if (opts.provider === 'pathao') {
          await this.pathao.cancelOrder(
            organizationId,
            remoteId,
            'CRM book aborted after courier accept',
          );
        } else {
          await this.carrybee.cancelOrder(
            organizationId,
            remoteId,
            'CRM book aborted after courier accept',
          );
        }
      } catch {
        // Pathao cancel may be Unauthorized on some accounts — stock still released below.
      }
    }

    if (opts.stockHeldNow) {
      try {
        await this.releaseStockForCourierBook(organizationId, order, actor);
      } catch {
        // Do not mask the original book error.
      }
    }
  }

  /** Persist last courier submit failure so list rows can highlight failed attempts. */
  private async recordCourierSubmitFailure(
    orderId: string,
    organizationId: string,
    error: unknown,
    actor?: ActorLabel,
  ): Promise<void> {
    const message = formatCourierBookError(error);
    try {
      const linked = await this.prisma.order.findUnique({
        where: { id: orderId },
        select: { courierConsignmentId: true },
      });
      if (linked?.courierConsignmentId) return;

      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          courierSubmitError: message,
          courierSubmitFailedAt: new Date(),
          activities: {
            create: {
              organizationId,
              type: 'note',
              label: 'Courier submit failed',
              description: message,
              actorUserId: actor?.userId ?? null,
              actorName: actor?.name ?? null,
            },
          },
        },
      });
    } catch (persistError) {
      // Never mask the original book/validation failure with a secondary Prisma error.
      this.logger.warn(
        `recordCourierSubmitFailure skipped for ${orderId}: ${
          persistError instanceof Error ? persistError.message : String(persistError)
        }`,
      );
      // Fallback when client is stale but DB columns exist (post migrate).
      try {
        await this.prisma.$executeRaw`
          UPDATE "Order"
          SET
            "courierSubmitError" = ${message},
            "courierSubmitFailedAt" = ${new Date()}
          WHERE id = ${orderId}
            AND "courierConsignmentId" IS NULL
        `;
      } catch (rawError) {
        this.logger.warn(
          `recordCourierSubmitFailure raw fallback failed for ${orderId}: ${
            rawError instanceof Error ? rawError.message : String(rawError)
          }`,
        );
      }
    }
  }

  /**
   * Book order on Pathao sandbox/live.
   * amount_to_collect = due; success → status in_courier.
   * Flow: hold stock → remote book → persist → in_courier (no post-book stock surprise).
   */
  async bookWithPathao(
    organizationId: string,
    idOrNumber: string,
    actor: ActorLabel,
    routingOverride?: RoutingOverrideInput,
    loadMemo?: Map<string, number>,
  ): Promise<OrderDetail> {
    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!existing) throw new NotFoundException('Order not found');

    let stockHeldNow = false;
    let remoteConsignmentId: string | null = null;
    try {
      if (existing.status === 'cancelled') {
        throw new BadRequestException('Cancelled orders cannot be booked');
      }
      if (existing.courierConsignmentId) {
        throw new BadRequestException(
          `Already booked with ${existing.courierProvider ?? 'courier'} (${existing.courierConsignmentId})`,
        );
      }
      const address = existing.shippingAddress?.trim() ?? '';
      // Pathao accepts address-only booking (city/zone/area optional — API can auto-detect).
      if (address.length < 10) {
        throw new BadRequestException(
          'Add a delivery address (min 10 characters) before booking with Pathao',
        );
      }

      const phoneDigits = existing.customerPhone.replace(/\D/g, '');
      const phone =
        phoneDigits.length === 11
          ? phoneDigits
          : phoneDigits.length === 10
            ? `0${phoneDigits}`
            : phoneDigits.slice(-11);
      if (phone.length !== 11) {
        throw new BadRequestException(
          'Customer phone must be an 11-digit Bangladesh number for Pathao',
        );
      }

      const due = Math.max(0, existing.amount - (existing.paidAmount ?? 0));
      const itemQuantity = Math.max(
        1,
        existing.lineItems.reduce((sum, l) => sum + l.quantity, 0),
      );
      const itemDescription = existing.lineItems
        .map((l) =>
          l.variationLabel ? `${l.productName} (${l.variationLabel})` : l.productName,
        )
        .slice(0, 5)
        .join(', ')
        .slice(0, 200);

      const itemWeightKg = await this.resolveCourierWeightKg(organizationId, existing);
      const deliveryType = this.resolvePathaoDeliveryType(
        (existing as { courierDeliveryType?: string | null }).courierDeliveryType,
      );

      const storeId = await this.pathao.resolveStoreId(organizationId);

      stockHeldNow = await this.holdStockForCourierBook(organizationId, existing, actor);

      const booked = await this.pathao.createOrder(organizationId, {
        storeId,
        merchantOrderId: existing.orderNumber,
        recipientName: existing.customerName.trim().slice(0, 100),
        recipientPhone: phone,
        recipientSecondaryPhone: (() => {
          const alt = existing.altMobile?.replace(/\D/g, '') ?? '';
          const normalized =
            alt.length === 11 ? alt : alt.length === 10 ? `0${alt}` : alt.slice(-11);
          return normalized.length === 11 ? normalized : undefined;
        })(),
        recipientAddress: address.slice(0, 220),
        recipientCity: existing.pathaoCityId ?? undefined,
        recipientZone: existing.pathaoZoneId ?? undefined,
        recipientArea: existing.pathaoAreaId ?? undefined,
        deliveryType,
        specialInstruction: existing.courierNote?.trim() || undefined,
        itemQuantity,
        itemWeight: itemWeightKg,
        itemDescription: itemDescription || existing.orderNumber,
        amountToCollect: due,
      });
      remoteConsignmentId = booked.consignmentId;

      const mapped = await this.courierIntegrations.resolveStatusMapping(
        organizationId,
        'pathao',
        booked.orderStatus || 'pending',
      );
      const logistic = await this.logisticFieldsForBook(
        organizationId,
        existing,
        routingOverride,
        loadMemo,
      );

      await this.prisma.order.update({
        where: { id: existing.id },
        data: {
          courierProvider: 'pathao',
          courierConsignmentId: booked.consignmentId,
          courierTrackingCode: booked.consignmentId,
          courierCollectAmount: due,
          courierBookedAt: new Date(),
          courierStatus: mapped.label,
          courierStatusSlug: mapped.slug,
          courierStatusSyncedAt: new Date(),
          courierSubmitError: null,
          courierSubmitFailedAt: null,
          ...logistic,
          activities: {
            create: {
              organizationId,
              type: 'note',
              label: 'Booked with Pathao',
              description: `Consignment ${booked.consignmentId} · collect ৳${due}`,
              actorUserId: actor.userId ?? null,
              actorName: actor.name ?? null,
            },
          },
        },
      });

      // Stock already held — status move will not cut again.
      return this.updateStatus(organizationId, existing.id, 'in_courier', actor);
    } catch (error) {
      if (!existing.courierConsignmentId) {
        await this.compensateFailedCourierBook(organizationId, existing, actor, {
          stockHeldNow,
          provider: 'pathao',
          remoteConsignmentId,
        });
        // "Already booked" is not a failed submit of an unbooked order.
        if (!isAlreadyBookedCourierError(error)) {
          await this.recordCourierSubmitFailure(
            existing.id,
            organizationId,
            error,
            actor,
          );
        }
      }
      throw error;
    }
  }

  async syncPathaoStatus(
    organizationId: string,
    idOrNumber: string,
  ): Promise<OrderDetail> {
    await this.pathaoSync.syncOrder(organizationId, idOrNumber);
    if (idOrNumber.startsWith('ORD-')) {
      return this.getByOrderNumber(organizationId, idOrNumber);
    }
    try {
      return await this.getById(organizationId, idOrNumber);
    } catch {
      return this.getByOrderNumber(organizationId, idOrNumber);
    }
  }

  /**
   * Book order on Carrybee sandbox/live.
   * collectable_amount = due; success → status in_courier.
   * Flow: hold stock → remote book → persist → in_courier (no post-book stock surprise).
   */
  async bookWithCarrybee(
    organizationId: string,
    idOrNumber: string,
    actor: ActorLabel,
    routingOverride?: RoutingOverrideInput,
    loadMemo?: Map<string, number>,
  ): Promise<OrderDetail> {
    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        activities: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!existing) throw new NotFoundException('Order not found');

    let stockHeldNow = false;
    let remoteConsignmentId: string | null = null;
    try {
      if (existing.status === 'cancelled') {
        throw new BadRequestException('Cancelled orders cannot be booked');
      }
      if (existing.courierConsignmentId) {
        throw new BadRequestException(
          `Already booked with ${existing.courierProvider ?? 'courier'} (${existing.courierConsignmentId})`,
        );
      }
      // Carrybee accepts address-only booking (city/zone optional — API auto-resolves).
      if (!existing.shippingAddress?.trim() || existing.shippingAddress.trim().length < 10) {
        throw new BadRequestException(
          'Shipping address must be at least 10 characters for Carrybee',
        );
      }

      const phoneDigits = existing.customerPhone.replace(/\D/g, '');
      const phone =
        phoneDigits.length === 11
          ? phoneDigits
          : phoneDigits.length === 10
            ? `0${phoneDigits}`
            : phoneDigits.slice(-11);
      if (phone.length !== 11) {
        throw new BadRequestException(
          'Customer phone must be an 11-digit Bangladesh number for Carrybee',
        );
      }

      const due = Math.max(0, existing.amount - (existing.paidAmount ?? 0));
      const itemQuantity = Math.max(
        1,
        existing.lineItems.reduce((sum, l) => sum + l.quantity, 0),
      );
      const itemDescription = existing.lineItems
        .map((l) =>
          l.variationLabel ? `${l.productName} (${l.variationLabel})` : l.productName,
        )
        .slice(0, 5)
        .join(', ')
        .slice(0, 200);

      const itemWeightKg = await this.resolveCourierWeightKg(organizationId, existing);
      const itemWeightGrams = Math.max(1, Math.round(itemWeightKg * 1000));
      const deliveryType = this.resolveCarrybeeDeliveryType(
        (existing as { courierDeliveryType?: string | null }).courierDeliveryType,
      );

      const storeId = await this.carrybee.assertStoreReady(organizationId);

      stockHeldNow = await this.holdStockForCourierBook(organizationId, existing, actor);

      const booked = await this.carrybee.createOrder(organizationId, {
        storeId,
        merchantOrderId: existing.orderNumber,
        recipientName: existing.customerName.trim().slice(0, 99),
        recipientPhone: phone,
        recipientSecondaryPhone: (() => {
          const alt = existing.altMobile?.replace(/\D/g, '') ?? '';
          const normalized =
            alt.length === 11 ? alt : alt.length === 10 ? `0${alt}` : alt.slice(-11);
          return normalized.length === 11 ? normalized : undefined;
        })(),
        recipientAddress: existing.shippingAddress.trim().slice(0, 200),
        cityId: existing.carrybeeCityId ?? undefined,
        zoneId: existing.carrybeeZoneId ?? undefined,
        areaId: existing.carrybeeAreaId ?? undefined,
        deliveryType,
        specialInstruction: existing.courierNote?.trim() || undefined,
        itemQuantity,
        itemWeight: itemWeightGrams,
        productDescription: itemDescription || existing.orderNumber,
        collectableAmount: due,
      });
      remoteConsignmentId = booked.consignmentId;

      const mapped = await this.courierIntegrations.resolveStatusMapping(
        organizationId,
        'carrybee',
        'created',
      );
      const logistic = await this.logisticFieldsForBook(
        organizationId,
        existing,
        routingOverride,
        loadMemo,
      );

      await this.prisma.order.update({
        where: { id: existing.id },
        data: {
          courierProvider: 'carrybee',
          courierConsignmentId: booked.consignmentId,
          courierTrackingCode: booked.consignmentId,
          courierCollectAmount: due,
          courierBookedAt: new Date(),
          courierStatus: mapped.label,
          courierStatusSlug: mapped.slug,
          courierStatusSyncedAt: new Date(),
          courierSubmitError: null,
          courierSubmitFailedAt: null,
          ...logistic,
          activities: {
            create: {
              organizationId,
              type: 'note',
              label: 'Booked with Carrybee',
              description: `Consignment ${booked.consignmentId} · collect ৳${due}`,
              actorUserId: actor.userId ?? null,
              actorName: actor.name ?? null,
            },
          },
        },
      });

      // Stock already held — status move will not cut again.
      return this.updateStatus(organizationId, existing.id, 'in_courier', actor);
    } catch (error) {
      if (!existing.courierConsignmentId) {
        await this.compensateFailedCourierBook(organizationId, existing, actor, {
          stockHeldNow,
          provider: 'carrybee',
          remoteConsignmentId,
        });
        if (!isAlreadyBookedCourierError(error)) {
          await this.recordCourierSubmitFailure(
            existing.id,
            organizationId,
            error,
            actor,
          );
        }
      }
      throw error;
    }
  }

  /**
   * Cancel remote Pathao/Carrybee consignment and clear local courier link.
   * Does not cancel the CRM order — use Cancel order for that.
   * If status is in_courier, moves back to confirmed so the order can be rebooked.
   */
  async cancelCourierShipment(
    organizationId: string,
    idOrNumber: string,
    actor: ActorLabel,
    reason = 'Cancelled from CRM',
  ): Promise<OrderDetail> {
    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
    });
    if (!existing) throw new NotFoundException('Order not found');
    if (!existing.courierConsignmentId || !existing.courierProvider) {
      throw new BadRequestException('No courier booking to cancel on this order');
    }

    const remote = await this.cancelRemoteCourierOrThrow(organizationId, existing, {
      reason,
    });

    await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        ...this.courierClearFields(),
        activities: {
          create: {
            organizationId,
            type: 'note',
            label: 'Courier cancelled',
            description: remote.consignmentId
              ? `Cancelled ${remote.provider} consignment ${remote.consignmentId}`
              : 'Courier consignment cancelled',
            actorUserId: actor.userId ?? null,
            actorName: actor.name ?? null,
          },
        },
      },
    });

    if (existing.status === 'in_courier') {
      return this.updateStatus(organizationId, existing.id, 'confirmed', actor);
    }
    return this.getById(organizationId, existing.id);
  }

  /**
   * Clear local courier fields. Tries remote cancel first; force-clear only when
   * confirmRemoteCancelled is true (parcel already cancelled in courier panel).
   */
  async unlinkCourierShipment(
    organizationId: string,
    idOrNumber: string,
    actor: ActorLabel,
    opts?: { confirmRemoteCancelled?: boolean },
  ): Promise<OrderDetail> {
    const existing = await this.prisma.order.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        OR: [{ id: idOrNumber }, { orderNumber: idOrNumber }],
      },
    });
    if (!existing) throw new NotFoundException('Order not found');
    const hadLink = Boolean(
      existing.courierProvider ||
        existing.courierConsignmentId ||
        existing.courierTrackingCode,
    );
    if (!hadLink) {
      throw new BadRequestException('No courier link to unlink on this order');
    }

    const prev = [
      existing.courierProvider,
      existing.courierConsignmentId ?? existing.courierTrackingCode,
    ]
      .filter(Boolean)
      .join(' · ');

    let clearedAfterRemoteCancel = false;
    if (existing.courierConsignmentId && existing.courierProvider) {
      try {
        await this.cancelRemoteCourierOrThrow(organizationId, existing, {
          reason: 'Unlinked from CRM',
        });
        clearedAfterRemoteCancel = true;
      } catch (error) {
        if (!opts?.confirmRemoteCancelled) {
          const msg = error instanceof Error ? error.message : String(error);
          throw new BadRequestException(
            `${msg} Use Cancel Courier to cancel the real shipment, or confirm the parcel is already cancelled in the courier panel to force-unlink.`,
          );
        }
      }
    } else if (!opts?.confirmRemoteCancelled) {
      throw new BadRequestException(
        'Confirm the parcel is already cancelled in the courier panel before force-unlinking a local-only link.',
      );
    }

    await this.prisma.order.update({
      where: { id: existing.id },
      data: {
        ...this.courierClearFields(),
        activities: {
          create: {
            organizationId,
            type: 'note',
            label: clearedAfterRemoteCancel
              ? 'Courier cancelled and unlinked'
              : 'Courier force-unlinked',
            description: clearedAfterRemoteCancel
              ? prev
                ? `Cancelled remotely then cleared local link (${prev}).`
                : 'Cancelled remotely then cleared local courier link.'
              : prev
                ? `Force-cleared local link (${prev}). Remote cancel was skipped/failed — confirm parcel status in courier panel.`
                : 'Force-cleared local courier link. Confirm parcel status in courier panel.',
            actorUserId: actor.userId ?? null,
            actorName: actor.name ?? null,
          },
        },
      },
    });

    if (existing.status === 'in_courier' && clearedAfterRemoteCancel) {
      return this.updateStatus(organizationId, existing.id, 'confirmed', actor);
    }
    return this.getById(organizationId, existing.id);
  }

  private courierClearFields() {
    return {
      courierProvider: null as null,
      courierConsignmentId: null as null,
      courierTrackingCode: null as null,
      courierCollectAmount: null as null,
      courierBookedAt: null as null,
      courierStatus: null as null,
      courierStatusSlug: null as null,
      courierStatusSyncedAt: null as null,
      courierSubmitError: null as null,
      courierSubmitFailedAt: null as null,
    };
  }

  /** Pathao: 48 = Normal, 12 = On Demand / Express. */
  private resolvePathaoDeliveryType(value?: string | null): number {
    return value === 'express' ? 12 : 48;
  }

  /** Carrybee: 1 = Normal, 2 = Express (when supported). */
  private resolveCarrybeeDeliveryType(value?: string | null): number {
    return value === 'express' ? 2 : 1;
  }

  /**
   * Package weight in kg: order override → sum(variant.weightKg × qty) → 0.5 minimum.
   */
  private async resolveCourierWeightKg(
    organizationId: string,
    order: {
      courierWeightKg?: number | null;
      lineItems: Array<{ variantId?: string | null; quantity: number }>;
    },
  ): Promise<number> {
    const override = order.courierWeightKg;
    if (override != null && Number(override) > 0) {
      return Math.max(0.5, Number(override));
    }

    const variantIds = [
      ...new Set(
        order.lineItems
          .map((l) => l.variantId?.trim())
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    if (!variantIds.length) return 0.5;

    const variants = await this.prisma.productVariant.findMany({
      where: { organizationId, id: { in: variantIds } },
      select: { id: true, weightKg: true },
    });
    const weightById = new Map(
      variants.map((v) => [
        v.id,
        Number((v as { weightKg?: number }).weightKg ?? 0.5) || 0.5,
      ]),
    );

    let total = 0;
    let matched = false;
    for (const line of order.lineItems) {
      const id = line.variantId?.trim();
      if (!id) continue;
      const unit = weightById.get(id);
      if (unit == null) continue;
      total += unit * Math.max(1, line.quantity);
      matched = true;
    }

    return Math.max(0.5, matched ? total : 0.5);
  }

  private isRemoteCourierAlreadyGone(message: string): boolean {
    return /already\s*cancel|not\s*found|does\s*not\s*exist|no longer|already\s*been\s*cancel/i.test(
      message,
    );
  }

  private isRemoteCourierCancelledStatus(status: string, slug?: string): boolean {
    return isPathaoCancelledStatus(status, slug);
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Pathao status can lag a second or two after cancel — poll briefly before failing.
   */
  private async waitForPathaoCancelled(
    organizationId: string,
    consignmentId: string,
  ): Promise<{ orderStatus: string; orderStatusSlug?: string }> {
    const delaysMs = [0, 700, 1500, 2500];
    let last: { orderStatus: string; orderStatusSlug?: string } | null = null;
    for (const delay of delaysMs) {
      if (delay > 0) await this.sleep(delay);
      last = await this.pathao.getOrderInfo(organizationId, consignmentId);
      if (this.isRemoteCourierCancelledStatus(last.orderStatus, last.orderStatusSlug)) {
        return last;
      }
    }
    throw new BadRequestException(
      `Pathao still shows “${last?.orderStatus || last?.orderStatusSlug || 'active'}” for ${consignmentId}. Cancel it in the Pathao panel, then use Unlink if needed.`,
    );
  }

  private async cancelRemoteCourierOrThrow(
    organizationId: string,
    order: {
      courierProvider?: string | null;
      courierConsignmentId?: string | null;
    },
    opts: { reason: string },
  ): Promise<{ provider: string; consignmentId: string }> {
    const consignmentId = order.courierConsignmentId?.trim() ?? '';
    const provider = (order.courierProvider ?? '').trim().toLowerCase();
    if (!consignmentId || !provider) {
      throw new BadRequestException('No courier booking to cancel');
    }

    try {
      if (provider === 'pathao') {
        try {
          await this.pathao.cancelOrder(organizationId, consignmentId, opts.reason);
        } catch (cancelErr) {
          const cancelMsg =
            cancelErr instanceof Error ? cancelErr.message : String(cancelErr);
          // Some Pathao apps return Unauthorized on cancel but the parcel may
          // already be cancelled in the merchant panel — verify before failing.
          if (/unauthorized/i.test(cancelMsg)) {
            try {
              await this.waitForPathaoCancelled(organizationId, consignmentId);
              return { provider, consignmentId };
            } catch {
              throw new BadRequestException(
                `Pathao cancel API Unauthorized for ${consignmentId}. If the parcel is already cancelled in the Pathao panel, use Unlink. Otherwise ask Pathao to enable cancel on your developer app.`,
              );
            }
          }
          throw cancelErr;
        }
        await this.waitForPathaoCancelled(organizationId, consignmentId);
      } else if (provider === 'carrybee') {
        await this.carrybee.cancelOrder(organizationId, consignmentId, opts.reason);
        try {
          const details = await this.carrybee.getOrderDetails(
            organizationId,
            consignmentId,
          );
          if (
            details.transferStatus &&
            !this.isRemoteCourierCancelledStatus(details.transferStatus)
          ) {
            throw new BadRequestException(
              `Carrybee still shows “${details.transferStatus}” for ${consignmentId}. Cancel it in the Carrybee panel, then use Unlink if needed.`,
            );
          }
        } catch (e) {
          if (e instanceof BadRequestException) throw e;
          // Some Carrybee accounts omit status on cancel — accept API success.
        }
      } else {
        throw new BadRequestException(
          `Cannot cancel unsupported courier provider: ${provider}`,
        );
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!this.isRemoteCourierAlreadyGone(msg)) {
        throw new BadRequestException(
          `Courier cancel failed (${provider} ${consignmentId}): ${msg}. Cancel it in the courier panel, or use Courier Unlink only if it is already cancelled there.`,
        );
      }
    }

    return { provider, consignmentId };
  }

  async syncCarrybeeStatus(
    organizationId: string,
    idOrNumber: string,
  ): Promise<OrderDetail> {
    await this.carrybeeSync.syncOrder(organizationId, idOrNumber);
    if (idOrNumber.startsWith('ORD-')) {
      return this.getByOrderNumber(organizationId, idOrNumber);
    }
    try {
      return await this.getById(organizationId, idOrNumber);
    } catch {
      return this.getByOrderNumber(organizationId, idOrNumber);
    }
  }

  private resolvePaymentStatus(
    explicit: PaymentStatus | undefined,
    paymentMethod: string | null,
    paidAmount: number,
    amount: number,
  ): PaymentStatus {
    if (explicit) return explicit;
    if (paymentMethod === 'paid' || (amount > 0 && paidAmount >= amount)) return 'paid';
    if (paidAmount > 0) return 'partial';
    return 'cod';
  }

  private async nextOrderNumber(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ORD-${year}-`;
    const latest = await this.prisma.order.findFirst({
      where: { organizationId, orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    let seq = 1;
    if (latest?.orderNumber) {
      const part = latest.orderNumber.slice(prefix.length);
      const n = Number(part);
      if (Number.isFinite(n)) seq = n + 1;
    }
    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  private async loadShopCourierByPhones(
    organizationId: string,
    phones: string[],
  ): Promise<Map<string, CourierShopStats>> {
    const result = new Map<string, CourierShopStats>();
    if (phones.length === 0) return result;

    const normalizedToRaw = new Map<string, string[]>();
    for (const phone of phones) {
      const key = normalizeBdPhone(phone);
      if (!key) continue;
      const list = normalizedToRaw.get(key) ?? [];
      list.push(phone);
      normalizedToRaw.set(key, list);
    }
    const keys = [...normalizedToRaw.keys()];
    if (keys.length === 0) return result;

    const customers = await this.prisma.customer.findMany({
      where: { organizationId, phoneNormalized: { in: keys } },
      select: { phoneNormalized: true, orderCount: true, deliveredCount: true },
    });

    for (const c of customers) {
      const shop = { to: c.orderCount, co: c.deliveredCount };
      for (const raw of normalizedToRaw.get(c.phoneNormalized) ?? []) {
        result.set(raw, shop);
      }
    }

    const missing = phones.filter((p) => !result.has(p));
    if (missing.length === 0) return result;

    const orders = await this.prisma.order.findMany({
      where: {
        organizationId,
        customerPhone: { in: missing },
        deletedAt: null,
      },
      select: { customerPhone: true, status: true },
    });

    const agg = new Map<string, CourierShopStats>();
    for (const o of orders) {
      const cur = agg.get(o.customerPhone) ?? { to: 0, co: 0 };
      cur.to += 1;
      if (o.status === 'delivered' || o.status === 'completed') cur.co += 1;
      agg.set(o.customerPhone, cur);
    }
    for (const [phone, stats] of agg) {
      result.set(phone, stats);
    }

    for (const phone of missing) {
      if (!result.has(phone)) result.set(phone, { to: 0, co: 0 });
    }

    return result;
  }

  private async assertActiveWarehouse(
    organizationId: string,
    warehouseId: string,
  ): Promise<{ id: string; name: string }> {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: warehouseId, organizationId, isActive: true },
      select: { id: true, name: true },
    });
    if (!warehouse) {
      throw new BadRequestException('Select a valid fulfillment warehouse');
    }
    return warehouse;
  }

  /**
   * Resolves warehouse for stock cut. Optional override is persisted when stock
   * has not been deducted yet. After deduction, warehouse is locked.
   */
  private async resolveFulfillmentWarehouseId(
    organizationId: string,
    order: {
      id: string;
      fulfillmentWarehouseId: string | null;
      stockDeductedAt: Date | null;
    },
    override?: string | null,
  ): Promise<string> {
    const trimmedOverride = override?.trim() || undefined;
    if (order.stockDeductedAt) {
      if (
        trimmedOverride &&
        order.fulfillmentWarehouseId &&
        trimmedOverride !== order.fulfillmentWarehouseId
      ) {
        throw new BadRequestException(
          'Cannot change fulfillment warehouse after stock was deducted',
        );
      }
      if (!order.fulfillmentWarehouseId) {
        throw new BadRequestException(FULFILLMENT_WAREHOUSE_REQUIRED_MSG);
      }
      return order.fulfillmentWarehouseId;
    }

    const warehouseId = trimmedOverride || order.fulfillmentWarehouseId || undefined;
    if (!warehouseId) {
      throw new BadRequestException(FULFILLMENT_WAREHOUSE_REQUIRED_MSG);
    }
    await this.assertActiveWarehouse(organizationId, warehouseId);
    return warehouseId;
  }

  private toListItem(
    row: {
      id: string;
      orderNumber: string;
      status: string;
      customerName: string;
      customerPhone: string;
      source: string;
      itemsCount: number;
      amount: number;
      paymentStatus: string;
      assignedAgentName: string | null;
      shippingArea: string;
      createdAt: Date;
      updatedAt: Date;
      courierBookedAt?: Date | null;
      shippingAddress?: string | null;
      subtotal?: number;
      discount?: number;
      paidAmount?: number;
      notes?: string | null;
      lineItems?: Array<{
        productId?: string | null;
        productName: string;
        variationLabel?: string | null;
        sku: string | null;
        quantity: number;
        unitPrice: number;
        lineTotal: number;
      }>;
    },
    imageByProductId?: Map<string, string | undefined>,
    courier?: OrderCourierStats,
    dates?: {
      followUpDueAt?: string;
      followUpSetAt?: string;
    },
    courierShop?: CourierShopStats,
  ): OrderListItem {
    return {
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status as OrderStatusType,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      source: row.source as OrderSource,
      itemsCount: row.itemsCount,
      amount: row.amount,
      paymentStatus: row.paymentStatus as PaymentStatus,
      assignedAgentName: row.assignedAgentName ?? undefined,
      assignedUserId:
        (row as { assignedUserId?: string | null }).assignedUserId ?? undefined,
      logisticAssignedUserId:
        (row as { logisticAssignedUserId?: string | null }).logisticAssignedUserId ?? undefined,
      logisticAssignedAgentName:
        (row as { logisticAssignedAgentName?: string | null }).logisticAssignedAgentName ??
        undefined,
      shippingArea: row.shippingArea,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      followUpDueAt: dates?.followUpDueAt,
      followUpSetAt: dates?.followUpSetAt,
      courierBookedAt: row.courierBookedAt
        ? row.courierBookedAt.toISOString()
        : undefined,
      products: (row.lineItems ?? []).map((l) => ({
        name: l.productName,
        variationLabel: l.variationLabel ?? undefined,
        sku: l.sku ?? undefined,
        quantity: l.quantity,
        price: l.unitPrice,
        imageUrl:
          (l.productId && imageByProductId?.get(l.productId)) || undefined,
      })),
      shippingAddress: row.shippingAddress ?? row.shippingArea,
      subtotal: row.subtotal ?? row.amount,
      discount: row.discount ?? 0,
      paidAmount: row.paidAmount ?? 0,
      hasNote: Boolean(row.notes?.trim()),
      lastNotePreview: row.notes?.trim() || undefined,
      courierProvider:
        (row as { courierProvider?: string | null }).courierProvider ?? undefined,
      courierStatus: (row as { courierStatus?: string | null }).courierStatus ?? undefined,
      courierStatusSlug:
        (row as { courierStatusSlug?: string | null }).courierStatusSlug ?? undefined,
      courierConsignmentId:
        (row as { courierConsignmentId?: string | null }).courierConsignmentId ?? undefined,
      courierSubmitFailed: Boolean(
        (row as { courierSubmitFailedAt?: Date | null }).courierSubmitFailedAt ||
          (row as { courierSubmitError?: string | null }).courierSubmitError?.trim(),
      ),
      courierSubmitError:
        (row as { courierSubmitError?: string | null }).courierSubmitError?.trim() || undefined,
      fulfillmentWarehouseId:
        (row as { fulfillmentWarehouseId?: string | null }).fulfillmentWarehouseId ??
        (row as { fulfillmentWarehouse?: { id: string } | null }).fulfillmentWarehouse?.id ??
        undefined,
      fulfillmentWarehouseName:
        (row as { fulfillmentWarehouse?: { name: string } | null }).fulfillmentWarehouse
          ?.name ?? undefined,
      stockDeducted: Boolean(
        (row as { stockDeductedAt?: Date | null }).stockDeductedAt,
      ),
      courierShop: courierShop ?? { to: 0, co: 0 },
      courier: courier ?? {
        to: 0,
        co: 0,
        su: 0,
        fa: 0,
        label: '—',
        percent: 0,
      },
    };
  }

  private toDetail(
    row: {
    id: string;
    orderNumber: string;
    status: string;
    customerName: string;
    customerPhone: string;
    customerEmail: string | null;
    altMobile?: string | null;
    source: string;
    itemsCount: number;
    subtotal: number;
    discount: number;
    deliveryCharge: number;
    amount: number;
    paidAmount?: number;
    paymentStatus: string;
    paymentMethod?: string | null;
    assignedAgentName: string | null;
    shippingArea: string;
    shippingAddress: string | null;
    district?: string | null;
    notes: string | null;
    customerNote?: string | null;
    courierNote?: string | null;
    packingNote?: string | null;
    referenceNo?: string | null;
    skipFollowup?: boolean;
    couponCode?: string | null;
    customerTag?: string | null;
    orderTag?: string | null;
    pathaoCity?: string | null;
    pathaoZone?: string | null;
    pathaoArea?: string | null;
    pathaoCityId?: number | null;
    pathaoZoneId?: number | null;
    pathaoAreaId?: number | null;
    carrybeeCity?: string | null;
    carrybeeZone?: string | null;
    carrybeeArea?: string | null;
    carrybeeCityId?: number | null;
    carrybeeZoneId?: number | null;
    carrybeeAreaId?: number | null;
    courierProvider?: string | null;
    courierConsignmentId?: string | null;
    courierTrackingCode?: string | null;
    courierCollectAmount?: number | null;
    courierBookedAt?: Date | null;
    courierStatus?: string | null;
    courierStatusSlug?: string | null;
    courierStatusSyncedAt?: Date | null;
    attachmentNames?: string[];
    attachmentUrls?: string[];
    stockDeductedAt?: Date | null;
    leadId: string | null;
    createdAt: Date;
    updatedAt: Date;
    lineItems: Array<{
      id: string;
      productId?: string | null;
      variantId?: string | null;
      productName: string;
      variationLabel?: string | null;
      sku: string | null;
      quantity: number;
      unitPrice: number;
      discount?: number;
      lineTotal: number;
    }>;
    activities: Array<{
      id: string;
      type: string;
      label: string;
      description: string | null;
      actorName: string | null;
      createdAt: Date;
    }>;
  },
    imageByProductId?: Map<string, string | undefined>,
  ): OrderDetail {
    const names = row.attachmentNames ?? [];
    const urls = row.attachmentUrls ?? [];
    const attachments = urls.map((url, index) => ({
      id: `att-${row.id}-${index}`,
      url,
      name: names[index] || url.split('/').pop() || `Attachment ${index + 1}`,
    }));

    return {
      ...this.toListItem(row),
      customerEmail: row.customerEmail ?? undefined,
      shippingAddress: row.shippingAddress ?? '',
      deliveryCharge: row.deliveryCharge,
      discount: row.discount,
      subtotal: row.subtotal,
      notes: row.notes ?? undefined,
      leadId: row.leadId ?? undefined,
      altMobile: row.altMobile ?? undefined,
      district: row.district ?? undefined,
      paymentMethod: row.paymentMethod ?? undefined,
      paidAmount: row.paidAmount ?? 0,
      couponCode: row.couponCode ?? undefined,
      referenceNo: row.referenceNo ?? undefined,
      skipFollowup: row.skipFollowup ?? false,
      customerNote: row.customerNote ?? undefined,
      courierNote: row.courierNote ?? undefined,
      packingNote: row.packingNote ?? undefined,
      customerTag: row.customerTag ?? undefined,
      orderTag: row.orderTag ?? undefined,
      utmSource: (row as { utmSource?: string | null }).utmSource ?? undefined,
      utmId: (row as { utmId?: string | null }).utmId ?? undefined,
      utmContent: (row as { utmContent?: string | null }).utmContent ?? undefined,
      utmCampaign: (row as { utmCampaign?: string | null }).utmCampaign ?? undefined,
      courierWeightKg: (row as { courierWeightKg?: number | null }).courierWeightKg ?? undefined,
      courierDeliveryType: (() => {
        const v = (row as { courierDeliveryType?: string | null }).courierDeliveryType;
        return v === 'express' || v === 'normal' ? v : undefined;
      })(),
      pathaoCity: row.pathaoCity ?? undefined,
      pathaoZone: row.pathaoZone ?? undefined,
      pathaoArea: row.pathaoArea ?? undefined,
      pathaoCityId: row.pathaoCityId ?? undefined,
      pathaoZoneId: row.pathaoZoneId ?? undefined,
      pathaoAreaId: row.pathaoAreaId ?? undefined,
      carrybeeCity: row.carrybeeCity ?? undefined,
      carrybeeZone: row.carrybeeZone ?? undefined,
      carrybeeArea: row.carrybeeArea ?? undefined,
      carrybeeCityId: row.carrybeeCityId ?? undefined,
      carrybeeZoneId: row.carrybeeZoneId ?? undefined,
      carrybeeAreaId: row.carrybeeAreaId ?? undefined,
      courierProvider: row.courierProvider ?? undefined,
      courierConsignmentId: row.courierConsignmentId ?? undefined,
      courierTrackingCode: row.courierTrackingCode ?? undefined,
      courierCollectAmount: row.courierCollectAmount ?? undefined,
      courierBookedAt: row.courierBookedAt?.toISOString(),
      courierStatus: row.courierStatus ?? undefined,
      courierStatusSlug: row.courierStatusSlug ?? undefined,
      courierStatusSyncedAt: row.courierStatusSyncedAt?.toISOString(),
      courierSubmitFailed: Boolean(
        (row as { courierSubmitFailedAt?: Date | null }).courierSubmitFailedAt ||
          (row as { courierSubmitError?: string | null }).courierSubmitError?.trim(),
      ),
      courierSubmitError:
        (row as { courierSubmitError?: string | null }).courierSubmitError?.trim() || undefined,
      attachments: attachments.length > 0 ? attachments : undefined,
      stockDeducted: Boolean(row.stockDeductedAt),
      clientIp: (row as { clientIp?: string | null }).clientIp?.trim() || undefined,
      assignedUserId:
        (row as { assignedUserId?: string | null }).assignedUserId?.trim() ||
        undefined,
      orderCreditUserId:
        (row as { orderCreditUserId?: string | null }).orderCreditUserId?.trim() || undefined,
      orderCreditAgentName:
        (row as { orderCreditAgentName?: string | null }).orderCreditAgentName?.trim() ||
        undefined,
      orderCreditedAt:
        (row as { orderCreditedAt?: Date | null }).orderCreditedAt?.toISOString() || undefined,
      incentiveFlags: (() => {
        const raw = (row as { incentiveFlags?: unknown }).incentiveFlags as
          | { crossSell?: boolean; upsell?: boolean }
          | null
          | undefined;
        if (!raw) return undefined;
        return {
          crossSell: Boolean(raw.crossSell),
          upsell: Boolean(raw.upsell),
        };
      })(),
      lineItems: row.lineItems.map((l) => ({
        id: l.id,
        productName: l.productName,
        sku: l.sku ?? undefined,
        quantity: l.quantity,
        returnedQuantity: (l as { returnedQuantity?: number }).returnedQuantity ?? 0,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
        productId: l.productId ?? undefined,
        variantId: l.variantId ?? undefined,
        variationLabel: l.variationLabel ?? undefined,
        discount: l.discount ?? undefined,
        imageUrl:
          (l.productId && imageByProductId?.get(l.productId)) || undefined,
      })),
      timeline: row.activities.map((a) => ({
        id: a.id,
        type: this.mapTimelineType(a.type),
        label: a.label,
        description: a.description ?? undefined,
        timestamp: a.createdAt.toISOString(),
        actorName: a.actorName ?? undefined,
      })),
    };
  }

  private async toDetailEnriched(
    organizationId: string,
    row: Parameters<OrdersService['toDetail']>[0],
  ): Promise<OrderDetail> {
    const productIds = [
      ...new Set(
        row.lineItems
          .map((l) => l.productId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const productImages =
      productIds.length > 0
        ? await this.prisma.product.findMany({
            where: { organizationId, id: { in: productIds } },
            select: { id: true, imageUrl: true },
          })
        : [];
    const imageByProductId = new Map(
      productImages.map((p) => [p.id, p.imageUrl ?? undefined]),
    );

    const [followup, followUpActivity] = await Promise.all([
      this.prisma.followup.findFirst({
        where: { organizationId, orderId: row.id },
        select: { scheduleDate: true },
        orderBy: { scheduleDate: 'desc' },
      }),
      this.prisma.orderActivity.findFirst({
        where: {
          organizationId,
          orderId: row.id,
          label: 'Follow-up scheduled',
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);

    const detail = this.toDetail(row, imageByProductId);
    return {
      ...detail,
      followUpDueAt: followup?.scheduleDate
        ? followup.scheduleDate.toISOString()
        : detail.followUpDueAt,
      followUpSetAt: followUpActivity?.createdAt
        ? followUpActivity.createdAt.toISOString()
        : detail.followUpSetAt,
    };
  }

  private mapTimelineType(
    type: string,
  ): 'created' | 'confirmed' | 'hold' | 'cancelled' | 'delivered' | 'note' | 'assigned' {
    if (
      type === 'created' ||
      type === 'confirmed' ||
      type === 'hold' ||
      type === 'cancelled' ||
      type === 'delivered' ||
      type === 'note' ||
      type === 'assigned'
    ) {
      return type;
    }
    return 'note';
  }
}

function resolveCreatedAtFilter(
  dateRange?: string,
  dateFrom?: string,
  dateTo?: string,
): { gte?: Date; lte?: Date } | undefined {
  // Explicit ISO bounds win (custom + pinned presets from client)
  if (dateFrom?.trim() || dateTo?.trim()) {
    const filter: { gte?: Date; lte?: Date } = {};
    if (dateFrom?.trim()) {
      const gte = new Date(dateFrom.trim());
      if (!Number.isNaN(gte.getTime())) {
        gte.setHours(0, 0, 0, 0);
        filter.gte = gte;
      }
    }
    if (dateTo?.trim()) {
      const lte = new Date(dateTo.trim());
      if (!Number.isNaN(lte.getTime())) {
        lte.setHours(23, 59, 59, 999);
        filter.lte = lte;
      }
    }
    if (filter.gte || filter.lte) return filter;
  }

  if (!dateRange || dateRange === 'all_time') return undefined;

  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  switch (dateRange) {
    case 'today':
      return { gte: startOfDay(now), lte: endOfDay(now) };
    case 'yesterday': {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { gte: startOfDay(y), lte: endOfDay(y) };
    }
    case 'last_7': {
      const gte = startOfDay(now);
      gte.setDate(gte.getDate() - 6);
      return { gte, lte: endOfDay(now) };
    }
    case 'last_30': {
      const gte = startOfDay(now);
      gte.setDate(gte.getDate() - 29);
      return { gte, lte: endOfDay(now) };
    }
    case 'this_month':
      return { gte: new Date(now.getFullYear(), now.getMonth(), 1), lte: endOfDay(now) };
    case 'last_month': {
      const gte = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lte = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { gte, lte };
    }
    case 'this_year':
      return { gte: new Date(now.getFullYear(), 0, 1), lte: endOfDay(now) };
    case 'last_year':
      return {
        gte: new Date(now.getFullYear() - 1, 0, 1),
        lte: new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999),
      };
    case 'custom':
      return undefined;
    default:
      return undefined;
  }
}

function resolveOrderListSort(
  sortBy?: string,
  sortDir?: 'asc' | 'desc',
): Record<string, 'asc' | 'desc'> {
  const dir = sortDir === 'asc' ? 'asc' : 'desc';
  const allowed = new Set([
    'createdAt',
    'updatedAt',
    'amount',
    'orderNumber',
    'customerName',
    'status',
    'paymentStatus',
  ]);
  if (sortBy && allowed.has(sortBy)) {
    return { [sortBy]: dir };
  }
  return { createdAt: 'desc' };
}
