import express, { Express, Request, Response } from "express";
import cors from "cors";
import { chatRouter } from "./routes/chat";
import { imageRouter } from "./routes/image";
import { matchRouter } from "./routes/match";
import http from "http";

const app: Express = express();
const PORT = Number(process.env.PORT || 3030);

// Basic environment info
const OPENAI_KEY = process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENAI_KEY;
if (!OPENAI_KEY) {
  console.warn("Warning: OpenAI API key (OPEN_API_KEY) is not set. Image/chat routes will fail if invoked.");
}

// CORS configuration - allow all origins
app.use(cors({
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Chat routes
app.use("/api", chatRouter);

// Image routes
app.use("/api", imageRouter);

// Match route (compare two images)
app.use("/api", matchRouter);

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = (signal?: string) => {
  console.log(`Received ${signal ?? "shutdown"}, closing server...`);
  try {
    server?.close(() => {
      console.log("Server closed. Exiting.");
      process.exit(0);
    });
    // Force exit if close doesn't complete in time
    setTimeout(() => {
      console.warn("Forcing exit after timeout.");
      process.exit(1);
    }, 10000).unref();
  } catch (err) {
    console.error("Error during shutdown:", err);
    process.exit(1);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

// Catch-all error handlers to avoid silent exits
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Give logs a moment then exit
  setTimeout(() => process.exit(1), 100).unref();
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
  setTimeout(() => process.exit(1), 100).unref();
});
