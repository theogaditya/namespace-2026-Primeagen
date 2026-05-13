import { Router } from "express";
import { PrismaClient } from "../prisma/generated/client/client";

export function userComplaintsRouter(db: PrismaClient) {
  const router = Router();

  // GET /api/users/:userId/complaints - Fetch all complaints for a user
  router.get("/:userId/complaints", async (req, res) => {
    try {
      const { userId } = req.params;

      // Validate userId format (UUID)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid user ID format",
        });
      }

      // Check if user exists
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true },
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Fetch complaints where complainantId matches userId
      // This allows multiple complaints per user
      const complaints = await db.complaint.findMany({
        where: { complainantId: userId },
        include: {
          location: true,
          category: {
            select: { id: true, name: true },
          },
          assignedAgent: {
            select: { id: true, fullName: true, department: true },
          },
        },
        orderBy: { submissionDate: 'desc' },
      });

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
          },
          totalComplaints: complaints.length,
          complaints: complaints.map((c) => ({
            id: c.id,
            seq: c.seq,
            subCategory: c.subCategory,
            description: c.description,
            urgency: c.urgency,
            status: c.status,
            assignedDepartment: c.assignedDepartment,
            isPublic: c.isPublic,
            isDuplicate: c.isDuplicate,
            submissionDate: c.submissionDate,
            lastUpdated: c.lastUpdated,
            dateOfResolution: c.dateOfResolution,
            attachmentUrl: c.attachmentUrl,
            location: c.location,
            category: c.category,
            assignedAgent: c.assignedAgent,
          })),
        },
      });
    } catch (error) {
      console.error("Error fetching user complaints:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}
