import express from "express";
import cors from "cors";
import publicRouter from "../backend/src/routes/public.js";

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use("/api", publicRouter);

app.get("/", (_req, res) => {
  res.send("Worker is running!");
});

app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
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
