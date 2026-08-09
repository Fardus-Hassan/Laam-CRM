-- Org-scoped order status config (nav / tabs / workflow)
CREATE TABLE "OrgOrderStatus" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "labelBn" TEXT,
    "color" TEXT NOT NULL DEFAULT 'hsl(174 58% 42%)',
    "group" TEXT NOT NULL DEFAULT 'intake',
    "parentSlug" TEXT,
    "displayMode" TEXT NOT NULL DEFAULT 'filter_only',
    "showInSidebar" BOOLEAN,
    "showInNestedTabs" BOOLEAN,
    "sidebarOrder" INTEGER,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedTransitions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bulkActions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "showInGroupByStatus" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrgOrderStatus_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrgOrderStatus_organizationId_slug_key" ON "OrgOrderStatus"("organizationId", "slug");
CREATE INDEX "OrgOrderStatus_organizationId_isActive_idx" ON "OrgOrderStatus"("organizationId", "isActive");
CREATE INDEX "OrgOrderStatus_organizationId_parentSlug_idx" ON "OrgOrderStatus"("organizationId", "parentSlug");

ALTER TABLE "OrgOrderStatus" ADD CONSTRAINT "OrgOrderStatus_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
