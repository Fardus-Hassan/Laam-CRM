-- CreateTable
CREATE TABLE "CourierInboxRead" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "readAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourierInboxRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CourierInboxRead_organizationId_userId_idx" ON "CourierInboxRead"("organizationId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "CourierInboxRead_organizationId_userId_eventId_key" ON "CourierInboxRead"("organizationId", "userId", "eventId");
