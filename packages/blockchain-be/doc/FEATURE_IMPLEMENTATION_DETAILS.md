# Implementation Guide: SwarajDesk Walletless Blockchain Innovations 🛠️

Based on a detailed analysis of your exact codebase (`GrievanceContract.sol` and your specific Redis Queue / Worker architecture), here is the perfect step-by-step technical implementation guide for all four Web3 innovations. 

Because your smart contract already has structural foundations (like the `AgentPerformance` struct and `updateComplaintStatusWithReason`), building these will be incredibly fast.

---

## 🔥 Innovation 1: The AI-Oracle Fraud Slasher

**1. Smart Contract Update (`GrievanceContract.sol`)**
You already have the `AgentPerformance` struct. You just need a function that specifically slashes the score when the AI commands it.
Add this function to the contract:
```solidity
function slashAgentFraud(
    string calldata _agentId, 
    string calldata _complaintId, 
    string calldata _reason
) external onlyAuthorizedOperator {
    bytes32 agentIdHash = keccak256(bytes(_agentId));
    AgentPerformance storage perf = agentPerformanceRecords[agentIdHash];
    
    // Slash 25 points automatically for fraudulent resolution
    perf.score = perf.score > 25 ? perf.score - 25 : 0; 
    perf.lastUpdated = uint64(block.timestamp);
    
    // Fire the event you already have defined
    emit AgentPerformanceRecorded(
        _agentId, 
        _complaintId, 
        perf.resolvedCount, 
        perf.escalatedCount, 
        perf.duplicateFlags, 
        perf.score, 
        block.timestamp
    );
}
```

**2. Backend Worker Update (`worker.ts`)**
When `Vision AI` returns that the agent uploaded a fake photo, dispatch a custom JSON to your Redis queue. Your worker reads it and executes:
```typescript
// Inside your worker.processMessage switch case
case "AI_FRAUD_DETECTED":
    const slashFn = this.contract.getFunction("slashAgentFraud");
    await this.sendTransactionWithRetry("slashAgentFraud", () => 
        slashFn(data.agentId, data.complaintId, "Vision AI rejected Proof of Work")
    );
    
    // Step 2: Instantly trigger your existing escalate function
    const escalateFn = this.contract.getFunction("escalateComplaint");
    await this.sendTransactionWithRetry("escalateComplaint", () => 
        escalateFn(data.complaintId, 9, "Auto-escalated due to fake AI evidence") // 9 = Escalated to State Admin
    );
    break;
```

---

## ⏰ Innovation 2: Time-Locked Cryptographic Escalation

**1. Smart Contract Update (`GrievanceContract.sol`)**
You already have `recordComplaintSla(complaintId, expectedBy, note)`. To build an unstoppable clock, you need a smart contract function that enforces it based *strictly* on block time.

```solidity
function enforceUnlockedSLA(
    string calldata _complaintId, 
    uint8 _escalateToStatus
) external onlyAuthorizedOperator {
    bytes32 complaintHash = keccak256(bytes(_complaintId));
    SlaRecord memory sla = complaintSlaRecords[complaintHash];
    
    require(sla.expectedBy > 0, "SLA not set");
    require(block.timestamp > sla.expectedBy, "SLA deadline has not passed yet");
    require(complaints[complaintHash].statusCode != 3, "Complaint is already Completed"); // Assuming 3 = COMPLETED

    // Permanently record the breach using your existing function
    this.markComplaintSlaBreached(_complaintId, "Auto-breach by Block Timestamp");
    
    // Force Escalation 
    this.escalateComplaint(_complaintId, _escalateToStatus, "Cryptographic SLA Timer Expired");
}
```

**2. Backend Implementation**
Instead of manually clicking "Escalate", you run a Node.js cron-job every 6 hours. It fetches all pending complaints from Prisma, and sends them to the Blockchain worker queue. The smart contract does the mathematical check. If the timestamp hasn't passed, the contract rejects the transaction. If it has passed, the contract escalates it—no human can stop it.

---

## 🤝 Innovation 3: The On-Chain "Solidarity Block"

**1. Smart Contract Update (`GrievanceContract.sol`)**
We need a structure to bind duplicates together. Add a mapping and a binding function:

```solidity
mapping(bytes32 => string[]) public solidarityBlocks; // Maps Primary Hash -> Array of Duplicate IDs

event SolidarityBlockCreated(string primaryComplaintId, string[] linkedComplaints, uint256 timestamp);

function createSolidarityBlock(
    string calldata _primaryComplaintId, 
    string[] calldata _duplicateIds
) external onlyAuthorizedOperator {
    bytes32 primaryHash = keccak256(bytes(_primaryComplaintId));
    
    solidarityBlocks[primaryHash] = _duplicateIds;
    
    emit SolidarityBlockCreated(_primaryComplaintId, _duplicateIds, block.timestamp);
}
```
*Note: To enforce it, modify your `updateComplaintStatus` function to check if a complaint is part of a `solidarityBlock`. If it is, the smart contract requires the agent to close the `primaryComplaintId` first.*

**2. Backend Worker Update (`worker.ts`)**
When your `DedupAI` groups 5 complaints together, pass an array of their IDs to Redis.
```typescript
case "CREATE_SOLIDARITY_BLOCK":
    const blockFn = this.contract.getFunction("createSolidarityBlock");
    await this.sendTransactionWithRetry("createSolidarityBlock", () => 
        blockFn(data.primaryId, data.duplicateIdsArray)
    );
    break;
```

---

## 🔍 Innovation 4: Live On-Chain Complaint Audit Tracking

**1. Smart Contract Base**
You don't need to change anything! You have already implemented this perfectly. 
You are currently using:
`_appendStatusHistory(bytes32, uint8, uint8, bytes32)` and emitting `ComplaintStatusAudited`.

**2. Frontend Integration (The UX Magic)**
To prove this feature to the judges, the frontend must explicitly pull from the blockchain, not Prisma.

```javascript
import { ethers } from 'ethers';
import GrievanceABI from '../abi/GrievanceContract.json';

// Function called when scanning a QR Code
async function fetchCryptographicAuditTrail(complaintId) {
    const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_SEPOLIA_RPC);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, GrievanceABI, provider);

    // Fetch the raw events directly from Ethereum
    const filter = contract.filters.ComplaintStatusAudited(complaintId);
    const events = await contract.queryFilter(filter);

    // Map these events to a beautiful UI timeline 
    return events.map(event => ({
        oldStatus: event.args[1],
        newStatus: event.args[2],
        timestamp: new Date(Number(event.args[5]) * 1000).toLocaleString(),
        reasonHash: event.args[4]
    }));
}
```
**Demo Value:** The judge scans the QR code. You show them the network panel pointing directly to `infura.io` or `alchemy` (Sepolia RPC), proving it is 100% decentralized data, totally bypassing your PostgreSQL database.
