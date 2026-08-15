-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "handle" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastScrapedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "rawPostUrl" TEXT NOT NULL,
    "rawCaption" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "startTime" TEXT,
    "endTime" TEXT,
    "location" TEXT,
    "ageRange" TEXT,
    "category" TEXT NOT NULL,
    "cost" TEXT,
    "isFree" BOOLEAN NOT NULL DEFAULT false,
    "registrationUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confidence" REAL NOT NULL DEFAULT 1.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Event_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Source_handle_key" ON "Source"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "Event_rawPostUrl_key" ON "Event"("rawPostUrl");
