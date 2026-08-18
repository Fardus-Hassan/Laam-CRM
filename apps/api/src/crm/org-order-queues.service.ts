import { BadRequestException, Injectable } from '@nestjs/common';
import type { OrderQueuePage, UpsertOrderQueuePagePayload } from '@laam/types';

import { PrismaService } from '../prisma/prisma.service';

const SYSTEM_QUEUES: Array<Omit<OrderQueuePage, 'id' | 'childStatusSlugs' | 'displayMode'> & {
  displayMode?: OrderQueuePage['displayMode'];
  isSystem: boolean;
}> = [
  {
    slug: 'create_new',
    label: 'Create New',
    href: '/dashboard/orders/new',
    kind: 'form',
    sidebarOrder: 0,
    title: 'Create New Order',
    description: 'Manually enter a customer order.',
    showInNav: true,
    isSystem: true,
  },
  {
    slug: 'all',
    label: 'All Orders',
    href: '/dashboard/orders',
    kind: 'list',
    sidebarOrder: 1,
    title: 'All Orders',
    description: 'Full order list with filters, bulk actions, and sales summary.',
    showInNav: true,
    isSystem: true,
  },
  {
    slug: 'pendings',
    label: 'Call confirm',
    href: '/dashboard/orders/queues/pendings',
    kind: 'list',
    sidebarOrder: 10,
    defaultChildSlug: 'pending',
    title: 'Call confirm',
    description: 'New orders waiting for confirmation before packing or courier booking.',
    showInNav: true,
    isSystem: true,
  },
  {
    slug: 'followups',
    label: 'Follow-ups Due',
    href: '/dashboard/orders/queues/followups',
    kind: 'list',
    sidebarOrder: 15,
    title: 'Follow-ups Due',
    description:
      'Orders with an open follow-up due today or overdue — call center callback queue.',
    showInNav: true,
    followUpDue: true,
    isSystem: true,
  },
  {
    slug: 'failed',
    label: 'Failed Orders',
    href: '/dashboard/orders/failed',
    kind: 'failed',
    sidebarOrder: 40,
    title: 'Failed Orders',
    description: 'Duplicate, blocked, or invalid orders for manual review.',
    showInNav: true,
    isSystem: true,
  },
  {
    slug: 'bulk_print',
    label: 'Bulk Print',
    href: '/dashboard/orders/tools/bulk-print',
    kind: 'tool',
    sidebarOrder: 50,
    title: 'Bulk Print',
    description: 'Print invoices and packing slips in bulk.',
    showInNav: true,
    isSystem: true,
  },
  {
    slug: 'send_courier_barcode',
    label: 'Send Courier by Barcode',
    href: '/dashboard/orders/tools/send-courier-barcode',
    kind: 'tool',
    sidebarOrder: 51,
    title: 'Send Courier by Barcode',
    description: 'Submit orders to courier using barcode scan.',
    showInNav: true,
    isSystem: true,
  },
  {
    slug: 'payments',
    label: 'Payments',
    href: '/dashboard/orders/payments',
    kind: 'payments',
    sidebarOrder: 52,
    title: 'Order Payments',
    description: 'Payment ledger and collection tracking.',
    showInNav: true,
    isSystem: true,
  },
];

@Injectable()
export class OrgOrderQueuesService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) throw new BadRequestException('Organization required');
  }

  async list(organizationId: string): Promise<OrderQueuePage[]> {
    await this.ensureSeeded(organizationId);
    const rows = await this.prisma.orgOrderQueue.findMany({
      where: { organizationId, isActive: true },
      orderBy: { sidebarOrder: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  /** Settings UI — includes hidden/inactive custom folders. */
  async listForSettings(organizationId: string): Promise<OrderQueuePage[]> {
    await this.ensureSeeded(organizationId);
    const rows = await this.prisma.orgOrderQueue.findMany({
      where: { organizationId },
      orderBy: { sidebarOrder: 'asc' },
    });
    return rows.map((row) => this.toDto(row));
  }

  async setNavVisibility(
    organizationId: string,
    id: string,
    showInNav: boolean,
  ): Promise<OrderQueuePage> {
    const existing = await this.prisma.orgOrderQueue.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new BadRequestException('Queue not found');
    const row = await this.prisma.orgOrderQueue.update({
      where: { id: existing.id },
      data: { showInNav },
    });
    return this.toDto(row);
  }

  async rename(organizationId: string, id: string, label: string): Promise<OrderQueuePage> {
    const next = label.trim();
    if (!next) throw new BadRequestException('Label required');
    const existing = await this.prisma.orgOrderQueue.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new BadRequestException('Queue not found');
    const row = await this.prisma.orgOrderQueue.update({
      where: { id: existing.id },
      data: { label: next, description: existing.description || `${next} queue` },
    });
    return this.toDto(row);
  }

  async deactivate(organizationId: string, id: string): Promise<{ ok: true }> {
    const existing = await this.prisma.orgOrderQueue.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new BadRequestException('Queue not found');
    if (existing.isSystem) {
      throw new BadRequestException('System queue folders cannot be deleted');
    }
    await this.prisma.orgOrderQueue.update({
      where: { id: existing.id },
      data: { isActive: false, showInNav: false },
    });
    return { ok: true };
  }

  async listFolderSlugs(organizationId: string): Promise<Set<string>> {
    const pages = await this.list(organizationId);
    return new Set(
      pages
        .filter((page) => page.kind === 'list' && page.slug !== 'all' && page.slug !== 'more_statuses')
        .map((page) => page.slug),
    );
  }

  async upsert(
    organizationId: string,
    input: UpsertOrderQueuePagePayload,
  ): Promise<OrderQueuePage> {
    await this.ensureSeeded(organizationId);
    const slug = input.slug.trim().toLowerCase();
    if (!/^[a-z][a-z0-9_]*$/.test(slug)) {
      throw new BadRequestException('Invalid queue slug');
    }

    const existing = input.id
      ? await this.prisma.orgOrderQueue.findFirst({
          where: { id: input.id, organizationId },
        })
      : await this.prisma.orgOrderQueue.findUnique({
          where: { organizationId_slug: { organizationId, slug } },
        });

    if (existing?.isSystem && existing.slug !== slug) {
      throw new BadRequestException('Cannot change slug of a system queue');
    }

    const href =
      slug === 'all'
        ? '/dashboard/orders'
        : slug === 'create_new'
          ? '/dashboard/orders/new'
          : slug === 'failed'
            ? '/dashboard/orders/failed'
            : slug === 'payments'
              ? '/dashboard/orders/payments'
              : slug.startsWith('send_') || slug.includes('print') || slug.includes('barcode')
                ? `/dashboard/orders/tools/${slug.replace(/_/g, '-')}`
                : `/dashboard/orders/queues/${slug}`;

    const data = {
      slug,
      label: input.label.trim(),
      description: input.description?.trim() ?? existing?.description ?? '',
      sidebarOrder: input.sidebarOrder ?? existing?.sidebarOrder ?? 60,
      showInNav: input.showInNav ?? existing?.showInNav ?? true,
      defaultChildSlug:
        input.defaultChildSlug === null
          ? null
          : (input.defaultChildSlug?.trim() || existing?.defaultChildSlug || null),
      followUpDue: input.followUpDue ?? existing?.followUpDue ?? false,
      href: existing?.href ?? href,
      kind: existing?.kind ?? 'list',
      isActive: true,
    };

    const row = existing
      ? await this.prisma.orgOrderQueue.update({
          where: { id: existing.id },
          data,
        })
      : await this.prisma.orgOrderQueue.create({
          data: {
            organizationId,
            ...data,
            isSystem: false,
          },
        });

    return this.toDto(row);
  }

  async ensureSeeded(organizationId: string): Promise<void> {
    const count = await this.prisma.orgOrderQueue.count({ where: { organizationId } });
    if (count > 0) return;

    await this.prisma.orgOrderQueue.createMany({
      data: SYSTEM_QUEUES.map((queue) => ({
        organizationId,
        slug: queue.slug,
        label: queue.label,
        description: queue.description,
        kind: queue.kind,
        href: queue.href,
        sidebarOrder: queue.sidebarOrder,
        showInNav: queue.showInNav,
        defaultChildSlug: queue.defaultChildSlug ?? null,
        followUpDue: queue.followUpDue ?? false,
        isSystem: true,
        isActive: true,
      })),
    });
  }

  private toDto(row: {
    id: string;
    slug: string;
    label: string;
    description: string;
    kind: string;
    href: string;
    sidebarOrder: number;
    showInNav: boolean;
    defaultChildSlug: string | null;
    followUpDue: boolean;
    isSystem: boolean;
    isActive?: boolean;
  }): OrderQueuePage {
    return {
      id: row.id,
      slug: row.slug,
      label: row.label,
      href: row.href,
      kind: row.kind as OrderQueuePage['kind'],
      displayMode: 'sidebar',
      sidebarOrder: row.sidebarOrder,
      defaultChildSlug: row.defaultChildSlug ?? undefined,
      title: row.label,
      description: row.description,
      showInNav: row.showInNav,
      followUpDue: row.followUpDue,
      isSystem: row.isSystem,
      isActive: row.isActive ?? true,
    };
  }
}
