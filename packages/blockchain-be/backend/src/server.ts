import express from "express";
import cors from "cors";
import path from "node:path";
import { ZodError } from "zod";
import { env } from "./lib/env.js";
import { requireInternalToken } from "./middleware/internalAuth.js";
import internalSyncRouter from "./routes/internalSync.js";
import publicRouter from "./routes/public.js";

const app = express();
const publicDir = path.resolve(__dirname, "../public");

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use("/test-ui", express.static(publicDir));

app.get("/", (_req, res) => {
  return res.redirect("/test-ui/");
});

app.get("/health", (_req, res) => {
  return res.status(200).json({
    ok: true,
    service: "blockchain-sync-backend",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/internal/blockchain", requireInternalToken, internalSyncRouter);
app.use("/api", publicRouter);

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ ok: false, error: "Validation error", details: err.issues });
  }

  const message = err instanceof Error ? err.message : "Unknown error";
  return res.status(500).json({ ok: false, error: message });
});

app.listen(env.PORT, () => {
  console.log(`blockchain-sync-backend listening on port ${env.PORT}`);
});
