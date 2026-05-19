import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../prisma/generated/client/client';
import { loginSchema } from '../lib/schemas/agentSchema';
import { authenticateAgentOnly } from '../middleware/unifiedAuth';
import { getProcessedQueueLength, peekProcessedQueue } from '../lib/redis/assignQueue';

let isAssignmentPolling = false;
let assignmentPollingInterval: NodeJS.Timeout | null = null;

async function processNextAssignment(prisma: PrismaClient): Promise<{ processed: boolean; result?: any; error?: string }> {
  try {
    const queueLength = await getProcessedQueueLength();
    if (queueLength > 0) {
      const complaint = await peekProcessedQueue();
      console.log(`Found ${queueLength} complaint(s) in processed queue. Next: id=${complaint?.id}`);
      // TODO: Add actual assignment logic here
      return { processed: false, result: { queueLength, nextComplaint: complaint } };
    }
    return { processed: false };
  } catch (error: any) {
    console.error('Assignment processing error:', error);
    return { processed: false, error: error.message };
  }
}

export function startAssignmentPolling(prisma: PrismaClient) {
  if (isAssignmentPolling) return;

  isAssignmentPolling = true;
  console.log("Assignment polling started (10s interval)");

  assignmentPollingInterval = setInterval(async () => {
    await processNextAssignment(prisma);
  }, 10000);
}

export function stopAssignmentPolling() {
  if (assignmentPollingInterval) {
    clearInterval(assignmentPollingInterval);
    assignmentPollingInterval = null;
  }
  isAssignmentPolling = false;
  console.log("Assignment polling stopped");
}

export default function(prisma: PrismaClient) {
  const router = Router();
  

// Agent Login
router.post('/login', async (req, res: any) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ 
      message: 'Invalid input', 
      errors: parse.error.errors 
    });
  }

  const { officialEmail, password } = parse.data;

  try {
    const agent = await prisma.agent.findFirst({
      where: {
        officialEmail,
        status: 'ACTIVE' 
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        employeeId: true,
        password: true,
        phoneNumber: true,
        officialEmail: true,
        department: true,
        municipality: true,
        accessLevel: true,
        status: true,
        workloadLimit: true,
        currentWorkload: true,
        availabilityStatus: true,
        dateOfCreation: true,
        lastLogin: true,
      }
    });

    if (!agent) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    const isPasswordValid = await bcrypt.compare(password, agent.password);
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Invalid credentials' 
      });
    }

    await prisma.agent.update({
      where: { id: agent.id },
      data: { lastLogin: new Date() }
    });

    // Ensure JWT secret is available
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[agent.login] Missing JWT secret in environment');
      return res.status(500).json({ message: 'Server misconfigured: missing JWT secret' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: agent.id, 
        officialEmail: agent.officialEmail,
        accessLevel: agent.accessLevel,
        department: agent.department,
        type: 'AGENT'
      },
      secret,
      { expiresIn: '24h' }
    );

    // Remove password from response
    const { password: _, ...agentData } = agent;

    // Set HTTP-only cookie
    res.cookie('agentToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.status(200).json({
      message: 'Login successful',
      agent: agentData,
      token // Also send token in response body if needed
    });

  } catch (err: any) {
    console.error('Agent login error:', err);
    res.status(500).json({ 
      message: 'Login failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Verify Token / Get Current Agent
router.get('/me', async (req, res: any) => {
  try {
    const token = req.cookies?.agentToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[agent.me] Missing JWT secret in environment');
      return res.status(500).json({ message: 'Server misconfigured: missing JWT secret' });
    }

    const decoded = jwt.verify(token, secret) as any;
    
    if (decoded.type !== 'AGENT') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const agent = await prisma.agent.findUnique({
      where: { 
        id: decoded.id,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        employeeId: true,
        phoneNumber: true,
        officialEmail: true,
        department: true,
        municipality: true,
        accessLevel: true,
        status: true,
        workloadLimit: true,
        currentWorkload: true,
        availabilityStatus: true,
        dateOfCreation: true,
        lastLogin: true,
        resolutionRate: true,
        avgResolutionTime: true,
        collaborationMetric: true,
      }
    });

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.status(200).json({ agent });

  } catch (err: any) {
    console.error('Token verification error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Token verification failed' });
  }
});

// ----- Get Complaints Assigned to the Authenticated Agent -----
router.get('/my-complaints', authenticateAgentOnly, async (req: any, res: any) => {
  try {
    const agentId = req.admin.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [complaintsRaw, total] = await Promise.all([
      prisma.complaint.findMany({
        where: {
          assignedAgentId: agentId,
          status: { not: 'DELETED' },
        },
        include: {
          category: true,
          User: true,
          location: true,
          assignedAgent: {
            select: { id: true, fullName: true, officialEmail: true },
          },
          managedByMunicipalAdmin: {
            select: { id: true, fullName: true, officialEmail: true },
          },
        },
        orderBy: { submissionDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.complaint.count({
        where: { assignedAgentId: agentId, status: { not: 'DELETED' } },
      }),
    ]);

    const complaints = complaintsRaw.map(({ User, ...rest }) => ({
      ...rest,
      complainant: User || null,
    }));

    return res.json({
      success: true,
      complaints,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching assigned complaints:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned complaints',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ----- 3. Get All Complaints -----
router.get('/complaints',authenticateAgentOnly, async (req, res:any) => {
  try {
    const complaintsRaw = await prisma.complaint.findMany({
      where: {
        status: {
          not: 'DELETED'
        }
      },
      include: {
        category: true,
        User: true, // relation field in schema is `User` (complainant)
      },
      orderBy: {
        submissionDate: 'desc' 
      }
    });

    const complaints = complaintsRaw.map(({ User, ...rest }) => ({
      ...rest,
      complainant: User || null
    }));

    return res.json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
});

// // ----- 3. Get Agent Complaint  -----
// router.get('/complaints', authenticateAgent, async (req:any, res:any) => {
//   try {
//     const agentId = req.agent.id;

//     const complaints = await prisma.complaint.findMany({
//       where: {
//         assignedAgentId: agentId,
//       },
//       include: {
//         category: true,
//         complainant: true,
//       },
//       orderBy: {
//         submissionDate: 'desc',
//       },
//     });

//     return res.json({ success: true, complaints });
//   } catch (error) {
//     console.error(error);
//     return res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
//   }
// });

// ----- 4. Get Complaint Details -----
router.get('/complaints/:id', authenticateAgentOnly, async (req: any, res: any) => {
  try {
    const { id } = req.params;

  const complaintRaw = await prisma.complaint.findUnique({
    where: { id },
    include: {
      User: true, // relation field in schema is `User` (complainant)
      category: true,
      location: true,
      upvotes: true
    }
  });

    if (!complaintRaw) {
      return res.status(404).json({ 
        success: false, 
        message: 'Complaint not found' 
      });
    }

    const { User, ...rest } = complaintRaw as any;
    const complaint = { ...rest, complainant: User || null };

    return res.json({ 
      success: true, 
      complaint 
    });

  } catch (error: any) {
    console.error('Error fetching complaint details:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch complaint details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----- 5. Update Complaint Status -----
router.put('/complaints/:id/status', authenticateAgentOnly, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status, escalate } = req.body;

    console.log('Incoming body:', req.body);

    // Handle possible string "true" from frontend
    const isEscalation = escalate === true || escalate === 'true';

    const validStatuses = [
      'REGISTERED',
      'UNDER_PROCESSING',
      'FORWARDED',
      'ON_HOLD',
      'COMPLETED',
      'REJECTED',
      'ESCALATED_TO_MUNICIPAL_LEVEL'
    ];

    // Set final status based on escalation or direct update
    const newStatus = isEscalation ? 'ESCALATED_TO_MUNICIPAL_LEVEL' : status;

    console.log('Resolved new status:', newStatus);

    if (!newStatus || !validStatuses.includes(newStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Valid statuses are: ' + validStatuses.join(', ')
      });
    }

    const existingComplaint = await prisma.complaint.findUnique({
      where: { id }
    });

    if (!existingComplaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found'
      });
    }

    // If this update is an escalation, ensure the complaint is assigned to this agent
    if (isEscalation && existingComplaint.assignedAgentId !== req.admin.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to escalate this complaint'
      });
    }

    // Only the agent assigned to the complaint may update its status
    if (existingComplaint.assignedAgentId !== req.admin.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this complaint'
      });
    }

    const updatedComplaintRaw = await prisma.complaint.update({
      where: { id },
      data: {
        status: newStatus,
        ...(newStatus === 'COMPLETED' && { dateOfResolution: new Date() }),
        // Note: do not set `escalatedAt` here because the Prisma schema doesn't include that field.
        // Escalation handling (assigning municipal admin, workload adjustments) is handled
        // by the dedicated `/complaints/:id/escalate` endpoint which updates the complaint appropriately.
      },
      include: {
        User: true, // relation field in schema is `User` (complainant)
        category: true,
        location: true,
        upvotes: true,
        assignedAgent: {
          select: {
            id: true,
            fullName: true,
            officialEmail: true
          }
        }
      }
    });

    if (newStatus === 'COMPLETED' && existingComplaint.assignedAgentId) {
      await prisma.agent.update({
        where: { id: existingComplaint.assignedAgentId },
        data: {
          currentWorkload: { decrement: 1 }
        }
      });
    }

    // Map Prisma relation `User` to `complainant` for response consistency
    const { User, ...complaintRest } = updatedComplaintRaw as any;
    const updatedComplaint = { ...complaintRest, complainant: User || null };

    console.log('Successfully updated complaint with status:', newStatus);

    return res.json({
      success: true,
      message: isEscalation
        ? 'Complaint escalated to municipal level successfully'
        : 'Complaint status updated successfully',
      complaint: updatedComplaint
    });

  } catch (error: any) {
    console.error('Error updating complaint status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update complaint status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----- 6. Escalate Complaint to Municipal Admin -----
router.put('/complaints/:id/escalate', authenticateAgentOnly, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const agentId = req.admin.id;

    // 1. Find the complaint with location info
    const complaint = await prisma.complaint.findUnique({ 
      where: { id },
      include: { location: true }
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    // Verify the agent is assigned to this complaint
    if (complaint.assignedAgentId !== agentId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Not authorized to escalate this complaint - not assigned to you' 
      });
    }

    // Get agent details
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent || agent.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: 'Agent not active' });
    }

    // 2. Get the district from complaint location
    const complaintDistrict = complaint.location?.district;
    
    if (!complaintDistrict) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot escalate: complaint has no district information' 
      });
    }

    // 3. Find a municipal admin whose municipality matches the complaint's district
    // Order by currentWorkload for load balancing (assign to least busy admin)
    const municipalAdmin = await prisma.departmentMunicipalAdmin.findFirst({
      where: {
        municipality: {
          equals: complaintDistrict,
          mode: 'insensitive',
        },
        status: 'ACTIVE',
      },
      orderBy: { currentWorkload: 'asc' },
      select: { id: true, fullName: true, officialEmail: true }
    });

    if (!municipalAdmin) {
      return res.status(404).json({
        success: false,
        message: `No municipal admin found for district "${complaintDistrict}"`,
      });
    }

    // 4. Use transaction to:
    //    - Update complaint: set status, assign to municipal admin (keep agent for history)
    //    - Decrease agent's workload
    //    - Increase municipal admin's workload
    const [updatedComplaint] = await prisma.$transaction([
      prisma.complaint.update({
        where: { id },
        data: {
          status: 'ESCALATED_TO_MUNICIPAL_LEVEL',
          escalationLevel: 'MUNICIPAL_ADMIN',
          managedByMunicipalAdminId: municipalAdmin.id,
          // NOTE: assignedAgentId is NOT cleared - kept for complaint history
        },
        include: {
          User: true,
          category: true,
          location: true,
          assignedAgent: {
            select: { id: true, fullName: true, officialEmail: true }
          },
          managedByMunicipalAdmin: {
            select: { id: true, fullName: true, officialEmail: true }
          }
        }
      }),
      // Decrease agent's workload
      prisma.agent.update({
        where: { id: agentId },
        data: { currentWorkload: { decrement: 1 } },
      }),
      // Increase municipal admin's workload
      prisma.departmentMunicipalAdmin.update({
        where: { id: municipalAdmin.id },
        data: { currentWorkload: { increment: 1 } },
      }),
    ]);

    // Map User to complainant for response consistency
    const { User, ...complaintRest } = updatedComplaint as any;
    const complaintForResponse = { ...complaintRest, complainant: User || null };

    console.log(`[Escalate] Complaint ${id} escalated to municipal admin ${municipalAdmin.fullName} (${municipalAdmin.id}) in district ${complaintDistrict}. Agent ${agent.fullName} workload decremented.`);

    return res.json({
      success: true,
      message: `Complaint escalated to municipal admin ${municipalAdmin.fullName} successfully`,
      complaint: complaintForResponse,
    });
  } catch (error: any) {
    console.error('[Escalate] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to escalate complaint',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// -------- Assign Complaint to Agent --------
router.post('/complaints/:id/assign', authenticateAgentOnly, async (req: any, res:any) => {
  const complaintId = req.params.id;
  const agentId = req.admin.id;

  try {
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      include: { assignedComplaints: true },
    });

    if (!agent) return res.status(404).json({ message: 'Agent not found' });

    if (agent.currentWorkload >= agent.workloadLimit) {
      return res.status(400).json({ message: 'Workload limit reached' });
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

    if (complaint.assignedAgentId) {
      return res.status(400).json({ message: 'Complaint already assigned' });
    }
    
    await prisma.$transaction([
      prisma.complaint.update({
        where: { id: complaintId },
        data: { assignedAgentId: agentId },
      }),
      prisma.agent.update({
        where: { id: agentId },
        data: { currentWorkload: { increment: 1 } },
      }),
    ]);

    res.status(200).json({ message: 'Complaint assigned successfully' });
  } catch (error) {
    console.error('Assignment error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ---------- Fetch assigned complaints  ---------- 
router.get('/me/complaints', authenticateAgentOnly, async (req: any, res) => {
  const agentId = req.admin.id;

  try {
    const complaints = await prisma.complaint.findMany({
      where: { assignedAgentId: agentId }
    });

    res.status(200).json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Failed to fetch complaints' });
  }
});

// ---------- Endpoint to reduce workload of agent --------
router.put('/me/workload/dec', authenticateAgentOnly, async (req: any, res: any) => {
  try {
    const token = req.cookies?.agentToken || req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[agent.workload.dec] Missing JWT secret in environment');
      return res.status(500).json({ message: 'Server misconfigured: missing JWT secret' });
    }

    const decoded = jwt.verify(token, secret) as any;
    
    if (decoded.type !== 'AGENT') {
      return res.status(403).json({ message: 'Access denied' });
    }

    
    const agent = await prisma.agent.findUnique({
      where: { id: decoded.id }
    });

    if (!agent || agent.status !== 'ACTIVE') {
      return res.status(400).json({ error: 'Agent not active' });
    }

    if (agent.currentWorkload > 0) {
      await prisma.agent.update({
        where: { id: decoded.id },
        data: {
          currentWorkload: { decrement: 1 }
        }
      });
    }

    // If things go wrong, can increment back

    // const agent = await prisma.agent.update({
    //   where: { 
    //     id: decoded.id,
    //     status: 'ACTIVE'
    //   },
    //   data: {
    //     currentWorkload: { increment: 1 }
    //   }
    // });

    res.status(200).json({ agent });
  } catch (err: any) {
    console.error('Token verification error:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired' });
    }
    res.status(500).json({ message: 'Token verification failed' });
  }
});

  return router;
}