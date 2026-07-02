import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { getProvider } from "../lib/chain.js";

const TxHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/);

type ChainVerificationStatus =
  | "NO_TX_HASH"
  | "RPC_NOT_CONFIGURED"
  | "TX_NOT_FOUND"
  | "PENDING"
  | "FAILED"
  | "MISMATCH_CONTRACT"
  | "VERIFIED"
  | "ERROR";

type ChainReceiptView = {
  blockNumber: number | null;
  status: number | null;
  gasUsed: string | null;
  from: string | null;
  to: string | null;
  confirmations: number | null;
};

type ChainVerification = {
  status: ChainVerificationStatus;
  verified: boolean;
  checkedAt: string;
  providerConfigured: boolean;
  message: string;
  expectedContractAddress: string | null;
  toMatchesContract: boolean | null;
  receipt: ChainReceiptView | null;
};

function isNumeric(value: string): boolean {
  return /^\d+$/.test(value);
}

async function findComplaintByIdOrSeq(complaintId: string) {
  const byId = await prisma.complaint.findUnique({
    where: { id: complaintId },
    select: {
      id: true,
      seq: true,
      subCategory: true,
      description: true,
      urgency: true,
      status: true,
      assignedDepartment: true,
      isPublic: true,
      attachmentUrl: true,
      categoryId: true,
      blockchainHash: true,
      blockchainBlock: true,
      ipfsHash: true,
      isOnChain: true,
      blockchainStatus: true,
      blockchainUpdatedAt: true,
      submissionDate: true,
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      location: {
        select: {
          pin: true,
          district: true,
          city: true,
          locality: true,
          street: true,
          latitude: true,
          longitude: true,
        },
      },
      User: {
        select: {
          location: {
            select: {
              pin: true,
              district: true,
              city: true,
              locality: true,
              street: true,
              state: true,
              country: true,
              municipal: true,
            },
          },
        },
      },
    },
  });

  if (byId) {
    return byId;
  }

  if (isNumeric(complaintId)) {
    return prisma.complaint.findUnique({
      where: { seq: Number(complaintId) },
      select: {
        id: true,
        seq: true,
        subCategory: true,
        description: true,
        urgency: true,
        status: true,
        assignedDepartment: true,
        isPublic: true,
        attachmentUrl: true,
        categoryId: true,
        blockchainHash: true,
        blockchainBlock: true,
        ipfsHash: true,
        isOnChain: true,
        blockchainStatus: true,
        blockchainUpdatedAt: true,
        submissionDate: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            pin: true,
            district: true,
            city: true,
            locality: true,
            street: true,
            latitude: true,
            longitude: true,
          },
        },
        User: {
          select: {
            location: {
              select: {
                pin: true,
                district: true,
                city: true,
                locality: true,
                street: true,
                state: true,
                country: true,
                municipal: true,
              },
            },
          },
        },
      },
    });
  }

  return null;
}

function getExplorerUrl(txHash: string | null): string | null {
  if (!txHash) {
    return null;
  }
  return `${env.ETHERSCAN_TX_BASE_URL}${txHash}`;
}

function normalizeAddress(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  return value.toLowerCase();
}

async function verifyTransactionOnChain(txHash: string | null): Promise<ChainVerification> {
  const checkedAt = new Date().toISOString();
  const expectedContractAddress = normalizeAddress(env.BLOCKCHAIN_CONTRACT_ADDRESS);

  if (!txHash) {
    return {
      status: "NO_TX_HASH",
      verified: false,
      checkedAt,
      providerConfigured: Boolean(env.BLOCKCHAIN_RPC_URL),
      message: "Complaint has no transaction hash yet.",
      expectedContractAddress,
      toMatchesContract: null,
      receipt: null,
    };
  }

  const provider = getProvider();
  if (!provider) {
    return {
      status: "RPC_NOT_CONFIGURED",
      verified: false,
      checkedAt,
      providerConfigured: false,
      message: "Blockchain RPC URL is not configured.",
      expectedContractAddress,
      toMatchesContract: null,
      receipt: null,
    };
  }

  try {
    const [tx, chainReceipt] = await Promise.all([
      provider.getTransaction(txHash),
      provider.getTransactionReceipt(txHash),
    ]);

    if (!tx) {
      return {
        status: "TX_NOT_FOUND",
        verified: false,
        checkedAt,
        providerConfigured: true,
        message: "Transaction hash not found on chain.",
        expectedContractAddress,
        toMatchesContract: null,
        receipt: null,
      };
    }

    if (!chainReceipt) {
      return {
        status: "PENDING",
        verified: false,
        checkedAt,
        providerConfigured: true,
        message: "Transaction is not mined yet.",
        expectedContractAddress,
        toMatchesContract: null,
        receipt: {
          blockNumber: null,
          status: null,
          gasUsed: null,
          from: tx.from ?? null,
          to: tx.to ?? null,
          confirmations: null,
        },
      };
    }

    const latestBlock = await provider.getBlockNumber();
    const confirmations =
      chainReceipt.blockNumber === null || chainReceipt.blockNumber === undefined
        ? null
        : Math.max(0, latestBlock - chainReceipt.blockNumber + 1);

    const txTo = normalizeAddress(tx.to);
    const toMatchesContract = expectedContractAddress ? txTo === expectedContractAddress : null;

    if (chainReceipt.status === 0) {
      return {
        status: "FAILED",
        verified: false,
        checkedAt,
        providerConfigured: true,
        message: "Transaction exists but failed on chain.",
        expectedContractAddress,
        toMatchesContract,
        receipt: {
          blockNumber: chainReceipt.blockNumber ?? null,
          status: chainReceipt.status ?? null,
          gasUsed: chainReceipt.gasUsed?.toString() ?? null,
          from: tx.from ?? null,
          to: tx.to ?? null,
          confirmations,
        },
      };
    }

    if (toMatchesContract === false) {
      return {
        status: "MISMATCH_CONTRACT",
        verified: false,
        checkedAt,
        providerConfigured: true,
        message: "Transaction is mined but not sent to the configured contract.",
        expectedContractAddress,
        toMatchesContract,
        receipt: {
          blockNumber: chainReceipt.blockNumber ?? null,
          status: chainReceipt.status ?? null,
          gasUsed: chainReceipt.gasUsed?.toString() ?? null,
          from: tx.from ?? null,
          to: tx.to ?? null,
          confirmations,
        },
      };
    }

    return {
      status: "VERIFIED",
      verified: true,
      checkedAt,
      providerConfigured: true,
      message: "Transaction verified on blockchain.",
      expectedContractAddress,
      toMatchesContract,
      receipt: {
        blockNumber: chainReceipt.blockNumber ?? null,
        status: chainReceipt.status ?? null,
        gasUsed: chainReceipt.gasUsed?.toString() ?? null,
        from: tx.from ?? null,
        to: tx.to ?? null,
        confirmations,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Chain verification failed.";
    return {
      status: "ERROR",
      verified: false,
      checkedAt,
      providerConfigured: true,
      message,
      expectedContractAddress,
      toMatchesContract: null,
      receipt: null,
    };
  }
}

type ComplaintRecord = NonNullable<Awaited<ReturnType<typeof findComplaintByIdOrSeq>>>;

function buildLocationView(complaint: ComplaintRecord) {
  const complaintLocation = complaint.location;
  const profileLocation = complaint.User?.location ?? null;

  return {
    state: profileLocation?.state ?? null,
    district: complaintLocation?.district ?? profileLocation?.district ?? null,
    city: complaintLocation?.city ?? profileLocation?.city ?? null,
    locality: complaintLocation?.locality ?? profileLocation?.locality ?? null,
    street: complaintLocation?.street ?? profileLocation?.street ?? null,
    pin: complaintLocation?.pin ?? profileLocation?.pin ?? null,
    municipal: profileLocation?.municipal ?? null,
    country: profileLocation?.country ?? null,
    latitude: complaintLocation?.latitude ?? null,
    longitude: complaintLocation?.longitude ?? null,
    source: complaintLocation ? "complaint" : profileLocation ? "user_profile" : "none",
  };
}

async function buildComplaintBlockchainView(complaint: ComplaintRecord, verifyOnChain: boolean) {
  const pending = !complaint.blockchainHash;
  const chainVerification = verifyOnChain ? await verifyTransactionOnChain(complaint.blockchainHash) : null;
  const location = buildLocationView(complaint);

  return {
    ok: true,
    complaintId: complaint.id,
    seq: complaint.seq,
    status: pending ? "PENDING" : complaint.blockchainStatus,
    transactionHash: complaint.blockchainHash,
    blockchainHash: complaint.blockchainHash,
    blockchainBlock: complaint.blockchainBlock ? complaint.blockchainBlock.toString() : null,
    ipfsHash: complaint.ipfsHash,
    isOnChain: complaint.isOnChain,
    explorerUrl: getExplorerUrl(complaint.blockchainHash),
    blockchainUpdatedAt: complaint.blockchainUpdatedAt,
    submissionDate: complaint.submissionDate,
    chainVerification,
    complaint: {
      complaintId: complaint.id,
      seq: complaint.seq,
      subCategory: complaint.subCategory,
      description: complaint.description,
      urgency: complaint.urgency,
      complaintStatus: complaint.status,
      assignedDepartment: complaint.assignedDepartment,
      isPublic: complaint.isPublic,
      categoryId: complaint.categoryId,
      categoryName: complaint.category?.name ?? null,
      attachmentUrl: complaint.attachmentUrl,
      submissionDate: complaint.submissionDate,
      location,
    },
  };
}

const router = Router();

router.get("/complaints/:complaintId/blockchain", async (req, res, next) => {
  try {
    const complaint = await findComplaintByIdOrSeq(req.params.complaintId);

    if (!complaint) {
      return res.status(404).json({ ok: false, error: "Complaint not found" });
    }

    return res.status(200).json(await buildComplaintBlockchainView(complaint, false));
  } catch (error) {
    return next(error);
  }
});

router.get("/complaints/:complaintId/blockchain/live", async (req, res, next) => {
  try {
    const complaint = await findComplaintByIdOrSeq(req.params.complaintId);

    if (!complaint) {
      return res.status(404).json({ ok: false, error: "Complaint not found" });
    }

    return res.status(200).json(await buildComplaintBlockchainView(complaint, true));
  } catch (error) {
    return next(error);
  }
});

router.get("/blockchain/tx/:txHash", async (req, res, next) => {
  try {
    const txHash = TxHashSchema.parse(req.params.txHash);

    const complaint = await prisma.complaint.findFirst({
      where: { blockchainHash: txHash },
      select: {
        id: true,
        seq: true,
        subCategory: true,
        description: true,
        urgency: true,
        status: true,
        assignedDepartment: true,
        isPublic: true,
        attachmentUrl: true,
        categoryId: true,
        submissionDate: true,
        blockchainHash: true,
        blockchainBlock: true,
        ipfsHash: true,
        isOnChain: true,
        blockchainStatus: true,
        blockchainUpdatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        location: {
          select: {
            pin: true,
            district: true,
            city: true,
            locality: true,
            street: true,
            latitude: true,
            longitude: true,
          },
        },
        User: {
          select: {
            location: {
              select: {
                pin: true,
                district: true,
                city: true,
                locality: true,
                street: true,
                state: true,
                country: true,
                municipal: true,
              },
            },
          },
        },
      },
    });

    if (!complaint) {
      return res.status(404).json({ ok: false, error: "No complaint linked to this tx hash" });
    }

    const chainVerification = await verifyTransactionOnChain(txHash);
    const location = buildLocationView(complaint);

    return res.status(200).json({
      ok: true,
      txHash,
      explorerUrl: getExplorerUrl(txHash),
      complaint: {
        complaintId: complaint.id,
        seq: complaint.seq,
        subCategory: complaint.subCategory,
        description: complaint.description,
        urgency: complaint.urgency,
        complaintStatus: complaint.status,
        assignedDepartment: complaint.assignedDepartment,
        isPublic: complaint.isPublic,
        categoryId: complaint.categoryId,
        categoryName: complaint.category?.name ?? null,
        attachmentUrl: complaint.attachmentUrl,
        submissionDate: complaint.submissionDate,
        location,
        blockchainHash: complaint.blockchainHash,
        blockchainBlock: complaint.blockchainBlock ? complaint.blockchainBlock.toString() : null,
        ipfsHash: complaint.ipfsHash,
        isOnChain: complaint.isOnChain,
        blockchainStatus: complaint.blockchainStatus,
        blockchainUpdatedAt: complaint.blockchainUpdatedAt,
      },
      receipt: chainVerification.receipt,
      chainVerification,
    });
  } catch (error) {
    return next(error);
  }
});

export default router;
