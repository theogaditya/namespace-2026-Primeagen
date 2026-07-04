import { ethers } from 'ethers';

// This ABI focus only on the Audit Events we need
const AUDIT_ABI = [
  "event AuditLogCreated(string indexed logId, string action, string userId, string indexed complaintId, string details, uint256 timestamp)"
];

export class BlockchainAuditService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private rangeClampWarned = false;

  private isRateLimitError(error: unknown): boolean {
    const raw = String(error || '').toLowerCase();
    return raw.includes('429') || raw.includes('throughput') || raw.includes('rate limit');
  }

  constructor() {
    const rpcUrl = process.env.BLOCKCHAIN_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/your-key';
    const address = process.env.CONTRACT_ADDRESS;

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    
    if (!address || address === "") {
      console.warn('[BlockchainAudit] Warning: CONTRACT_ADDRESS is missing. On-chain verification will be disabled.');
      // Initialize with a dummy address to prevent constructor crash, but we check this.contract later
      this.contract = new ethers.Contract(ethers.ZeroAddress, AUDIT_ABI, this.provider);
    } else {
      this.contract = new ethers.Contract(address, AUDIT_ABI, this.provider);
    }
  }

  private normalizeEvent(event: any) {
    const args = event?.args;
    if (!args) return null;

    return {
      logId: args.logId || 'N/A',
      action: args.action || 'Unknown',
      userId: args.userId || 'System',
      details: args.details || '',
      timestamp: args.timestamp ? Number(args.timestamp) : Math.floor(Date.now() / 1000),
      transactionHash: event?.transactionHash || '',
      blockNumber: event?.blockNumber || 0,
    };
  }

  async getTransactionProof(transactionHash: string) {
    try {
      if (!transactionHash) return null;

      const receipt = await this.provider.getTransactionReceipt(transactionHash);
      if (!receipt) return null;

      const block = receipt.blockNumber
        ? await this.provider.getBlock(receipt.blockNumber)
        : null;

      return {
        transactionHash,
        blockNumber: receipt.blockNumber,
        status: receipt.status === 1 ? 'CONFIRMED' : 'FAILED',
        timestamp: block?.timestamp ?? Math.floor(Date.now() / 1000),
      };
    } catch (error) {
      console.error('[BlockchainAudit] Error fetching transaction proof:', error);
      return null;
    }
  }

  async getOnChainLogs(
    complaintId: string,
    hintBlock?: number | null,
    options?: {
      disableFallbackScan?: boolean;
      maxFallbackChunks?: number;
    }
  ) {
    try {
      if (!complaintId || !this.contract) return [];
      if ((this.contract as any).target === ethers.ZeroAddress) return [];

      // Get the filter safely
      const filters = (this.contract as any).filters;
      if (!filters || !filters.AuditLogCreated) {
        console.error('[BlockchainAudit] AuditLogCreated not found');
        return [];
      }

      const filter = filters.AuditLogCreated(null, null, null, complaintId);
      const latestBlock = await this.provider.getBlockNumber();
      const configuredMaxRange = Number(process.env.BLOCKCHAIN_LOG_MAX_RANGE || 10);
      const providerHardCap = Math.max(1, Number(process.env.BLOCKCHAIN_PROVIDER_MAX_LOG_RANGE || 10));
      const sanitizedConfiguredRange = Number.isFinite(configuredMaxRange)
        ? Math.max(1, Math.floor(configuredMaxRange))
        : 10;
      const maxRangePerRequest = Math.min(providerHardCap, sanitizedConfiguredRange);

      if (!this.rangeClampWarned && sanitizedConfiguredRange > providerHardCap) {
        console.warn(
          `[BlockchainAudit] BLOCKCHAIN_LOG_MAX_RANGE=${sanitizedConfiguredRange} exceeds provider cap=${providerHardCap}. Using ${maxRangePerRequest}.`
        );
        this.rangeClampWarned = true;
      }

      const fallbackLookback = Math.max(maxRangePerRequest, Number(process.env.BLOCKCHAIN_LOG_LOOKBACK || 5000));
      const maxFallbackChunks = Math.max(
        1,
        Number(options?.maxFallbackChunks ?? process.env.BLOCKCHAIN_LOG_MAX_CHUNKS ?? 120)
      );
      let events: any[] = [];

      // If DB stores a block hint, query exactly around it first (fast and free-tier safe).
      if (typeof hintBlock === 'number' && Number.isFinite(hintBlock)) {
        const clampedHint = Math.min(Math.max(Math.floor(hintBlock), 0), latestBlock);
        const halfWindow = Math.floor((maxRangePerRequest - 1) / 2);
        const hintedFrom = Math.max(clampedHint - halfWindow, 0);
        const hintedTo = Math.min(hintedFrom + maxRangePerRequest - 1, latestBlock);

        try {
          const hintedMatches = await this.contract.queryFilter(filter, hintedFrom, hintedTo);
          if (hintedMatches.length > 0) {
            events = hintedMatches;
          }
        } catch (hintError) {
          console.warn('[BlockchainAudit] Hint-block query failed:', hintError);
        }
      }

      // Fallback: walk backward in small chunks to satisfy free-tier block range limits.
      if (events.length === 0 && !options?.disableFallbackScan) {
        const minBlock = Math.max(latestBlock - fallbackLookback, 0);
        let toBlock = latestBlock;
        let scannedChunks = 0;

        while (toBlock >= minBlock && scannedChunks < maxFallbackChunks) {
          const fromBlock = Math.max(toBlock - maxRangePerRequest + 1, minBlock);
          scannedChunks += 1;
          try {
            const matches = await this.contract.queryFilter(filter, fromBlock, toBlock);
            if (matches.length > 0) {
              events = matches;
              break;
            }
          } catch (chunkError) {
            console.warn(
              `[BlockchainAudit] Query failed for chunk=[${fromBlock}, ${toBlock}] (maxRange=${maxRangePerRequest}):`,
              chunkError
            );

            // Stop immediately on provider throttling to avoid long hangs and noisy retries.
            if (this.isRateLimitError(chunkError)) {
              break;
            }
          }

          toBlock = fromBlock - 1;
        }

        if (scannedChunks >= maxFallbackChunks) {
          console.warn(
            `[BlockchainAudit] Fallback chunk scan limit reached (${maxFallbackChunks}). Returning partial/no on-chain logs.`
          );
        }
      }

      const logs = events.map((event) => this.normalizeEvent(event));

      return logs
        .filter((l): l is NonNullable<typeof l> => l !== null)
        .sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('[BlockchainAudit] Error fetching logs:', error);
      return [];
    }
  }
}

export const blockchainAuditService = new BlockchainAuditService();
