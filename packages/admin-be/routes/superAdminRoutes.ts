import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authenticateSuperAdminOnly } from '../middleware/unifiedAuth';
import {
  createSuperAdminSchema,
  superAdminLoginSchema,
  createStateAdminSchema,
  createMunicipalAdminSchema
} from '../lib/schemas/superAdminSchema';
import { PrismaClient } from '../prisma/generated/client/client';

export default function(prisma: PrismaClient) {
  const router = express.Router();
  const nodeEnv = process.env.NODE_ENV || 'development';
  const envFile = nodeEnv === 'production' ? '.env.prod' : '.env.local';
  dotenv.config({ path: envFile });

// ----- 1. Super Admin Login -----
router.post('/login', async (req, res: any) => {
  const parseResult = superAdminLoginSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ success: false, errors: parseResult.error.flatten() });
  }

  const { officialEmail, password } = parseResult.data;

  try {
    const admin = await prisma.superAdmin.findUnique({
      where: { officialEmail }
    });

    if (!admin) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await prisma.superAdmin.update({
      where: { id: admin.id },
      data: { lastLogin: new Date() }
    });

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error('[superAdmin.login] Missing JWT secret in environment');
      return res.status(500).json({ success: false, message: 'Server misconfigured: missing JWT secret' });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.officialEmail,
        accessLevel: admin.accessLevel,
      },
      secret,
      { expiresIn: '24h' }
    );

    res.cookie('superAdminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24h
      path: '/',
    });

    return res.json({
      success: true,
      message: 'Login successful',
      admin: {
        id: admin.id,
        adminId: admin.adminId,
        fullName: admin.fullName,
        officialEmail: admin.officialEmail,
        accessLevel: admin.accessLevel,
        status: admin.status,
        lastLogin: admin.lastLogin,
      }
    });
  } catch (err) {
    console.error('Login Error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ----- 2. Super Admin Logout -----
router.post('/logout', (req, res: any) => {
  res.clearCookie('superAdminToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/'
  });
  
  return res.json({ success: true, message: 'Logged out successfully' });
});

// ----- 3. Create Super Admin -----
router.post('/create', async (req, res: any) => {
  const parseResult = createSuperAdminSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ success: false, errors: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  try {
    const existing = await prisma.superAdmin.findFirst({
      where: {
        OR: [
          { officialEmail: data.officialEmail },
        ]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Super Admin with given email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newSuperAdmin = await prisma.superAdmin.create({
      data: {
        fullName: data.fullName,
        officialEmail: data.officialEmail,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        accessLevel: 'SUPER_ADMIN', // this will default anyway, but explicit
        status: 'ACTIVE',           // default, but explicit for clarity
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Super Admin created successfully',
      data: {
        id: newSuperAdmin.id,
        adminId: newSuperAdmin.adminId,
        fullName: newSuperAdmin.fullName,
        officialEmail: newSuperAdmin.officialEmail,
        accessLevel: newSuperAdmin.accessLevel,
        dateOfCreation: newSuperAdmin.dateOfCreation,
        status: newSuperAdmin.status,
      }
    });

  } catch (error) {
    console.error('Create Super Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ----- 4. Get Current Super Admin Profile -----
router.get('/profile', authenticateSuperAdminOnly, async (req, res: any) => {
  try {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: (req as any).admin.id },
      select: {
        id: true,
        fullName: true,
        adminId: true,
        officialEmail: true,
        phoneNumber: true,
        accessLevel: true,
        dateOfCreation: true,
        lastUpdated: true,
        status: true,
        lastLogin: true
      }
    });

    if (!superAdmin) {
      return res.status(404).json({ success: false, message: 'Super Admin not found' });
    }

    return res.json({ success: true, superAdmin });
  } catch (error) {
    console.error('Get Profile Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 5. Create Department State Admin -----
router.post('/create/state-admins', authenticateSuperAdminOnly, async (req, res: any) => {
  const parseResult = createStateAdminSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ success: false, errors: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  try {
    const existing = await prisma.departmentStateAdmin.findFirst({
      where: { officialEmail: data.officialEmail },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Department State Admin with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newAdmin = await prisma.departmentStateAdmin.create({
      data: {
        fullName: data.fullName,
        officialEmail: data.officialEmail,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        department: data.department as any,
        state: data.state,
        managedMunicipalities: data.managedMunicipalities || [],
        accessLevel: 'DEPT_STATE_ADMIN',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        adminId: true,
        fullName: true,
        officialEmail: true,
        phoneNumber: true,
        department: true,
        state: true,
        managedMunicipalities: true,
        accessLevel: true,
        status: true,
        dateOfCreation: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Department State Admin created successfully',
      data: newAdmin
    });

  } catch (error) {
    console.error('Create State Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 6. Create Department Municipal Admin -----
router.post('/create/municipal-admins', authenticateSuperAdminOnly, async (req, res: any) => {
  const parseResult = createMunicipalAdminSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ success: false, errors: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  try {
    const existing = await prisma.departmentMunicipalAdmin.findFirst({
      where: { officialEmail: data.officialEmail }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Department Municipal Admin with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newAdmin = await prisma.departmentMunicipalAdmin.create({
      data: {
        fullName: data.fullName,
        officialEmail: data.officialEmail,
        phoneNumber: data.phoneNumber,
        password: hashedPassword,
        department: data.department as any,
        municipality: data.municipality,
        accessLevel: 'DEPT_MUNICIPAL_ADMIN',
        status: 'ACTIVE'
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
        dateOfCreation: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Department Municipal Admin created successfully',
      data: newAdmin
    });
  } catch (error) {
    console.error('Create Municipal Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 7. Create Super Municipal Admin -----
router.post('/create/super-municipal-admins', authenticateSuperAdminOnly, async (req, res: any) => {
  const { fullName, officialEmail, phoneNumber, password, municipality } = req.body;

  if (!fullName || !officialEmail || !password || !municipality) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: fullName, officialEmail, password, municipality' 
    });
  }

  try {
    const existing = await prisma.superMunicipalAdmin.findFirst({
      where: { officialEmail }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Super Municipal Admin with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.superMunicipalAdmin.create({
      data: {
        fullName,
        officialEmail,
        phoneNumber,
        password: hashedPassword,
        municipality,
        accessLevel: 'SUPER_MUNICIPAL_ADMIN',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        adminId: true,
        fullName: true,
        officialEmail: true,
        phoneNumber: true,
        municipality: true,
        accessLevel: true,
        status: true,
        dateOfCreation: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Super Municipal Admin created successfully',
      data: newAdmin
    });
  } catch (error) {
    console.error('Create Super Municipal Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 8. Create Super State Admin -----
router.post('/create/super-state-admins', authenticateSuperAdminOnly, async (req, res: any) => {
  const { fullName, officialEmail, phoneNumber, password, state } = req.body;

  if (!fullName || !officialEmail || !password || !state) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing required fields: fullName, officialEmail, password, state' 
    });
  }

  try {
    const existing = await prisma.superStateAdmin.findFirst({
      where: { officialEmail }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Super State Admin with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newAdmin = await prisma.superStateAdmin.create({
      data: {
        fullName,
        officialEmail,
        phoneNumber,
        password: hashedPassword,
        state,
        accessLevel: 'SUPER_STATE_ADMIN',
        status: 'ACTIVE'
      },
      select: {
        id: true,
        adminId: true,
        fullName: true,
        officialEmail: true,
        phoneNumber: true,
        state: true,
        accessLevel: true,
        status: true,
        dateOfCreation: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Super State Admin created successfully',
      data: newAdmin
    });
  } catch (error) {
    console.error('Create Super State Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 9. Get All Admins -----  
router.get('/admins', async (req, res) => {
  try {
    const stateAdmins = await prisma.departmentStateAdmin.findMany();
    const municipalAdmins = await prisma.departmentMunicipalAdmin.findMany();

    const admins = [...stateAdmins, ...municipalAdmins].map(admin => ({
      id: admin.id,
      name: admin.fullName,
      email: admin.officialEmail,
      department: admin.department,
      accessLevel: admin.accessLevel,
      status: admin.status,
    }));

    res.json({ success: true, admins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch admins' });
  }
});

// ----- 8. Update Admins Status -----  
router.patch('/admins/:id/status', async (req, res:any) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['ACTIVE', 'INACTIVE'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status' });
  }

  try {
    let updated = await prisma.departmentStateAdmin.updateMany({
      where: { id },
      data: { status },
    });

    if (updated.count === 0) {
      updated = await prisma.departmentMunicipalAdmin.updateMany({
        where: { id },
        data: { status },
      });
    }

    if (updated.count === 0) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    res.json({ success: true, message: `Admin status updated to ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to update status' });
  }
});

// ----- 9. Get All Complaints -----
router.get('/complaints', async (req, res) => {
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

    // Normalize relation key to `complainant` for response consistency
    const complaints = complaintsRaw.map(({ User, ...rest }) => ({
      ...rest,
      complainant: User || null
    }));

    res.json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
});

// ----- 10. Delete A Complaint -----
router.patch('/delete/:id', async (req, res:any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'DELETED') {
      return res.status(400).json({ error: 'Invalid status update' });
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: { 
        status: 'DELETED',
      }
    });

    res.json({
      message: 'Complaint status updated to DELETED',
      data: updatedComplaint
    });

  } catch (error) {
    console.error('Error updating complaint status:', error);
    res.status(500).json({ error: 'Failed to update complaint status' });
  }
});

// ----- 11. Escalate A Complaint ----- 

// ----- 12. Get My Complaints (Escalated to Super Admin) -----
router.get('/my-complaints', authenticateSuperAdminOnly, async (req: any, res: any) => {
  try {
    const superAdminId = req.admin.id;

    // Fetch complaints that have been escalated to state level (Super Admin handles state-level escalations)
    const complaintsRaw = await prisma.complaint.findMany({
      where: {
        OR: [
          { status: 'ESCALATED_TO_STATE_LEVEL' },
          { escalatedToStateAdminId: { not: null } }
        ]
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
    console.error('Error fetching super admin complaints:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch complaints',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----- 13. Update Complaint Status -----
router.put('/complaints/:id/status', authenticateSuperAdminOnly, async (req: any, res: any) => {
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

// ----- Update State Admin Status (Activate/Deactivate) -----
router.patch('/state-admins/:id/status', authenticateSuperAdminOnly, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be ACTIVE or INACTIVE' 
      });
    }

    const stateAdmin = await prisma.departmentStateAdmin.findUnique({
      where: { id }
    });

    if (!stateAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: 'State admin not found' 
      });
    }

    const updatedAdmin = await prisma.departmentStateAdmin.update({
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
      message: `State admin ${status === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`,
      data: updatedAdmin 
    });
  } catch (error: any) {
    console.error('Error updating state admin status:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update state admin status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ----- Update Municipal Admin Status (Activate/Deactivate) -----
router.patch('/municipal-admins/:id/status', authenticateSuperAdminOnly, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status. Must be ACTIVE or INACTIVE' 
      });
    }

    const municipalAdmin = await prisma.departmentMunicipalAdmin.findUnique({
      where: { id }
    });

    if (!municipalAdmin) {
      return res.status(404).json({ 
        success: false, 
        message: 'Municipal admin not found' 
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