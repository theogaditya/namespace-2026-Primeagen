import { ethers } from 'ethers';

// This ABI focus only on the Audit Events we need
const AUDIT_ABI = [
  "event AuditLogCreated(string indexed logId, string action, string userId, string indexed complaintId, string details, uint256 timestamp)"
];

export class BlockchainAuditService {
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;

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

  
  async getOnChainLogs(complaintId: string) {
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
      const searchWindows = [500, 5000, 50000];
      let events: any[] = [];

      // Start with a small block window, then widen to recover older complaint logs.
      for (const windowSize of searchWindows) {
        try {
          const fromBlock = Math.max(latestBlock - windowSize, 0);
          const matches = await this.contract.queryFilter(filter, fromBlock, latestBlock);
          if (matches.length > 0) {
            events = matches;
            break;
          }
        } catch (windowError) {
          console.warn(`[BlockchainAudit] Query failed for window=${windowSize}:`, windowError);
        }
      }


      const logs = events.map(event => {
        const e = event as any;
        const args = e.args;
        if (!args) return null;
        
        return {
          logId: args.logId || 'N/A',
          action: args.action || 'Unknown',
          userId: args.userId || 'System',
          details: args.details || '',
          timestamp: args.timestamp ? Number(args.timestamp) : Math.floor(Date.now() / 1000),
          transactionHash: e.transactionHash || '',
          blockNumber: e.blockNumber || 0
        };
      });

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
