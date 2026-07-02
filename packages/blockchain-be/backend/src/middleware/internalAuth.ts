import type { NextFunction, Request, Response } from "express";
import { env } from "../lib/env.js";

export function requireInternalToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.header("authorization") || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (token !== env.BACKEND_SYNC_TOKEN) {
    return res.status(401).json({
      ok: false,
      error: "Unauthorized",
    });
  }

  return next();
}
