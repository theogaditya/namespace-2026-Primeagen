import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client/client';
import { authenticateAdmin } from '../middleware/unifiedAuth';

// Jharkhand district coordinates for geocoding fallback
const JHARKHAND_DISTRICTS: Record<string, { lat: number; lng: number }> = {
  'ranchi': { lat: 23.3441, lng: 85.3096 },
  'dhanbad': { lat: 23.7957, lng: 86.4304 },
  'jamshedpur': { lat: 22.8046, lng: 86.2029 },
  'bokaro': { lat: 23.6693, lng: 86.1511 },
  'hazaribagh': { lat: 23.9925, lng: 85.3637 },
  'deoghar': { lat: 24.4851, lng: 86.6947 },
  'giridih': { lat: 24.1851, lng: 86.3004 },
  'ramgarh': { lat: 23.6277, lng: 85.5614 },
  'dumka': { lat: 24.2680, lng: 87.2500 },
  'palamu': { lat: 24.0267, lng: 84.0525 },
  'garhwa': { lat: 24.1600, lng: 83.8000 },
  'chatra': { lat: 24.2067, lng: 84.8700 },
  'koderma': { lat: 24.4675, lng: 85.5940 },
  'jamtara': { lat: 23.9575, lng: 86.8014 },
  'sahebganj': { lat: 25.2550, lng: 87.6550 },
  'pakur': { lat: 24.6347, lng: 87.8450 },
  'godda': { lat: 24.8274, lng: 87.2126 },
  'lohardaga': { lat: 23.4357, lng: 84.6839 },
  'gumla': { lat: 23.0440, lng: 84.5420 },
  'simdega': { lat: 22.6155, lng: 84.5032 },
  'west singhbhum': { lat: 22.4732, lng: 85.6033 },
  'east singhbhum': { lat: 22.8046, lng: 86.2029 },
  'seraikela kharsawan': { lat: 22.7075, lng: 85.8375 },
  'khunti': { lat: 23.0750, lng: 85.2800 },
  'latehar': { lat: 23.7475, lng: 84.5000 },
};

// Simple hash function to generate consistent offset from complaint ID
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash;
}

// Get deterministic offset based on complaint ID (returns value between -0.01 and 0.01)
function getDeterministicOffset(id: string, seed: number): number {
  const hash = hashCode(id + seed.toString());
  return ((hash % 1000) / 1000) * 0.02 - 0.01; // ~1km offset, deterministic
}

// Helper to get coordinates from district/city name with deterministic offset
function getCoordinatesFromLocation(
  district: string | null, 
  city: string | null, 
  locality: string | null,
  complaintId: string
): { lat: number; lng: number } | null {
  // Try district first
  if (district) {
    const normalizedDistrict = district.toLowerCase().trim();
    if (JHARKHAND_DISTRICTS[normalizedDistrict]) {
      return {
        lat: JHARKHAND_DISTRICTS[normalizedDistrict].lat + getDeterministicOffset(complaintId, 1),
        lng: JHARKHAND_DISTRICTS[normalizedDistrict].lng + getDeterministicOffset(complaintId, 2),
      };
    }
    // Try partial match
    for (const [key, coords] of Object.entries(JHARKHAND_DISTRICTS)) {
      if (normalizedDistrict.includes(key) || key.includes(normalizedDistrict)) {
        return { 
          lat: coords.lat + getDeterministicOffset(complaintId, 1), 
          lng: coords.lng + getDeterministicOffset(complaintId, 2) 
        };
      }
    }
  }
  
  // Try city as fallback
  if (city) {
    const normalizedCity = city.toLowerCase().trim();
    for (const [key, coords] of Object.entries(JHARKHAND_DISTRICTS)) {
      if (normalizedCity.includes(key) || key.includes(normalizedCity)) {
        return { 
          lat: coords.lat + getDeterministicOffset(complaintId, 1), 
          lng: coords.lng + getDeterministicOffset(complaintId, 2) 
        };
      }
    }
  }
  
  return null;
}

export default function (prisma: PrismaClient) {
  const router = Router();

  // Get all complaints with filters
  router.get('/list', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).admin;
      const { status, department, page = 1, limit = 10, search } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause based on admin type and filters
      const whereClause: any = {};

      // Filter by status if provided
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      // Filter by department if provided
      if (department && department !== 'all') {
        whereClause.assignedDepartment = department;
      }

      // Search in description or subCategory
      if (search) {
        whereClause.OR = [
          { description: { contains: search as string, mode: 'insensitive' } },
          { subCategory: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      // Based on admin type, filter complaints
      switch (admin.adminType) {
        case 'AGENT':
          // Agents see only their assigned complaints
          whereClause.assignedAgentId = admin.id;
          break;
        case 'MUNICIPAL_ADMIN':
          // Municipal admins see complaints managed by them or in their municipality
          whereClause.managedByMunicipalAdminId = admin.id;
          break;
        case 'STATE_ADMIN':
          // State admins see escalated complaints to them
          whereClause.OR = [
            { escalatedToStateAdminId: admin.id },
            { assignedDepartment: admin.department },
          ];
          break;
        case 'SUPER_ADMIN':
          // Super admins see all complaints
          break;
      }

      const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
          where: whereClause,
          include: {
            category: {
              select: {
                name: true,
              },
            },
            location: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
            assignedAgent: {
              select: {
                id: true,
                fullName: true,
                officialEmail: true,
              },
            },
            managedByMunicipalAdmin: {
              select: {
                id: true,
                fullName: true,
                officialEmail: true,
              },
            },
          },
          orderBy: {
            submissionDate: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.complaint.count({ where: whereClause }),
      ]);

      // Transform complaints for response
      const formattedComplaints = complaints.map((complaint) => ({
        id: complaint.id,
        seq: complaint.seq,
        title: complaint.subCategory,
        description: complaint.description,
        category: complaint.category?.name || 'Unknown',
        subCategory: complaint.subCategory,
        status: complaint.status,
        escalationLevel: complaint.escalationLevel,
        urgency: complaint.urgency,
        department: complaint.assignedDepartment,
        submissionDate: complaint.submissionDate,
        lastUpdated: complaint.lastUpdated,
        dateOfResolution: complaint.dateOfResolution,
        attachmentUrl: complaint.attachmentUrl,
        isPublic: complaint.isPublic,
        upvoteCount: complaint.upvoteCount,
        isDuplicate: complaint.isDuplicate,
        sla: complaint.sla,
        AIstandardizedSubCategory: complaint.AIstandardizedSubCategory || null,
        AIStandardizedSubcategory: complaint.AIstandardizedSubCategory || null,
        managedByMunicipalAdmin: complaint.managedByMunicipalAdmin
          ? {
              id: complaint.managedByMunicipalAdmin.id,
              name: complaint.managedByMunicipalAdmin.fullName,
              email: complaint.managedByMunicipalAdmin.officialEmail,
            }
          : null,
        location: complaint.location
          ? {
              district: complaint.location.district,
              city: complaint.location.city,
              locality: complaint.location.locality,
              street: complaint.location.street,
              pin: complaint.location.pin,
            }
          : null,
        complainant: complaint.User
          ? {
              id: complaint.User.id,
              name: complaint.User.name,
              email: complaint.User.email,
              phone: complaint.User.phoneNumber,
            }
          : null,
        assignedAgent: complaint.assignedAgent
          ? {
              id: complaint.assignedAgent.id,
              name: complaint.assignedAgent.fullName,
              email: complaint.assignedAgent.officialEmail,
            }
          : null,
      }));

      return res.json({
        success: true,
        data: formattedComplaints,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching complaints:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch complaints',
      });
    }
  });

  // Get single complaint by ID
  // NOTE: single-complaint route has been moved to the end of the file

  // Get complaint statistics
  router.get('/stats/overview', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const admin = (req as any).admin;
      const whereClause: any = {};

      // Apply same filtering based on admin type
      switch (admin.adminType) {
        case 'AGENT':
          whereClause.assignedAgentId = admin.id;
          break;
        case 'MUNICIPAL_ADMIN':
          whereClause.managedByMunicipalAdminId = admin.id;
          break;
        case 'STATE_ADMIN':
          whereClause.OR = [
            { escalatedToStateAdminId: admin.id },
            { assignedDepartment: admin.department },
          ];
          break;
      }

      const [
        total,
        registered,
        underProcessing,
        completed,
        onHold,
        highPriority,
        assignedCount,
      ] = await Promise.all([
        prisma.complaint.count({ where: whereClause }),
        prisma.complaint.count({ where: { ...whereClause, status: 'REGISTERED' } }),
        prisma.complaint.count({ where: { ...whereClause, status: 'UNDER_PROCESSING' } }),
        prisma.complaint.count({ where: { ...whereClause, status: 'COMPLETED' } }),
        prisma.complaint.count({ where: { ...whereClause, status: 'ON_HOLD' } }),
        // Count high and critical urgencies
        prisma.complaint.count({ where: { ...whereClause, urgency: { in: ['HIGH', 'CRITICAL'] } } }),
        // Count assigned complaints (assignedAgentId not null)
        prisma.complaint.count({ where: { ...whereClause, NOT: { assignedAgentId: null } } }),
      ]);

      return res.json({
        success: true,
        data: {
          total,
          registered,
          inProgress: underProcessing,
          resolved: completed,
          closed: onHold,
          highPriority,
          assigned: assignedCount,
        },
      });
    } catch (error) {
      console.error('Error fetching complaint stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch complaint statistics',
      });
    }
  });

  // Get all complaints
  router.get('/all-complaints', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { status, department, page = 1, limit = 10, search } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);
      const skip = (pageNum - 1) * limitNum;

      // Build where clause - no restrictions, get all complaints
      const whereClause: any = {};

      // Filter by status if provided
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      // Filter by department if provided
      if (department && department !== 'all') {
        whereClause.assignedDepartment = department;
      }

      // Search in description or subCategory
      if (search) {
        whereClause.OR = [
          { description: { contains: search as string, mode: 'insensitive' } },
          { subCategory: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [complaints, total] = await Promise.all([
        prisma.complaint.findMany({
          where: whereClause,
          include: {
            category: {
              select: {
                name: true,
              },
            },
            location: true,
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
              },
            },
            assignedAgent: {
              select: {
                id: true,
                fullName: true,
                officialEmail: true,
              },
            },
            managedByMunicipalAdmin: {
              select: {
                id: true,
                fullName: true,
                officialEmail: true,
              },
            },
          },
          orderBy: {
            submissionDate: 'desc',
          },
          skip,
          take: limitNum,
        }),
        prisma.complaint.count({ where: whereClause }),
      ]);

      // Transform complaints for response
      const formattedComplaints = complaints.map((complaint) => ({
        id: complaint.id,
        seq: complaint.seq,
        title: complaint.subCategory,
        description: complaint.description,
        category: complaint.category?.name || 'Unknown',
        subCategory: complaint.subCategory,
        status: complaint.status,
        escalationLevel: complaint.escalationLevel,
        urgency: complaint.urgency,
        department: complaint.assignedDepartment,
        submissionDate: complaint.submissionDate,
        lastUpdated: complaint.lastUpdated,
        attachmentUrl: complaint.attachmentUrl,
        isPublic: complaint.isPublic,
        upvoteCount: complaint.upvoteCount,
        // Include AI standardized subcategory if present (both DB field and a frontend-friendly alias)
        AIstandardizedSubCategory: complaint.AIstandardizedSubCategory || null,
        AIStandardizedSubcategory: complaint.AIstandardizedSubCategory || null,
        location: complaint.location
          ? {
              district: complaint.location.district,
              city: complaint.location.city,
                isDuplicate: complaint.isDuplicate,
              street: complaint.location.street,
              pin: complaint.location.pin,
            }
          : null,
        complainant: complaint.User
          ? {
              id: complaint.User.id,
              name: complaint.User.name,
              email: complaint.User.email,
              phone: complaint.User.phoneNumber,
            }
          : null,
        assignedAgent: complaint.assignedAgent
          ? {
              id: complaint.assignedAgent.id,
              name: complaint.assignedAgent.fullName,
              email: complaint.assignedAgent.officialEmail,
            }
          : null,
        managedByMunicipalAdmin: complaint.managedByMunicipalAdmin
          ? {
              id: complaint.managedByMunicipalAdmin.id,
              name: complaint.managedByMunicipalAdmin.fullName,
              email: complaint.managedByMunicipalAdmin.officialEmail,
            }
          : null,
      }));

      return res.json({
        success: true,
        data: formattedComplaints,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } catch (error) {
      console.error('Error fetching all complaints:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch complaints',
      });
    }
  });

  // Get complaint locations for map (all non-duplicate complaints with geocoding fallback)
  // NOTE: This must be placed BEFORE the /:id route to avoid route shadowing
  router.get('/locations', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      // Fetch ALL non-duplicate complaints (not just ones with coordinates)
      const complaints = await prisma.complaint.findMany({
        where: {
          isDuplicate: { not: true },
          status: { not: 'DELETED' },
        },
        select: {
          id: true,
          seq: true,
          subCategory: true,
          description: true,
          status: true,
          urgency: true,
          submissionDate: true,
          category: {
            select: {
              name: true,
            },
          },
          location: {
            select: {
              latitude: true,
              longitude: true,
              district: true,
              city: true,
              locality: true,
              pin: true,
            },
          },
        },
        orderBy: {
          submissionDate: 'desc',
        },
      });

      // Process complaints - use stored coordinates or geocode from district/city
      const locations = complaints
        .map((c) => {
          let lat: number | null = c.location?.latitude ?? null;
          let lng: number | null = c.location?.longitude ?? null;

          // If no coordinates, try to geocode from district/city (with deterministic offset based on ID)
          if (lat == null || lng == null) {
            const geocoded = getCoordinatesFromLocation(
              c.location?.district ?? null,
              c.location?.city ?? null,
              c.location?.locality ?? null,
              c.id // Pass complaint ID for deterministic offset
            );
            if (geocoded) {
              lat = geocoded.lat;
              lng = geocoded.lng;
            }
          }

          // Skip if still no coordinates
          if (lat == null || lng == null) {
            return null;
          }

          return {
            id: c.id,
            seq: c.seq,
            subCategory: c.subCategory,
            description: c.description,
            status: c.status,
            urgency: c.urgency,
            submissionDate: c.submissionDate,
            category: c.category?.name || 'Unknown',
            latitude: lat,
            longitude: lng,
            district: c.location?.district ?? null,
            city: c.location?.city ?? null,
            locality: c.location?.locality ?? null,
            pin: c.location?.pin ?? null,
          };
        })
        .filter((loc): loc is NonNullable<typeof loc> => loc !== null);

      // console.log(`[complaints/locations] Returning ${locations.length} complaint locations (geocoded from ${complaints.length} total)`);

      return res.json({
        success: true,
        count: locations.length,
        locations,
      });
    } catch (error) {
      console.error('Error fetching complaint locations:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch complaint locations',
      });
    }
  });

  // Get most-liked complaints (handles ties)
  router.get('/most-liked', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      // Find the complaint with highest upvoteCount
      const top = await prisma.complaint.findFirst({
        where: { upvoteCount: { not: 0 } },
        orderBy: { upvoteCount: 'desc' },
        select: { upvoteCount: true },
      });

      if (!top || (top.upvoteCount ?? 0) <= 0) {
        return res.json({ success: true, data: [] });
      }

      const highest = top.upvoteCount as number;

      const complaints = await prisma.complaint.findMany({
        where: { upvoteCount: highest },
        include: {
          category: { select: { name: true } },
          location: true,
          User: { select: { id: true, name: true, email: true, phoneNumber: true } },
          assignedAgent: { select: { id: true, fullName: true, officialEmail: true } },
          managedByMunicipalAdmin: { select: { id: true, fullName: true, officialEmail: true } },
        },
        orderBy: { submissionDate: 'desc' },
      });

      const formatted = complaints.map((complaint) => ({
        id: complaint.id,
        seq: complaint.seq,
        title: complaint.subCategory,
        description: complaint.description,
        category: complaint.category?.name || 'Unknown',
        subCategory: complaint.subCategory,
        status: complaint.status,
        escalationLevel: complaint.escalationLevel,
        urgency: complaint.urgency,
        department: complaint.assignedDepartment,
        submissionDate: complaint.submissionDate,
        lastUpdated: complaint.lastUpdated,
        dateOfResolution: complaint.dateOfResolution,
        attachmentUrl: complaint.attachmentUrl,
        isPublic: complaint.isPublic,
        upvoteCount: complaint.upvoteCount,
        isDuplicate: complaint.isDuplicate,
        sla: complaint.sla,
        AIstandardizedSubCategory: complaint.AIstandardizedSubCategory || null,
        AIStandardizedSubcategory: complaint.AIstandardizedSubCategory || null,
        managedByMunicipalAdmin: complaint.managedByMunicipalAdmin
          ? {
              id: complaint.managedByMunicipalAdmin.id,
              name: complaint.managedByMunicipalAdmin.fullName,
              email: complaint.managedByMunicipalAdmin.officialEmail,
            }
          : null,
        location: complaint.location
          ? {
              district: complaint.location.district,
              city: complaint.location.city,
              locality: complaint.location.locality,
              street: complaint.location.street,
              pin: complaint.location.pin,
            }
          : null,
        complainant: complaint.User
          ? {
              id: complaint.User.id,
              name: complaint.User.name,
              email: complaint.User.email,
              phone: complaint.User.phoneNumber,
            }
          : null,
        assignedAgent: complaint.assignedAgent
          ? {
              id: complaint.assignedAgent.id,
              name: complaint.assignedAgent.fullName,
              email: complaint.assignedAgent.officialEmail,
            }
          : null,
      }));

      return res.json({ success: true, data: formatted, highestLikeCount: highest });
    } catch (error) {
      console.error('Error fetching most-liked complaints:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch most-liked complaints' });
    }
  });

  // Get single complaint by ID (placed last to avoid route shadowing)
  router.get('/:id', authenticateAdmin, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const complaint = await prisma.complaint.findUnique({
        where: { id },
        include: {
          category: {
            select: {
              name: true,
            },
          },
          location: true,
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
            },
          },
          assignedAgent: {
            select: {
              id: true,
              fullName: true,
              officialEmail: true,
              department: true,
            },
          },
          auditLogs: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: 'Complaint not found',
        });
      }

      return res.json({
        success: true,
        data: {
          id: complaint.id,
          seq: complaint.seq,
          title: complaint.subCategory,
          description: complaint.description,
          category: complaint.category?.name || 'Unknown',
          subCategory: complaint.subCategory,
          status: complaint.status,
          urgency: complaint.urgency,
          department: complaint.assignedDepartment,
          submissionDate: complaint.submissionDate,
          lastUpdated: complaint.lastUpdated,
          dateOfResolution: complaint.dateOfResolution,
          attachmentUrl: complaint.attachmentUrl,
          isPublic: complaint.isPublic,
          upvoteCount: complaint.upvoteCount,
          isDuplicate: complaint.isDuplicate,
          sla: complaint.sla,
          escalationLevel: complaint.escalationLevel,
          AIabusedFlag: complaint.AIabusedFlag,
          AIimageVarificationStatus: complaint.AIimageVarificationStatus,
          AIstandardizedSubCategory: complaint.AIstandardizedSubCategory,
          location: complaint.location
            ? {
                district: complaint.location.district,
                city: complaint.location.city,
                locality: complaint.location.locality,
                street: complaint.location.street,
                pin: complaint.location.pin,
                latitude: complaint.location.latitude,
                longitude: complaint.location.longitude,
              }
            : null,
          complainant: complaint.User
            ? {
                id: complaint.User.id,
                name: complaint.User.name,
                email: complaint.User.email,
                phone: complaint.User.phoneNumber,
              }
            : null,
          assignedAgent: complaint.assignedAgent
            ? {
                id: complaint.assignedAgent.id,
                name: complaint.assignedAgent.fullName,
                email: complaint.assignedAgent.officialEmail,
                department: complaint.assignedAgent.department,
              }
            : null,
          auditLogs: complaint.auditLogs,
        },
      });
    } catch (error) {
      console.error('Error fetching complaint:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch complaint',
      });
    }
  });

  return router;
}
