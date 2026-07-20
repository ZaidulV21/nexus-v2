-- CreateTable
CREATE TABLE "in_app_notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'INFO',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "relatedEntity" TEXT,
    "relatedEntityId" TEXT,
    "actionUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "in_app_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "in_app_notifications_recipientId_recipientType_idx" ON "in_app_notifications"("recipientId", "recipientType");

-- CreateIndex
CREATE INDEX "in_app_notifications_recipientId_recipientType_isRead_idx" ON "in_app_notifications"("recipientId", "recipientType", "isRead");
