import { Router } from "express";
import { RedisClientforComplaintQueue } from "../lib/redis/redisClient";
import { processedComplaintQueueService } from "../lib/redis/processedComplaintQueueService";
import { PrismaClient } from "../prisma/generated/client/client";
import { complaintProcessingSchema } from "../lib/schemas/validation.complaint.processing";
import { standardizeSubCategory } from "../lib/gcp/gcp";
import { moderateTextSafe } from "../lib/moderation/moderationClient";
import { getBadgeService } from "../lib/badges/badgeService";
import dotenv from "dotenv";

dotenv.config();

let isPolling = false;
let pollingInterval: NodeJS.Timeout | null = null;

// Redis client for registration queue operations
const registrationQueueClient = new RedisClientforComplaintQueue();
const REGISTRATION_QUEUE = 'complaint:registration:queue';

export async function processNextComplaint(db: PrismaClient): Promise<{ processed: boolean; result?: any; error?: string }> {
  try {
    await registrationQueueClient.connect();
    const client = registrationQueueClient.getClient();
    const complaintJson = await client.lIndex(REGISTRATION_QUEUE, 0);

    if (!complaintJson) {
      return { processed: false };
    }

    const rawData = JSON.parse(complaintJson);

    const validationResult = complaintProcessingSchema.safeParse(rawData);
    if (!validationResult.success) {
      await client.lPop(REGISTRATION_QUEUE);
      return { processed: false, error: "Invalid complaint data removed from queue" };
    }

    const complaintData = validationResult.data;
    
    // Verify referenced category exists to avoid FK violations
    const categoryExists = await db.category.findUnique({
      where: { id: complaintData.categoryId },
    });
    if (!categoryExists) {
      // Remove invalid complaint from queue to avoid repeated failures
      await client.lPop(REGISTRATION_QUEUE);
      console.warn(`Invalid categoryId=${complaintData.categoryId} - removed from queue`);
      return { processed: false, error: "Invalid categoryId removed from queue" };
    }

    // Check if complaint already exists (same subCategory and description)
    const existingComplaint = await db.complaint.findFirst({
      where: {
        subCategory: complaintData.subCategory,
        description: complaintData.description,
      },
    });

    // If a duplicate exists, do NOT remove it from the queue.
    // Instead, mark the new complaint as duplicate and proceed with creation.
    const isDuplicate = !!existingComplaint;
    if (isDuplicate) {
      console.log(`Duplicate complaint detected. Existing complaint id=${existingComplaint?.id}. New complaint will be flagged as duplicate.`);
    }

    // Placeholder for AI standardized sub-category  
    // const AIstandardizedSubCategory = "dev";

    // AI standardized sub-category (stub for now)
    const AIstandardizedSubCategory = await standardizeSubCategory(complaintData.subCategory);

    // Call moderation service to sanitize abusive text. If moderation service returns clean_text,
    // let AIabusedFlag: boolean | null = null;
    // try {
    //   console.log("Testing Out The Abusive Route");
      
    //   const mod = await moderateTextSafe({ text: complaintData.description, user_id: complaintData.userId });
    //   if (mod) {
    //     if (mod.has_abuse) {
    //       AIabusedFlag = true;
    //     }
    //     // Use cleaned text if provided
    //     if (mod.clean_text && typeof mod.clean_text === 'string' && mod.clean_text.trim().length > 0) {
    //       complaintData.description = mod.clean_text;
    //     }
    //     console.log("[ComplaintProcessing] Moderation Successfull");
    //   }
    // } catch (mErr) {
    //   console.warn('[ComplaintProcessing] moderation call failed, proceeding with original description', mErr);
    // }
    
    // Testing Abuse Route Stub 
    const AIabusedFlag: boolean = false;

    const result = await db.$transaction(async (tx) => {
      const complaint = await tx.complaint.create({
        data: {
          complainantId: complaintData.userId,  // Store userId in complainantId field
          categoryId: complaintData.categoryId,
          subCategory: complaintData.subCategory,
          AIstandardizedSubCategory,
          description: complaintData.description,
          isDuplicate: isDuplicate || false,
          AIabusedFlag: AIabusedFlag,
          // AIimageVarificationStatus: false, // Placeholder for future AI image verification
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
    
      return complaint;
    });

    // Pop from registration queue
    await client.lPop(REGISTRATION_QUEUE);

    // Check and award badges after complaint creation
    try {
      const badgeService = getBadgeService(db);
      const newBadges = await badgeService.checkBadgesAfterComplaint(
        complaintData.userId,
        complaintData.assignedDepartment
      );
      if (newBadges.length > 0) {
        console.log(`[BadgeService] Awarded ${newBadges.length} badge(s) to user ${complaintData.userId}:`, 
          newBadges.map(b => b.badge.name).join(", "));
      }
    } catch (badgeError) {
      console.error("Badge check failed (non-blocking):", badgeError);
    }

    // Only push to processed queue if NOT a duplicate
    if (!isDuplicate) {
      try {
        await processedComplaintQueueService.pushToQueue({
          id: result.id,
          seq: result.seq,
          status: result.status,
          categoryId: result.categoryId,
          subCategory: result.subCategory,
          assignedDepartment: result.assignedDepartment,
          city: complaintData.location.city,
          district: complaintData.location.district,
        });
      } catch (pushErr) {
        console.error("Failed to push processed complaint to queue:", pushErr);
      }
    } else {
      console.log(`Duplicate complaint id=${result.id} created but not pushed to processed queue.`);
    }
    
    return { processed: true, result: { id: result.id, seq: result.seq, status: result.status, isDuplicate } };
  } catch (error: any) {
    console.error("Complaint processing error:", error);
    
    // Pop invalid complaints that cause DB errors (e.g., foreign key violations)
    if (error?.code === 'P2003' || error?.code === 'P2002' || error?.code === 'P2025') {
      try {
        await registrationQueueClient.connect();
        const client = registrationQueueClient.getClient();
        await client.lPop(REGISTRATION_QUEUE);
        console.log("Invalid complaint removed from queue due to DB constraint error");
      } catch (popError) {
        console.error("Failed to pop invalid complaint:", popError);
      }
      return { processed: false, error: "Invalid complaint removed from queue (DB constraint error)" };
    }
    
    return { processed: false, error: "Processing failed" };
  }
}

export function startComplaintPolling(db: PrismaClient) {
  if (isPolling) return;

  isPolling = true;
  console.log("Complaint polling started (10s interval)");

  pollingInterval = setInterval(async () => {
    try {
      // Log registration queue status before processing
      await registrationQueueClient.connect();
      const client = registrationQueueClient.getClient();
      const regQueueLen = await client.lLen(REGISTRATION_QUEUE);
      // console.log(`[ComplaintProcessing] Poll cycle - registration queue length: ${regQueueLen}`);

      const result = await processNextComplaint(db);
      if (result.processed) {
        console.log("[ComplaintProcessing] Complaint processed:", result.result);
      }
    } catch (err) {
      console.error("[ComplaintProcessing] Poll cycle error:", err);
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
