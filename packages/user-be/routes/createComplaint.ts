import { Router } from "express";
import { createComplaintSchema } from "../lib/validations/validation.complaint";
import { CreateComplaint } from "../lib/types/types";
import { PrismaClient } from "../prisma/generated/client/client";
import { complaintQueueService } from "../lib/redis/complaintQueueService";

export function createComplaintRouter(db: PrismaClient) {
  const router = Router();

  router.post("/", async (req, res) => {
    try {
      // Validate input
      const validationResult = createComplaintSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors: validationResult.error.issues,
        });
      }

      const complaintData: CreateComplaint = validationResult.data as CreateComplaint;

      // Push complaint data to Redis queue for processing
      // No DB operations - the queue consumer will handle DB insertion
      try {
        await complaintQueueService.pushComplaintToQueue({
          ...complaintData,
          submissionDate: new Date().toISOString(),
        });
      } catch (queueError) {
        console.error('Failed to push complaint to queue:', queueError);
        return res.status(503).json({
          success: false,
          message: "Failed to submit complaint. Please try again later.",
        });
      }

      return res.status(202).json({
        success: true,
        message: "Complaint submitted successfully and is being processed",
        data: {
          complainantId: complaintData.complainantId,
          categoryId: complaintData.categoryId,
          subCategory: complaintData.subCategory,
          assignedDepartment: complaintData.assignedDepartment,
          submissionDate: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Create complaint error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}
