/*
  Warnings:

  - You are about to drop the column `createdAt` on the `User` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phoneNumber]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `aadhaarId` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dateOfBirth` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastUpdated` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `password` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phoneNumber` to the `User` table without a default value. This is not possible if the table is not empty.
  - Made the column `name` on table `User` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "userStatus" AS ENUM ('ACTIVE', 'DELETED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "Departments" AS ENUM ('INFRASTRUCTURE', 'EDUCATION', 'REVENUE', 'HEALTH', 'WATER_SUPPLY_SANITATION', 'ELECTRICITY_POWER', 'TRANSPORTATION', 'MUNICIPAL_SERVICES', 'POLICE_SERVICES', 'ENVIRONMENT', 'HOUSING_URBAN_DEVELOPMENT', 'SOCIAL_WELFARE', 'PUBLIC_GRIEVANCES');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('REGISTERED', 'UNDER_PROCESSING', 'FORWARDED', 'ON_HOLD', 'COMPLETED', 'REJECTED', 'ESCALATED_TO_MUNICIPAL_LEVEL', 'ESCALATED_TO_STATE_LEVEL', 'DELETED');

-- CreateEnum
CREATE TYPE "ComplaintUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt",
ADD COLUMN     "aadhaarId" TEXT NOT NULL,
ADD COLUMN     "consentDataCollection" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "dateOfCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "disability" TEXT DEFAULT 'None',
ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "password" TEXT NOT NULL,
ADD COLUMN     "phoneNumber" TEXT NOT NULL,
ADD COLUMN     "preferredLanguage" TEXT NOT NULL DEFAULT 'English',
ADD COLUMN     "status" "userStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "name" SET NOT NULL;

-- CreateTable
CREATE TABLE "user_locations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "municipal" TEXT NOT NULL,

    CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" TEXT NOT NULL,
    "submissionDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "complainantId" TEXT NOT NULL,
    "category" "Departments" NOT NULL,
    "subCategory" TEXT NOT NULL,
    "standardizedSubCategory" TEXT,
    "description" TEXT NOT NULL,
    "urgency" "ComplaintUrgency" NOT NULL DEFAULT 'LOW',
    "attachmentUrl" TEXT,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'UNDER_PROCESSING',
    "upvoteCount" INTEGER NOT NULL DEFAULT 0,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_locations" (
    "id" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "street" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "complaint_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "upvotes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "complaintId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "upvotes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_locations_userId_key" ON "user_locations"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "complaint_locations_complaintId_key" ON "complaint_locations"("complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "upvotes_userId_complaintId_key" ON "upvotes"("userId", "complaintId");

-- CreateIndex
CREATE UNIQUE INDEX "User_phoneNumber_key" ON "User"("phoneNumber");

-- AddForeignKey
ALTER TABLE "user_locations" ADD CONSTRAINT "user_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_complainantId_fkey" FOREIGN KEY ("complainantId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaint_locations" ADD CONSTRAINT "complaint_locations_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "upvotes" ADD CONSTRAINT "upvotes_complaintId_fkey" FOREIGN KEY ("complaintId") REFERENCES "Complaint"("id") ON DELETE CASCADE ON UPDATE CASCADE;
