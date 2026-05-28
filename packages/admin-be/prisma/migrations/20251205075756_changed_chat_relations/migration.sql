/*
  Warnings:

  - You are about to drop the column `adminId` on the `chats` table. All the data in the column will be lost.
  - You are about to drop the column `adminRole` on the `chats` table. All the data in the column will be lost.
  - Added the required column `complaintId` to the `chats` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderType` to the `chats` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('USER', 'AGENT');

-- DropForeignKey
ALTER TABLE "chats" DROP CONSTRAINT "chats_userId_fkey";

-- DropIndex
DROP INDEX "chats_adminId_idx";

-- AlterTable
ALTER TABLE "chats" DROP COLUMN "adminId",
DROP COLUMN "adminRole",
ADD COLUMN     "agentId" TEXT,
ADD COLUMN     "complaintId" TEXT NOT NULL,
ADD COLUMN     "senderType" "SenderType" NOT NULL,
ALTER COLUMN "userId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "chats_complaintId_idx" ON "chats"("complaintId");

-- CreateIndex
CREATE INDEX "chats_agentId_idx" ON "chats"("agentId");

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chats" ADD CONSTRAINT "chats_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "Agent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
