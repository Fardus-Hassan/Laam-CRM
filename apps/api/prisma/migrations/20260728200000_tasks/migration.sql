-- Agent / ops Task table

CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "taskType" TEXT NOT NULL DEFAULT 'general',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueDate" DATE,
    "dueTime" TEXT,
    "assignedAgentName" TEXT,
    "createdByUserId" TEXT,
    "createdByName" TEXT,
    "relatedType" TEXT NOT NULL DEFAULT 'none',
    "relatedId" TEXT,
    "relatedLabel" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "activities" JSONB NOT NULL DEFAULT '[]',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Task_organizationId_status_idx" ON "Task"("organizationId", "status");
CREATE INDEX IF NOT EXISTS "Task_organizationId_dueDate_idx" ON "Task"("organizationId", "dueDate");
CREATE INDEX IF NOT EXISTS "Task_organizationId_assignedAgentName_idx" ON "Task"("organizationId", "assignedAgentName");
CREATE INDEX IF NOT EXISTS "Task_organizationId_priority_idx" ON "Task"("organizationId", "priority");
CREATE INDEX IF NOT EXISTS "Task_organizationId_taskType_idx" ON "Task"("organizationId", "taskType");
CREATE INDEX IF NOT EXISTS "Task_organizationId_createdAt_idx" ON "Task"("organizationId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "Task"
    ADD CONSTRAINT "Task_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
