/**
 * Assignment Dispatcher
 *
 * Two responsibilities:
 * 1. `dispatchNewComplaint` — called at complaint intake. Decides whether a
 *    complaint goes to the agent claimable pool or directly to a municipal admin.
 * 2. `drainUnclaimedForAgent` — called whenever an agent's workload is decremented.
 *    Immediately fills their free slots with the oldest eligible unclaimed complaints.
 */

import type { PrismaClient } from '../prisma/generated/client/client';

// ─── Department Routing Lists ───────────────────────────────────────────────

/** Departments where complaints enter the agent claimable pool */
export const AGENT_DEPARTMENTS = [
  'INFRASTRUCTURE',
  'WATER_SUPPLY_SANITATION',
  'ELECTRICITY_POWER',
  'TRANSPORTATION',
  'POLICE_SERVICES',
  'ENVIRONMENT',
  'PUBLIC_GRIEVANCES',
] as const;

/** Departments where complaints route directly to a municipal admin */
export const MUNICIPAL_ADMIN_DEPARTMENTS = [
  'REVENUE',
  'EDUCATION',
  'HEALTH',
  'MUNICIPAL_SERVICES',
  'HOUSING_URBAN_DEVELOPMENT',
  'SOCIAL_WELFARE',
] as const;

export type AgentDepartment = (typeof AGENT_DEPARTMENTS)[number];
export type MunicipalDepartment = (typeof MUNICIPAL_ADMIN_DEPARTMENTS)[number];

export function isAgentDepartment(dept: string): dept is AgentDepartment {
  return (AGENT_DEPARTMENTS as readonly string[]).includes(dept);
}

export function isMunicipalAdminDepartment(dept: string): dept is MunicipalDepartment {
  return (MUNICIPAL_ADMIN_DEPARTMENTS as readonly string[]).includes(dept);
}

// ─── SLA Deadline Helpers ───────────────────────────────────────────────────

/** Returns milliseconds offset for SLA based on urgency */
export function slaOffsetMs(urgency: string): number {
  switch (urgency) {
    case 'CRITICAL':
      return 48 * 60 * 60 * 1000;   // 48 h
    case 'HIGH':
      return 72 * 60 * 60 * 1000;   // 72 h
    case 'MEDIUM':
      return 7 * 24 * 60 * 60 * 1000; // 7 d
    case 'LOW':
    default:
      return 14 * 24 * 60 * 60 * 1000; // 14 d
  }
}

export function computeSlaDeadline(submissionDate: Date, urgency: string): Date {
  return new Date(submissionDate.getTime() + slaOffsetMs(urgency));
}

export function slaLabel(urgency: string): string {
  switch (urgency) {
    case 'CRITICAL': return '48h (CRITICAL)';
    case 'HIGH':     return '72h (HIGH)';
    case 'MEDIUM':   return '7d (MEDIUM)';
    case 'LOW':
    default:         return '14d (LOW)';
  }
}

// ─── 1. Dispatch New Complaint ──────────────────────────────────────────────

interface DispatchResult {
  routed: boolean;
  routeTo: 'agent_pool' | 'municipal_admin' | 'unknown';
  municipalAdminId?: string;
  message: string;
}

/**
 * Called right after a complaint is created / enters admin-be.
 * Sets `slaDeadline`, `sla` label, and routes:
 *   - Municipal-admin-only depts → assign to least-loaded matching admin.
 *   - Agent depts → leave unassigned (agents claim via `/complaints/:id/assign`).
 */
export async function dispatchNewComplaint(
  prisma: PrismaClient,
  complaintId: string,
): Promise<DispatchResult> {
  const complaint = await prisma.complaint.findUnique({
    where: { id: complaintId },
    include: { location: true },
  });

  if (!complaint) {
    return { routed: false, routeTo: 'unknown', message: `Complaint ${complaintId} not found` };
  }

  const dept = complaint.assignedDepartment;
  const district = complaint.location?.district;

  // Compute SLA fields
  const slaDeadline = computeSlaDeadline(complaint.submissionDate, complaint.urgency);
  const slaString = slaLabel(complaint.urgency);

  // --- Agent department → goes into the claimable pool ---
  if (isAgentDepartment(dept)) {
    await prisma.complaint.update({
      where: { id: complaintId },
      data: { slaDeadline, sla: slaString },
    });

    console.log(`[Dispatch] Complaint ${complaintId} (${dept} / ${district ?? 'no-district'}) → agent claimable pool`);
    return { routed: true, routeTo: 'agent_pool', message: 'Placed in agent claimable pool' };
  }

  // --- Municipal-admin department → assign directly ---
  if (isMunicipalAdminDepartment(dept)) {
    if (!district) {
      // Still set SLA, but can't auto-route without district
      await prisma.complaint.update({
        where: { id: complaintId },
        data: { slaDeadline, sla: slaString },
      });
      console.warn(`[Dispatch] Complaint ${complaintId} has no district — cannot route to municipal admin`);
      return { routed: false, routeTo: 'municipal_admin', message: 'No district on complaint; SLA set but not routed' };
    }

    const admin = await prisma.departmentMunicipalAdmin.findFirst({
      where: {
        municipality: { equals: district, mode: 'insensitive' },
        department: dept as any,
        status: 'ACTIVE',
      },
      orderBy: { currentWorkload: 'asc' },
    });

    if (!admin) {
      // Fallback: try any active admin in that municipality regardless of department
      const fallbackAdmin = await prisma.departmentMunicipalAdmin.findFirst({
        where: {
          municipality: { equals: district, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        orderBy: { currentWorkload: 'asc' },
      });

      if (fallbackAdmin) {
        await prisma.$transaction([
          prisma.complaint.update({
            where: { id: complaintId },
            data: {
              managedByMunicipalAdminId: fallbackAdmin.id,
              escalationLevel: 'MUNICIPAL_ADMIN',
              slaDeadline,
              sla: slaString,
            },
          }),
          prisma.departmentMunicipalAdmin.update({
            where: { id: fallbackAdmin.id },
            data: { currentWorkload: { increment: 1 } },
          }),
        ]);
        console.log(`[Dispatch] Complaint ${complaintId} (${dept} / ${district}) → fallback municipal admin ${fallbackAdmin.fullName}`);
        return { routed: true, routeTo: 'municipal_admin', municipalAdminId: fallbackAdmin.id, message: `Routed to fallback municipal admin ${fallbackAdmin.fullName}` };
      }

      // No admin at all — just set SLA
      await prisma.complaint.update({
        where: { id: complaintId },
        data: { slaDeadline, sla: slaString },
      });
      console.warn(`[Dispatch] No municipal admin found for ${dept} / ${district}`);
      return { routed: false, routeTo: 'municipal_admin', message: `No municipal admin for ${dept} in ${district}` };
    }

    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: complaintId },
        data: {
          managedByMunicipalAdminId: admin.id,
          escalationLevel: 'MUNICIPAL_ADMIN',
          slaDeadline,
          sla: slaString,
        },
      }),
      prisma.departmentMunicipalAdmin.update({
        where: { id: admin.id },
        data: { currentWorkload: { increment: 1 } },
      }),
    ]);

    console.log(`[Dispatch] Complaint ${complaintId} (${dept} / ${district}) → municipal admin ${admin.fullName}`);
    return { routed: true, routeTo: 'municipal_admin', municipalAdminId: admin.id, message: `Routed to municipal admin ${admin.fullName}` };
  }

  // Unknown department
  await prisma.complaint.update({
    where: { id: complaintId },
    data: { slaDeadline, sla: slaString },
  });
  console.warn(`[Dispatch] Department "${dept}" not in either list for complaint ${complaintId}`);
  return { routed: false, routeTo: 'unknown', message: `Unknown department: ${dept}` };
}

// ─── 2. Drain Unclaimed Complaints for a Freed Agent ────────────────────────

/**
 * Called whenever an agent's workload decreases (resolve, escalate, etc.).
 * Fills their free slots with the oldest unclaimed complaints that match
 * their municipality + department.
 *
 * Returns how many complaints were auto-assigned in this pass.
 */
export async function drainUnclaimedForAgent(
  prisma: PrismaClient,
  agentId: string,
): Promise<number> {
  let assigned = 0;

  // Fetch agent
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent || agent.status !== 'ACTIVE') return 0;
  if (!agent.municipality) return 0;
  if (!isAgentDepartment(agent.department)) return 0;

  let freeSlots = agent.workloadLimit - agent.currentWorkload;
  if (freeSlots <= 0) return 0;

  while (freeSlots > 0) {
    // Find the oldest unclaimed complaint matching municipality + department
    const complaint = await prisma.complaint.findFirst({
      where: {
        assignedAgentId: null,
        managedByMunicipalAdminId: null,
        assignedDepartment: agent.department,
        status: 'REGISTERED',
        location: {
          district: { equals: agent.municipality, mode: 'insensitive' },
        },
      },
      orderBy: [
        { urgency: 'desc' },        // CRITICAL > HIGH > MEDIUM > LOW
        { submissionDate: 'asc' },   // oldest first within same urgency
      ],
      include: { location: true },
    });

    if (!complaint) break; // No more unclaimed complaints for this agent

    // Set SLA if missing (legacy data)
    const slaDeadline = complaint.slaDeadline ?? computeSlaDeadline(complaint.submissionDate, complaint.urgency);
    const slaString = complaint.sla ?? slaLabel(complaint.urgency);

    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: complaint.id },
        data: {
          assignedAgentId: agentId,
          status: 'UNDER_PROCESSING',
          slaDeadline,
          sla: slaString,
        },
      }),
      prisma.agent.update({
        where: { id: agentId },
        data: { currentWorkload: { increment: 1 } },
      }),
    ]);

    assigned++;
    freeSlots--;

    console.log(`[DrainUnclaimed] Auto-assigned complaint ${complaint.id} → agent ${agent.fullName} (${agent.department}/${agent.municipality})`);
  }

  if (assigned > 0) {
    console.log(`[DrainUnclaimed] Agent ${agent.fullName}: ${assigned} complaint(s) auto-filled`);
  }

  return assigned;
}
