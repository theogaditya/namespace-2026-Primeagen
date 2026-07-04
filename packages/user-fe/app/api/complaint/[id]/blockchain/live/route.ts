import { NextRequest, NextResponse } from "next/server";

const BLOCKCHAIN_BACKEND_URL =
  process.env.BLOCKCHAIN_BE_URL ||
  process.env.NEXT_PUBLIC_BLOCKCHAIN_BE_URL ||
  "http://localhost:4100";

const ADMIN_BE_URL = process.env.NEXT_PUBLIC_ADMIN_BE_URL || "http://localhost:3002";

async function fetchJson(url: string) {
  try {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
    });

    const data = await response.json().catch(() => null);
    return { ok: response.ok, status: response.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Fetch both sources so UI gets live chain status + verifiable logs together.
    const [adminVerify, blockchainLive] = await Promise.all([
      fetchJson(`${ADMIN_BE_URL}/api/complaints/verify/${encodeURIComponent(id)}`),
      fetchJson(`${BLOCKCHAIN_BACKEND_URL}/api/complaints/${encodeURIComponent(id)}/blockchain/live`),
    ]);

    const adminData = adminVerify.ok ? adminVerify.data : null;
    const liveData = blockchainLive.ok ? blockchainLive.data : null;

    if (!adminData && !liveData) {
      return NextResponse.json(
        {
          ok: false,
          error: "Verification services are unavailable.",
        },
        { status: 502 }
      );
    }

    const base = liveData || {
      ok: true,
      complaintId: id,
      seq: null,
      status: "UNKNOWN",
      transactionHash: null,
      blockchainHash: null,
      blockchainBlock: null,
      ipfsHash: null,
      isOnChain: false,
      explorerUrl: null,
      blockchainUpdatedAt: null,
      chainVerification: null,
      complaint: null,
    };

    const databaseLogs = Array.isArray(adminData?.databaseLogs)
      ? adminData.databaseLogs
      : [];
    const adminChainLogs = Array.isArray(adminData?.blockchainVerifiedLogs)
      ? adminData.blockchainVerifiedLogs
      : [];

    const txHash = base.transactionHash || base.blockchainHash;
    const hasVerifiedTx =
      Boolean(txHash) &&
      (Boolean(base.isOnChain) || base.chainVerification?.status === "VERIFIED");

    const syntheticTxLog = hasVerifiedTx
      ? [
          {
            logId: `TX-${String(txHash).slice(2, 10)}`,
            action: "ON_CHAIN_CONFIRMATION",
            userId: "SYSTEM",
            details: `Complaint transaction confirmed on-chain${base.blockchainBlock ? ` at block ${base.blockchainBlock}` : ""}.`,
            timestamp: base.blockchainUpdatedAt
              ? Math.floor(new Date(base.blockchainUpdatedAt).getTime() / 1000)
              : Math.floor(Date.now() / 1000),
            transactionHash: txHash,
            blockNumber: base.blockchainBlock ? Number(base.blockchainBlock) : 0,
          },
        ]
      : [];

    const blockchainVerifiedLogs =
      adminChainLogs.length > 0 ? adminChainLogs : syntheticTxLog;

    const syncedFallback =
      blockchainVerifiedLogs.length > 0 || Boolean(base.isOnChain);
    const synced =
      typeof adminData?.synced === "boolean"
        ? adminData.synced
        : syncedFallback;

    return NextResponse.json({
      ...base,
      complaintId: base.complaintId || id,
      databaseLogs,
      blockchainVerifiedLogs,
      synced,
      syncedByFallback: !adminData && !!liveData,
    });

  } catch (error: any) {
    console.error("Blockchain Verification Final Error:", error);
    return NextResponse.json({ ok: false, error: "Both verification services are down." }, { status: 500 });
  }
}



