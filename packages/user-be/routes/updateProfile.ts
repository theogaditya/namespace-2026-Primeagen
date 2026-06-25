import { Router, Request, Response } from "express";
import { PrismaClient } from "../prisma/generated/client/client";
import { z } from "zod";

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  location: z
    .object({
      pin: z.string().optional(),
      district: z.string().optional(),
      city: z.string().optional(),
      locality: z.string().optional(),
      street: z.string().optional(),
      municipal: z.string().optional(),
      state: z.string().optional(),
    })
    .optional(),
});

export function createUpdateProfileRouter(db: PrismaClient) {
  const router = Router();

  /**
   * PATCH /api/users/profile
   * Update the current user's name and/or location
   */
  router.patch("/profile", async (req: Request, res: Response) => {
    try {
      const userId = req.userId;
      if (!userId) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
      }

      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          success: false,
          errors: parsed.error.issues,
        });
      }

      const { name, location } = parsed.data;

      // Build update payload
      const userUpdate: Record<string, unknown> = {};
      if (name) userUpdate.name = name;

      // Update user
      const updatedUser = await db.user.update({
        where: { id: userId },
        data: {
          ...userUpdate,
          ...(location
            ? {
                location: {
                  update: {
                    ...(location.pin !== undefined && { pin: location.pin }),
                    ...(location.district !== undefined && { district: location.district }),
                    ...(location.city !== undefined && { city: location.city }),
                    ...(location.locality !== undefined && { locality: location.locality }),
                    ...(location.street !== undefined && { street: location.street }),
                    ...(location.municipal !== undefined && { municipal: location.municipal }),
                    ...(location.state !== undefined && { state: location.state }),
                  },
                },
              }
            : {}),
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          name: true,
          dateOfBirth: true,
          preferredLanguage: true,
          disability: true,
          status: true,
          dateOfCreation: true,
          lastUpdated: true,
          location: true,
        },
      });

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        data: updatedUser,
      });
    } catch (error) {
      console.error("Profile update error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}
