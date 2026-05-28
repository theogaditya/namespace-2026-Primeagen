import { Router } from "express";
import type { Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import { getPrisma } from "../lib/prisma";
import { uploadMiddleware } from "../middleware/multerConfig";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

// S3 configuration for chat images
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "ap-south-2",
  credentials: {
    accessKeyId: process.env.S3_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_AWS_SECRET_ACCESS_KEY!,
  },
});
const BUCKET_NAME = process.env.AWS_BUCKET || "sih-swaraj";
const CHAT_IMAGES_FOLDER = "chat-images";

async function uploadChatImage(
  fileBuffer: Buffer,
  originalFilename: string,
  mimeType: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    const fileExtension = originalFilename.split(".").pop() || "jpg";
    const uniqueFilename = `${randomUUID()}.${fileExtension}`;
    const key = `${CHAT_IMAGES_FOLDER}/${uniqueFilename}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await s3Client.send(command);

    const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "ap-south-2"}.amazonaws.com/${key}`;
    return { success: true, url };
  } catch (error) {
    console.error("S3 chat image upload error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Upload failed" };
  }
}

export function chatRouter(db: PrismaClient) {
  const router = Router();
  const prismaClient = db || getPrisma();

  // Create a new chat message (authenticated user) - supports optional image upload
  // Expects: { message?, complaintId, adminId? }
  router.post("/create", uploadMiddleware.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = req.userId as string | undefined;
      const { message, complaintId: complaintIdFromBody, adminId: adminIdFromBody, adminRole: adminRoleFromBody } = req.body;
      let imageUrl: string | null = req.body.imageUrl || null;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      if (!message && !req.file) {
        return res.status(400).json({ success: false, message: "message or image is required" });
      }

      // Handle image upload if file is present
      if (req.file) {
        const uploadResult = await uploadChatImage(
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
        if (uploadResult.success && uploadResult.url) {
          imageUrl = uploadResult.url;
        } else {
          return res.status(500).json({ success: false, message: uploadResult.error || "Image upload failed" });
        }
      }

      // Determine assigned admin: prefer provided adminId, else prefer complaint.assignedAgentId, else reuse previous admin, else fallback to admin selection
      let assignedAdminId: string | null = adminIdFromBody || null;
      let assignedAdminRole: string | null = adminRoleFromBody || null;
      const complaintId = complaintIdFromBody || null;

      if (complaintId) {
        const complaint = await (prismaClient as any).complaint.findUnique({ where: { id: complaintId }, select: { assignedAgentId: true } });
        if (complaint && complaint.assignedAgentId) {
          assignedAdminId = complaint.assignedAgentId;
          assignedAdminRole = 'AGENT';
        }
      }

      if (!assignedAdminId) {
        // Check if user already has existing chats with an admin — reuse that admin
        const existing = await (prismaClient as any).chat.findFirst({
          where: { userId, agentId: { not: null } },
          orderBy: { createdAt: 'desc' },
          select: { agentId: true },
        });

        if (existing && existing.agentId) {
          assignedAdminId = existing.agentId;
          assignedAdminRole = 'AGENT';
        }
      }

      // Final fallback: select a municipal admin or agent as before
      if (!assignedAdminId) {
        const municipal = await (prismaClient as any).departmentMunicipalAdmin.findFirst({
          where: { status: 'ACTIVE' },
          orderBy: { currentWorkload: 'asc' },
          select: { id: true },
        });

        if (municipal && municipal.id) {
          assignedAdminId = municipal.id;
          assignedAdminRole = 'DEPT_MUNICIPAL_ADMIN';
          try {
            await (prismaClient as any).departmentMunicipalAdmin.update({ where: { id: municipal.id }, data: { currentWorkload: { increment: 1 } } });
          } catch (e) {
            console.warn('Failed to increment municipal admin workload:', e);
          }
        } else {
          const superMun = await (prismaClient as any).superMunicipalAdmin.findFirst({ where: { status: 'ACTIVE' }, orderBy: { lastUpdated: 'asc' }, select: { id: true } });
          if (superMun && superMun.id) {
            assignedAdminId = superMun.id;
            assignedAdminRole = 'SUPER_MUNICIPAL_ADMIN';
          } else {
            const agent = await (prismaClient as any).agent.findFirst({ where: { status: 'ACTIVE' }, orderBy: { currentWorkload: 'asc' }, select: { id: true } });
            if (agent && agent.id) {
              assignedAdminId = agent.id;
              assignedAdminRole = 'AGENT';
            }
          }
        }
      }

      const chat = await (prismaClient as any).chat.create({
        data: {
          message: message || '',
          complaintId: complaintId || undefined,
          userId,
          agentId: assignedAdminId || undefined,
          senderType: 'USER' as any,
          imageUrl: imageUrl || null,
        },
      });

      return res.json({ success: true, data: chat });
    } catch (err) {
      console.error("[user-be chat] create error:", err);
      return res.status(500).json({ success: false, message: "Failed to create chat" });
    }
  });

  // Get chats for a specific complaint (authenticated user)
  // query: ?complaintId=...
  router.get("/list", async (req: Request, res: Response) => {
    try {
      const userId = req.userId as string | undefined;
      const complaintId = (req.query.complaintId as string) || undefined;

      if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
      if (!complaintId) return res.status(400).json({ success: false, message: 'complaintId query parameter required' });

      const chats = await (prismaClient as any).chat.findMany({ where: { complaintId }, orderBy: { createdAt: 'asc' } });

      return res.json({ success: true, data: chats });
    } catch (err) {
      console.error("[user-be chat] list error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch chats" });
    }
  });

  // Get list of admins this authenticated user has chatted with (latest message per admin)
  router.get("/admins", async (req: Request, res: Response) => {
    try {
      const userId = req.userId as string | undefined;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      const chats = await (prismaClient as any).chat.findMany({
        where: { userId, agentId: { not: null } },
        orderBy: { createdAt: 'desc' },
        select: { agentId: true, message: true, createdAt: true, id: true },
      });

      const seen = new Set<string>();
      const result: Array<{ adminId: string; lastMessage: string; lastAt: Date; chatId: string }> = [];
      for (const c of chats) {
        if (!c.agentId) continue;
        if (seen.has(c.agentId)) continue;
        seen.add(c.agentId);
        // Return shape similar to previous API: adminId holds the agent id
        result.push({ adminId: c.agentId, lastMessage: c.message, lastAt: c.createdAt, chatId: c.id });
      }

      return res.json({ success: true, data: result });
    } catch (err) {
      console.error("[user-be chat] admins error:", err);
      return res.status(500).json({ success: false, message: "Failed to fetch admins list" });
    }
  });

  return router;
}

export default chatRouter;
