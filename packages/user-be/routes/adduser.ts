import { Router } from "express";
import bcrypt from "bcrypt";
import { userSignupSchema } from "../lib/validations/validation.user";
import { UserSignup } from "../lib/types/types";
import { PrismaClient } from "../prisma/generated/client/client";
import { userQueueService } from "../lib/redis/userQueueService";
const pinAPIBase = process.env.pinAPIBase || "https://api.postalpincode.in/pincode";

export function addUserRouter(db: PrismaClient) {
  const router = Router();
  router.post("/signup", async (req, res) => {
    try {
      // Validate input
      const validationResult = userSignupSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors: validationResult.error.issues,
        });
      }

      const userData: UserSignup = validationResult.data as any;

      // Check if user already exists
      const existingUser = await db.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { phoneNumber: userData.phoneNumber },
            { aadhaarId: userData.aadhaarId },
          ],
        },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "User with this email, phone number, or Aadhaar already exists",
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(userData.password, 10);

      // Create user with location
      const user = await db.user.create({
        data: {
          email: userData.email,
          phoneNumber: userData.phoneNumber,
          name: userData.name,
          password: hashedPassword,
          dateOfBirth: new Date(userData.dateOfBirth),
          aadhaarId: userData.aadhaarId,
          preferredLanguage: userData.preferredLanguage,
          disability: userData.disability,
          location: {
            create: {
              pin: userData.location.pin,
              district: userData.location.district,
              city: userData.location.city,
              locality: userData.location.locality,
              street: userData.location.street,
              municipal: userData.location.municipal,
              state: userData.location.state,
            },
          },
        },
        select: {
          id: true,
          email: true,
          phoneNumber: true,
          name: true,
          dateOfBirth: true,
          preferredLanguage: true,
          disability: true,
          location: true,
          dateOfCreation: true,
          lastUpdated: true,
        },
      });

      // Push user data to Redis queue for blockchain processing
      try {
        await userQueueService.pushUserToQueue({
          id: user.id,
          email: user.email,
          phoneNumber: user.phoneNumber,
          name: user.name,
          aadhaarId: userData.aadhaarId,
          dateOfCreation: user.dateOfCreation,
          location: user.location,
        });
      } catch (queueError) {
        // Log the error but don't fail the user creation
        console.error('Failed to push user to blockchain queue:', queueError);
        // You might want to implement a retry mechanism or dead-letter queue here
      }

      return res.status(201).json({
        success: true,
        message: "User created successfully",
        data: user,
      });
    } catch (error) {
      console.error("Signup error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Helper route to get location details by PIN
  router.get("/location/:pin", async (req, res) => {
    try {
      const { pin } = req.params;

      if (!/^\d{6}$/.test(pin)) {
        return res.status(400).json({
          success: false,
          message: "Invalid PIN code",
        });
      }

      const response = await fetch(
        `${pinAPIBase}/${pin}`
      );
      const data: any = await response.json();

      if (data[0].Status !== "Success") {
        return res.status(404).json({
          success: false,
          message: "PIN code not found",
        });
      }

      const postOffice = data[0].PostOffice[0];

      return res.status(200).json({
        success: true,
        data: {
          district: postOffice.District,
          city: postOffice.Division,
          state: postOffice.State,
        },
      });
    } catch (error) {
      console.error("Location fetch error:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch location details",
      });
    }
  });
  return router;
}
