import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../prisma/generated/client/client';
import { unifiedLoginSchema} from '../lib/schemas/authSchema';
import type { AdminType } from '../lib/schemas/authSchema';

export default function (prisma: PrismaClient) {
  const router = Router();
  const JWT_SECRET: string = process.env.JWT_SECRET!;

  // Unified Login for all admin types
  router.post('/login', async (req, res: any) => {
    const parseResult = unifiedLoginSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Invalid input',
        errors: parseResult.error.flatten()
      });
    }

    const { officialEmail, password, adminType } = parseResult.data;

    try {
      let admin: any = null;
      let tokenPayload: object = {};

      switch (adminType) {
        case 'SUPER_ADMIN':
          admin = await prisma.superAdmin.findUnique({
            where: { officialEmail }
          });
          if (admin) {
            tokenPayload = {
              id: admin.id,
              email: admin.officialEmail,
              accessLevel: admin.accessLevel,
              adminType: 'SUPER_ADMIN'
            };
          }
          break;

        case 'STATE_ADMIN':
          admin = await prisma.departmentStateAdmin.findUnique({
            where: { officialEmail }
          });
          if (admin) {
            tokenPayload = {
              id: admin.id,
              email: admin.officialEmail,
              accessLevel: admin.accessLevel,
              adminType: 'STATE_ADMIN'
            };
          }
          break;

        case 'MUNICIPAL_ADMIN':
          admin = await prisma.departmentMunicipalAdmin.findUnique({
            where: { officialEmail }
          });
          if (admin) {
            tokenPayload = {
              id: admin.id,
              email: admin.officialEmail,
              accessLevel: admin.accessLevel,
              adminType: 'MUNICIPAL_ADMIN'
            };
          }
          break;

        case 'AGENT':
          admin = await prisma.agent.findFirst({
            where: {
              officialEmail,
              status: 'ACTIVE'
            }
          });
          if (admin) {
            tokenPayload = {
              id: admin.id,
              email: admin.officialEmail,
              accessLevel: admin.accessLevel,
              department: admin.department,
              adminType: 'AGENT'
            };
          }
          break;

        default:
          return res.status(400).json({
            success: false,
            message: 'Invalid admin type'
          });
      }

      if (!admin) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // Update lastLogin
      await updateLastLogin(prisma, adminType, admin.id);

      // Generate JWT token
      const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '7d' });

      // Prepare admin response (excluding password)
      const { password: _, ...adminData } = admin;

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        adminType,
        admin: adminData
      });

    } catch (err) {
      console.error('Login Error:', err);
      return res.status(500).json({
        success: false,
        message: 'Server error'
      });
    }
  });

  // Verify token endpoint
  router.get('/verify', async (req, res: any) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const token: string = authHeader.split(' ')[1]!;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);

      return res.json({
        success: true,
        user: decoded
      });
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  });

  return router;
}

// Helper function to update last login
async function updateLastLogin(prisma: PrismaClient, adminType: AdminType, id: string) {
  try {
    switch (adminType) {
      case 'SUPER_ADMIN':
        await prisma.superAdmin.update({
          where: { id },
          data: { lastLogin: new Date() }
        });
        break;
      case 'STATE_ADMIN':
        await prisma.departmentStateAdmin.update({
          where: { id },
          data: { lastLogin: new Date() }
        });
        break;
      case 'MUNICIPAL_ADMIN':
        await prisma.departmentMunicipalAdmin.update({
          where: { id },
          data: { lastLogin: new Date() }
        });
        break;
      case 'AGENT':
        await prisma.agent.update({
          where: { id },
          data: { lastLogin: new Date() }
        });
        break;
    }
  } catch (error) {
    console.error('Failed to update lastLogin:', error);
  }
}
