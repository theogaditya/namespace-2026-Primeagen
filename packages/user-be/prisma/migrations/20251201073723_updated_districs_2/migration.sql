/*
  Warnings:

  - You are about to drop the `operating_municipalities` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "operating_municipalities" DROP CONSTRAINT "operating_municipalities_stateId_fkey";

-- DropTable
DROP TABLE "operating_municipalities";

-- CreateTable
CREATE TABLE "operating_districts" (
    "id" TEXT NOT NULL,
    "stateId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "state" TEXT NOT NULL,

    CONSTRAINT "operating_districts_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "operating_districts" ADD CONSTRAINT "operating_districts_stateId_fkey" FOREIGN KEY ("stateId") REFERENCES "operating_states"("id") ON DELETE CASCADE ON UPDATE CASCADE;
