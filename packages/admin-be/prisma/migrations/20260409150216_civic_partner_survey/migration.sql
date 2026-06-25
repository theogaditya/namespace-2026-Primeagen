/*
  Warnings:

  - The primary key for the `_CoAssignedAgentComplaints` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_CoAssignedAgentComplaints` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "BadgeCategory" AS ENUM ('FILING', 'ENGAGEMENT', 'RESOLUTION', 'CATEGORY_SPECIALIST');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "BlockchainStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "SyncEventStatus" AS ENUM ('PROCESSED', 'DUPLICATE', 'FAILED');

-- CreateEnum
CREATE TYPE "CivicPartnerType" AS ENUM ('NGO', 'GOVERNMENT_BODY');

-- CreateEnum
CREATE TYPE "SurveySourceType" AS ENUM ('NGO', 'SURVEY');

-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TEXT', 'MCQ', 'CHECKBOX', 'RATING', 'YES_NO');

-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "blockchainBlock" BIGINT,
ADD COLUMN     "blockchainHash" VARCHAR(66),
ADD COLUMN     "blockchainStatus" "BlockchainStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "blockchainUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "ipfsHash" TEXT,
ADD COLUMN     "isOnChain" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "_CoAssignedAgentComplaints" DROP CONSTRAINT "_CoAssignedAgentComplaints_AB_pkey";

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

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" "BadgeCategory" NOT NULL,
    "rarity" "BadgeRarity" NOT NULL,
    "threshold" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "civic_partners" (
    "id" TEXT NOT NULL,
    "orgName" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "officialEmail" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "orgType" "CivicPartnerType" NOT NULL,
    "registrationNo" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT,
    "website" TEXT,
    "accessLevel" "AccessLevel" NOT NULL DEFAULT 'CIVIC_PARTNER',
    "status" "Status" NOT NULL DEFAULT 'ACTIVE',
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "dateOfCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "civic_partners_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "civicPartnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceType" "SurveySourceType" NOT NULL DEFAULT 'SURVEY',
    "category" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "status" "SurveyStatus" NOT NULL DEFAULT 'DRAFT',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" "QuestionType" NOT NULL,
    "options" TEXT[],
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT,
    "startedAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isComplete" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "selectedOpts" TEXT[],
    "ratingValue" INTEGER,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "blockchain_sync_events_entityType_entityId_idx" ON "blockchain_sync_events"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "blockchain_sync_events_keyPrefix_blockchainHash_key" ON "blockchain_sync_events"("keyPrefix", "blockchainHash");

-- CreateIndex
CREATE UNIQUE INDEX "badges_slug_key" ON "badges"("slug");

-- CreateIndex
CREATE INDEX "badges_category_idx" ON "badges"("category");

-- CreateIndex
CREATE INDEX "badges_rarity_idx" ON "badges"("rarity");

-- CreateIndex
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

-- CreateIndex
CREATE INDEX "user_badges_earnedAt_idx" ON "user_badges"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE UNIQUE INDEX "civic_partners_orgId_key" ON "civic_partners"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "civic_partners_officialEmail_key" ON "civic_partners"("officialEmail");

-- CreateIndex
CREATE UNIQUE INDEX "civic_partners_registrationNo_key" ON "civic_partners"("registrationNo");

-- CreateIndex
CREATE INDEX "surveys_category_idx" ON "surveys"("category");

-- CreateIndex
CREATE INDEX "surveys_status_idx" ON "surveys"("status");

-- CreateIndex
CREATE INDEX "surveys_civicPartnerId_idx" ON "surveys"("civicPartnerId");

-- CreateIndex
CREATE INDEX "survey_responses_surveyId_idx" ON "survey_responses"("surveyId");

-- CreateIndex
CREATE INDEX "Complaint_blockchainHash_idx" ON "Complaint"("blockchainHash");

-- CreateIndex
CREATE UNIQUE INDEX "_CoAssignedAgentComplaints_AB_unique" ON "_CoAssignedAgentComplaints"("A", "B");

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_civicPartnerId_fkey" FOREIGN KEY ("civicPartnerId") REFERENCES "civic_partners"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
