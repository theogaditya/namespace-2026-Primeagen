-- CreateEnum
CREATE TYPE "BlockchainStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncEventStatus" AS ENUM ('PROCESSED', 'DUPLICATE', 'FAILED');

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "seq" SERIAL NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "blockchainHash" VARCHAR(66),
    "blockchainBlock" BIGINT,
    "ipfsHash" TEXT,
    "isOnChain" BOOLEAN NOT NULL DEFAULT false,
    "blockchainStatus" "BlockchainStatus" NOT NULL DEFAULT 'PENDING',
    "blockchainUpdatedAt" TIMESTAMP(3),

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blockchain_sync_events" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "blockchainHash" VARCHAR(66) NOT NULL,
    "blockchainBlock" BIGINT,
    "ipfsHash" TEXT,
    "isOnChain" BOOLEAN NOT NULL DEFAULT true,
    "payload" JSONB NOT NULL,
    "status" "SyncEventStatus" NOT NULL DEFAULT 'PROCESSED',
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blockchain_sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_seq_key" ON "Complaint"("seq");

-- CreateIndex
CREATE INDEX "Complaint_blockchainHash_idx" ON "Complaint"("blockchainHash");

-- CreateIndex
CREATE INDEX "Complaint_seq_idx" ON "Complaint"("seq");

-- CreateIndex
CREATE INDEX "blockchain_sync_events_entityType_entityId_idx" ON "blockchain_sync_events"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_sync_events_keyPrefix_blockchainHash_key" ON "blockchain_sync_events"("keyPrefix", "blockchainHash");
