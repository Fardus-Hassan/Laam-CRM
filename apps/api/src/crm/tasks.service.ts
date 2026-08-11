import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateTaskPayload,
  TaskDetail,
  TaskFilter,
  TaskListItem,
  TaskListQuery,
  TaskListResponse,
  TaskPriority,
  TaskRelatedType,
  TaskStatus,
  TaskType,
  UpdateTaskPayload,
} from '@laam/types';
import type { Prisma, Task } from '@prisma/client';
import { randomUUID } from 'crypto';

import type { ActorLabel } from '../common/actor.util';
import { PrismaService } from '../prisma/prisma.service';

type ActivityJson = {
  id: string;
  label: string;
  description?: string;
  timestamp: string;
  actorName?: string;
};

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  requireOrg(organizationId: string | null | undefined): asserts organizationId is string {
    if (!organizationId) {
      throw new BadRequestException('Organization context required');
    }
  }

  async list(
    organizationId: string,
    query: TaskListQuery,
    actor?: ActorLabel & { email?: string; rawName?: string },
  ): Promise<TaskListResponse> {
    const page = Math.max(1, query.page ?? 1);
    const pageSize = Math.min(1000, Math.max(1, query.pageSize ?? 20));
    const filter = query.filter ?? 'all';
    const search = query.search?.trim();

    const where = this.buildWhere(organizationId, {
      filter,
      status: query.status,
      priority: query.priority,
      taskType: query.taskType,
      search,
      actor,
    });

    const [total, rows, allForSummary] = await Promise.all([
      this.prisma.task.count({ where }),
      this.prisma.task.findMany({
        where,
        orderBy: [{ dueDate: 'asc' }, { priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.task.findMany({
        where: { organizationId },
        select: {
          status: true,
          dueDate: true,
          assignedAgentName: true,
        },
      }),
    ]);

    const today = this.todayDateOnly();
    const summary = {
      count: allForSummary.length,
      todayCount: allForSummary.filter(
        (t) =>
          t.dueDate &&
          this.sameDay(t.dueDate, today) &&
          t.status !== 'done' &&
          t.status !== 'cancelled',
      ).length,
      overdueCount: allForSummary.filter(
        (t) =>
          t.dueDate &&
          t.dueDate < today &&
          t.status !== 'done' &&
          t.status !== 'cancelled',
      ).length,
      doneCount: allForSummary.filter((t) => t.status === 'done').length,
      myTasksCount: allForSummary.filter(
        (t) =>
          this.isMyTask(t.assignedAgentName, actor) &&
          t.status !== 'done' &&
          t.status !== 'cancelled',
      ).length,
    };

    const filters = [
      { id: 'all', label: 'All tasks', count: summary.count },
      { id: 'my_tasks', label: 'My tasks', count: summary.myTasksCount },
      { id: 'today', label: 'Due today', count: summary.todayCount },
      { id: 'overdue', label: 'Overdue', count: summary.overdueCount },
      { id: 'done', label: 'Done', count: summary.doneCount },
    ];

    return {
      items: rows.map((r) => this.toListItem(r)),
      total,
      page,
      pageSize,
      summary,
      filters,
    };
  }

  async getById(organizationId: string, id: string): Promise<TaskDetail> {
    const row = await this.prisma.task.findFirst({
      where: { id, organizationId },
    });
    if (!row) throw new NotFoundException('Task not found');
    return this.toDetail(row);
  }

  async create(
    organizationId: string,
    input: CreateTaskPayload,
    actor?: ActorLabel,
  ): Promise<TaskDetail> {
    const title = input.title?.trim();
    if (!title) throw new BadRequestException('Title is required');

    const now = new Date();
    const activities: ActivityJson[] = [
      {
        id: randomUUID(),
        label: 'Task created',
        timestamp: now.toISOString(),
        actorName: actor?.name,
      },
    ];

    const row = await this.prisma.task.create({
      data: {
        organizationId,
        title,
        description: input.description?.trim() || null,
        taskType: input.taskType ?? 'general',
        status: 'pending',
        priority: input.priority ?? 'medium',
        dueDate: this.parseDateOnly(input.dueDate),
        dueTime: input.dueTime?.trim() || null,
        assignedAgentName:
          input.assignedAgentName?.trim() ||
          (actor as ActorLabel & { rawName?: string })?.rawName?.trim() ||
          actor?.name ||
          null,
        createdByUserId: actor?.userId || null,
        createdByName: actor?.name || null,
        relatedType: input.relatedType ?? 'none',
        relatedId: input.relatedId?.trim() || null,
        relatedLabel: input.relatedLabel?.trim() || null,
        customerName: input.customerName?.trim() || null,
        customerPhone: input.customerPhone?.trim() || null,
        notes: input.notes?.trim() || null,
        tags: input.tags ?? [],
        activities: activities as unknown as Prisma.InputJsonValue,
      },
    });

    return this.toDetail(row);
  }

  async update(
    organizationId: string,
    id: string,
    patch: UpdateTaskPayload,
    actor?: ActorLabel,
  ): Promise<TaskDetail> {
    const existing = await this.prisma.task.findFirst({
      where: { id, organizationId },
    });
    if (!existing) throw new NotFoundException('Task not found');

    const activities = this.readActivities(existing.activities);
    const now = new Date();
    const data: Prisma.TaskUpdateInput = {};

    if (patch.title !== undefined) {
      const title = patch.title.trim();
      if (!title) throw new BadRequestException('Title cannot be empty');
      data.title = title;
    }
    if (patch.description !== undefined) {
      data.description = patch.description.trim() || null;
    }
    if (patch.taskType !== undefined) data.taskType = patch.taskType;
    if (patch.priority !== undefined) {
      data.priority = patch.priority;
      activities.push({
        id: randomUUID(),
        label: `Priority → ${patch.priority}`,
        timestamp: now.toISOString(),
        actorName: actor?.name,
      });
    }
    if (patch.assignedAgentName !== undefined) {
      data.assignedAgentName = patch.assignedAgentName.trim() || null;
      activities.push({
        id: randomUUID(),
        label: 'Assignee updated',
        description: patch.assignedAgentName.trim() || 'Unassigned',
        timestamp: now.toISOString(),
        actorName: actor?.name,
      });
    }
    if (patch.dueDate !== undefined) {
      data.dueDate = this.parseDateOnly(patch.dueDate);
      activities.push({
        id: randomUUID(),
        label: 'Due date updated',
        description: patch.dueDate || 'Cleared',
        timestamp: now.toISOString(),
        actorName: actor?.name,
      });
    }
    if (patch.dueTime !== undefined) {
      data.dueTime = patch.dueTime.trim() || null;
    }
    if (patch.notes !== undefined) {
      data.notes = patch.notes.trim() || null;
      activities.push({
        id: randomUUID(),
        label: 'Notes updated',
        timestamp: now.toISOString(),
        actorName: actor?.name,
      });
    }
    if (patch.tags !== undefined) data.tags = patch.tags;

    if (patch.status !== undefined && patch.status !== existing.status) {
      data.status = patch.status;
      if (patch.status === 'done') {
        data.completedAt = now;
      } else if (existing.status === 'done') {
        data.completedAt = null;
      }
      activities.push({
        id: randomUUID(),
        label: `Status → ${patch.status}`,
        timestamp: now.toISOString(),
        actorName: actor?.name,
      });
    }

    data.activities = activities as unknown as Prisma.InputJsonValue;

    const updated = await this.prisma.task.update({
      where: { id },
      data,
    });
    return this.toDetail(updated);
  }

  async bulkAction(
    organizationId: string,
    payload: {
      taskIds: string[];
      status?: TaskStatus;
      priority?: TaskPriority;
      assignedAgentName?: string;
      dueDate?: string;
    },
    actor?: ActorLabel,
  ): Promise<{ successCount: number; failedCount: number; message?: string }> {
    const ids = [...new Set(payload.taskIds.filter(Boolean))];
    if (!ids.length) {
      throw new BadRequestException('taskIds required');
    }

    let successCount = 0;
    let failedCount = 0;
    for (const id of ids) {
      try {
        await this.update(
          organizationId,
          id,
          {
            status: payload.status,
            priority: payload.priority,
            assignedAgentName: payload.assignedAgentName,
            dueDate: payload.dueDate,
          },
          actor,
        );
        successCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    return {
      successCount,
      failedCount,
      message: `Updated ${successCount} task(s)`,
    };
  }

  async todayOpenCount(organizationId: string): Promise<number> {
    const today = this.todayDateOnly();
    return this.prisma.task.count({
      where: {
        organizationId,
        dueDate: today,
        status: { notIn: ['done', 'cancelled'] },
      },
    });
  }

  // ─── helpers ───────────────────────────────────────────────────────────────

  private buildWhere(
    organizationId: string,
    opts: {
      filter: TaskFilter;
      status?: TaskStatus;
      priority?: TaskPriority;
      taskType?: TaskType;
      search?: string;
      actor?: ActorLabel & { email?: string; rawName?: string };
    },
  ): Prisma.TaskWhereInput {
    const today = this.todayDateOnly();
    const where: Prisma.TaskWhereInput = { organizationId };

    if (opts.status) where.status = opts.status;
    if (opts.priority) where.priority = opts.priority;
    if (opts.taskType) where.taskType = opts.taskType;

    if (opts.search) {
      where.OR = [
        { title: { contains: opts.search, mode: 'insensitive' } },
        { description: { contains: opts.search, mode: 'insensitive' } },
        { customerName: { contains: opts.search, mode: 'insensitive' } },
        { customerPhone: { contains: opts.search, mode: 'insensitive' } },
        { assignedAgentName: { contains: opts.search, mode: 'insensitive' } },
        { relatedLabel: { contains: opts.search, mode: 'insensitive' } },
      ];
    }

    switch (opts.filter) {
      case 'my_tasks': {
        const names = this.myNameCandidates(opts.actor);
        if (names.length) {
          where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            {
              OR: names.map((n) => ({
                assignedAgentName: { equals: n, mode: 'insensitive' as const },
              })),
            },
            { status: { notIn: ['done', 'cancelled'] } },
          ];
        } else {
          where.id = '__none__';
        }
        break;
      }
      case 'today':
        where.dueDate = today;
        where.status = { notIn: ['done', 'cancelled'] };
        break;
      case 'overdue':
        where.dueDate = { lt: today };
        where.status = { notIn: ['done', 'cancelled'] };
        break;
      case 'done':
        where.status = 'done';
        break;
      default:
        break;
    }

    return where;
  }

  private myNameCandidates(
    actor?: ActorLabel & { email?: string; rawName?: string },
  ): string[] {
    if (!actor) return [];
    const set = new Set<string>();
    if (actor.name) set.add(actor.name);
    if (actor.rawName) set.add(actor.rawName);
    if (actor.email) set.add(actor.email);
    // Also plain name without email suffix: "Name (email)" → "Name"
    if (actor.name?.includes(' (')) {
      set.add(actor.name.split(' (')[0]!.trim());
    }
    return [...set].filter(Boolean);
  }

  private isMyTask(
    assigned: string | null,
    actor?: ActorLabel & { email?: string; rawName?: string },
  ): boolean {
    if (!assigned) return false;
    const candidates = this.myNameCandidates(actor).map((c) => c.toLowerCase());
    const a = assigned.toLowerCase();
    return candidates.some((c) => a === c || a.includes(c) || c.includes(a));
  }

  private toListItem(row: Task): TaskListItem {
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? undefined,
      taskType: row.taskType as TaskType,
      status: row.status as TaskStatus,
      priority: row.priority as TaskPriority,
      dueDate: row.dueDate ? this.toDateString(row.dueDate) : undefined,
      dueTime: row.dueTime ?? undefined,
      assignedAgentName: row.assignedAgentName ?? undefined,
      createdByName: row.createdByName ?? undefined,
      createdAt: row.createdAt.toISOString(),
      completedAt: row.completedAt?.toISOString(),
      relatedType: (row.relatedType as TaskRelatedType) || 'none',
      relatedId: row.relatedId ?? undefined,
      relatedLabel: row.relatedLabel ?? undefined,
      customerName: row.customerName ?? undefined,
      customerPhone: row.customerPhone ?? undefined,
      tags: row.tags ?? [],
      hasNotes: Boolean(row.notes?.trim()),
    };
  }

  private toDetail(row: Task): TaskDetail {
    return {
      ...this.toListItem(row),
      notes: row.notes ?? undefined,
      activities: this.readActivities(row.activities),
    };
  }

  private readActivities(raw: unknown): ActivityJson[] {
    if (!Array.isArray(raw)) return [];
    const out: ActivityJson[] = [];
    for (const a of raw) {
      if (!a || typeof a !== 'object') continue;
      const o = a as Record<string, unknown>;
      if (typeof o['id'] !== 'string' || typeof o['label'] !== 'string') continue;
      out.push({
        id: o['id'] as string,
        label: o['label'] as string,
        description:
          typeof o['description'] === 'string' ? o['description'] : undefined,
        timestamp:
          typeof o['timestamp'] === 'string'
            ? o['timestamp']
            : new Date().toISOString(),
        actorName: typeof o['actorName'] === 'string' ? o['actorName'] : undefined,
      });
    }
    return out;
  }

  private parseDateOnly(value?: string | null): Date | null {
    if (!value?.trim()) return null;
    const d = new Date(`${value.trim().slice(0, 10)}T00:00:00.000Z`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('Invalid dueDate');
    }
    return d;
  }

  private toDateString(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  private todayDateOnly(): Date {
    const n = new Date();
    return new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()));
  }

  private sameDay(a: Date, b: Date): boolean {
    return this.toDateString(a) === this.toDateString(b);
  }
}
