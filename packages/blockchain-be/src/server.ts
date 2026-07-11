import express from "express";
import cors from "cors";
import publicRouter from "../backend/src/routes/public.js";
import { requireInternalToken } from "../backend/src/middleware/internalAuth.js";
import internalSyncRouter from "../backend/src/routes/internalSync.js";
import { ZodError } from "zod";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use("/internal/blockchain", requireInternalToken, internalSyncRouter);
app.use("/api", publicRouter);

app.get("/", (_req, res) => {
  res.send("Worker and API are running!");
});

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    services: ["worker", "api"],
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ ok: false, error: "Validation error", details: err.issues });
  }
  const message = err instanceof Error ? err.message : "Unknown error";
  return res.status(500).json({ ok: false, error: message });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Express server listening on port ${PORT}`);
  (async () => {
    try {
      await import("./worker.js");
      console.log("Worker started successfully");
    } catch (err) {
      console.error("Failed to start worker:", err);
    }
  })();
});
