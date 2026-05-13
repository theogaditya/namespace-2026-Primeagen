-- DropForeignKey
ALTER TABLE "Complaint" DROP CONSTRAINT "Complaint_complainantId_fkey";

-- AlterTable
ALTER TABLE "Complaint" ALTER COLUMN "complainantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
