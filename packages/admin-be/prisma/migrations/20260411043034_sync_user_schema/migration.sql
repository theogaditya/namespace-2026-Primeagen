-- AlterTable
ALTER TABLE "Complaint" ADD COLUMN     "abuseMetadata" JSONB,
ADD COLUMN     "hasSimilarComplaints" BOOLEAN DEFAULT false,
ADD COLUMN     "qualityBreakdown" JSONB,
ADD COLUMN     "qualityScore" INTEGER DEFAULT 0,
ADD COLUMN     "similarComplaintIds" TEXT[] DEFAULT ARRAY[]::TEXT[];
