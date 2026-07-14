-- AlterTable
ALTER TABLE "User" ALTER COLUMN "healthReport" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "OptimizationJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "datasetId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'running',
    "stage" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "requestJson" TEXT,
    "resultJson" TEXT,
    "error" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OptimizationJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OptimizationJob_userId_idx" ON "OptimizationJob"("userId");

-- CreateIndex
CREATE INDEX "OptimizationJob_createdAt_idx" ON "OptimizationJob"("createdAt");
