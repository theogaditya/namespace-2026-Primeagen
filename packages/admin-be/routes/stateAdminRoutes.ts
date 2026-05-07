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
    const complaints = await prisma.complaint.findMany({
      include: {
        category: true,
        complainant: true 
      },
      orderBy: {
        submissionDate: 'desc' 
      }
    });

    return res.json({ success: true, complaints });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: 'Failed to fetch complaints' });
  }
});

  return router;
}
