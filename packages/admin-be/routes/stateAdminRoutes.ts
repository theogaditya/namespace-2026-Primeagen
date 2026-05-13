import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { PrismaClient } from '../prisma/generated/client/client';
import { authenticateStateAdmin } from '../middleware/adminAuth';

export default function(prisma: PrismaClient) {
  const router = express.Router();

  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'production' ? '.env.prod' : '.env.local';
  dotenv.config({ path: envFile });

  const JWT_SECRET = process.env.JWT_SECRET!;

router.post('/login', async (req, res:any) => {
  const { officialEmail, password } = req.body;

  const admin = await prisma.departmentStateAdmin.findUnique({ where: { officialEmail } });

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
      accessLevel: admin.accessLevel
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Set cookie options
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // secure only in prod
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in 
  });

  return res.json({
    success: true,
    message: 'Logged in successfully',
    admin: {
      id: admin.id,
      officialEmail: admin.officialEmail,
      accessLevel: admin.accessLevel
    }
  });
});

// ----- 2. Get All State Admins -----
router.get('/state-admins', async (req, res: any) => {
  try {
    const stateAdmins = await prisma.departmentStateAdmin.findMany({
      select: {
        id: true,
        fullName: true,
        adminId: true,
        officialEmail: true,
        department: true,
        state: true,
        status: true,
        dateOfCreation: true,
        lastLogin: true,
        managedMunicipalities: true,
        accessLevel: true,
      },
      orderBy: { dateOfCreation: 'desc' }
    });

    return res.json({ success: true, data: stateAdmins });
  } catch (error) {
    console.error('Get State Admins Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 3. Get All Complaints -----
router.get('/complaints',authenticateStateAdmin, async (req, res:any) => {
  try {
    const complaintsRaw = await prisma.complaint.findMany({
      include: {
        category: true,
        User: true // relation field in schema is `User` (complainant)
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

// ----- 4. Update Complaint Status -----
router.put('/complaints/:id/status', authenticateStateAdmin, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
      'REGISTERED',
      'UNDER_PROCESSING',
      'FORWARDED',
      'ON_HOLD',
      'COMPLETED',
      'REJECTED',
      'ESCALATED_TO_MUNICIPAL_LEVEL',
      'ESCALATED_TO_STATE_LEVEL'
    ];

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

    const updatedComplaintRaw = await prisma.complaint.update({
      where: { id },
      data: { 
        status,
        ...(status === 'COMPLETED' && { dateOfResolution: new Date() })
      },
      include: {
        User: true,
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

    // Map Prisma relation `User` to `complainant` for response consistency
    const { User, ...complaintRest } = updatedComplaintRaw as any;
    const updatedComplaint = { ...complaintRest, complainant: User || null };

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

// ----- 5. Escalate Complaint -----
router.put('/complaints/:id/escalate', authenticateStateAdmin, async (req: any, res: any) => {
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
        escalatedToStateAdminId: req.admin.id,
      },
    });

    return res.json({
      success: true,
      message: 'Complaint escalated successfully',
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

  return router;
}
