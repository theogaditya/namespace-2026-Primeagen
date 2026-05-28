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
  router.post("/create", uploadMiddleware.single("image"), async (req: Request, res: Response) => {
    try {
      const userId = req.userId as string | undefined;
      const { message, adminId: adminIdFromBody, adminRole: adminRoleFromBody } = req.body;
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

      // Determine assigned admin: prefer body adminId if provided
      let assignedAdminId: string | null = adminIdFromBody || null
      let assignedAdminRole: string | null = adminRoleFromBody || null

      if (!assignedAdminId) {
        // Check if user already has existing chats with an admin — reuse that admin
        const existing = await (prismaClient as any).chats.findFirst({
          where: { userId, adminId: { not: null } },
          orderBy: { createdAt: "desc" },
          select: { adminId: true, adminRole: true },
        })

        if (existing && existing.adminId) {
          assignedAdminId = existing.adminId
          assignedAdminRole = existing.adminRole || null
        } else {
          // No existing admin -> assign a municipal admin (lowest workload)
          const municipal = await (prismaClient as any).departmentMunicipalAdmin.findFirst({
            where: { status: "ACTIVE" },
            orderBy: { currentWorkload: "asc" },
            select: { id: true },
          })

          if (municipal && municipal.id) {
            assignedAdminId = municipal.id
            assignedAdminRole = "DEPT_MUNICIPAL_ADMIN"

            // increment municipal admin workload (best-effort)
            try {
              await (prismaClient as any).departmentMunicipalAdmin.update({
                where: { id: municipal.id },
                data: { currentWorkload: { increment: 1 } },
              })
            } catch (e) {
              console.warn("Failed to increment municipal admin workload:", e)
            }
          } else {
            // fallback: try SuperMunicipalAdmin
            const superMun = await (prismaClient as any).superMunicipalAdmin.findFirst({
              where: { status: "ACTIVE" },
              orderBy: { lastUpdated: "asc" },
              select: { id: true },
            })
            if (superMun && superMun.id) {
              assignedAdminId = superMun.id
              assignedAdminRole = "SUPER_MUNICIPAL_ADMIN"
            } else {
              // final fallback: pick an Agent
              const agent = await (prismaClient as any).agent.findFirst({
                where: { status: "ACTIVE" },
                orderBy: { currentWorkload: "asc" },
                select: { id: true },
              })
              if (agent && agent.id) {
                assignedAdminId = agent.id
                assignedAdminRole = "AGENT"
              }
            }
          }
        }
      }

      const chat = await (prismaClient as any).chats.create({
        data: {
          message: message || "",
          userId,
          adminId: assignedAdminId,
          adminRole: assignedAdminRole || null,
          imageUrl: imageUrl || null,
        },
      });

      return res.json({ success: true, data: chat });
    } catch (err) {
      console.error("[user-be chat] create error:", err);
      return res.status(500).json({ success: false, message: "Failed to create chat" });
    }
  });

  // Get chats between authenticated user and a specific admin
  router.get("/list", async (req: Request, res: Response) => {
    try {
      const userId = req.userId as string | undefined;
      const adminId = (req.query.adminId as string) || undefined;

      if (!userId) {
        return res.status(401).json({ success: false, message: "Not authenticated" });
      }

      if (!adminId) {
        return res.status(400).json({ success: false, message: "adminId query parameter required" });
      }

      const chats = await (prismaClient as any).chats.findMany({
        where: { userId, adminId },
        orderBy: { createdAt: "asc" },
      });

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

      const chats = await (prismaClient as any).chats.findMany({
        where: { userId, adminId: { not: null } },
        orderBy: { createdAt: "desc" },
        select: { adminId: true, adminRole: true, message: true, createdAt: true, id: true },
      });

      const seen = new Set<string>();
      const result: Array<{ adminId: string; adminRole?: string | null; lastMessage: string; lastAt: Date; chatId: string }> = [];
      for (const c of chats) {
        if (!c.adminId) continue;
        if (seen.has(c.adminId)) continue;
        seen.add(c.adminId);
        result.push({ adminId: c.adminId, adminRole: c.adminRole || null, lastMessage: c.message, lastAt: c.createdAt, chatId: c.id });
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
