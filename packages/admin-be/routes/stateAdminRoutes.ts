import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { PrismaClient } from '../prisma/generated/client/client';
import { authenticateStateAdminOnly } from '../middleware/unifiedAuth';
import { getBadgeService } from '../lib/badges/badgeService';

export default function(prisma: PrismaClient) {
  const router = express.Router();

  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'production' ? '.env.prod' : '.env.local';
  dotenv.config({ path: envFile });

router.post('/login', async (req, res:any) => {
  const { officialEmail, password } = req.body;

  const admin = await prisma.departmentStateAdmin.findUnique({ where: { officialEmail } });

  if (!admin) {
    return res.status(404).json({ success: false, message: 'Admin not found' });
  }

  // Check if admin is inactive
  if (admin.status === 'INACTIVE') {
    return res.status(403).json({ success: false, message: 'Your account is inactive. Please contact Super Admin.' });
  }

  const isMatch = await bcrypt.compare(password, admin.password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('[stateAdmin.login] Missing JWT secret in environment');
    return res.status(500).json({ success: false, message: 'Server misconfigured: missing JWT secret' });
  }

  const token = jwt.sign(
    {
      id: admin.id,
      email: admin.officialEmail,
      accessLevel: admin.accessLevel
    },
    secret,
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
router.get('/complaints',authenticateStateAdminOnly, async (req, res:any) => {
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
router.put('/complaints/:id/status', authenticateStateAdminOnly, async (req: any, res: any) => {
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

      // Award resolution badges to the complainant
      if (existingComplaint.complainantId) {
        try {
          const badgeService = getBadgeService(prisma);
          const newBadges = await badgeService.checkBadgesAfterResolution(existingComplaint.complainantId);
          if (newBadges.length > 0) {
            console.log(`[BadgeService] Awarded ${newBadges.length} resolution badge(s) to user ${existingComplaint.complainantId}:`,
              newBadges.map(b => b.badge.name).join(", "));
          }
        } catch (badgeError) {
          console.error("Badge check failed (non-blocking):", badgeError);
        }
      }
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
router.put('/complaints/:id/escalate', authenticateStateAdminOnly, async (req: any, res: any) => {
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

// ----- 6. Get My Complaints (Escalated to this State Admin) -----
router.get('/my-complaints', authenticateStateAdminOnly, async (req: any, res: any) => {
  try {
    const stateAdminId = req.admin.id;

    const complaintsRaw = await prisma.complaint.findMany({
      where: {
        escalatedToStateAdminId: stateAdminId,
      },
      include: {
        category: true,
        User: true,
        location: true,
        assignedAgent: {
          select: {
            id: true,
            fullName: true,
            officialEmail: true
          }
        }
      },
      orderBy: {
        submissionDate: 'desc'
      }
    });

    // Map Prisma relation `User` to `complainant` for response consistency
    const complaints = complaintsRaw.map(({ User, ...rest }) => ({
      ...rest,
      complainant: User || null
    }));

    return res.json({ success: true, complaints });
  } catch (error: any) {
    console.error('Error fetching state admin complaints:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch complaints',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----- 7. Get All Municipal Admins (Created by this State Admin or unassigned) -----
router.get('/municipal-admins', authenticateStateAdminOnly, async (req: any, res: any) => {
  try {
    const stateAdminId = req.admin.id;

    // Get municipal admins managed by this state admin OR unassigned ones
    const municipalAdmins = await prisma.departmentMunicipalAdmin.findMany({
      where: {
        OR: [
          { managedByStateAdminId: stateAdminId },
          { managedByStateAdminId: null }
        ]
      },
      select: {
        id: true,
        adminId: true,
        fullName: true,
        officialEmail: true,
        phoneNumber: true,
        department: true,
        municipality: true,
        accessLevel: true,
        status: true,
        workloadLimit: true,
        currentWorkload: true,
        dateOfCreation: true,
        managedByStateAdminId: true,
      },
      orderBy: {
        dateOfCreation: 'desc'
      }
    });

    return res.json({ success: true, data: municipalAdmins });
  } catch (error: any) {
    console.error('Error fetching municipal admins:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch municipal admins',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----- 8. Create Municipal Admin -----
router.post('/municipal-admins', authenticateStateAdminOnly, async (req: any, res: any) => {
  try {
    const stateAdminId = req.admin.id;
    const { fullName, officialEmail, password, phoneNumber, department, municipality } = req.body;

    // Validate required fields
    if (!fullName || !officialEmail || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Full name, email, and password are required' 
      });
    }

    // Check if email already exists
    const existingAdmin = await prisma.departmentMunicipalAdmin.findUnique({
      where: { officialEmail }
    });

    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'An admin with this email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate admin ID
    const adminId = `MA-${Date.now().toString(36).toUpperCase()}`;

    // Create municipal admin
    const newAdmin = await prisma.departmentMunicipalAdmin.create({
      data: {
        adminId,
        fullName,
        officialEmail,
        password: hashedPassword,
        phoneNumber: phoneNumber || '',
        department: department || 'GENERAL',
        municipality: municipality || '',
        accessLevel: 'DEPT_MUNICIPAL_ADMIN',
        status: 'ACTIVE',
        managedByStateAdminId: stateAdminId,
      },
      select: {
        id: true,
        adminId: true,
        fullName: true,
        officialEmail: true,
        phoneNumber: true,
        department: true,
        municipality: true,
        accessLevel: true,
        status: true,
        dateOfCreation: true,
      }
    });

    return res.status(201).json({ 
      success: true, 
      message: 'Municipal admin created successfully',
      data: newAdmin 
    });
  } catch (error: any) {
    console.error('Error creating municipal admin:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to create municipal admin',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----- 9. Update Municipal Admin Status (Activate/Deactivate) -----
router.patch('/municipal-admins/:id/status', authenticateStateAdminOnly, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const stateAdminId = req.admin.id;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be ACTIVE or INACTIVE' 
      });
    }

    // Verify the municipal admin belongs to this state admin
    const municipalAdmin = await prisma.departmentMunicipalAdmin.findFirst({
      where: {
        id,
        OR: [
          { managedByStateAdminId: stateAdminId },
          { managedByStateAdminId: null }
        ]
      }
    });

    if (!municipalAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Municipal admin not found or not under your management' 
      });
    }

    const updatedAdmin = await prisma.departmentMunicipalAdmin.update({
      where: { id },
      data: { status },
      select: {
        id: true,
        fullName: true,
        officialEmail: true,
        status: true,
      }
    });

    return res.json({ 
      success: true, 
      message: `Municipal admin ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      data: updatedAdmin 
    });
  } catch (error: any) {
    console.error('Error updating municipal admin status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update municipal admin status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

  return router;
}
