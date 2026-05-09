/*
  Warnings:

  - You are about to drop the column `standardizedSubCategory` on the `Complaint` table. All the data in the column will be lost.
  - Added the required column `lastUpdated` to the `Complaint` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Agent" ADD COLUMN     "district" TEXT,
ALTER COLUMN "municipality" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Complaint" DROP COLUMN "standardizedSubCategory",
ADD COLUMN     "AIabusedFlag" BOOLEAN,
ADD COLUMN     "AIimageVarificationStatus" BOOLEAN,
ADD COLUMN     "AIstandardizedSubCategory" TEXT,
ADD COLUMN     "lastUpdated" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'REGISTERED',
ALTER COLUMN "isPublic" DROP DEFAULT;

-- CreateTable
CREATE TABLE "operating_states" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',

    CONSTRAINT "operating_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_municipalities" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "operating_municipalities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "operating_municipalities" ADD CONSTRAINT "operating_municipalities_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "operating_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;
