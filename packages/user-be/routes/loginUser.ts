import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../prisma/generated/client/client";
import { userLoginSchema } from "../lib/validation.user";

const JWT_SECRET = "my123";

export function loginUserRouter(db: PrismaClient) {
  const router = Router();

  router.post("/login", async (req, res) => {
    try {
      // Validate input
      const validationResult = userLoginSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({
          success: false,
          errors: validationResult.error.issues,
        });
      }

      const { email, password } = validationResult.data;

      // Find user by email
      const user = await db.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          name: true,
          phoneNumber: true,
          dateOfBirth: true,
          preferredLanguage: true,
          disability: true,
          status: true,
          location: true,
          dateOfCreation: true,
          lastUpdated: true,
        },
      });

      // User not found
      if (!user) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Check if user account is active
      if (user.status !== "ACTIVE") {
        return res.status(403).json({
          success: false,
          message: `Account is ${user.status.toLowerCase()}. Please contact support.`,
        });
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        {
          userId: user.id,
          email: user.email,
          name: user.name,
        },
        JWT_SECRET,
        { expiresIn: "24h" }
      );

      // Remove password from response
      const { password: _, ...userWithoutPassword } = user;

      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: {
          user: userWithoutPassword,
          token,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  return router;
}
