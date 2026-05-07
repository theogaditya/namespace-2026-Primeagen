import express from 'express';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { authenticateSuperAdmin } from '../middleware/superAdminAuth';
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

  const JWT_SECRET = process.env.JWT_SECRET!;

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

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.officialEmail,
        accessLevel: admin.accessLevel,
      },
      JWT_SECRET,
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
router.get('/profile', authenticateSuperAdmin, async (req, res: any) => {
  try {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: req.superAdmin!.id },
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

// ----- 5. Create State Admin -----
router.post('/create/state-admins', async (req, res: any) => {
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
        message: 'Admin with given email or ID already exists'
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
        managedMunicipalities: data.managedMunicipalities || []
      }
    });

    return res.status(201).json({
      success: true,
      message: 'State Department Admin created successfully',
      data: {
        id: newAdmin.id,
        fullName: newAdmin.fullName,
        officialEmail: newAdmin.officialEmail,
        state: newAdmin.state,
        department: newAdmin.department,
        managedMunicipalities: newAdmin.managedMunicipalities,
        accessLevel: newAdmin.accessLevel,
        dateOfCreation: newAdmin.dateOfCreation,
        status: newAdmin.status,
      }
    });

  } catch (error) {
    console.error('Create State Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 6. Create Municipal Admin -----
router.post('/create/municipal-admins', async (req, res: any) => {
  const parseResult = createMunicipalAdminSchema.safeParse(req.body);

  if (!parseResult.success) {
    return res.status(400).json({ success: false, errors: parseResult.error.flatten() });
  }

  const data = parseResult.data;

  try {
    const existing = await prisma.departmentMunicipalAdmin.findFirst({
      where: {
        OR: [
          { officialEmail: data.officialEmail },
        ]
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'Admin with given email or ID already exists'
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
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Municipal Department Admin created successfully',
      data: {
        id: newAdmin.id,
        fullName: newAdmin.fullName,
        officialEmail: newAdmin.officialEmail,
        department: newAdmin.department,
        municipality: newAdmin.municipality
      }
    });
  } catch (error) {
    console.error('Create Municipal Admin Error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ----- 7. Get All Admins -----  
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
    const complaints = await prisma.complaint.findMany({
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

  return router;
}