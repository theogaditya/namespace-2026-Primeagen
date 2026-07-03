import { Router } from "express";
import type { PrismaClient } from "../prisma/generated/client/client";
import { runComplaintReportAgent } from "../agents/complaintReportAgent";
import { runActionSuggestionAgent } from "../agents/actionSuggestionAgent";

/**
 * POST /api/report/generate   -SSE stream: pipeline_start → progress → stats → token → complete
 * POST /api/report/actions    -JSON: { actions[], summary }
 */
export function createReportRouter(db: PrismaClient): Router {
  const router = Router();

  // ── SSE: Generate report ──────────────────────────────────────────────────
  router.post("/generate", async (req, res) => {
    const reqId = Math.random().toString(36).slice(2, 8);

    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // for nginx proxies
    res.flushHeaders();

    const send = (event: string, data: object) => {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(payload);
      // Flush immediately so Next.js / nginx / any buffering proxy forwards the chunk
      if (typeof (res as any).flush === "function") (res as any).flush();
    };

    try {
      send("pipeline_start", {});

      let completeSent = false;

      await runComplaintReportAgent({
        db,
        onProgress: (phase, detail) => {
          send("progress", { phase, detail });
        },
        onStats: (stats) => {
          send("stats", { stats });
        },
        onToken: (chunk) => {
          send("token", { chunk });
        },
        onComplete: (report) => {
          completeSent = true;
          send("complete", { report });
        },
      });

      if (!completeSent) {
        send("error", { message: "Report generation completed but no output was produced." });
      }

      res.end();
    } catch (err) {
      // keep server error logging to surface unexpected failures
      console.error(`[report:${reqId}] UNHANDLED ERROR:`, err);
      send("error", { message: String(err) });
      res.end();
    }
  });

  // ── JSON: Generate action suggestions ─────────────────────────────────────
  router.post("/actions", async (req, res) => {
    try {
      const { report, stats } = req.body;

      if (!report || !stats) {
        res.status(400).json({
          error: "Both 'report' and 'stats' fields are required in the request body.",
        });
        return;
      }

      const result = await runActionSuggestionAgent(report, stats);
      res.json(result);
    } catch (err) {
      console.error("[ReportActions] Error:", err);
      res.status(500).json({ error: String(err) });
    }
  });

  return router;
}
