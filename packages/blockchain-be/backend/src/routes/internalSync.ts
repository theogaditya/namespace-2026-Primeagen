import { Router } from "express";
import type { Prisma } from "../../prisma/generated/client/client";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";

const SyncPayloadSchema = z.object({
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  keyPrefix: z.string().min(1),
  blockchainHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  blockchainBlock: z.union([z.number().int().nonnegative(), z.string().regex(/^\d+$/)]).optional(),
  ipfsHash: z.string().min(1).optional(),
  isOnChain: z.boolean().default(true),
  updatedAt: z.string().optional(),
});

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}

function resolveComplaintRef(entityId: string, keyPrefix: string): string {
  if (keyPrefix.startsWith("complaint:")) {
    return keyPrefix.slice("complaint:".length);
  }
  return entityId;
}

const router = Router();

router.post("/sync", async (req, res, next) => {
  try {
    const payload = SyncPayloadSchema.parse(req.body);

    if (payload.entityType !== "complaint") {
      return res.status(202).json({
        ok: true,
        ignored: true,
        reason: "entityType is not complaint",
      });
    }

    const complaintRef = resolveComplaintRef(payload.entityId, payload.keyPrefix);

    let complaint = await prisma.complaint.findUnique({
      where: { id: complaintRef },
      select: { id: true, seq: true, blockchainHash: true },
    });

    if (!complaint && isNumeric(complaintRef)) {
      complaint = await prisma.complaint.findUnique({
        where: { seq: Number(complaintRef) },
        select: { id: true, seq: true, blockchainHash: true },
      });
    }

    if (!complaint) {
      return res.status(404).json({
        ok: false,
        error: "Complaint not found for sync payload",
        complaintRef,
      });
    }

    const existingEvent = await prisma.blockchainSyncEvent.findUnique({
      where: {
        keyPrefix_blockchainHash: {
          keyPrefix: payload.keyPrefix,
          blockchainHash: payload.blockchainHash,
        },
      },
      select: { id: true },
    });

    if (existingEvent) {
      return res.status(200).json({
        ok: true,
        idempotent: true,
        complaintId: complaint.id,
        blockchainHash: payload.blockchainHash,
      });
    }

    const blockNumber =
      payload.blockchainBlock === undefined
        ? undefined
        : BigInt(typeof payload.blockchainBlock === "string" ? payload.blockchainBlock : payload.blockchainBlock);

    const updatedAt = payload.updatedAt ? new Date(payload.updatedAt) : new Date();

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.complaint.update({
        where: { id: complaint.id },
        data: {
          blockchainHash: payload.blockchainHash,
          blockchainBlock: blockNumber,
          ipfsHash: payload.ipfsHash,
          isOnChain: payload.isOnChain,
          blockchainStatus: "CONFIRMED",
          blockchainUpdatedAt: updatedAt,
        },
      });

      await tx.blockchainSyncEvent.create({
        data: {
          entityType: payload.entityType,
          entityId: payload.entityId,
          keyPrefix: payload.keyPrefix,
          blockchainHash: payload.blockchainHash,
          blockchainBlock: blockNumber,
          ipfsHash: payload.ipfsHash,
          isOnChain: payload.isOnChain,
          payload: payload,
          status: "PROCESSED",
        },
      });
    });

    return res.status(200).json({
      ok: true,
      complaintId: complaint.id,
      seq: complaint.seq,
      blockchainHash: payload.blockchainHash,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
