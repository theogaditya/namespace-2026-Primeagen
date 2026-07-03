import type { PrismaClient } from "../../prisma/generated/client/client";

/**
 * Raw complaint data shape returned by the bulk fetch.
 * Every field is safe for read-only analytics -no PII beyond description.
 */
export interface RawComplaintData {
  id: string;
  seq: number;
  description: string;
  subCategory: string;
  status: string;
  urgency: string;
  upvoteCount: number;
  qualityScore: number | null;
  isDuplicate: boolean | null;
  isPublic: boolean;
  submissionDate: Date;
  dateOfResolution: Date | null;
  sla: string | null;
  assignedDepartment: string;
  escalationLevel: string | null;
  isEscalatedToState: boolean;
  isEscalatedToSuperState: boolean;
  isAbused: boolean | null;
  category: string;
  district: string | null;
  city: string | null;
  pin: string | null;
}

/**
 * Fetches all non-deleted complaints from the database in a single read-only
 * Prisma query. Returns a flat array of `RawComplaintData` ready for stats
 * computation. No LLM involved.
 */
export async function fetchAllComplaintsForReport(
  db: PrismaClient
): Promise<RawComplaintData[]> {
  const complaints = await db.complaint.findMany({
    where: {
      status: { not: "DELETED" },
    },
    select: {
      id: true,
      seq: true,
      description: true,
      subCategory: true,
      status: true,
      urgency: true,
      upvoteCount: true,
      qualityScore: true,
      isDuplicate: true,
      isPublic: true,
      submissionDate: true,
      dateOfResolution: true,
      sla: true,
      assignedDepartment: true,
      escalationLevel: true,
      escalatedToStateAdminId: true,
      escalatedToSuperStateAdminId: true,
      AIabusedFlag: true,
      category: { select: { name: true } },
      location: { select: { district: true, city: true, pin: true } },
    },
    orderBy: { submissionDate: "desc" },
  });

  return complaints.map((c) => ({
    id: c.id,
    seq: c.seq,
    description: c.description,
    subCategory: c.subCategory,
    status: c.status,
    urgency: c.urgency,
    upvoteCount: c.upvoteCount,
    qualityScore: c.qualityScore ?? null,
    isDuplicate: c.isDuplicate ?? null,
    isPublic: c.isPublic,
    submissionDate: c.submissionDate,
    dateOfResolution: c.dateOfResolution ?? null,
    sla: c.sla ?? null,
    assignedDepartment: c.assignedDepartment,
    escalationLevel: c.escalationLevel ?? null,
    isEscalatedToState: !!c.escalatedToStateAdminId,
    isEscalatedToSuperState: !!c.escalatedToSuperStateAdminId,
    isAbused: c.AIabusedFlag ?? null,
    category: c.category.name,
    district: c.location?.district ?? null,
    city: c.location?.city ?? null,
    pin: c.location?.pin ?? null,
  }));
}
