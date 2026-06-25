import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '../prisma/generated/client/client';
import { registerCivicPartnerSchema, loginCivicPartnerSchema } from '../lib/schemas/civicPartnerSchema';
import { authenticateCivicPartner, getCivicPartner } from '../middleware/civicPartnerAuth';

export default function (prisma: PrismaClient) {
  const router = express.Router();

  // ─── POST /api/civic-partner/auth/register ────────────────────────────────
  // Self-registration. Account is created but remains unverified until a
  // SuperAdmin approves it. Verified = false prevents survey creation.
  router.post('/register', async (req, res: any) => {
    const parsed = registerCivicPartnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }

    const { orgName, officialEmail, password, orgType, registrationNo, state, district, website, phoneNumber } =
      parsed.data;

    try {
      const existing = await prisma.civicPartner.findUnique({ where: { officialEmail } });
      if (existing) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists' });
      }

      const regExists = await prisma.civicPartner.findUnique({ where: { registrationNo } });
      if (regExists) {
        return res.status(409).json({
          success: false,
          message: 'An account with this registration number already exists',
        });
      }

      const hashed = await bcrypt.hash(password, 12);

      const partner = await prisma.civicPartner.create({
        data: {
          orgName,
          officialEmail,
          password: hashed,
          orgType,
          registrationNo,
          state,
          district: district ?? null,
          website: website || null,
          phoneNumber: phoneNumber ?? null,
        },
        select: {
          id: true,
          orgId: true,
          orgName: true,
          officialEmail: true,
          orgType: true,
          state: true,
          district: true,
          isVerified: true,
          status: true,
          dateOfCreation: true,
        },
      });

      return res.status(201).json({
        success: true,
        message:
          'Registration successful. Your organisation is pending verification by the platform administrator.',
        partner,
      });
    } catch (err) {
      console.error('[civicPartner.register]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── POST /api/civic-partner/auth/login ──────────────────────────────────
  router.post('/login', async (req, res: any) => {
    const parsed = loginCivicPartnerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, errors: parsed.error.flatten() });
    }

    const { officialEmail, password } = parsed.data;

    try {
      const partner = await prisma.civicPartner.findUnique({ where: { officialEmail } });

      if (!partner) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      if (partner.status === 'INACTIVE') {
        return res.status(403).json({ success: false, message: 'Your account has been suspended. Please contact the platform administrator.' });
      }

      const isMatch = await bcrypt.compare(password, partner.password);
      if (!isMatch) {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
      }

      await prisma.civicPartner.update({
        where: { id: partner.id },
        data: { lastLogin: new Date() },
      });

      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('[civicPartner.login] Missing JWT_SECRET');
        return res.status(500).json({ success: false, message: 'Server misconfiguration' });
      }

      const token = jwt.sign(
        {
          id: partner.id,
          email: partner.officialEmail,
          orgType: partner.orgType,
          accessLevel: 'CIVIC_PARTNER',
          isVerified: partner.isVerified,
        },
        secret,
        { expiresIn: '7d' }
      );

      res.cookie('civicPartnerToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000,
        path: '/',
      });

      return res.json({
        success: true,
        message: 'Login successful',
        isVerified: partner.isVerified,
        partner: {
          id: partner.id,
          orgId: partner.orgId,
          orgName: partner.orgName,
          officialEmail: partner.officialEmail,
          orgType: partner.orgType,
          accessLevel: partner.accessLevel,
          state: partner.state,
          isVerified: partner.isVerified,
        },
      });
    } catch (err) {
      console.error('[civicPartner.login]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  // ─── POST /api/civic-partner/auth/logout ─────────────────────────────────
  router.post('/logout', (req, res: any) => {
    res.clearCookie('civicPartnerToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // ─── GET /api/civic-partner/auth/me ──────────────────────────────────────
  router.get('/me', authenticateCivicPartner, async (req, res: any) => {
    const { id } = getCivicPartner(req);
    try {
      const partner = await prisma.civicPartner.findUnique({
        where: { id },
        select: {
          id: true,
          orgId: true,
          orgName: true,
          officialEmail: true,
          orgType: true,
          registrationNo: true,
          state: true,
          district: true,
          website: true,
          phoneNumber: true,
          accessLevel: true,
          status: true,
          isVerified: true,
          verifiedAt: true,
          dateOfCreation: true,
          lastLogin: true,
        },
      });
      if (!partner) return res.status(404).json({ success: false, message: 'Account not found' });
      return res.json({ success: true, partner });
    } catch (err) {
      console.error('[civicPartner.me]', err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  });

  return router;
}
