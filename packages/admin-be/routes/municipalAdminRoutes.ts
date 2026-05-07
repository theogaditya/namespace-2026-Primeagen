import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { PrismaClient } from '../prisma/generated/client/client';
import { agentSchema } from '../lib/schemas/agentSchema';
import { authenticateMunicipalAdmin } from '../middleware/adminAuth';

export default function(prisma: PrismaClient) {
  const router = express.Router();
  const JWT_SECRET = process.env.JWT_SECRET!;

// Login
router.post('/login', async (req, res: any) => {
  const { officialEmail, password } = req.body;

  const admin = await prisma.departmentMunicipalAdmin.findUnique({ where: { officialEmail } });

  if (!admin) {
    return res.status(404).json({ success: false, message: 'Admin not found' });
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.officialEmail,
      accessLevel: admin.accessLevel,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return res.json({
    success: true,
    admin: {
      id: admin.id,
      officialEmail: admin.officialEmail,
      accessLevel: admin.accessLevel,
    },
  });
});


// Create Agent
router.post('/create/agent', authenticateMunicipalAdmin, async (req, res: any) => {
  const parse = agentSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ 
      message: 'Invalid input', 
      errors: parse.error.errors 
    });
  }

  const {
    email, fullName, password,
    phoneNumber, officialEmail, department,
    municipality
  } = parse.data;

  try {
    // attach the creating municipal admin as the manager
    const managerId = (req as any).user?.id;

    const existingAgent = await prisma.agent.findFirst({
      where: {
        OR: [
          { email },
          { officialEmail },
        ]
      }
    });

    if (existingAgent) {
      return res.status(409).json({ 
        message: 'Agent with this email or official email already exists' 
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const agent = await prisma.agent.create({
      data: {
        email,
        fullName,
        password: hashedPassword,
        phoneNumber,
        officialEmail,
        department,
        municipality,
        // enforce schema-driven values regardless of client input
        accessLevel: 'AGENT',
        status: 'ACTIVE',
        // availability and workload defaults are set in schema, but set explicitly for clarity
        availabilityStatus: 'At Work',
        // link to the municipal admin who created this agent
        managedByMunicipalId: managerId || undefined,
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
        workloadLimit: true,
        currentWorkload: true,
        availabilityStatus: true,
        dateOfCreation: true,
        status: true,
        managedByMunicipal: {
          select: {
            id: true,
            adminId: true,
            officialEmail: true,
            fullName: true
          }
        }
      }
    });

    res.status(201).json({ 
      success: true,
      message: 'Agent created successfully', 
      agent 
    });
  } catch (err: any) {
    console.error('Agent creation error:', err);
    
    if (err.code === 'P2002') {
      return res.status(409).json({ 
        message: 'Agent with this email or official email already exists' 
      });
    }
    
    res.status(500).json({ 
      message: 'Agent registration failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ----- 9. Get All Complaints -----
router.get('/complaints', async (req, res:any) => {
  try {
    const complaints = await prisma.complaint.findMany({
      where: {
        status: {
         not:'DELETED'
      },
    },
      include: {
        category: true,
        complainant: true 
      },
      orderBy: {
        submissionDate: 'desc' 
      }
    });

    res.json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
});

// ----- 10. Update Complaint Status -----
router.put('/complaints/:id/status', authenticateMunicipalAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['REGISTERED', 'UNDER_PROCESSING', 'FORWARDED', 'ON_HOLD', 'COMPLETED', 'REJECTED'];
    if (!status || !validStatuses.includes(status)) {
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

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: { 
        status,
        ...(status === 'COMPLETED' && { dateOfResolution: new Date() })
      },
      include: {
        complainant: true,
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

    if (status === 'COMPLETED' && existingComplaint.assignedAgentId) {
      await prisma.agent.update({
        where: { id: existingComplaint.assignedAgentId },
        data: {
          currentWorkload: { decrement: 1 }
        }
      });
    }

    return res.json({ 
      success: true, 
      message: 'Complaint status updated successfully',
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

// ----- 10. Update Complaint Status -----
router.put('/complaints/:id/escalate', authenticateMunicipalAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found' });
    }

    const updated = await prisma.complaint.update({
      where: { id },
      data: {
        status: 'ESCALATED_TO_STATE_LEVEL',
      },
    });

    return res.json({
      success: true,
      message: 'Complaint escalated to municipal level successfully',
      complaint: updated,
    });
  } catch (error: any) {
    console.error('Escalation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to escalate complaint',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
});

// ---- Get Agents ---- //
router.get('/all', async (req, res) => {
  try {
    const agents = await prisma.agent.findMany({
      select: {
        id: true,
        fullName: true,  
        email: true,
        department: true,
        accessLevel: true,
        status: true,
      }
    });
      
    res.status(200).json({ 
      success: true, 
      agents: agents.map((agent: any) => ({
        ...agent,
        name: agent.fullName, 
        status: agent.status || 'INACTIVE'
      }))
    });
  } catch (error) {
    console.error('Error fetching agents:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch agents' });
  }
});

// ---- Update Agent Status ---- //
router.patch('/:id/status', async (req, res:any) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate input
  if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid status. Must be either "ACTIVE" or "INACTIVE"' 
    });
  }

  try {
    // Update the agent status
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        fullName: true,
        email: true,
        department: true,
        accessLevel: true,
        status: true
      }
    });

    // Format the response to match frontend expectations
    const formattedAgent = {
      ...updatedAgent,
      name: updatedAgent.fullName,
      status: updatedAgent.status.charAt(0).toUpperCase() + 
             updatedAgent.status.slice(1).toLowerCase()
    };

    res.status(200).json({ 
      success: true,
      agent: formattedAgent
    });

  } catch (error:any) {
    console.error('Error updating agent status:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ 
        success: false, 
        message: 'Agent not found' 
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update agent status' 
    });
  }
});

  return router;
}
