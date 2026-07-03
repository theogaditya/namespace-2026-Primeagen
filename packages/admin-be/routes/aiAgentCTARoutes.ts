/**
 * AI Agent CTA (Call-To-Action) Routes
 * ────────────────────────────────────
 * These routes are the backend execution layer for all AI agent action
 * suggestions produced by the ComplaintReportAgent / ActionSuggestionAgent.
 *
 * Accessible by: STATE_ADMIN, SUPER_ADMIN
 * Mounted at:    /api/agent-cta
 *
 * Unified endpoint:           POST /api/agent-cta/execute
 * Individual endpoints:
 *   POST /api/agent-cta/escalate-complaint
 *   POST /api/agent-cta/update-complaint-status
 *   POST /api/agent-cta/create-announcement
 *   POST /api/agent-cta/trigger-auto-assign
 *   POST /api/agent-cta/update-municipal-admin-status
 *   POST /api/agent-cta/navigate   (no-op; ack only)
 */

import express from 'express';
import { PrismaClient } from '../prisma/generated/client/client';
import {
  authenticateAdmin,
  requireAdminType,
  type AuthenticatedRequest,
} from '../middleware/unifiedAuth';
import { processAutoAssignBatch } from './autoAssign';

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Convert BigInt values returned by Prisma into plain strings so Express can serialize them. */
function safeJson(obj: unknown): unknown {
  return JSON.parse(JSON.stringify(obj, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)));
}

/** Middleware stack shared by every CTA route – authenticates and allows STATE_ADMIN + SUPER_ADMIN. */
// Middleware is applied explicitly per-route to keep types and stack ordering predictable.

// ── Route builder ────────────────────────────────────────────────────────────

export default function aiAgentCTARoutes(prisma: PrismaClient) {
  const router = express.Router();

  // ══════════════════════════════════════════════════════════════════════════
  // 1. ESCALATE_COMPLAINT
  //    POST /api/agent-cta/escalate-complaint
  //    Body: { complaintId, rationale?, urgency? }
  // ══════════════════════════════════════════════════════════════════════════
  router.post('/escalate-complaint', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    try {
      const { complaintId, rationale, urgency } = req.body;
      if (!complaintId) {
        return res.status(400).json({ success: false, message: 'complaintId is required' });
      }

      const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: 'ESCALATED_TO_STATE_LEVEL',
          escalatedToStateAdminId: (req as AuthenticatedRequest).admin.id,
        },
      });

      console.log(
        `[AIAgentCTA] ESCALATE_COMPLAINT complaintId=${complaintId} by admin=${(req as AuthenticatedRequest).admin.id} urgency=${urgency} rationale="${rationale}"`
      );

      return res.json({
        success: true,
        message: 'Complaint escalated to state level',
        complaint: safeJson(updated),
        actionType: 'ESCALATE_COMPLAINT',
      });
    } catch (error: any) {
      console.error('[AIAgentCTA] escalate-complaint error:', error);
      return res.status(500).json({ success: false, message: error.message ?? 'Failed to escalate complaint' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 2. UPDATE_COMPLAINT_STATUS
  //    POST /api/agent-cta/update-complaint-status
  //    Body: { complaintId, newStatus, rationale?, urgency? }
  // ══════════════════════════════════════════════════════════════════════════
  const VALID_STATUSES = [
    'REGISTERED',
    'UNDER_PROCESSING',
    'FORWARDED',
    'ON_HOLD',
    'COMPLETED',
    'REJECTED',
    'ESCALATED_TO_MUNICIPAL_LEVEL',
    'ESCALATED_TO_STATE_LEVEL',
  ] as const;

  router.post('/update-complaint-status', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    try {
      const { complaintId, newStatus, rationale, urgency } = req.body;

      if (!complaintId || !newStatus) {
        return res.status(400).json({ success: false, message: 'complaintId and newStatus are required' });
      }
      if (!VALID_STATUSES.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid values: ${VALID_STATUSES.join(', ')}`,
        });
      }

      const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
      if (!complaint) {
        return res.status(404).json({ success: false, message: 'Complaint not found' });
      }

      const updated = await prisma.complaint.update({
        where: { id: complaintId },
        data: {
          status: newStatus,
          ...(newStatus === 'COMPLETED' ? { dateOfResolution: new Date() } : {}),
        },
        include: {
          User: true,
          category: true,
          location: true,
        },
      });

      console.log(
        `[AIAgentCTA] UPDATE_COMPLAINT_STATUS complaintId=${complaintId} newStatus=${newStatus} by admin=${(req as AuthenticatedRequest).admin.id} urgency=${urgency}`
      );

      const { User, ...rest } = updated as any;
      return res.json({
        success: true,
        message: `Complaint status updated to ${newStatus}`,
        complaint: safeJson({ ...rest, complainant: User || null }),
        actionType: 'UPDATE_COMPLAINT_STATUS',
      });
    } catch (error: any) {
      console.error('[AIAgentCTA] update-complaint-status error:', error);
      return res.status(500).json({ success: false, message: error.message ?? 'Failed to update complaint status' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 3. CREATE_ANNOUNCEMENT
  //    POST /api/agent-cta/create-announcement
  //    Body: { title, content, municipality, priority?, rationale?, urgency? }
  //
  //  The announcements table has a FK → DepartmentMunicipalAdmin.
  //  We resolve this by finding an active municipal admin for the target
  //  municipality, falling back to any active municipal admin in the system.
  // ══════════════════════════════════════════════════════════════════════════
  router.post('/create-announcement', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    try {
      const { title, content, municipality, priority = 5, rationale, urgency } = req.body;

      if (!title || !municipality) {
        return res.status(400).json({ success: false, message: 'title and municipality are required' });
      }

      // Resolve createdById: prefer an admin in the same municipality; fall back to any active admin.
      let proxyCandidates = await prisma.departmentMunicipalAdmin.findMany({
        where: { municipality, status: 'ACTIVE' },
        select: { id: true },
        take: 1,
      });

      if (proxyCandidates.length === 0) {
        proxyCandidates = await prisma.departmentMunicipalAdmin.findMany({
          where: { status: 'ACTIVE' },
          select: { id: true },
          orderBy: { dateOfCreation: 'asc' },
          take: 1,
        });
      }

      if (proxyCandidates.length === 0) {
        return res.status(422).json({
          success: false,
          message: 'No active municipal admin found to associate the announcement with.',
        });
      }

      // We ensured proxyCandidates has at least one element above, assert non-null here for TS.
      const createdById = proxyCandidates[0]!.id;

      const announcement = await prisma.announcement.create({
        data: {
          title: title.slice(0, 100),
          content: (content ?? '').slice(0, 280),
          municipality,
          priority: Math.min(10, Math.max(0, Number(priority) || 5)),
          createdById,
        },
      });

      console.log(
        `[AIAgentCTA] CREATE_ANNOUNCEMENT id=${announcement.id} municipality=${municipality} by admin=${(req as AuthenticatedRequest).admin.id} urgency=${urgency} rationale="${rationale}"`
      );

      return res.status(201).json({
        success: true,
        message: 'Announcement created successfully',
        announcement: safeJson(announcement),
        actionType: 'CREATE_ANNOUNCEMENT',
      });
    } catch (error: any) {
      console.error('[AIAgentCTA] create-announcement error:', error);
      return res.status(500).json({ success: false, message: error.message ?? 'Failed to create announcement' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 4. TRIGGER_AUTO_ASSIGN
  //    POST /api/agent-cta/trigger-auto-assign
  //    Body: { batchSize?, rationale?, urgency? }
  // ══════════════════════════════════════════════════════════════════════════
  router.post('/trigger-auto-assign', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    try {
      const batchSize = Math.min(50, Math.max(1, Number(req.body.batchSize) || 10));
      const { rationale, urgency } = req.body;

      console.log(
        `[AIAgentCTA] TRIGGER_AUTO_ASSIGN batchSize=${batchSize} by admin=${(req as AuthenticatedRequest).admin.id} urgency=${urgency} rationale="${rationale}"`
      );

      const result = await processAutoAssignBatch(batchSize);

      return res.json({
        success: true,
        message: `Auto-assign batch complete. Processed ${result.processed} complaints.`,
        result: safeJson(result),
        actionType: 'TRIGGER_AUTO_ASSIGN',
      });
    } catch (error: any) {
      console.error('[AIAgentCTA] trigger-auto-assign error:', error);
      return res.status(500).json({ success: false, message: error.message ?? 'Failed to trigger auto-assign' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 5. UPDATE_MUNICIPAL_ADMIN_STATUS
  //    POST /api/agent-cta/update-municipal-admin-status
  //    Body: { municipalAdminId, newStatus, rationale?, urgency? }
  // ══════════════════════════════════════════════════════════════════════════
  router.post('/update-municipal-admin-status', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    try {
      const { municipalAdminId, newStatus, rationale, urgency } = req.body;

      if (!municipalAdminId || !newStatus) {
        return res.status(400).json({ success: false, message: 'municipalAdminId and newStatus are required' });
      }
      if (!['ACTIVE', 'INACTIVE'].includes(newStatus)) {
        return res.status(400).json({ success: false, message: 'newStatus must be ACTIVE or INACTIVE' });
      }

      const existing = await prisma.departmentMunicipalAdmin.findUnique({
        where: { id: municipalAdminId },
      });
      if (!existing) {
        return res.status(404).json({ success: false, message: 'Municipal admin not found' });
      }

      const updated = await prisma.departmentMunicipalAdmin.update({
        where: { id: municipalAdminId },
        data: { status: newStatus },
        select: {
          id: true,
          fullName: true,
          officialEmail: true,
          municipality: true,
          status: true,
        },
      });

      console.log(
        `[AIAgentCTA] UPDATE_MUNICIPAL_ADMIN_STATUS adminId=${municipalAdminId} newStatus=${newStatus} by admin=${(req as AuthenticatedRequest).admin.id} urgency=${urgency} rationale="${rationale}"`
      );

      return res.json({
        success: true,
        message: `Municipal admin ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'}`,
        data: safeJson(updated),
        actionType: 'UPDATE_MUNICIPAL_ADMIN_STATUS',
      });
    } catch (error: any) {
      console.error('[AIAgentCTA] update-municipal-admin-status error:', error);
      return res.status(500).json({ success: false, message: error.message ?? 'Failed to update municipal admin status' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 6. NAVIGATE (frontend-only; backend acks and returns the path)
  //    POST /api/agent-cta/navigate
  //    Body: { destination, path, rationale?, urgency? }
  // ══════════════════════════════════════════════════════════════════════════
  router.post('/navigate', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    const { destination, path: navPath } = req.body;
    console.log(`[AIAgentCTA] NAVIGATE destination="${destination}" path="${navPath}"`);
    return res.json({
      success: true,
      message: 'NAVIGATE action acknowledged (frontend-handled)',
      destination,
      path: navPath,
      actionType: 'NAVIGATE',
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // 7. UNIFIED EXECUTE -dispatches any AI agent action object in one call
  //    POST /api/agent-cta/execute
  //    Body: <SuggestedAction> (any of the above action shapes)
  // ══════════════════════════════════════════════════════════════════════════
  router.post('/execute', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), async (req: any, res: any) => {
    const action = req.body as { type: string; [key: string]: unknown };

    if (!action?.type) {
      return res.status(400).json({ success: false, message: 'action.type is required' });
    }

    // Forward the body to the matching sub-handler by internally re-routing
    const subPath: Record<string, string> = {
      ESCALATE_COMPLAINT: '/escalate-complaint',
      UPDATE_COMPLAINT_STATUS: '/update-complaint-status',
      CREATE_ANNOUNCEMENT: '/create-announcement',
      TRIGGER_AUTO_ASSIGN: '/trigger-auto-assign',
      UPDATE_MUNICIPAL_ADMIN_STATUS: '/update-municipal-admin-status',
      NAVIGATE: '/navigate',
    };

    const path = subPath[action.type];
    if (!path) {
      return res.status(400).json({
        success: false,
        message: `Unknown action type "${action.type}". Valid types: ${Object.keys(subPath).join(', ')}`,
      });
    }

    // Re-invoke the handler logic by dispatching an internal sub-request
    // (avoids duplicating logic -we forward the body to the respective handler).
    try {
      // Map action-specific field names to handler body expectations
      let body = { ...action };

      // ESCALATE_COMPLAINT: complaintId already in body
      // UPDATE_COMPLAINT_STATUS: newStatus already in body from schema
      // CREATE_ANNOUNCEMENT: all fields in body
      // TRIGGER_AUTO_ASSIGN: batchSize in body
      // UPDATE_MUNICIPAL_ADMIN_STATUS: municipalAdminId + newStatus in body
      // NAVIGATE: destination + path in body

      req.body = body;

      // Find and call the matching route handler directly
      // Use `any` to call the internal handler to avoid typing issues with Express' Router type
      return (router as any).handle(
        Object.assign(req, { url: path, path }),
        res,
        () =>
          res.status(404).json({
            success: false,
            message: `No handler found for ${action.type}`,
          })
      );
    } catch (error: any) {
      console.error('[AIAgentCTA] execute dispatch error:', error);
      return res.status(500).json({ success: false, message: error.message ?? 'Failed to execute action' });
    }
  });

  // ══════════════════════════════════════════════════════════════════════════
  // GET /api/agent-cta/status -health + list of supported actions
  // ══════════════════════════════════════════════════════════════════════════
  router.get('/status', authenticateAdmin, requireAdminType('STATE_ADMIN', 'SUPER_ADMIN'), (_req: any, res: any) => {
    res.json({
      success: true,
      message: 'AI Agent CTA routes are active',
      supportedActions: [
        'ESCALATE_COMPLAINT',
        'UPDATE_COMPLAINT_STATUS',
        'CREATE_ANNOUNCEMENT',
        'TRIGGER_AUTO_ASSIGN',
        'UPDATE_MUNICIPAL_ADMIN_STATUS',
        'NAVIGATE',
      ],
    });
  });

  return router;
}
