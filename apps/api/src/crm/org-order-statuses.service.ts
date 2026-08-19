import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import {
  bulkActionIdSchema,
  type BulkActionId,
  type OrderStatusConfig,
  type OrderStatusDisplayMode,
  type OrderWorkflowGroup,
  type UpsertOrderStatusConfigPayload,
} from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';

type SeedStatus = Omit<OrderStatusConfig, 'id'>;

function sanitizeBulkActions(raw: unknown): BulkActionId[] {
  if (!Array.isArray(raw)) return [];
  const out: BulkActionId[] = [];
  for (const id of raw) {
    const parsed = bulkActionIdSchema.safeParse(id);
    if (parsed.success && !out.includes(parsed.data)) {
      out.push(parsed.data);
    }
  }
  return out;
}

function bulkActionsChanged(before: string[], after: BulkActionId[]): boolean {
  if (before.length !== after.length) return true;
  return before.some((id, index) => id !== after[index]);
}

const DEFAULT_BULK: BulkActionId[] = [
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
];

const PENDING_BULK: BulkActionId[] = [
  ...DEFAULT_BULK,
  'update_courier_status',
];

const CONFIRMED_BULK: BulkActionId[] = [
  ...PENDING_BULK,
];

/** Core workflow only — tenants add extra statuses in Settings. */
const DEFAULT_ORG_ORDER_STATUSES: SeedStatus[] = [
  {
    slug: 'pending',
    label: 'Pending',
    color: 'hsl(174 58% 42%)',
    group: 'intake',
    parentSlug: 'pendings',
    displayMode: 'sidebar_and_tab',
    isDefault: true,
    isTerminal: false,
    allowedTransitions: ['confirmed', 'hold', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
    sidebarOrder: 10,
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
    slug: 'hold',
    label: 'Hold',
    color: 'hsl(38 90% 50%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 30,
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['pending', 'confirmed', 'hold_followup', 'cancelled'],
    bulkActions: PENDING_BULK,
    showInGroupByStatus: true,
  },
  {
    slug: 'hold_followup',
    label: 'Hold Followup',
    color: 'hsl(38 85% 42%)',
    group: 'confirm',
    displayMode: 'sidebar',
    sidebarOrder: 35,
    isDefault: false,
    isTerminal: false,
    allowedTransitions: ['pending', 'confirmed', 'hold', 'cancelled'],
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
    allowedTransitions: ['in_courier', 'hold'],
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
    return this.toDtoListWithBulkCleanup(rows);
  }

  async listAll(organizationId: string): Promise<OrderStatusConfig[]> {
    await this.ensureSeeded(organizationId);
    const rows = await this.prisma.orgOrderStatus.findMany({
      where: { organizationId },
      orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
    });
    return this.toDtoListWithBulkCleanup(rows);
  }

  async isValidStatus(organizationId: string, slug: string): Promise<boolean> {
    await this.ensureSeeded(organizationId);
    const row = await this.prisma.orgOrderStatus.findFirst({
      where: { organizationId, slug, isActive: true },
      select: { id: true },
    });
    return Boolean(row);
  }

  async getStatusMeta(
    organizationId: string,
    slug: string,
  ): Promise<{ slug: string; group: string } | null> {
    await this.ensureSeeded(organizationId);
    return this.prisma.orgOrderStatus.findFirst({
      where: { organizationId, slug: slug.trim().toLowerCase() },
      select: { slug: true, group: true },
    });
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
      bulkActions: sanitizeBulkActions(
        input.bulkActions && input.bulkActions.length > 0
          ? input.bulkActions
          : existing?.bulkActions?.length
            ? existing.bulkActions
            : DEFAULT_BULK,
      ),
      showInGroupByStatus: input.showInGroupByStatus ?? true,
      isActive: true,
    };

    const row = existing
      ? await this.prisma.orgOrderStatus.update({
          where: { id: existing.id },
          data: {
            ...data,
            sortOrder: input.sidebarOrder ?? existing.sortOrder ?? 100,
          },
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
      await this.ensureHoldFollowupStatus(organizationId);
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

  /** Ensure hold_followup exists on orgs seeded before workflow automation. */
  private async ensureHoldFollowupStatus(organizationId: string): Promise<void> {
    const existing = await this.prisma.orgOrderStatus.findFirst({
      where: { organizationId, slug: 'hold_followup' },
    });
    if (!existing) {
      const seed = DEFAULT_ORG_ORDER_STATUSES.find((s) => s.slug === 'hold_followup');
      if (seed) {
        await this.prisma.orgOrderStatus.create({
          data: {
            organizationId,
            slug: seed.slug,
            label: seed.label,
            color: seed.color,
            group: seed.group,
            displayMode: seed.displayMode,
            sidebarOrder: seed.sidebarOrder ?? null,
            isTerminal: seed.isTerminal,
            isDefault: seed.isDefault,
            isSystem: true,
            isActive: true,
            allowedTransitions: seed.allowedTransitions,
            bulkActions: seed.bulkActions,
            showInGroupByStatus: seed.showInGroupByStatus,
            sortOrder: seed.sidebarOrder ?? 35,
          },
        });
        await this.syncFormOption(organizationId, seed.slug, seed.label);
      }
    }

    const hold = await this.prisma.orgOrderStatus.findFirst({
      where: { organizationId, slug: 'hold' },
    });
    if (hold && !hold.allowedTransitions.includes('hold_followup')) {
      await this.prisma.orgOrderStatus.update({
        where: { id: hold.id },
        data: {
          allowedTransitions: [...hold.allowedTransitions, 'hold_followup'],
        },
      });
    }
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

  private async toDtoListWithBulkCleanup(
    rows: Array<{
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
    }>,
  ): Promise<OrderStatusConfig[]> {
    const result: OrderStatusConfig[] = [];
    for (const row of rows) {
      const cleaned = sanitizeBulkActions(row.bulkActions);
      if (bulkActionsChanged(row.bulkActions, cleaned)) {
        await this.prisma.orgOrderStatus.update({
          where: { id: row.id },
          data: { bulkActions: cleaned },
        });
        row.bulkActions = cleaned;
      }
      result.push(this.toDto(row));
    }
    return result;
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
      bulkActions: sanitizeBulkActions(row.bulkActions),
      showInGroupByStatus: row.showInGroupByStatus,
    };
  }
}
