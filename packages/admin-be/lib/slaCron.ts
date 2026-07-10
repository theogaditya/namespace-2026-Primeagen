/**
 * SLA Cron — periodic breach detection & auto-escalation
 *
 * Runs every 15 minutes via setInterval (matching existing project pattern).
 *
 * Each tick:
 *   1. Finds all complaints where slaDeadline < NOW and slaBreached = false
 *      (excluding terminal statuses: COMPLETED, REJECTED, DELETED).
 *   2. Marks them slaBreached = true.
 *   3. For CRITICAL / HIGH urgency breaches that are assigned to agents,
 *      auto-escalates to the least-loaded municipal admin in the same district.
 *   4. As a safety-net, calls drainUnclaimedForAgent for any agents whose
 *      workload decreased due to escalation.
 */

import type { PrismaClient } from '../prisma/generated/client/client';
import { drainUnclaimedForAgent } from './assignmentDispatcher';

let slaCronInterval: NodeJS.Timeout | null = null;

// ─── Core tick ──────────────────────────────────────────────────────────────

async function slaTick(prisma: PrismaClient) {
  const now = new Date();

  try {
    // 1. Find newly-breached complaints
    const breached = await prisma.complaint.findMany({
      where: {
        slaBreached: false,
        slaDeadline: { lt: now },
        status: { notIn: ['COMPLETED', 'REJECTED', 'DELETED'] },
      },
      include: { location: true },
    });

    if (breached.length === 0) return;

    console.log(`[SLA-Cron] Found ${breached.length} newly breached complaint(s)`);

    // 2. Mark all as breached in one query
    const breachedIds = breached.map((c) => c.id);
    await prisma.complaint.updateMany({
      where: { id: { in: breachedIds } },
      data: { slaBreached: true },
    });

    // 3. Auto-escalate CRITICAL & HIGH that are assigned to agents
    const escalatable = breached.filter(
      (c) =>
        (c.urgency === 'CRITICAL' || c.urgency === 'HIGH') &&
        c.assignedAgentId !== null &&
        c.managedByMunicipalAdminId === null,
    );

    const agentIdsToRefill = new Set<string>();

    for (const complaint of escalatable) {
      const district = complaint.location?.district;
      if (!district) continue;

      // Find least-loaded municipal admin in the same district
      const municipalAdmin = await prisma.departmentMunicipalAdmin.findFirst({
        where: {
          municipality: { equals: district, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        orderBy: { currentWorkload: 'asc' },
        select: { id: true, fullName: true },
      });

      if (!municipalAdmin) {
        console.warn(`[SLA-Cron] No municipal admin for district "${district}", skipping escalation of ${complaint.id}`);
        continue;
      }

      try {
        await prisma.$transaction(async (tx) => {
          await tx.complaint.update({
            where: { id: complaint.id },
            data: {
              status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
              escalationLevel: 'MUNICIPAL_ADMIN',
              managedByMunicipalAdminId: municipalAdmin.id,
            },
          });
          await tx.agent.update({
            where: { id: complaint.assignedAgentId! },
            data: { currentWorkload: { decrement: 1 } },
          });
          await tx.departmentMunicipalAdmin.update({
            where: { id: municipalAdmin.id },
            data: { currentWorkload: { increment: 1 } },
          });
        });

        agentIdsToRefill.add(complaint.assignedAgentId!);
        console.log(
          `[SLA-Cron] Auto-escalated ${complaint.id} (${complaint.urgency}) → ${municipalAdmin.fullName}`,
        );
      } catch (txErr) {
        console.error(`[SLA-Cron] Failed to escalate ${complaint.id}:`, txErr);
      }
    }

    // 4. Reactive drain for freed agents
    for (const agentId of agentIdsToRefill) {
      try {
        await drainUnclaimedForAgent(prisma, agentId);
      } catch (e) {
        console.error(`[SLA-Cron] DrainUnclaimed failed for agent ${agentId}:`, e);
      }
    }
  } catch (err) {
    console.error('[SLA-Cron] Tick error:', err);
  }
}

// ─── Start / Stop ───────────────────────────────────────────────────────────

const SLA_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

export function startSlaCron(prisma: PrismaClient) {
  if (slaCronInterval) {
    console.log('[SLA-Cron] Already running');
    return;
  }

  console.log(`[SLA-Cron] Starting — will tick every ${SLA_INTERVAL_MS / 60000} minutes`);

  // Run once immediately, then on interval
  slaTick(prisma).catch((err) => console.error('[SLA-Cron] Initial tick error:', err));

  slaCronInterval = setInterval(() => {
    slaTick(prisma).catch((err) => console.error('[SLA-Cron] Tick error:', err));
  }, SLA_INTERVAL_MS);
}

export function stopSlaCron() {
  if (slaCronInterval) {
    clearInterval(slaCronInterval);
    slaCronInterval = null;
    console.log('[SLA-Cron] Stopped');
  }
}
