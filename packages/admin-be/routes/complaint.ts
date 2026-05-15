import { Router } from 'express';
import type { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client/client';
import { authenticateAdmin } from '../middleware/unifiedAuth';

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

      const [total, registered, inProgress, resolved, closed] = await Promise.all([
        prisma.complaint.count({ where: whereClause }),
        prisma.complaint.count({ where: { ...whereClause, status: 'REGISTERED' } }),
        prisma.complaint.count({ where: { ...whereClause, status: 'IN_PROGRESS' } }),
        prisma.complaint.count({ where: { ...whereClause, status: 'RESOLVED' } }),
        prisma.complaint.count({ where: { ...whereClause, status: 'CLOSED' } }),
      ]);

      return res.json({
        success: true,
        data: {
          total,
          registered,
          inProgress,
          resolved,
          closed,
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
