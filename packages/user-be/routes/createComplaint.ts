import { Router } from "express";
import { createComplaintSchema } from "../lib/validations/validation.complaint";
import { CreateComplaint } from "../lib/types/types";
import { PrismaClient } from "../prisma/generated/client/client";
import { complaintQueueService } from "../lib/redis/complaintQueueService";
import { uploadMiddleware } from "../middleware/multerConfig";
import { uploadComplaintImage } from "../lib/s3/s3Client";

export function createComplaintRouter(db: PrismaClient) {
  const router = Router();

  const parseOptionalJson = (value: unknown) => {
    if (typeof value !== "string" || value.trim() === "") {
      return value;
    }

    return JSON.parse(value);
  };

  const parseOptionalBoolean = (value: unknown) => {
    if (typeof value === "boolean") return value;
    if (typeof value === "string") return value === "true";
    return value;
  };

  const parseOptionalNumber = (value: unknown) => {
    if (typeof value === "number") return value;
    if (typeof value === "string" && value.trim() !== "") return Number(value);
    return value;
  };

  router.post("/", uploadMiddleware.single("image"), async (req, res) => {
    try {
      // Handle image upload to S3 if file is provided
      let attachmentUrl: string | undefined;

      if (req.file) {
        const uploadResult = await uploadComplaintImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );

        if (!uploadResult.success) {
          return res.status(500).json({
            success: false,
            message: "Failed to upload image",
            error: uploadResult.error,
          });
        }

        attachmentUrl = uploadResult.url;
      }

      // Parse JSON fields if sent as form-data
      const bodyData = {
        ...req.body,
        location: typeof req.body.location === "string" ? parseOptionalJson(req.body.location) : req.body.location,
        isPublic: parseOptionalBoolean(req.body.isPublic),
        isDuplicate: parseOptionalBoolean(req.body.isDuplicate),
        hasSimilarComplaints: parseOptionalBoolean(req.body.hasSimilarComplaints),
        qualityScore: parseOptionalNumber(req.body.qualityScore),
        qualityBreakdown: parseOptionalJson(req.body.qualityBreakdown),
        similarComplaintIds: parseOptionalJson(req.body.similarComplaintIds),
        AIabusedFlag: parseOptionalBoolean(req.body.AIabusedFlag),
        abuseMetadata: parseOptionalJson(req.body.abuseMetadata),
      };

      // Validate input - use S3 URL if file was uploaded, otherwise use attachmentUrl from body
      const validationResult = createComplaintSchema.safeParse({
        ...bodyData,
        ...(attachmentUrl && { attachmentUrl }),
      });

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
          userId: req.userId,  // Include userId for complaint creation (FK constraint)
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
