import { Router } from "express";
import { complaintQueueService } from "../lib/redis/complaintQueueService";
import { PrismaClient } from "../prisma/generated/client/client";
import { complaintProcessingSchema } from "../lib/validations/validation.complaint.processing";

let isPolling = false;
let pollingInterval: NodeJS.Timeout | null = null;

async function processNextComplaint(db: PrismaClient): Promise<{ processed: boolean; result?: any; error?: string }> {
  try {
    await complaintQueueService.connect();
    const client = complaintQueueService['redisClient'].getClient();
    const complaintJson = await client.lIndex('complaint:registration:queue', 0);

    if (!complaintJson) {
      return { processed: false };
    }

    const rawData = JSON.parse(complaintJson);

    const validationResult = complaintProcessingSchema.safeParse(rawData);
    if (!validationResult.success) {
      await client.lPop('complaint:registration:queue');
      return { processed: false, error: "Invalid complaint data removed from queue" };
    }

    const complaintData = validationResult.data;
    const AIstandardizedSubCategory = "dev";
    // Placeholder for AI standardized sub-category

    const result = await db.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          complainantId: complaintData.complainantId,
          categoryId: complaintData.categoryId,
          subCategory: complaintData.subCategory,
          AIstandardizedSubCategory,
          description: complaintData.description,
          urgency: complaintData.urgency || "LOW",
          attachmentUrl: complaintData.attachmentUrl || null,
          assignedDepartment: complaintData.assignedDepartment,
          isPublic: complaintData.isPublic ?? true,
          status: "REGISTERED",
          location: {
            create: {
              pin: complaintData.location.pin,
              district: complaintData.location.district,
              city: complaintData.location.city,
              locality: complaintData.location.locality,
              street: complaintData.location.street || null,
              latitude: complaintData.location.latitude || null,
              longitude: complaintData.location.longitude || null,
            },
          },
        },
      });
    
    //   After Complaint is created, push it into a new queue for Auto-Assignment and Blockchain Processing
      

      return complaint;
    });

    await client.lPop('complaint:registration:queue');

    return { processed: true, result: { id: result.id, seq: result.seq, status: result.status } };
  } catch (error) {
    console.error("Complaint processing error:", error);
    return { processed: false, error: "Processing failed" };
  }
}

export function startComplaintPolling(db: PrismaClient) {
  if (isPolling) return;

  isPolling = true;
  console.log("Complaint polling started (10s interval)");

  pollingInterval = setInterval(async () => {
    const result = await processNextComplaint(db);
    if (result.processed) {
      console.log("Complaint processed:", result.result);
    }
  }, 10000);
}

export function stopComplaintPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
    pollingInterval = null;
  }
  isPolling = false;
  console.log("Complaint polling stopped");
}

export function complaintProcessingRouter(db: PrismaClient) {
  const router = Router();

  // Manual trigger endpoint
  router.post("/processing", async (req, res) => {
    const result = await processNextComplaint(db);

    if (!result.processed && !result.error) {
      return res.status(204).json({
        success: false,
        message: "No complaints in queue",
      });
    }

    if (result.error) {
      return res.status(400).json({
        success: false,
        message: result.error,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Complaint created successfully",
      data: result.result,
    });
  });

  // Start polling endpoint
  router.post("/processing/start", (req, res) => {
    startComplaintPolling(db);
    return res.status(200).json({
      success: true,
      message: "Complaint polling started",
    });
  });

  // Stop polling endpoint
  router.post("/processing/stop", (req, res) => {
    stopComplaintPolling();
    return res.status(200).json({
      success: true,
      message: "Complaint polling stopped",
    });
  });

  // Polling status endpoint
  router.get("/processing/status", (req, res) => {
    return res.status(200).json({
      success: true,
      isPolling,
    });
  });

  return router;
}   