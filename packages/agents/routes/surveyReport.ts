import { Router } from "express";
import type { PrismaClient } from "../prisma/generated/client/client";
import { runReportGeneratorAgent } from "../agents/reportGeneratorAgent";
import { VALID_CATEGORIES } from "../lib/reportGenerator/constants";

export function createSurveyReportRouter(db: PrismaClient): Router {
  const router = Router();

  router.post("/generate", async (req, res) => {
    const reqId = Math.random().toString(36).slice(2, 8);
    const { category } = req.body;

    if (!category || typeof category !== "string") {
      res.status(400).json({
        error: "Missing required field: 'category'",
        valid_categories: VALID_CATEGORIES,
        hint: "Use one of the valid categories or a related keyword.",
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const send = (event: string, data: Record<string, any>) => {
      const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
      res.write(payload);
      if (typeof (res as any).flush === "function") (res as any).flush();
    };

    try {
      send("pipeline_start", { category });

      let completeSent = false;

      await runReportGeneratorAgent({
        db,
        category,
        onProgress: (phase, detail, elapsedMs) => {
          send("progress", {
            phase,
            message: detail,
            elapsed_ms: elapsedMs ?? 0,
          });
        },
        onToken: (chunk) => {
          send("token", { chunk });
        },
        onPhaseComplete: (phase, report, elapsedMs) => {
          send("phase_complete", {
            phase,
            elapsed_ms: elapsedMs,
            report,
          });
        },
        onComplete: (result) => {
          completeSent = true;
          send("complete", {
            success: true,
            category: result.category,
            resolved_category: result.resolvedCategory,
            survey_report: result.surveyReport,
            backend_report: result.backendReport,
            fusion_report: result.fusionReport,
            pipeline_metadata: {
              total_time_seconds: +(result.pipelineMetadata.totalTimeMs / 1000).toFixed(2),
              phase_1_2_time_seconds: +(result.pipelineMetadata.phase12TimeMs / 1000).toFixed(2),
              phase_3_time_seconds: +(result.pipelineMetadata.phase3TimeMs / 1000).toFixed(2),
              survey_docs_retrieved: result.pipelineMetadata.surveyDocsRetrieved,
              backend_docs_retrieved: result.pipelineMetadata.backendDocsRetrieved,
            },
          });
        },
      });

      if (!completeSent) {
        send("error", { message: "Pipeline completed but no output was produced." });
      }

      res.end();
    } catch (err) {
      console.error(`[survey-report:${reqId}] ERROR:`, err);
      send("error", { message: String(err) });
      res.end();
    }
  });

  router.get("/categories", (_req, res) => {
    res.json({
      categories: VALID_CATEGORIES,
      count: VALID_CATEGORIES.length,
    });
  });

  return router;
}
