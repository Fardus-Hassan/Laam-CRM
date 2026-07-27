import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type {
  BulkActionId,
  OrderStatusConfig,
  OrderStatusDisplayMode,
  OrderWorkflowGroup,
  UpsertOrderStatusConfigPayload,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';

type SeedStatus = Omit<OrderStatusConfig, 'id'>;

const DEFAULT_BULK: BulkActionId[] = [
  'print_selected',
  'print_barcode',
  'print_info',
  'export',
  'send_sms',
  'set_followup',
  'transfer',
  'courier_unlink',
];

const PENDING_BULK: BulkActionId[] = [
  ...DEFAULT_BULK,
  'status_change',
  'update_courier_status',
];

const CONFIRMED_BULK: BulkActionId[] = [
  ...PENDING_BULK,
  'submit_pathao',
  'submit_steadfast',
  'submit_carrybee',
];

/** Matches web seed defaults — first-time org bootstrap only. */
const DEFAULT_ORG_ORDER_STATUSES: SeedStatus[] = [
  {
    slug: 'pending',
    label: 'Pending',
    labelBn: 'পেন্ডিং',
    color: 'hsl(174 58% 42%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'sidebar_and_tab',
    isDefault: true,
    isTerminal: false,
    allowedTransitions: ['pending_2', 'pending_3', 'confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'pending_2',
    label: 'Pending 2',
    color: 'hsl(174 48% 38%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'sidebar_and_tab',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['pending', 'pending_3', 'confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'pending_3',
    label: 'Pending 3',
    color: 'hsl(174 38% 34%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'sidebar_and_tab',
    sidebarOrder: 12,
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['pending', 'pending_2', 'confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'confirmed',
    label: 'Confirmed',
    color: 'hsl(200 60% 45%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 20,
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['processing', 'in_courier', 'hold', 'cancelled'],
    bulkActions: CONFIRMED_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'confirmed_2',
    label: 'Confirmed 2',
    color: 'hsl(200 50% 40%)',
    group: 'confirm',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['processing', 'in_courier', 'cancelled'],
    bulkActions: CONFIRMED_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'hold',
    label: 'Hold',
    color: 'hsl(38 90% 50%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 30,
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['pending', 'confirmed', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'hold_followup',
    label: 'Hold Followup',
    color: 'hsl(38 80% 45%)',
    group: 'confirm',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['hold', 'confirmed', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'processing',
    label: 'Processing',
    color: 'hsl(260 45% 55%)',
    group: 'fulfillment',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['in_courier', 'special', 'hold'],
    bulkActions: DEFAULT_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'in_courier',
    label: 'In Courier',
    color: 'hsl(220 55% 50%)',
    group: 'fulfillment',
    displayMode: 'sidebar',
    sidebarOrder: 25,
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['delivered', 'pending_return', 'cancelled'],
    bulkActions: [...DEFAULT_BULK, 'update_courier_status'],
    showInGroupByStatus: true,
  },
  {
    slug: 'hand_delivery',
    label: 'Hand Delivery',
    color: 'hsl(160 40% 42%)',
    group: 'delivery',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['hand_delivery_completed', 'delivered'],
    bulkActions: DEFAULT_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'delivered',
    label: 'Delivered',
    color: 'hsl(142 50% 40%)',
    group: 'delivery',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['completed', 'pending_return'],
    bulkActions: ['export', 'print_info'],
    showInGroupByStatus: true,
  },
  {
    slug: 'completed',
    label: 'Completed',
    color: 'hsl(142 60% 35%)',
    group: 'terminal',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export', 'print_info'],
    showInGroupByStatus: true,
  },
  {
    slug: 'cancelled',
    label: 'Canceled',
    color: 'hsl(0 60% 50%)',
    group: 'terminal',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export'],
    showInGroupByStatus: true,
  },
  {
    slug: 'pending_return',
    label: 'Pending Return',
    color: 'hsl(15 70% 50%)',
    group: 'returns',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['returned', 'completed'],
    bulkActions: DEFAULT_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'returned',
    label: 'Returned',
    color: 'hsl(15 60% 45%)',
    group: 'returns',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: true,
    allowedTransitions: [],
    bulkActions: ['export'],
    showInGroupByStatus: true,
  },
  {
    slug: 'return_collection',
    label: 'Return Collection',
    color: 'hsl(15 55% 48%)',
    group: 'returns',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['returned', 'pending_return'],
    bulkActions: DEFAULT_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'special',
    label: 'Special',
    color: 'hsl(280 45% 55%)',
    group: 'fulfillment',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['processing', 'in_courier'],
    bulkActions: DEFAULT_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'convert',
    label: 'Convert',
    color: 'hsl(300 40% 50%)',
    group: 'confirm',
    displayMode: 'filter_only',
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['confirmed', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
  },
];

@Injectable()
export class OrgOrderStatusesService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization required');
    }
  }

  async list(organizationId: string): Promise<OrderStatusConfig[]> {
    await this.ensureSeeded(organizationId);
    const rows = await this.prisma.orgOrderStatus.findMany({
      where: { organizationId, isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async listAll(organizationId: string): Promise<OrderStatusConfig[]> {
    await this.ensureSeeded(organizationId);
    const rows = await this.prisma.orgOrderStatus.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return rows.map((row) => this.toDto(row));
  }

  async isValidStatus(organizationId: string, slug: string): Promise<boolean> {
    await this.ensureSeeded(organizationId);
    const row = await this.prisma.orgOrderStatus.findFirst({
      where: { organizationId, slug, isActive: true },
      select: { id: true },
    });
    return Boolean(row);
  }

  async upsert(
    organizationId: string,
    input: UpsertOrderStatusConfigPayload,
  ): Promise<OrderStatusConfig> {
    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
      throw new BadRequestException('Invalid status slug');
    }

    const existing = input.id
      ? await this.prisma.orgOrderStatus.findFirst({
          where: { id: input.id, organizationId },
        })
      : await this.prisma.orgOrderStatus.findUnique({
          where: { organizationId_slug: { organizationId, slug } },
        });

    const data = {
      slug,
      label: input.label.trim(),
      labelBn: input.labelBn?.trim() || null,
      color: input.color,
      group: input.group,
      parentSlug: input.parentSlug?.trim() || null,
      displayMode: input.displayMode,
      showInSidebar: input.showInSidebar ?? null,
      showInNestedTabs: input.showInNestedTabs ?? null,
      sidebarOrder: input.sidebarOrder ?? null,
      isTerminal: input.isTerminal ?? false,
      isDefault: input.isDefault ?? false,
      allowedTransitions: input.allowedTransitions ?? [],
      bulkActions: input.bulkActions ?? [],
      showInGroupByStatus: input.showInGroupByStatus ?? true,
      isActive: true,
    };

    const row = existing
      ? await this.prisma.orgOrderStatus.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.orgOrderStatus.create({
          data: {
            organizationId,
            ...data,
            isSystem: false,
            sortOrder: input.sidebarOrder ?? 100,
          },
        });

    await this.syncFormOption(organizationId, row.slug, row.label);
    return this.toDto(row);
  }

  /** Bulk upsert used when migrating browser localStorage overrides. */
  async replaceMany(
    organizationId: string,
    statuses: UpsertOrderStatusConfigPayload[],
  ): Promise<OrderStatusConfig[]> {
    await this.ensureSeeded(organizationId);
    const results: OrderStatusConfig[] = [];
    for (const status of statuses) {
      results.push(await this.upsert(organizationId, status));
    }
    return this.list(organizationId);
  }

  async ensureSeeded(organizationId: string): Promise<void> {
    const count = await this.prisma.orgOrderStatus.count({ where: { organizationId } });
    if (count > 0) {
      await this.importMissingFormOptionStatuses(organizationId);
      return;
    }

    await this.prisma.orgOrderStatus.createMany({
      data: DEFAULT_ORG_ORDER_STATUSES.map((status, index) => ({
        organizationId,
        slug: status.slug,
        label: status.label,
        labelBn: status.labelBn ?? null,
        color: status.color,
        group: status.group,
        parentSlug: status.parentSlug ?? null,
        displayMode: status.displayMode,
        showInSidebar: status.showInSidebar ?? null,
        showInNestedTabs: status.showInNestedTabs ?? null,
        sidebarOrder: status.sidebarOrder ?? null,
        isTerminal: status.isTerminal,
        isDefault: status.isDefault,
        isSystem: true,
        isActive: true,
        allowedTransitions: status.allowedTransitions,
        bulkActions: status.bulkActions,
        showInGroupByStatus: status.showInGroupByStatus,
        sortOrder: status.sidebarOrder ?? index,
      })),
    });

    for (const status of DEFAULT_ORG_ORDER_STATUSES) {
      await this.syncFormOption(organizationId, status.slug, status.label);
    }

    await this.importMissingFormOptionStatuses(organizationId);
  }

  /** Pull any whitelist-only form-option statuses into OrgOrderStatus as filter_only. */
  private async importMissingFormOptionStatuses(organizationId: string): Promise<void> {
    const [existing, formStatuses] = await Promise.all([
      this.prisma.orgOrderStatus.findMany({
        where: { organizationId },
        select: { slug: true },
      }),
      this.prisma.orderFormOption.findMany({
        where: { organizationId, kind: 'status', isActive: true },
      }),
    ]);
    const known = new Set(existing.map((row) => row.slug));
    const missing = formStatuses.filter((row) => !known.has(row.value));
    if (missing.length === 0) return;

    await this.prisma.orgOrderStatus.createMany({
      data: missing.map((row, index) => ({
        organizationId,
        slug: row.value,
        label: row.label,
        color: 'hsl(174 58% 42%)',
        group: 'intake',
        displayMode: 'filter_only',
        isSystem: false,
        isActive: true,
        sortOrder: 200 + index,
        allowedTransitions: [] as string[],
        bulkActions: [] as string[],
      })),
      skipDuplicates: true,
    });
  }

  private async syncFormOption(
    organizationId: string,
    value: string,
    label: string,
  ): Promise<void> {
    await this.prisma.orderFormOption.upsert({
      where: {
        organizationId_kind_value: { organizationId, kind: 'status', value },
      },
      create: {
        organizationId,
        kind: 'status',
        value,
        label,
        sortOrder: 0,
        isActive: true,
      },
      update: { label, isActive: true },
    });
  }

  private toDto(row: {
    id: string;
    slug: string;
    label: string;
    labelBn: string | null;
    color: string;
    group: string;
    parentSlug: string | null;
    displayMode: string;
    showInSidebar: boolean | null;
    showInNestedTabs: boolean | null;
    sidebarOrder: number | null;
    isTerminal: boolean;
    isDefault: boolean;
    allowedTransitions: string[];
    bulkActions: string[];
    showInGroupByStatus: boolean;
  }): OrderStatusConfig {
    return {
      id: row.id,
      slug: row.slug,
      label: row.label,
      labelBn: row.labelBn ?? undefined,
      color: row.color,
      group: row.group as OrderWorkflowGroup,
      parentSlug: row.parentSlug ?? undefined,
      displayMode: row.displayMode as OrderStatusDisplayMode,
      showInSidebar: row.showInSidebar ?? undefined,
      showInNestedTabs: row.showInNestedTabs ?? undefined,
      sidebarOrder: row.sidebarOrder ?? undefined,
      isTerminal: row.isTerminal,
      isDefault: row.isDefault,
      allowedTransitions: row.allowedTransitions,
      bulkActions: row.bulkActions as BulkActionId[],
      showInGroupByStatus: row.showInGroupByStatus,
    };
  }
}
