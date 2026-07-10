import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "../prisma/generated/client/client";
import { userLoginSchema } from "../lib/validations/validation.user";

const JWT_SECRET = process.env.JWT_SECRET || "my123";
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY || "";
const SKIP_CAPTCHA = process.env.SKIP_CAPTCHA === "true";

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

      const { email, password, captchaToken } = validationResult.data;

      // Verify reCAPTCHA token with Google (unless skipped via env var)
      if (!SKIP_CAPTCHA) {
        try {
          const captchaResponse = await fetch(
            "https://www.google.com/recaptcha/api/siteverify",
            {
              method: "POST",
              headers: { "Content-Type": "application/x-www-form-urlencoded" },
              body: `secret=${encodeURIComponent(RECAPTCHA_SECRET_KEY)}&response=${encodeURIComponent(captchaToken)}`,
            }
          );

          const captchaData = (await captchaResponse.json()) as { success: boolean };

          if (!captchaData.success) {
            return res.status(400).json({
              success: false,
              message: "CAPTCHA verification failed. Please try again.",
            });
          }
        } catch (e) {
          // If the verification request fails (network, etc.), treat as bad request
          console.error('CAPTCHA verification error:', e);
          return res.status(400).json({ success: false, message: 'CAPTCHA verification failed. Please try again.' });
        }
      }
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
      console.log(`[Login] Signing token with secret length: ${JWT_SECRET.length}`);
      console.log(`[Login] Secret prefix: ${JWT_SECRET.substring(0, 3)}***`);
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
