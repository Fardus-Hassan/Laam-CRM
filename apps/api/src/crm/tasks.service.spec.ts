import 'reflect-metadata';

import { BadRequestException, NotFoundException } from '@nestjs/common';

import { TasksService } from './tasks.service';

function createPrismaMock() {
  return {
    task: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

const orgId = 'org-1';
const actor = {
  userId: 'u1',
  name: 'Admin User (e2e.admin@laam.test)',
  rawName: 'Admin User',
  email: 'e2e.admin@laam.test',
};

function sampleTask(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-07-21T10:00:00.000Z');
  return {
    id: 'task-1',
    organizationId: orgId,
    title: 'Call customer',
    description: null,
    taskType: 'call_customer',
    status: 'pending',
    priority: 'medium',
    dueDate: new Date('2026-07-21T00:00:00.000Z'),
    dueTime: '10:00',
    assignedAgentName: 'Admin User',
    createdByUserId: 'u1',
    createdByName: actor.name,
    relatedType: 'none',
    relatedId: null,
    relatedLabel: null,
    customerName: 'Fatema',
    customerPhone: '01700000000',
    notes: null,
    tags: [],
    activities: [
      {
        id: 'a1',
        label: 'Task created',
        timestamp: now.toISOString(),
        actorName: actor.name,
      },
    ],
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('TasksService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requireOrg throws without organization', () => {
    const service = new TasksService({} as never);
    expect(() => service.requireOrg(null)).toThrow(BadRequestException);
  });

  it('creates a task with activity + default assignee from rawName', async () => {
    const prisma = createPrismaMock();
    const created = sampleTask();
    prisma.task.create.mockResolvedValue(created);
    const service = new TasksService(prisma as never);

    const result = await service.create(
      orgId,
      { title: 'Call customer', taskType: 'call_customer' },
      actor,
    );

    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Call customer',
          assignedAgentName: 'Admin User',
          createdByUserId: 'u1',
          status: 'pending',
        }),
      }),
    );
    expect(result.id).toBe('task-1');
    expect(result.activities?.length).toBeGreaterThan(0);
  });

  it('rejects empty title on create', async () => {
    const service = new TasksService(createPrismaMock() as never);
    await expect(service.create(orgId, { title: '  ' }, actor)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('lists tasks with summary filters', async () => {
    const prisma = createPrismaMock();
    const now = new Date();
    const todayUtc = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const yesterdayUtc = new Date(todayUtc.getTime() - 24 * 60 * 60 * 1000);
    const today = sampleTask({ dueDate: todayUtc });
    const overdue = sampleTask({
      id: 'task-2',
      dueDate: yesterdayUtc,
      assignedAgentName: 'Other',
    });
    const done = sampleTask({
      id: 'task-3',
      status: 'done',
      dueDate: todayUtc,
      assignedAgentName: 'Admin User',
    });
    prisma.task.count.mockResolvedValue(1);
    prisma.task.findMany
      .mockResolvedValueOnce([today])
      .mockResolvedValueOnce([today, overdue, done]);
    const service = new TasksService(prisma as never);

    const result = await service.list(orgId, { page: 1, pageSize: 20 }, actor);

    expect(result.items).toHaveLength(1);
    expect(result.summary.count).toBe(3);
    expect(result.summary.todayCount).toBe(1);
    expect(result.summary.overdueCount).toBe(1);
    expect(result.summary.doneCount).toBe(1);
    expect(result.summary.myTasksCount).toBe(1);
    expect(result.filters.some((f) => f.id === 'my_tasks')).toBe(true);
  });

  it('getById throws when missing', async () => {
    const prisma = createPrismaMock();
    const service = new TasksService(prisma as never);
    await expect(service.getById(orgId, 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('updates status to done and sets completedAt', async () => {
    const prisma = createPrismaMock();
    const existing = sampleTask();
    const updated = sampleTask({
      status: 'done',
      completedAt: new Date('2026-07-21T12:00:00.000Z'),
    });
    prisma.task.findFirst.mockResolvedValue(existing);
    prisma.task.update.mockResolvedValue(updated);
    const service = new TasksService(prisma as never);

    const result = await service.update(orgId, 'task-1', { status: 'done' }, actor);

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'done',
          completedAt: expect.any(Date),
        }),
      }),
    );
    expect(result.status).toBe('done');
  });

  it('bulkAction reports success and failure counts', async () => {
    const prisma = createPrismaMock();
    prisma.task.findFirst
      .mockResolvedValueOnce(sampleTask())
      .mockResolvedValueOnce(null);
    prisma.task.update.mockResolvedValue(sampleTask({ status: 'done' }));
    const service = new TasksService(prisma as never);

    const result = await service.bulkAction(
      orgId,
      { taskIds: ['task-1', 'missing'], status: 'done' },
      actor,
    );

    expect(result.successCount).toBe(1);
    expect(result.failedCount).toBe(1);
  });
});
