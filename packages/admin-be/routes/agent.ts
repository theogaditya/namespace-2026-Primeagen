/**
 * Agent Routes — Refactored
 *
 * All routes are prefixed with /api/agent (mounted in index.ts).
 *
 * Endpoints:
 *   Auth:     POST /login | GET /me | POST /logout
 *   Workload: GET /workload | PUT /availability
 *   My Work:  GET /my-complaints | GET /my-complaints/stats
 *   Claim:    GET /claimable-complaints | POST /complaints/:id/assign
 *   Actions:  GET /complaints | GET /complaints/:id | PUT /complaints/:id/status | PUT /complaints/:id/escalate
 *   SLA:      GET /sla-breaches
 */

import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { PrismaClient } from '../prisma/generated/client/client';
import { loginSchema } from '../lib/schemas/agentSchema';
import { authenticateAgentOnly } from '../middleware/unifiedAuth';
import { getBadgeService } from '../lib/badges/badgeService';
import {
  isAgentDepartment,
  computeSlaDeadline,
  slaLabel,
  drainUnclaimedForAgent,
} from '../lib/assignmentDispatcher';

// ─── Helper ─────────────────────────────────────────────────────────────────

const complaintIncludes = {
  category: true,
  User: true,
  location: true,
  assignedAgent: {
    select: { id: true, fullName: true, officialEmail: true },
  },
  managedByMunicipalAdmin: {
    select: { id: true, fullName: true, officialEmail: true },
  },
  upvotes: true,
} as const;

/**
 * Recursively converts BigInt values to numbers so Express can JSON-serialize
 * Prisma results that contain fields like `blockchainBlock BigInt?`.
 */
function serializeBigInt(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value === 'bigint') return Number(value);
  if (Array.isArray(value)) return value.map(serializeBigInt);
  if (typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const key of Object.keys(value)) out[key] = serializeBigInt(value[key]);
    return out;
  }
  return value;
}

/** Renames the Prisma `User` relation key to `complainant` for FE compat,
 *  and converts any BigInt fields (e.g. blockchainBlock) to numbers. */
function normaliseComplaint(raw: any) {
  if (!raw) return raw;
  const { User, ...rest } = raw;
  return serializeBigInt({ ...rest, complainant: User ?? null });
}

// ─── Factory ────────────────────────────────────────────────────────────────

export default function agentRoutes(prisma: PrismaClient) {
  const router = Router();

  // ════════════════════════════════════════════════════════════════════════
  //  AUTH
  // ════════════════════════════════════════════════════════════════════════

  // POST /login
  router.post('/login', async (req, res: any) => {
    const parse = loginSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parse.error.errors });
    }

    const { officialEmail, password } = parse.data;

    try {
      const agent = await prisma.agent.findFirst({
        where: { officialEmail },
        select: {
          id: true, email: true, fullName: true, employeeId: true,
          password: true, phoneNumber: true, officialEmail: true,
          department: true, municipality: true, accessLevel: true,
          status: true, workloadLimit: true, currentWorkload: true,
          availabilityStatus: true, dateOfCreation: true, lastLogin: true,
          resolutionRate: true, avgResolutionTime: true, collaborationMetric: true,
        },
      });

      if (!agent) return res.status(401).json({ message: 'Invalid credentials' });
      if (agent.status === 'INACTIVE') {
        return res.status(403).json({ message: 'Your account is inactive. Please contact Municipal Admin.' });
      }

      const valid = await bcrypt.compare(password, agent.password);
      if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

      await prisma.agent.update({ where: { id: agent.id }, data: { lastLogin: new Date() } });

      const secret = process.env.JWT_SECRET;
      if (!secret) return res.status(500).json({ message: 'Server misconfigured: missing JWT secret' });

      const token = jwt.sign(
        {
          id: agent.id,
          officialEmail: agent.officialEmail,
          accessLevel: agent.accessLevel,
          department: agent.department,
          municipality: agent.municipality,
          type: 'AGENT',
        },
        secret,
        { expiresIn: '24h' },
      );

      const { password: _, ...agentData } = agent;

      res.cookie('agentToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000,
      });

      return res.status(200).json({ message: 'Login successful', agent: agentData, token });
    } catch (err: any) {
      console.error('Agent login error:', err);
      return res.status(500).json({ message: 'Login failed', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
    }
  });

  // GET /me
  router.get('/me', async (req, res: any) => {
    try {
      const token = req.cookies?.agentToken || req.headers.authorization?.replace('Bearer ', '');
      if (!token) return res.status(401).json({ message: 'No token provided' });

      const secret = process.env.JWT_SECRET;
      if (!secret) return res.status(500).json({ message: 'Server misconfigured: missing JWT secret' });

      const decoded = jwt.verify(token, secret) as any;
      if (decoded.type !== 'AGENT') return res.status(403).json({ message: 'Access denied' });

      const agent = await prisma.agent.findUnique({
        where: { id: decoded.id, status: 'ACTIVE' },
        select: {
          id: true, email: true, fullName: true, employeeId: true,
          phoneNumber: true, officialEmail: true, department: true,
          municipality: true, accessLevel: true, status: true,
          workloadLimit: true, currentWorkload: true,
          availabilityStatus: true, dateOfCreation: true, lastLogin: true,
          resolutionRate: true, avgResolutionTime: true, collaborationMetric: true,
        },
      });

      if (!agent) return res.status(404).json({ message: 'Agent not found' });
      return res.status(200).json({ agent });
    } catch (err: any) {
      if (err.name === 'JsonWebTokenError') return res.status(401).json({ message: 'Invalid token' });
      if (err.name === 'TokenExpiredError') return res.status(401).json({ message: 'Token expired' });
      return res.status(500).json({ message: 'Token verification failed' });
    }
  });

  // POST /logout
  router.post('/logout', (_req, res: any) => {
    res.clearCookie('agentToken');
    return res.status(200).json({ message: 'Logged out' });
  });

  // ════════════════════════════════════════════════════════════════════════
  //  WORKLOAD & AVAILABILITY
  // ════════════════════════════════════════════════════════════════════════

  // GET /workload
  router.get('/workload', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const agent = await prisma.agent.findUnique({
        where: { id: req.admin.id },
        select: {
          currentWorkload: true, workloadLimit: true,
          availabilityStatus: true, resolutionRate: true,
        },
      });
      if (!agent) return res.status(404).json({ success: false, message: 'Agent not found' });

      // Compute SLA compliance: complaints resolved before slaDeadline / total resolved
      const [totalResolved, resolvedOnTime] = await Promise.all([
        prisma.complaint.count({
          where: { assignedAgentId: req.admin.id, status: 'COMPLETED' },
        }),
        prisma.complaint.count({
          where: {
            assignedAgentId: req.admin.id,
            status: 'COMPLETED',
            slaBreached: false,
          },
        }),
      ]);
      const slaComplianceRate = totalResolved > 0 ? Math.round((resolvedOnTime / totalResolved) * 100) : 100;

      return res.json({
        success: true,
        currentWorkload: agent.currentWorkload,
        workloadLimit: agent.workloadLimit,
        availabilityStatus: agent.availabilityStatus,
        slaComplianceRate,
      });
    } catch (err: any) {
      console.error('Workload fetch error:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch workload' });
    }
  });

  // PUT /availability
  router.put('/availability', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const { status } = req.body;
      const allowed = ['At Work', 'On Break', 'Off Duty'];
      if (!status || !allowed.includes(status)) {
        return res.status(400).json({ success: false, message: `status must be one of: ${allowed.join(', ')}` });
      }
      await prisma.agent.update({
        where: { id: req.admin.id },
        data: { availabilityStatus: status },
      });
      return res.json({ success: true, message: 'Availability updated', availabilityStatus: status });
    } catch (err: any) {
      console.error('Availability update error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update availability' });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  MY COMPLAINTS (assigned to this agent)
  // ════════════════════════════════════════════════════════════════════════

  // GET /my-complaints
  router.get('/my-complaints', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const agentId = req.admin.id;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;

      // Optional filters
      const statusFilter = req.query.status as string | undefined;
      const urgencyFilter = req.query.urgency as string | undefined;
      const slaFilter = req.query.sla as string | undefined; // "breached" | "due_soon" | "all"

      const where: any = {
        assignedAgentId: agentId,
        status: { not: 'DELETED' },
      };

      if (statusFilter) where.status = statusFilter;
      if (urgencyFilter) where.urgency = urgencyFilter;
      if (slaFilter === 'breached') where.slaBreached = true;
      if (slaFilter === 'due_soon') {
        const now = new Date();
        const soon = new Date(now.getTime() + 24 * 60 * 60 * 1000); // next 24h
        where.slaBreached = false;
        where.slaDeadline = { gte: now, lte: soon };
      }

      const [complaintsRaw, total] = await Promise.all([
        prisma.complaint.findMany({
          where,
          include: complaintIncludes,
          orderBy: { submissionDate: 'desc' },
          skip,
          take: limit,
        }),
        prisma.complaint.count({ where }),
      ]);

      const complaints = complaintsRaw.map(normaliseComplaint);

      return res.json({
        success: true,
        complaints,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err: any) {
      console.error('Error fetching my-complaints:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch assigned complaints' });
    }
  });

  // GET /my-complaints/stats
  router.get('/my-complaints/stats', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const agentId = req.admin.id;

      const [total, inProgress, completed, onHold, slaBreached] = await Promise.all([
        prisma.complaint.count({ where: { assignedAgentId: agentId, status: { not: 'DELETED' } } }),
        prisma.complaint.count({ where: { assignedAgentId: agentId, status: 'UNDER_PROCESSING' } }),
        prisma.complaint.count({ where: { assignedAgentId: agentId, status: 'COMPLETED' } }),
        prisma.complaint.count({ where: { assignedAgentId: agentId, status: 'ON_HOLD' } }),
        prisma.complaint.count({ where: { assignedAgentId: agentId, slaBreached: true, status: { notIn: ['COMPLETED', 'REJECTED', 'DELETED'] } } }),
      ]);

      const resolvedOnTime = await prisma.complaint.count({
        where: { assignedAgentId: agentId, status: 'COMPLETED', slaBreached: false },
      });
      const slaComplianceRate = completed > 0 ? Math.round((resolvedOnTime / completed) * 100) : 100;

      return res.json({
        success: true,
        stats: { total, inProgress, completed, onHold, slaBreached, slaComplianceRate },
      });
    } catch (err: any) {
      console.error('Error fetching my-complaints/stats:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  CLAIMABLE COMPLAINTS
  // ════════════════════════════════════════════════════════════════════════

  // GET /claimable-complaints
  router.get('/claimable-complaints', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: req.admin.id } });
      if (!agent || !agent.municipality) {
        return res.status(400).json({ success: false, message: 'Agent has no municipality set' });
      }

      if (!isAgentDepartment(agent.department)) {
        return res.json({ success: true, complaints: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skip = (page - 1) * limit;
      const urgencyFilter = req.query.urgency as string | undefined;

      const where: any = {
        assignedAgentId: null,
        managedByMunicipalAdminId: null,
        assignedDepartment: agent.department,
        status: 'REGISTERED',
        location: {
          district: { equals: agent.municipality, mode: 'insensitive' },
        },
      };
      if (urgencyFilter) where.urgency = urgencyFilter;

      const [complaintsRaw, total] = await Promise.all([
        prisma.complaint.findMany({
          where,
          include: complaintIncludes,
          orderBy: [{ urgency: 'desc' }, { submissionDate: 'asc' }],
          skip,
          take: limit,
        }),
        prisma.complaint.count({ where }),
      ]);

      const complaints = complaintsRaw.map(normaliseComplaint);

      return res.json({
        success: true,
        complaints,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err: any) {
      console.error('Error fetching claimable complaints:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch claimable complaints' });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  CLAIM / ASSIGN COMPLAINT
  // ════════════════════════════════════════════════════════════════════════

  // GET /me/complaints — complaints assigned to the authenticated agent
  router.get('/me/complaints', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const complaints = await prisma.complaint.findMany({
        where: { assignedAgentId: req.admin.id },
      });
      return res.status(200).json(complaints);
    } catch (err: any) {
      console.error('Error fetching me/complaints:', err);
      return res.status(500).json({ message: 'Failed to fetch complaints' });
    }
  });

  // PUT /me/workload/dec — decrement the authenticated agent's workload by 1
  router.put('/me/workload/dec', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const agent = await prisma.agent.findUnique({ where: { id: req.admin.id } });
      if (!agent) return res.status(404).json({ message: 'Agent not found' });
      if (agent.status === 'INACTIVE') {
        return res.status(400).json({ message: 'Agent is not active' });
      }
      if ((agent.currentWorkload ?? 0) > 0) {
        await prisma.agent.update({
          where: { id: agent.id },
          data: { currentWorkload: { decrement: 1 } },
        });
      }
      return res.status(200).json({
        message: 'Workload decremented',
        currentWorkload: Math.max(0, (agent.currentWorkload ?? 0) - 1),
      });
    } catch (err: any) {
      console.error('Error decrementing workload:', err);
      return res.status(500).json({ message: 'Failed to decrement workload' });
    }
  });

  // POST /complaints/:id/assign  (kept at /assign path for FE compat)
  router.post('/complaints/:id/assign', authenticateAgentOnly, async (req: any, res: any) => {
    const complaintId = req.params.id;
    const agentId = req.admin.id;

    try {
      // 1. Fetch agent
      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent) return res.status(404).json({ message: 'Agent not found' });
      // Only block explicitly inactive agents; missing status is treated as active
      if (agent.status === 'INACTIVE') return res.status(403).json({ message: 'Agent account is not active' });

      // 2. Workload check (fail fast before fetching complaint)
      if (agent.currentWorkload >= agent.workloadLimit) {
        return res.status(400).json({ message: 'Workload limit reached' });
      }

      // 3. Fetch complaint with location
      const complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: { location: true },
      });
      if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

      // 4. Already assigned?
      if (complaint.assignedAgentId) {
        return res.status(400).json({ message: 'Complaint already assigned' });
      }
      if (complaint.managedByMunicipalAdminId) {
        return res.status(400).json({ message: 'Complaint is already managed by a municipal admin' });
      }

      // 5. Department match (only enforce when both sides have a department set)
      if (complaint.assignedDepartment && agent.department &&
          complaint.assignedDepartment !== agent.department) {
        return res.status(403).json({
          message: `Department mismatch: complaint is ${complaint.assignedDepartment}, you are ${agent.department}`,
        });
      }

      // 6. Department must be in agent-eligible list (only when dept is present)
      if (complaint.assignedDepartment && !isAgentDepartment(complaint.assignedDepartment)) {
        return res.status(403).json({
          message: `Department ${complaint.assignedDepartment} routes directly to municipal admins, agents cannot claim it`,
        });
      }

      // 7. Municipality / district match (only when both values are available)
      const complaintDistrict = complaint.location?.district;
      if (complaintDistrict && agent.municipality &&
          complaintDistrict.toLowerCase() !== agent.municipality.toLowerCase()) {
        return res.status(403).json({
          message: `Municipality mismatch: complaint is in ${complaintDistrict}, you are in ${agent.municipality}`,
        });
      }

      // 8. Compute SLA deadline if not already set
      const slaDeadline = complaint.slaDeadline ??
        (complaint.submissionDate ? computeSlaDeadline(complaint.submissionDate, complaint.urgency) : null);
      const slaString = complaint.sla ?? slaLabel(complaint.urgency);

      // 9. Transaction: assign + increment workload
      await prisma.$transaction([
        prisma.complaint.update({
          where: { id: complaintId },
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

      console.log(`[Agent Claim] Agent ${agent.fullName} claimed complaint ${complaintId}`);
      return res.status(200).json({ message: 'Complaint assigned successfully' });
    } catch (err: any) {
      console.error('Assignment error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  COMPLAINT DETAIL & STATUS MANAGEMENT
  // ════════════════════════════════════════════════════════════════════════

  // GET /complaints  (all non-deleted — broad agent view)
  router.get('/complaints', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const complaintsRaw = await prisma.complaint.findMany({
        where: { status: { not: 'DELETED' } },
        include: { category: true, User: true },
        orderBy: { submissionDate: 'desc' },
      });
      const complaints = complaintsRaw.map(normaliseComplaint);
      return res.json({ success: true, complaints });
    } catch (err: any) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
    }
  });

  // GET /complaints/:id
  router.get('/complaints/:id', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const complaintRaw = await prisma.complaint.findUnique({
        where: { id: req.params.id },
        include: { ...complaintIncludes },
      });
      if (!complaintRaw) return res.status(404).json({ success: false, message: 'Complaint not found' });

      return res.json({ success: true, complaint: normaliseComplaint(complaintRaw) });
    } catch (err: any) {
      console.error('Error fetching complaint details:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch complaint details' });
    }
  });

  // PUT /complaints/:id/status
  router.put('/complaints/:id/status', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { status, escalate } = req.body;
      const isEscalation = escalate === true || escalate === 'true';

      const validStatuses = [
        'REGISTERED', 'UNDER_PROCESSING', 'FORWARDED',
        'ON_HOLD', 'COMPLETED', 'REJECTED',
        'ESCALATED_TO_MUNICIPAL_LEVEL',
      ];

      const newStatus = isEscalation ? 'ESCALATED_TO_MUNICIPAL_LEVEL' : status;

      if (!newStatus || !validStatuses.includes(newStatus)) {
        return res.status(400).json({ success: false, message: `Invalid status. Valid: ${validStatuses.join(', ')}` });
      }

      const existing = await prisma.complaint.findUnique({ where: { id } });
      if (!existing) return res.status(404).json({ success: false, message: 'Complaint not found' });

      // Only the assigned agent can update
      if (existing.assignedAgentId !== req.admin.id) {
        return res.status(403).json({ success: false, message: 'Not authorized to update this complaint' });
      }

      // Agent cannot modify a complaint that has been escalated to a higher authority
      if (existing.status === 'ESCALATED_TO_MUNICIPAL_LEVEL' || existing.status === 'ESCALATED_TO_STATE_LEVEL') {
        return res.status(403).json({
          success: false,
          message: 'This complaint has been escalated and can only be updated by the receiving authority.',
        });
      }

      const updateData: any = { status: newStatus };
      if (newStatus === 'COMPLETED') updateData.dateOfResolution = new Date();
      // Clear resolution date when re-opening a completed complaint
      if (existing.status === 'COMPLETED' && newStatus !== 'COMPLETED') {
        updateData.dateOfResolution = null;
      }

      const updatedRaw = await prisma.complaint.update({
        where: { id },
        data: updateData,
        include: complaintIncludes,
      });

      // Workload management based on status transition
      const wasTerminal = existing.status === 'COMPLETED' || existing.status === 'REJECTED';
      const isNowTerminal = newStatus === 'COMPLETED' || newStatus === 'REJECTED';

      if (!wasTerminal && isNowTerminal && existing.assignedAgentId) {
        // Moving to a terminal state — free up the workload slot
        await prisma.agent.update({
          where: { id: existing.assignedAgentId },
          data: { currentWorkload: { decrement: 1 } },
        });

        // Award badges on COMPLETED
        if (newStatus === 'COMPLETED' && existing.complainantId) {
          try {
            const badgeService = getBadgeService(prisma);
            const newBadges = await badgeService.checkBadgesAfterResolution(existing.complainantId);
            if (newBadges.length > 0) {
              console.log(`[BadgeService] Awarded ${newBadges.length} badge(s) to user ${existing.complainantId}`);
            }
          } catch (e) {
            console.error('Badge check failed (non-blocking):', e);
          }
        }

        // Reactive drain: fill freed slot with next unclaimed complaint
        try {
          await drainUnclaimedForAgent(prisma, existing.assignedAgentId);
        } catch (e) {
          console.error('[DrainUnclaimed] Error after status update:', e);
        }
      } else if (wasTerminal && !isNowTerminal && existing.assignedAgentId) {
        // Re-opening from a terminal state — add complaint back to active workload
        await prisma.agent.update({
          where: { id: existing.assignedAgentId },
          data: { currentWorkload: { increment: 1 } },
        });
      }

      return res.json({
        success: true,
        message: isEscalation ? 'Complaint escalated to municipal level' : 'Status updated',
        complaint: normaliseComplaint(updatedRaw),
      });
    } catch (err: any) {
      console.error('Error updating complaint status:', err);
      return res.status(500).json({ success: false, message: 'Failed to update complaint status' });
    }
  });

  // PUT /complaints/:id/escalate
  router.put('/complaints/:id/escalate', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const agentId = req.admin.id;

      // 1. Fetch complaint with location
      const complaint = await prisma.complaint.findUnique({
        where: { id },
        include: { location: true },
      });
      if (!complaint) return res.status(404).json({ success: false, message: 'Complaint not found' });

      if (complaint.assignedAgentId !== agentId) {
        return res.status(403).json({ success: false, message: 'Not authorized — not assigned to you' });
      }

      const agent = await prisma.agent.findUnique({ where: { id: agentId } });
      if (!agent || agent.status !== 'ACTIVE') {
        return res.status(400).json({ success: false, message: 'Agent not active' });
      }

      const district = complaint.location?.district;
      if (!district) {
        return res.status(400).json({ success: false, message: 'Complaint has no district information' });
      }

      // 2. Find matching municipal admin (least loaded)
      const municipalAdmin = await prisma.departmentMunicipalAdmin.findFirst({
        where: {
          municipality: { equals: district, mode: 'insensitive' },
          status: 'ACTIVE',
        },
        orderBy: { currentWorkload: 'asc' },
        select: { id: true, fullName: true, officialEmail: true },
      });

      if (!municipalAdmin) {
        return res.status(404).json({ success: false, message: `No municipal admin found for "${district}"` });
      }

      // 3. Transaction: update complaint + adjust workloads
      const [updatedRaw] = await prisma.$transaction([
        prisma.complaint.update({
          where: { id },
          data: {
            status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
            escalationLevel: 'MUNICIPAL_ADMIN',
            managedByMunicipalAdminId: municipalAdmin.id,
            // Keep assignedAgentId for history
          },
          include: complaintIncludes,
        }),
        prisma.agent.update({
          where: { id: agentId },
          data: { currentWorkload: { decrement: 1 } },
        }),
        prisma.departmentMunicipalAdmin.update({
          where: { id: municipalAdmin.id },
          data: { currentWorkload: { increment: 1 } },
        }),
      ]);

      console.log(`[Escalate] Complaint ${id} → municipal admin ${municipalAdmin.fullName} (${district})`);

      // Reactive drain: fill freed agent slot
      try {
        await drainUnclaimedForAgent(prisma, agentId);
      } catch (e) {
        console.error('[DrainUnclaimed] Error after escalation:', e);
      }

      return res.json({
        success: true,
        message: `Complaint escalated to municipal admin ${municipalAdmin.fullName}`,
        complaint: normaliseComplaint(updatedRaw),
      });
    } catch (err: any) {
      console.error('[Escalate] Error:', err);
      return res.status(500).json({ success: false, message: 'Failed to escalate complaint' });
    }
  });

  // ════════════════════════════════════════════════════════════════════════
  //  SLA BREACHES
  // ════════════════════════════════════════════════════════════════════════

  // GET /sla-breaches
  router.get('/sla-breaches', authenticateAgentOnly, async (req: any, res: any) => {
    try {
      const agentId = req.admin.id;

      const breachedRaw = await prisma.complaint.findMany({
        where: {
          assignedAgentId: agentId,
          slaBreached: true,
          status: { notIn: ['COMPLETED', 'REJECTED', 'DELETED'] },
        },
        include: complaintIncludes,
        orderBy: { slaDeadline: 'asc' },
      });

      return res.json({
        success: true,
        count: breachedRaw.length,
        complaints: breachedRaw.map(normaliseComplaint),
      });
    } catch (err: any) {
      console.error('Error fetching SLA breaches:', err);
      return res.status(500).json({ success: false, message: 'Failed to fetch SLA breaches' });
    }
  });

  return router;
}
