import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import {
  ComplaintResponse,
  ComplaintListResponse,
  SingleComplaintResponse,
} from "../lib/types/types";
import { RedisClientForComplaintCache } from "../lib/redis/redisClient";
import { likeStore } from "../lib/likes/inMemoryLikeStore";

// Initialize Redis cache client
const cacheClient = new RedisClientForComplaintCache();
let cacheConnected = false;

// Connect to Redis cache on startup
(async () => {
  try {
    await cacheClient.connect();
    cacheConnected = true;
    console.log("✅ Redis Complaint Cache connected");
  } catch (error) {
    console.error("❌ Failed to connect Redis Complaint Cache:", error);
    cacheConnected = false;
  }
})();

// Export helper function to invalidate cache (used when complaints are created/updated)
export async function invalidateComplaintCache(userId?: string): Promise<void> {
  if (!cacheConnected) return;
  
  try {
    if (userId) {
      // Invalidate caches related to specific user
      await cacheClient.invalidateCachesByPattern(`my:${userId}`);
      await cacheClient.invalidateCachesByPattern(`user:${userId}`);
      await cacheClient.invalidateCachesByPattern(`all:${userId}`);
    }
    // Invalidate all list caches (they may have stale data)
    await cacheClient.invalidateCachesByPattern('all:');
    await cacheClient.invalidateCachesByPattern('my:');
  } catch (error) {
    console.error("Failed to invalidate complaint cache:", error);
  }
}

// Export helper to invalidate single complaint cache
export async function invalidateSingleComplaintCache(complaintId: string, seq?: number): Promise<void> {
  if (!cacheConnected) return;
  
  try {
    await cacheClient.invalidateCache(cacheClient.generateKey('single', complaintId));
    if (seq) {
      await cacheClient.invalidateCache(cacheClient.generateKey('seq', seq.toString()));
    }
  } catch (error) {
    console.error("Failed to invalidate single complaint cache:", error);
  }
}

// Common select fields for complaint queries
const complaintSelectFields = {
  id: true,
  seq: true,
  submissionDate: true,
  complainantId: true,
  subCategory: true,
  description: true,
  urgency: true,
  attachmentUrl: true,
  status: true,
  upvoteCount: true,
  isPublic: true,
  assignedAgentId: true,
  assignedDepartment: true,
  categoryId: true,
  dateOfResolution: true,
  escalationLevel: true,
  sla: true,
  AIabusedFlag: true,
  AIimageVarificationStatus: true,
  AIstandardizedSubCategory: true,
  lastUpdated: true,
  isDuplicate: true,
  managedByMunicipalAdminId: true,
  escalatedToStateAdminId: true,
  location: {
    select: {
      id: true,
      complaintId: true,
      pin: true,
      district: true,
      city: true,
      locality: true,
      street: true,
      latitude: true,
      longitude: true,
    },
  },
  User: {
    select: {
      id: true,
      name: true,
      email: true,
      phoneNumber: true,
    },
  },
  category: {
    select: {
      id: true,
      name: true,
      subCategories: true,
      assignedDepartment: true,
    },
  },
  // Include assigned personnel details
  assignedAgent: {
    select: {
      id: true,
      fullName: true,
      department: true,
      dateOfCreation: true,
    },
  },
  managedByMunicipalAdmin: {
    select: {
      id: true,
      fullName: true,
      department: true,
      municipality: true,
      dateOfCreation: true,
    },
  },
  escalatedToStateAdmin: {
    select: {
      id: true,
      fullName: true,
      department: true,
      state: true,
      dateOfCreation: true,
    },
  },
};

export function getComplaintRouter(db: PrismaClient) {
  const router = Router();

  /**
   * Helper function to add hasLiked field to complaints
   * Uses in-memory store for O(1) lookup
   */
  function addHasLikedField(complaints: any[], userId?: string): any[] {
    if (!userId) return complaints.map(c => ({ ...c, hasLiked: false }));
    
    return complaints.map(complaint => ({
      ...complaint,
      hasLiked: likeStore.hasLiked(userId, complaint.id),
    }));
  }

  /**
   * Helper function to add hasLiked field to a single complaint
   */
  function addHasLikedToSingle(complaint: any, userId?: string): any {
    return {
      ...complaint,
      hasLiked: userId ? likeStore.hasLiked(userId, complaint.id) : false,
    };
  }

  /**
   * GET /api/complaints
   * Get all complaints with pagination (only public complaints or user's own)
   * Query params:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   *   - status: ComplaintStatus (optional filter)
   *   - department: Department (optional filter)
   *   - urgency: ComplaintUrgency (optional filter)
   */
  router.get("/", async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      
      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Optional filters
      const status = req.query.status as string | undefined;
      const department = req.query.department as string | undefined;
      const urgency = req.query.urgency as string | undefined;

      // Generate cache key based on query params
      const cacheKey = cacheClient.generateKey('all', `${userId}:${page}:${limit}:${status || ''}:${department || ''}:${urgency || ''}`);

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<ComplaintListResponse>(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      // Build where clause - show public complaints or user's own complaints
      const whereClause: any = {
        OR: [
          { isPublic: true },
          { complainantId: userId },
        ],
      };

      // Add optional filters
      if (status) {
        whereClause.status = status;
      }
      if (department) {
        whereClause.assignedDepartment = department;
      }
      if (urgency) {
        whereClause.urgency = urgency;
      }

      // Get total count for pagination
      const total = await db.complaint.count({ where: whereClause });

      // Fetch complaints
      const complaints = await db.complaint.findMany({
        where: whereClause,
        select: complaintSelectFields,
        orderBy: { submissionDate: "desc" },
        skip,
        take: limit,
      });

      // Add hasLiked field to each complaint
      const complaintsWithLikes = addHasLikedField(complaints, userId);

      const response: ComplaintListResponse = {
        success: true,
        message: `Found ${complaints.length} complaints`,
        data: complaintsWithLikes as unknown as ComplaintResponse[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Cache the response
      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, response, 120); // 2 minutes TTL for list
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Get all complaints error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching complaints",
      });
    }
  });

  /**
   * GET /api/complaints/my
   * Get all complaints created by the authenticated user
   * Query params:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   *   - status: ComplaintStatus (optional filter)
   */
  router.get("/my", async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found. Authentication required.",
        });
      }

      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Optional status filter
      const status = req.query.status as string | undefined;

      // Generate cache key
      const cacheKey = cacheClient.generateKey('my', `${userId}:${page}:${limit}:${status || ''}`);

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<ComplaintListResponse>(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      // Build where clause
      const whereClause: any = {
        complainantId: userId,
      };

      if (status) {
        whereClause.status = status;
      }

      // Get total count for pagination
      const total = await db.complaint.count({ where: whereClause });

      // Fetch user's complaints
      const complaints = await db.complaint.findMany({
        where: whereClause,
        select: complaintSelectFields,
        orderBy: { submissionDate: "desc" },
        skip,
        take: limit,
      });

      // Add hasLiked field to each complaint
      const complaintsWithLikes = addHasLikedField(complaints, userId);

      const response: ComplaintListResponse = {
        success: true,
        message: `Found ${complaints.length} complaints for this user`,
        data: complaintsWithLikes as unknown as ComplaintResponse[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Cache the response
      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, response, 120); // 2 minutes TTL
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Get user complaints error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching user complaints",
      });
    }
  });

  /**
   * GET /api/complaints/:id
   * Get a specific complaint by ID
   * User can only view public complaints or their own complaints
   */
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userId = req.userId;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint ID format. Must be a valid UUID.",
        });
      }

      // Generate cache key
      const cacheKey = cacheClient.generateKey('single', id);

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<SingleComplaintResponse>(cacheKey);
        if (cached && cached.data) {
          // Verify access permissions even for cached data
          const cachedComplaint = cached.data;
          if (!cachedComplaint.isPublic && cachedComplaint.complainantId !== userId) {
            return res.status(403).json({
              success: false,
              message: "You do not have permission to view this complaint",
              data: null,
            });
          }
          return res.status(200).json(cached);
        }
      }

      // Fetch the complaint
      const complaint = await db.complaint.findUnique({
        where: { id },
        select: complaintSelectFields,
      });

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found",
          data: null,
        });
      }

      // Check if user has access to view this complaint
      // User can view if: complaint is public OR user is the complainant
      if (!complaint.isPublic && complaint.complainantId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view this complaint",
          data: null,
        });
      }

      // Add hasLiked field
      const complaintWithLike = addHasLikedToSingle(complaint, userId);

      const response: SingleComplaintResponse = {
        success: true,
        message: "Complaint retrieved successfully",
        data: complaintWithLike as unknown as ComplaintResponse,
      };

      // Cache the response
      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, response, 300); // 5 minutes TTL for single
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Get complaint by ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching complaint",
      });
    }
  });

  /**
   * GET /api/complaints/user/:userId
   * Get all complaints by a specific user ID
   * Only returns public complaints unless the requesting user is the owner
   * Query params:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   */
  router.get("/user/:userId", async (req: Request, res: Response) => {
    try {
      const targetUserId = req.params.userId as string;
      const requestingUserId = req.userId;

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(targetUserId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format. Must be a valid UUID.",
        });
      }

      // Check if user exists
      const userExists = await db.user.findUnique({
        where: { id: targetUserId },
        select: { id: true },
      });

      if (!userExists) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Generate cache key (include whether user is owner for different cache)
      const isOwner = requestingUserId === targetUserId;
      const cacheKey = cacheClient.generateKey('user', `${targetUserId}:${isOwner}:${page}:${limit}`);

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<ComplaintListResponse>(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      // Build where clause
      // If requesting user is the target user, show all their complaints
      // Otherwise, only show public complaints
      const whereClause: any = {
        complainantId: targetUserId,
      };

      if (requestingUserId !== targetUserId) {
        whereClause.isPublic = true;
      }

      // Get total count for pagination
      const total = await db.complaint.count({ where: whereClause });

      // Fetch complaints
      const complaints = await db.complaint.findMany({
        where: whereClause,
        select: complaintSelectFields,
        orderBy: { submissionDate: "desc" },
        skip,
        take: limit,
      });

      // Add hasLiked field to each complaint
      const complaintsWithLikes = addHasLikedField(complaints, requestingUserId);

      const response: ComplaintListResponse = {
        success: true,
        message: `Found ${complaints.length} complaints for user ${targetUserId}`,
        data: complaintsWithLikes as unknown as ComplaintResponse[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      // Cache the response
      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, response, 120); // 2 minutes TTL for list
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Get complaints by user ID error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching user complaints",
      });
    }
  });

  /**
   * GET /api/complaints/seq/:seq
   * Get a specific complaint by sequence number
   * User can only view public complaints or their own complaints
   */
  router.get("/seq/:seq", async (req: Request, res: Response) => {
    try {
      const seq = parseInt(req.params.seq as string);
      const userId = req.userId;

      if (isNaN(seq) || seq < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid sequence number. Must be a positive integer.",
        });
      }

      // Generate cache key
      const cacheKey = cacheClient.generateKey('seq', seq.toString());

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<SingleComplaintResponse>(cacheKey);
        if (cached && cached.data) {
          // Verify access permissions even for cached data
          const cachedComplaint = cached.data;
          if (!cachedComplaint.isPublic && cachedComplaint.complainantId !== userId) {
            return res.status(403).json({
              success: false,
              message: "You do not have permission to view this complaint",
              data: null,
            });
          }
          return res.status(200).json(cached);
        }
      }

      // Fetch the complaint by sequence number
      const complaint = await db.complaint.findUnique({
        where: { seq },
        select: complaintSelectFields,
      });

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found",
          data: null,
        });
      }

      // Check if user has access to view this complaint
      if (!complaint.isPublic && complaint.complainantId !== userId) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to view this complaint",
          data: null,
        });
      }

      // Add hasLiked field
      const complaintWithLike = addHasLikedToSingle(complaint, userId);

      const response: SingleComplaintResponse = {
        success: true,
        message: "Complaint retrieved successfully",
        data: complaintWithLike as unknown as ComplaintResponse,
      };

      // Cache the response
      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, response, 300); // 5 minutes TTL
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Get complaint by sequence error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching complaint",
      });
    }
  });

  /**
   * GET /api/complaints/feed/for-you
   * Get complaints from the same district as the user (personalized feed)
   * Query params:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   */
  router.get("/feed/for-you", async (req: Request, res: Response) => {
    try {
      const userId = req.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found. Authentication required.",
        });
      }

      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Get user's district from their profile
      const user = await db.user.findUnique({
        where: { id: userId },
        include: { location: true },
      });

      if (!user?.location?.district) {
        // Fallback to trending if user has no district set
        const complaints = await db.complaint.findMany({
          where: { isPublic: true },
          select: complaintSelectFields,
          orderBy: { upvoteCount: "desc" },
          skip,
          take: limit,
        });

        const total = await db.complaint.count({ where: { isPublic: true } });

        // Add hasLiked field to each complaint
        const complaintsWithLikes = addHasLikedField(complaints, userId);

        return res.status(200).json({
          success: true,
          message: `No district set. Showing trending complaints instead.`,
          data: complaintsWithLikes,
          pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
        });
      }

      const userDistrict = user.location.district;

      // Generate cache key (without userId - we'll add hasLiked after cache lookup)
      const cacheKey = cacheClient.generateKey('feed_foryou', `${userDistrict}:${page}:${limit}`);

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<ComplaintListResponse>(cacheKey);
        if (cached && cached.data) {
          // Add hasLiked field for THIS user (not cached)
          const complaintsWithLikes = addHasLikedField(cached.data as any[], userId);
          return res.status(200).json({
            ...cached,
            data: complaintsWithLikes,
          });
        }
      }

      // Get complaints from user's district (public only)
      const whereClause = {
        isPublic: true,
        location: {
          district: userDistrict,
        },
      };

      const total = await db.complaint.count({ where: whereClause });

      const complaints = await db.complaint.findMany({
        where: whereClause,
        select: complaintSelectFields,
        orderBy: [
          { upvoteCount: "desc" },
          { submissionDate: "desc" },
        ],
        skip,
        take: limit,
      });

      // Cache the raw response (WITHOUT hasLiked)
      const responseForCache: ComplaintListResponse = {
        success: true,
        message: `Found ${complaints.length} complaints from ${userDistrict}`,
        data: complaints as unknown as ComplaintResponse[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, responseForCache, 120); // 2 minutes TTL
      }

      // Add hasLiked field for THIS user before returning
      const complaintsWithLikes = addHasLikedField(complaints, userId);

      return res.status(200).json({
        ...responseForCache,
        data: complaintsWithLikes,
      });
    } catch (error) {
      console.error("Get for-you feed error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching for-you feed",
      });
    }
  });

  /**
   * GET /api/complaints/feed/trending
   * Get complaints sorted by upvote count (most liked first)
   * Query params:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   */
  router.get("/feed/trending", async (req: Request, res: Response) => {
    try {
      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Generate cache key (without userId - we'll add hasLiked after cache lookup)
      const cacheKey = cacheClient.generateKey('feed_trending', `${page}:${limit}`);

      const userId = req.userId;
      
      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<ComplaintListResponse>(cacheKey);
        if (cached && cached.data) {
          // Add hasLiked field for THIS user (not cached)
          const complaintsWithLikes = addHasLikedField(cached.data as any[], userId);
          return res.status(200).json({
            ...cached,
            data: complaintsWithLikes,
          });
        }
      }

      const whereClause = { isPublic: true };

      const total = await db.complaint.count({ where: whereClause });

      const complaints = await db.complaint.findMany({
        where: whereClause,
        select: complaintSelectFields,
        orderBy: [
          { upvoteCount: "desc" },
          { submissionDate: "desc" },
        ],
        skip,
        take: limit,
      });

      // Cache the raw response (WITHOUT hasLiked)
      const responseForCache: ComplaintListResponse = {
        success: true,
        message: `Found ${complaints.length} trending complaints`,
        data: complaints as unknown as ComplaintResponse[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, responseForCache, 120); // 2 minutes TTL
      }

      // Add hasLiked field for THIS user before returning
      const complaintsWithLikes = addHasLikedField(complaints, userId);

      return res.status(200).json({
        ...responseForCache,
        data: complaintsWithLikes,
      });
    } catch (error) {
      console.error("Get trending feed error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching trending feed",
      });
    }
  });

  /**
   * GET /api/complaints/feed/recent
   * Get complaints sorted by submission date (most recent first)
   * Query params:
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   */
  router.get("/feed/recent", async (req: Request, res: Response) => {
    try {
      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Generate cache key (without userId - we'll add hasLiked after cache lookup)
      const cacheKey = cacheClient.generateKey('feed_recent', `${page}:${limit}`);

      const userId = req.userId;

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<ComplaintListResponse>(cacheKey);
        if (cached && cached.data) {
          // Add hasLiked field for THIS user (not cached)
          const complaintsWithLikes = addHasLikedField(cached.data as any[], userId);
          return res.status(200).json({
            ...cached,
            data: complaintsWithLikes,
          });
        }
      }

      const whereClause = { isPublic: true };

      const total = await db.complaint.count({ where: whereClause });

      const complaints = await db.complaint.findMany({
        where: whereClause,
        select: complaintSelectFields,
        orderBy: { submissionDate: "desc" },
        skip,
        take: limit,
      });

      // Cache the raw response (WITHOUT hasLiked)
      const responseForCache: ComplaintListResponse = {
        success: true,
        message: `Found ${complaints.length} recent complaints`,
        data: complaints as unknown as ComplaintResponse[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, responseForCache, 60); // 1 minute TTL for recent
      }

      // Add hasLiked field for THIS user before returning
      const complaintsWithLikes = addHasLikedField(complaints, userId);

      return res.status(200).json({
        ...responseForCache,
        data: complaintsWithLikes,
      });
    } catch (error) {
      console.error("Get recent feed error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching recent feed",
      });
    }
  });

  /**
   * GET /api/complaints/feed/search
   * Search complaints from Redis cache (does not hit DB)
   * Query params:
   *   - q: string (search query)
   *   - page: number (default: 1)
   *   - limit: number (default: 10, max: 100)
   */
  router.get("/feed/search", async (req: Request, res: Response) => {
    try {
      const query = (req.query.q as string || "").toLowerCase().trim();
      
      if (!query) {
        return res.status(400).json({
          success: false,
          message: "Search query is required",
        });
      }

      // Pagination
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 10));
      const skip = (page - 1) * limit;

      // Generate cache key for search results (without userId - we'll add hasLiked after)
      const cacheKey = cacheClient.generateKey('feed_search', `${query}:${page}:${limit}`);

      const userId = req.userId;

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<ComplaintListResponse>(cacheKey);
        if (cached && cached.data) {
          // Add hasLiked field for THIS user (not cached)
          const complaintsWithLikes = addHasLikedField(cached.data as any[], userId);
          return res.status(200).json({
            ...cached,
            data: complaintsWithLikes,
          });
        }
      }

      // Search in DB with text matching (since we can't avoid DB for search)
      const whereClause = {
        isPublic: true,
        OR: [
          { description: { contains: query, mode: 'insensitive' as const } },
          { subCategory: { contains: query, mode: 'insensitive' as const } },
          { AIstandardizedSubCategory: { contains: query, mode: 'insensitive' as const } },
          { location: { locality: { contains: query, mode: 'insensitive' as const } } },
          { location: { district: { contains: query, mode: 'insensitive' as const } } },
          { location: { city: { contains: query, mode: 'insensitive' as const } } },
          { category: { name: { contains: query, mode: 'insensitive' as const } } },
        ],
      };

      const total = await db.complaint.count({ where: whereClause });

      const complaints = await db.complaint.findMany({
        where: whereClause,
        select: complaintSelectFields,
        orderBy: { submissionDate: "desc" },
        skip,
        take: limit,
      });

      // Cache the raw response (WITHOUT hasLiked)
      const responseForCache: ComplaintListResponse = {
        success: true,
        message: `Found ${complaints.length} complaints matching "${query}"`,
        data: complaints as unknown as ComplaintResponse[],
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };

      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, responseForCache, 180); // 3 minutes TTL for search
      }

      // Add hasLiked field for THIS user before returning
      const complaintsWithLikes = addHasLikedField(complaints, userId);

      return res.status(200).json({
        ...responseForCache,
        data: complaintsWithLikes,
      });
    } catch (error) {
      console.error("Search feed error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while searching complaints",
      });
    }
  });

  /**
   * POST /api/complaints/:id/like
   * Toggle like (upvote) on a complaint
   * Body: { action: 'like' | 'unlike' }
   */
  router.post("/:id/like", async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const userId = req.userId;
      const { action } = req.body as { action?: 'like' | 'unlike' };

      if (!userId) {
        return res.status(401).json({
          success: false,
          message: "User ID not found. Authentication required.",
        });
      }

      // Validate UUID format
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        return res.status(400).json({
          success: false,
          message: "Invalid complaint ID format.",
        });
      }

      if (!action || !['like', 'unlike'].includes(action)) {
        return res.status(400).json({
          success: false,
          message: "Invalid action. Must be 'like' or 'unlike'.",
        });
      }

      // Check if complaint exists and is public
      const complaint = await db.complaint.findUnique({
        where: { id },
        select: { id: true, isPublic: true, upvoteCount: true, complainantId: true },
      });

      if (!complaint) {
        return res.status(404).json({
          success: false,
          message: "Complaint not found",
        });
      }

      if (!complaint.isPublic && complaint.complainantId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Cannot like a private complaint",
        });
      }

      // Update upvote count (simple increment/decrement for now)
      // In a full implementation, you'd track who liked what in a separate table
      const newCount = action === 'like' 
        ? complaint.upvoteCount + 1 
        : Math.max(0, complaint.upvoteCount - 1);

      await db.complaint.update({
        where: { id },
        data: { upvoteCount: newCount },
      });

      // Invalidate caches for this complaint
      await invalidateSingleComplaintCache(id);
      // Also invalidate feed caches since upvote counts changed
      if (cacheConnected) {
        await cacheClient.invalidateCachesByPattern('feed_trending');
        await cacheClient.invalidateCachesByPattern('feed_foryou');
      }

      return res.status(200).json({
        success: true,
        message: action === 'like' ? "Complaint liked" : "Complaint unliked",
        data: { upvoteCount: newCount },
      });
    } catch (error) {
      console.error("Like complaint error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while updating like",
      });
    }
  });

  /**
   * GET /api/complaints/feed/heatmap
   * Get all public complaints with location data for heatmap visualization
   * Returns complaints with lat/lng coordinates, and separately complaints with only locality
   * Query params:
   *   - limit: number (default: 500, max: 1000)
   */
  router.get("/feed/heatmap", async (req: Request, res: Response) => {
    try {
      const limit = Math.min(1000, Math.max(1, parseInt(req.query.limit as string) || 500));

      // Generate cache key
      const cacheKey = cacheClient.generateKey('feed_heatmap', `${limit}`);

      // Check cache first
      if (cacheConnected) {
        const cached = await cacheClient.getCachedResponse<any>(cacheKey);
        if (cached) {
          return res.status(200).json(cached);
        }
      }

      // Get complaints with coordinates (lat/lng both present)
      const complaintsWithCoords = await db.complaint.findMany({
        where: {
          isPublic: true,
          location: {
            latitude: { not: null },
            longitude: { not: null },
          },
        },
        select: complaintSelectFields,
        orderBy: { submissionDate: "desc" },
        take: limit,
      });

      // Get complaints with only locality (no lat/lng)
      const complaintsWithLocalityOnly = await db.complaint.findMany({
        where: {
          isPublic: true,
          location: {
            OR: [
              { latitude: null },
              { longitude: null },
            ],
            locality: { not: "" },
          },
        },
        select: complaintSelectFields,
        orderBy: { submissionDate: "desc" },
        take: limit,
      });

      const response = {
        success: true,
        message: `Found ${complaintsWithCoords.length} complaints with coordinates and ${complaintsWithLocalityOnly.length} with locality only`,
        data: {
          withCoordinates: complaintsWithCoords,
          withLocalityOnly: complaintsWithLocalityOnly,
        },
        summary: {
          totalWithCoords: complaintsWithCoords.length,
          totalWithLocalityOnly: complaintsWithLocalityOnly.length,
          total: complaintsWithCoords.length + complaintsWithLocalityOnly.length,
        },
      };

      // Cache the response
      if (cacheConnected) {
        await cacheClient.cacheResponse(cacheKey, response, 300); // 5 minutes TTL for heatmap
      }

      return res.status(200).json(response);
    } catch (error) {
      console.error("Get heatmap feed error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error while fetching heatmap data",
      });
    }
  });

  return router;
}
